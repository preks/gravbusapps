import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_IDS_BY_COMPANY } from '../queries/compensationChangesQueries'

interface EmployeeIdsByCompanyResult {
  readonly employeeIdsByCompany: Map<string, Set<string>>
  readonly loading: boolean
}

export function useEmployeeIdsByCompany(
  accessToken: string,
  companyIds: Array<string | null>
): EmployeeIdsByCompanyResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [employeeIdsByCompany, setEmployeeIdsByCompany] = useState<Map<string, Set<string>>>(new Map())
  const [loading, setLoading] = useState(false)

  const companyIdsKey = useMemo(() => {
    const uniqueCompanyIds = Array.from(new Set(companyIds.filter((id): id is string => Boolean(id)))).sort((a, b) =>
      a.localeCompare(b)
    )
    return uniqueCompanyIds.join('|')
  }, [companyIds])

  useEffect(() => {
    let isCancelled = false

    const uniqueCompanyIds = companyIdsKey.length > 0 ? companyIdsKey.split('|') : []

    async function fetchAllEmployeeIds() {
      if (uniqueCompanyIds.length === 0) {
        setEmployeeIdsByCompany(new Map())
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const posData = await graphqlClient.request<{
          EmployeePosition: Array<{ companyId: string | null; employeeId: string }>
        }>(GET_EMPLOYEE_IDS_BY_COMPANY, { companyIds: uniqueCompanyIds })

        if (isCancelled) {
          return
        }

        const nextMap = new Map<string, Set<string>>()
        for (const companyId of uniqueCompanyIds) {
          nextMap.set(companyId, new Set())
        }
        for (const position of posData.EmployeePosition ?? []) {
          if (position.companyId && nextMap.has(position.companyId)) {
            nextMap.get(position.companyId)?.add(position.employeeId)
          }
        }
        setEmployeeIdsByCompany(nextMap)
      } catch {
        if (!isCancelled) {
          setEmployeeIdsByCompany(new Map())
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchAllEmployeeIds()

    return () => {
      isCancelled = true
    }
  }, [graphqlClient, companyIdsKey])

  return { employeeIdsByCompany, loading }
}
