import { useCallback, useState, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeOption {
  id: string
  displayName: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name: string
    }
    organizationalUnit?: {
      id: string
      name: string
    }
  }
}

const EMPLOYEES_PAGE_SIZE = 50

const TEAM_EMPLOYEES_QUERY = `
  query GetTeamEmployees($orgUnitId: uuid!, $limit: Int!, $offset: Int!, $searchPattern: String!) {
    EmployeePosition(
      where: {
        organizationalUnitId: { _eq: $orgUnitId }
        exitDate: { _isNull: true }
        employee: { 
          _and: [
            { isDeleted: { _eq: false } }
            {
              _or: [
                { displayName: { _ilike: $searchPattern } }
                { firstName: { _ilike: $searchPattern } }
                { lastName: { _ilike: $searchPattern } }
              ]
            }
          ]
        }
      }
      limit: $limit
      offset: $offset
    ) {
      employee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
          organizationalUnit {
            id
            name
          }
        }
      }
    }
  }
`

export const useTeamEmployees = (accessToken: string, orgUnitId: string | null) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const inFlightRef = useRef<{ key: string; promise: Promise<any> } | null>(null)

  const fetchPage = useCallback(
    async (term: string, pageOffset: number, append: boolean) => {
      if (!orgUnitId || !accessToken) return

      setLoading(true)
      try {
        const searchPattern = term ? `%${term.trim()}%` : '%%'
        const key = `${orgUnitId}|${searchPattern}|${pageOffset}`

        if (inFlightRef.current?.key === key) {
          await inFlightRef.current.promise
          return
        }

        const promise = graphqlClient.request<{
          EmployeePosition: Array<{ employee: EmployeeOption }>
        }>(TEAM_EMPLOYEES_QUERY, {
          orgUnitId,
          limit: EMPLOYEES_PAGE_SIZE,
          offset: pageOffset,
          searchPattern
        })

        inFlightRef.current = { key, promise }
        const result = await promise

        const nextEmployees =
          result?.EmployeePosition?.map(ep => ep.employee).filter((emp): emp is EmployeeOption => !!emp) || []

        setEmployees(prev => {
          const map = new Map<string, EmployeeOption>()
          if (append) {
            prev.forEach(p => map.set(p.id, p))
          }
          nextEmployees.forEach(e => map.set(e.id, e))
          return Array.from(map.values())
        })

        setHasMore(nextEmployees.length === EMPLOYEES_PAGE_SIZE)
        setOffset(pageOffset)
      } catch (err) {
        console.error('Error fetching team employees:', err)
      } finally {
        inFlightRef.current = null
        setLoading(false)
      }
    },
    [orgUnitId, accessToken, graphqlClient]
  )

  const search = useCallback(
    async (q: string) => {
      const term = (q || '').trim()
      setSearchTerm(term)
      await fetchPage(term, 0, false)
    },
    [fetchPage]
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchPage(searchTerm, offset + EMPLOYEES_PAGE_SIZE, true)
  }, [fetchPage, hasMore, loading, offset, searchTerm])

  // Initial load
  useEffect(() => {
    if (orgUnitId && accessToken) {
      fetchPage('', 0, false)
    }
  }, [orgUnitId, accessToken])

  return {
    employees,
    loading,
    hasMore,
    search,
    loadMore
  }
}
