import { useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_POSITIONS_BY_IDENTIFIERS, GET_EMPLOYEES_BY_IDS } from '../queries/backofficeReportQueries'
import { FORMER_EMPLOYEE_LABEL, buildEmployeeDisplayName } from './backofficeReportUtils'

export const useEmployeeResolver = (accessToken: string | undefined) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const employeeNameCacheRef = useRef<Record<string, string>>({})
  const employeeDepartmentCacheRef = useRef<Record<string, string>>({})

  const cacheEmployeePositionRows = useCallback((rows: any[]) => {
    rows.forEach((row: any) => {
      const displayName = buildEmployeeDisplayName(row)
      const departmentName = String(row?.organizationalUnit?.name || '').trim()
      const keys = [row?.id, row?.userId, row?.employeeId].map(value => String(value || '')).filter(Boolean)

      if (displayName) {
        keys.forEach(key => {
          employeeNameCacheRef.current[key] = displayName
        })
      }
      if (departmentName) {
        keys.forEach(key => {
          employeeDepartmentCacheRef.current[key] = departmentName
        })
      }
    })
  }, [])

  const cacheEmployeeRows = useCallback((rows: any[]) => {
    rows.forEach((employee: any) => {
      const displayName = buildEmployeeDisplayName(employee) || String(employee?.displayName || '').trim()
      if (!displayName || !employee?.id) return
      employeeNameCacheRef.current[String(employee.id)] = displayName
    })
  }, [])

  const chunkIdentifiers = useCallback((identifiers: string[], chunkSize = 50): string[][] => {
    const chunks: string[][] = []
    for (let index = 0; index < identifiers.length; index += chunkSize) {
      chunks.push(identifiers.slice(index, index + chunkSize))
    }
    return chunks
  }, [])

  const fetchEmployeePositionBatch = useCallback(
    async (batchIds: string[]) => {
      if (!graphqlClient || batchIds.length === 0) return
      try {
        const where = {
          _or: batchIds.flatMap(id => [{ id: { _eq: id } }, { userId: { _eq: id } }, { employeeId: { _eq: id } }])
        }
        const result = await graphqlClient.request(GET_EMPLOYEE_POSITIONS_BY_IDENTIFIERS, { where })
        const rows = Array.isArray(result?.EmployeePosition) ? result.EmployeePosition : []
        cacheEmployeePositionRows(rows)
      } catch {
        // Keep unresolved identifiers empty; UI should not display UUID fallback.
      }
    },
    [graphqlClient, cacheEmployeePositionRows]
  )

  const fetchEmployeeBatch = useCallback(
    async (batchIds: string[]) => {
      if (!graphqlClient || batchIds.length === 0) return
      try {
        const result = await graphqlClient.request(GET_EMPLOYEES_BY_IDS, { ids: batchIds })
        const rows = Array.isArray(result?.Employee) ? result.Employee : []
        cacheEmployeeRows(rows)
      } catch {
        // Keep unresolved IDs as fallback label.
      }
    },
    [graphqlClient, cacheEmployeeRows]
  )

  const resolveEmployeeNamesByIds = useCallback(
    async (employeeIds: string[]) => {
      if (!graphqlClient || employeeIds.length === 0) return employeeNameCacheRef.current

      const uniqueIds = Array.from(new Set(employeeIds.filter(Boolean)))
      const unresolvedIds = uniqueIds.filter(id => !employeeNameCacheRef.current[id])
      if (unresolvedIds.length === 0) return employeeNameCacheRef.current

      const positionChunks = chunkIdentifiers(unresolvedIds)
      for (const batchIds of positionChunks) {
        await fetchEmployeePositionBatch(batchIds)
      }

      const unresolvedAfterPositions = unresolvedIds.filter(id => !employeeNameCacheRef.current[id])
      const employeeChunks = chunkIdentifiers(unresolvedAfterPositions)
      for (const batchIds of employeeChunks) {
        await fetchEmployeeBatch(batchIds)
      }

      return employeeNameCacheRef.current
    },
    [graphqlClient, chunkIdentifiers, fetchEmployeePositionBatch, fetchEmployeeBatch]
  )

  const resolveDisplayName = useCallback(
    (candidates: Array<string | undefined | null>, employeeNameById: Record<string, string>) => {
      for (const id of candidates) {
        const key = String(id || '')
        if (!key) continue
        const resolved = employeeNameById[key]
        if (resolved) return resolved
      }
      return FORMER_EMPLOYEE_LABEL
    },
    []
  )

  const resolveDepartmentName = useCallback((candidates: Array<string | undefined | null>) => {
    for (const id of candidates) {
      const key = String(id || '')
      if (!key) continue
      const resolved = employeeDepartmentCacheRef.current[key]
      if (resolved) return resolved
    }
    return ''
  }, [])

  return {
    graphqlClient,
    employeeNameCacheRef,
    employeeDepartmentCacheRef,
    resolveEmployeeNamesByIds,
    resolveDisplayName,
    resolveDepartmentName
  }
}
