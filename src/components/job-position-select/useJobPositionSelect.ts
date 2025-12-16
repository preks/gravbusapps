import { useEffect, useState, useMemo, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface JobPositionOption {
  id: string
  name: string
  organizationalUnit?: {
    id: string
    name: string
  }
  currentEmployee?: {
    id: string
    displayName: string
    pictureThumbnail?: string
  }
}

// Query to fetch job positions with organizational unit and current employee
const GET_JOB_POSITIONS_QUERY = (search?: string, limit = 20, offset = 0): string => {
  const searchCondition = search?.trim()
    ? `_or: [
        { name: { _ilike: "%${search.trim()}%" } },
        { employeePositions: { employee: { displayName: { _ilike: "%${search.trim()}%" } } } },
        { employeePositions: { organizationalUnit: { name: { _ilike: "%${search.trim()}%" } } } }
      ]`
    : ''

  return `
    query GetJobPositions {
      JobPosition(
        where: {
          isDeleted: { _eq: false }
          ${searchCondition ? `, ${searchCondition}` : ''}
        }
        limit: ${limit}
        offset: ${offset}
        orderBy: { name: ASC_NULLS_LAST }
      ) {
        id
        name
        employeePositions(
          where: {
            exitDate: { _isNull: true }
            isDeleted: { _eq: false }
          }
          limit: 1
          orderBy: { hireDate: DESC_NULLS_LAST }
        ) {
          employee {
            id
            displayName
            pictureThumbnail
          }
          organizationalUnit {
            id
            name
          }
        }
      }
      JobPositionAggregate(
        where: {
          isDeleted: { _eq: false }
          ${searchCondition ? `, ${searchCondition}` : ''}
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export interface UseJobPositionSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onJobPositionChange?: (jobPosition: JobPositionOption | null) => void
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialJobPosition?: JobPositionOption | null
  // Manual mode props
  jobPositions?: JobPositionOption[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface UseJobPositionSelectReturn {
  jobPositions: JobPositionOption[]
  loading: boolean
  hasMore: boolean
  onSearch: (q: string) => void
  onLoadMore: () => void
  handleValueChange: (newValue: string | null) => void
  jobPositionsWithInitial: JobPositionOption[]
}

export const useJobPositionSelect = ({
  onValueChange,
  onJobPositionChange,
  businessAppContext,
  accessToken,
  initialJobPosition,
  jobPositions: manualJobPositions,
  onSearch: manualOnSearch,
  loading: manualLoading,
  hasMore: manualHasMore,
  onLoadMore: manualOnLoadMore
}: UseJobPositionSelectProps): UseJobPositionSelectReturn => {
  const token = accessToken || businessAppContext?.accessToken || ''
  const graphqlClient = useGraphQLClient(token)

  const [jobPositions, setJobPositions] = useState<JobPositionOption[]>(manualJobPositions || [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 20

  // Determine if we should use manual mode
  const isManualMode = Boolean(manualJobPositions || manualOnSearch)

  // Fetch job positions
  const fetchJobPositions = useCallback(
    async (search: string = '', resetOffset = true) => {
      if (isManualMode) return

      setLoading(true)
      try {
        const query = GET_JOB_POSITIONS_QUERY(search, limit, resetOffset ? 0 : offset)
        const result = await graphqlClient.request<{
          JobPosition: Array<{
            id: string
            name: string
            employeePositions: Array<{
              employee: {
                id: string
                displayName: string
                pictureThumbnail?: string
              }
              organizationalUnit: {
                id: string
                name: string
              }
            }>
          }>
          JobPositionAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query)

        const positions: JobPositionOption[] = (result.JobPosition || []).map(pos => ({
          id: pos.id,
          name: pos.name,
          organizationalUnit: pos.employeePositions[0]?.organizationalUnit,
          currentEmployee: pos.employeePositions[0]?.employee
        }))

        if (resetOffset) {
          setJobPositions(positions)
          setOffset(limit)
        } else {
          setJobPositions(prev => [...prev, ...positions])
          setOffset(prev => prev + limit)
        }

        const count = result.JobPositionAggregate?.aggregate?.count || 0
        setHasMore((resetOffset ? limit : offset + limit) < count)
      } catch (error) {
        console.error('Error fetching job positions:', error)
      } finally {
        setLoading(false)
      }
    },
    [graphqlClient, token, isManualMode, offset]
  )

  // Initial load
  useEffect(() => {
    if (!isManualMode && token) {
      fetchJobPositions('', true)
    }
  }, [isManualMode, token])

  // Search handler
  const handleSearch = useCallback(
    (search: string) => {
      setSearchTerm(search)
      if (isManualMode) {
        manualOnSearch?.(search)
      } else {
        fetchJobPositions(search, true)
      }
    },
    [isManualMode, manualOnSearch, fetchJobPositions]
  )

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (isManualMode) {
      manualOnLoadMore?.()
    } else {
      fetchJobPositions(searchTerm, false)
    }
  }, [isManualMode, manualOnLoadMore, fetchJobPositions, searchTerm])

  // Value change handler
  const handleValueChange = useCallback(
    (newValue: string | null) => {
      onValueChange?.(newValue || null)

      if (newValue && onJobPositionChange) {
        const position = jobPositions.find(p => p.id === newValue)
        if (position) {
          onJobPositionChange(position)
        } else if (initialJobPosition?.id === newValue) {
          onJobPositionChange(initialJobPosition)
        } else {
          onJobPositionChange(null)
        }
      } else {
        onJobPositionChange?.(null)
      }
    },
    [onValueChange, onJobPositionChange, jobPositions, initialJobPosition]
  )

  // Combine initial with fetched positions
  const jobPositionsWithInitial = useMemo(() => {
    if (!initialJobPosition) return jobPositions

    const hasInitial = jobPositions.some(p => p.id === initialJobPosition.id)
    if (hasInitial) return jobPositions

    return [initialJobPosition, ...jobPositions]
  }, [jobPositions, initialJobPosition])

  return {
    jobPositions: isManualMode ? manualJobPositions || [] : jobPositions,
    loading: isManualMode ? Boolean(manualLoading) : loading,
    hasMore: isManualMode ? Boolean(manualHasMore) : hasMore,
    onSearch: handleSearch,
    onLoadMore: handleLoadMore,
    handleValueChange,
    jobPositionsWithInitial
  }
}
