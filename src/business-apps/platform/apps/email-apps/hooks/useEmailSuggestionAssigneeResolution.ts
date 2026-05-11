import { useEffect, useMemo, useRef, useState } from 'react'
import {
  mapEmployeeRowToLite,
  type EmployeeLiteOption,
  type EmployeeLiteRow
} from '@/common/data/employee/useEmployeeSearch'
import { SEARCH_EMPLOYEES_LIGHT } from '@/common/data/employee/queries/employeeQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  parseRawAssignee,
  resolveAssigneeFromEmployees,
  type AssigneeMatchStatus,
  type ParsedAssignee
} from '../utils/emailSuggestionAssigneeResolver'

export interface UseAssigneeResolutionParams {
  accessToken?: string
  rawAssignee?: string
  enabled: boolean
  cacheKey?: string
}

export interface UseAssigneeResolutionResult {
  status: 'idle' | 'loading' | AssigneeMatchStatus
  employee?: EmployeeLiteOption
  parsed?: ParsedAssignee
}

const IDLE_RESULT: UseAssigneeResolutionResult = { status: 'idle' }

function searchTermFromParsed(parsed: ParsedAssignee): string {
  return parsed.email || parsed.name || parsed.raw
}

export function useEmailSuggestionAssigneeResolution({
  accessToken,
  rawAssignee,
  enabled,
  cacheKey = ''
}: UseAssigneeResolutionParams): UseAssigneeResolutionResult {
  const graphqlClient = useGraphQLClient(accessToken || '')
  const cacheRef = useRef<Map<string, UseAssigneeResolutionResult>>(new Map())
  const [result, setResult] = useState<UseAssigneeResolutionResult>(IDLE_RESULT)

  const parsed = useMemo(() => {
    const trimmed = rawAssignee?.trim()
    return trimmed ? parseRawAssignee(trimmed) : undefined
  }, [rawAssignee])

  useEffect(() => {
    if (!enabled || !accessToken || !parsed) {
      setResult(IDLE_RESULT)
      return
    }

    const searchTerm = searchTermFromParsed(parsed)
    if (!searchTerm) {
      setResult(IDLE_RESULT)
      return
    }

    const resolutionKey = `${cacheKey}|${parsed.raw}`
    const cached = cacheRef.current.get(resolutionKey)
    if (cached) {
      setResult(cached)
      return
    }

    let cancelled = false
    setResult({ status: 'loading', parsed })

    const run = async () => {
      try {
        const query = SEARCH_EMPLOYEES_LIGHT({ search: searchTerm, limit: 25, offset: 0 })
        const response = await graphqlClient.request<{ Employee: EmployeeLiteRow[] }>(query)
        if (cancelled) return

        const employees = (response.Employee || []).map(mapEmployeeRowToLite)
        const next = resolveAssigneeFromEmployees(parsed, employees)
        cacheRef.current.set(resolutionKey, next)
        setResult(next)
      } catch {
        if (!cancelled) {
          setResult(IDLE_RESULT)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [accessToken, cacheKey, enabled, graphqlClient, parsed])

  return result
}
