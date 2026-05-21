import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { SEARCH_EMPLOYEES_LIGHT } from '@/common/data/employee/queries/employeeQueries'
import type { SearchItem } from '../types'

interface EmployeeRecord {
  id: string
  displayName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name?: string
    }
  }
}

const toAvatarUrl = (thumbnail?: string): string | undefined => {
  if (!thumbnail) {
    return undefined
  }

  if (thumbnail.startsWith('data:image/') || thumbnail.startsWith('http')) {
    return thumbnail
  }

  if (thumbnail.startsWith('{')) {
    return undefined
  }

  return `data:image/jpeg;base64,${thumbnail}`
}

const toDisplayName = (employee: EmployeeRecord): string => {
  if (employee.displayName?.trim()) {
    return employee.displayName.trim()
  }

  const fromName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
  return fromName || 'Unknown employee'
}

export const useQueryEmployees = (
  accessToken: string | undefined,
  query: string,
  enabled = true,
  minQueryLength = 2
): SearchItem[] => {
  const client = useGraphQLClient(accessToken || '')
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!enabled || !accessToken || trimmedQuery.length < minQueryLength) {
      setEmployees([])
      return
    }

    let cancelled = false
    const timeoutId = globalThis.setTimeout(() => {
      const loadEmployees = async () => {
        try {
          const request = SEARCH_EMPLOYEES_LIGHT({
            search: trimmedQuery,
            limit: 10,
            offset: 0
          })
          const result = await client.request<{ Employee: EmployeeRecord[] }>(request)
          if (!cancelled) {
            setEmployees(result.Employee ?? [])
          }
        } catch {
          if (!cancelled) {
            setEmployees([])
          }
        }
      }

      void loadEmployees()
    }, 250)

    return () => {
      cancelled = true
      globalThis.clearTimeout(timeoutId)
    }
  }, [accessToken, client, enabled, minQueryLength, query])

  return useMemo(
    () =>
      employees.slice(0, 10).map((employee, index) => ({
        id: `query-employee-${employee.id}`,
        type: 'employee',
        typeLabel: 'Employee',
        categoryIds: ['PEOPLE'],
        name: toDisplayName(employee),
        description: employee.employeePosition?.jobPosition?.name ?? 'Employee',
        media: {
          imageUrl: toAvatarUrl(employee.pictureThumbnail),
          fallbackIcon: 'user'
        },
        primaryTarget: {
          kind: 'COMMAND',
          commandId: 'open-employee-profile',
          payload: {
            employeeId: employee.id
          }
        },
        analytics: {
          provider: 'employee-directory-query',
          trackingId: `query-employee-${employee.id}`,
          rank: index + 1
        }
      })),
    [employees]
  )
}
