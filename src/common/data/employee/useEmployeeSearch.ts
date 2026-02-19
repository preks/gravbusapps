import { useCallback, useRef, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { SEARCH_EMPLOYEES_LIGHT, GET_EMPLOYEE_LIGHT_BY_ID } from './queries/employeeQueries'

export interface EmployeeLiteOption {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  userId?: string
  workEmail?: string
  pictureThumbnail?: string
  organizationalUnitName?: string
  jobPositionName?: string
}

export const useEmployeeSearch = (accessToken?: string, initialEmployee?: EmployeeLiteOption | null) => {
  const graphqlClient = useGraphQLClient(accessToken || '')
  const [employees, setEmployees] = useState<EmployeeLiteOption[]>(initialEmployee ? [initialEmployee] : [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const PAGE_SIZE = 20
  const inFlightRef = useRef<{ key: string; promise: Promise<any> } | null>(null)
  // Keep fully-hydrated records here so they persist across searches/pages
  const pinnedRef = useRef<Map<string, EmployeeLiteOption>>(new Map())
  // Track if we've failed with auth error to prevent retry loops
  const hasFailedRef = useRef(false)

  // Pin initial employee if provided and update state
  useEffect(() => {
    if (initialEmployee && !pinnedRef.current.has(initialEmployee.id)) {
      pinnedRef.current.set(initialEmployee.id, initialEmployee)

      // Update employees list to include initial employee
      setEmployees(prev => {
        const map = new Map<string, EmployeeLiteOption>()
        prev.forEach(p => map.set(p.id, p))
        map.set(initialEmployee.id, initialEmployee)
        return Array.from(map.values())
      })
    }
  }, [initialEmployee])

  const fetchPage = useCallback(
    async (term: string, pageOffset: number, append: boolean) => {
      if (!accessToken) return

      // Don't retry if we've already failed with auth error on initial search
      if (hasFailedRef.current && pageOffset === 0 && !append) {
        return
      }

      setLoading(true)
      setError(null)
      try {
        const query = SEARCH_EMPLOYEES_LIGHT({ search: term, limit: PAGE_SIZE, offset: pageOffset })
        const key = `${term}|${PAGE_SIZE}|${pageOffset}`
        if (inFlightRef.current?.key === key) {
          await inFlightRef.current.promise
        }

        const promise = graphqlClient.request<{ Employee: any[] }>(query)
        inFlightRef.current = { key, promise }
        const result = await promise

        const next = (result.Employee || []).map(e => ({
          id: e.id,
          displayName: e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
          firstName: e.firstName,
          lastName: e.lastName,
          userId: e.userId,
          workEmail: e.workCommunications?.[0]?.value || '',
          pictureThumbnail: e.pictureThumbnail,
          organizationalUnitName: e.employeePosition?.organizationalUnit?.name,
          jobPositionName: e.employeePosition?.jobPosition?.name
        })) as EmployeeLiteOption[]

        // Merge with previous (when appending) and pinned (ensure selected/hydrated items never disappear)
        setEmployees(prev => {
          const map = new Map<string, EmployeeLiteOption>()
          if (append) {
            prev.forEach(p => map.set(p.id, p))
          }
          next.forEach(r => map.set(r.id, r))
          // Ensure pinned are present (prefer pinned details if not in results)
          pinnedRef.current.forEach((val, key) => {
            if (!map.has(key)) {
              map.set(key, val)
            }
          })
          return Array.from(map.values())
        })
        // More pages only if a full page was returned
        setHasMore(next.length === PAGE_SIZE)
        setOffset(pageOffset)
        hasFailedRef.current = false // Reset on success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search employees'
        setError(errorMessage)

        // Mark as failed if it's an auth error (401)
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('GraphQL request failed: 401')
        ) {
          hasFailedRef.current = true
        }
      } finally {
        inFlightRef.current = null
        setLoading(false)
      }
    },
    [PAGE_SIZE, accessToken, graphqlClient]
  )

  const search = useCallback(
    async (q: string) => {
      const term = (q || '').trim()
      setSearchTerm(term)
      // Reset failure flag on new search attempt
      hasFailedRef.current = false
      await fetchPage(term, 0, false)
    },
    [fetchPage]
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchPage(searchTerm, offset + PAGE_SIZE, true)
  }, [fetchPage, hasMore, loading, offset, PAGE_SIZE, searchTerm])

  const hydrateById = useCallback(
    async (id: string): Promise<EmployeeLiteOption | undefined> => {
      if (!accessToken || !id) return undefined
      // If already pinned, return it
      if (pinnedRef.current.has(id)) {
        return pinnedRef.current.get(id)
      }
      try {
        const query = GET_EMPLOYEE_LIGHT_BY_ID(id)
        const result = await graphqlClient.request<{ Employee: any[] }>(query)
        const e = result.Employee?.[0]
        if (!e) return undefined
        const record: EmployeeLiteOption = {
          id: e.id,
          displayName: e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
          firstName: e.firstName,
          lastName: e.lastName,
          userId: e.userId,
          workEmail: e.workCommunications?.[0]?.value || '',
          pictureThumbnail: e.pictureThumbnail,
          organizationalUnitName: e.employeePosition?.organizationalUnit?.name,
          jobPositionName: e.employeePosition?.jobPosition?.name
        }
        // Pin and merge into list
        pinnedRef.current.set(record.id, record)
        setEmployees(prev => {
          const map = new Map<string, EmployeeLiteOption>()
          prev.forEach(x => map.set(x.id, x))
          // Ensure pinned items are present and override if needed
          pinnedRef.current.forEach((val, key) => map.set(key, val))
          return Array.from(map.values())
        })
        return record
      } catch {
        return undefined
      }
    },
    [accessToken, graphqlClient]
  )

  return { employees, loading, error, search, hasMore, loadMore, hydrateById }
}
