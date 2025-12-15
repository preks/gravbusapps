import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface OrganizationalUnitOption {
  id: string
  name: string
  code?: string
}

// Query to fetch organizational units
const GET_ORGANIZATIONAL_UNITS_QUERY = (search?: string, limit = 20, offset = 0): string => {
  const searchCondition = search?.trim()
    ? `_or: [
        { name: { _ilike: "%${search.trim()}%" } },
        { code: { _ilike: "%${search.trim()}%" } }
      ]`
    : ''

  return `
    query GetOrganizationalUnits {
      OrganizationalUnit(
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
        code
      }
      OrganizationalUnitAggregate(
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

export interface UseOrganizationalUnitSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onOrganizationalUnitChange?: (orgUnit: OrganizationalUnitOption | null) => void
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialOrganizationalUnit?: OrganizationalUnitOption | null
  autoSelect?: 'current-user'
  // Manual mode props
  organizationalUnits?: OrganizationalUnitOption[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface UseOrganizationalUnitSelectReturn {
  organizationalUnits: OrganizationalUnitOption[]
  loading: boolean
  hasMore: boolean
  onSearch: (q: string) => void
  onLoadMore: () => void
  handleValueChange: (newValue: string | null) => void
  organizationalUnitsWithInitial: OrganizationalUnitOption[]
}

export const useOrganizationalUnitSelect = ({
  value,
  onValueChange,
  onOrganizationalUnitChange,
  businessAppContext,
  accessToken,
  initialOrganizationalUnit,
  autoSelect,
  organizationalUnits: manualOrganizationalUnits,
  onSearch: manualOnSearch,
  loading: manualLoading,
  hasMore: manualHasMore,
  onLoadMore: manualOnLoadMore
}: UseOrganizationalUnitSelectProps): UseOrganizationalUnitSelectReturn => {
  const token = accessToken || businessAppContext?.accessToken || ''
  const graphqlClient = useGraphQLClient(token)

  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnitOption[]>(
    manualOrganizationalUnits || []
  )
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 20

  const autoSelectDone = useRef(false)
  const initialSearchDone = useRef(false)

  // Get current user's organizational unit
  const currentUserOrgUnitId = businessAppContext?.userInfo?.employeeDetails?.organizationalUnit?.id
  const currentUserOrgUnitName = businessAppContext?.userInfo?.employeeDetails?.organizationalUnit?.name
  const shouldAutoSelect = autoSelect === 'current-user' && !initialOrganizationalUnit && currentUserOrgUnitId

  // Determine if we should use manual mode
  const isManualMode = Boolean(manualOrganizationalUnits || manualOnSearch)

  // Create current user org unit option
  const currentUserOrgUnit: OrganizationalUnitOption | null = useMemo(() => {
    if (!currentUserOrgUnitId) return null
    return {
      id: currentUserOrgUnitId,
      name: currentUserOrgUnitName || 'Current Organizational Unit'
    }
  }, [currentUserOrgUnitId, currentUserOrgUnitName])

  // Fetch organizational units
  const fetchOrganizationalUnits = useCallback(
    async (search: string = '', resetOffset = true) => {
      if (isManualMode) return

      setLoading(true)
      try {
        const query = GET_ORGANIZATIONAL_UNITS_QUERY(search, limit, resetOffset ? 0 : offset)
        const result = await graphqlClient.request<{
          OrganizationalUnit: Array<{
            id: string
            name: string
            code?: string
          }>
          OrganizationalUnitAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query)

        const units: OrganizationalUnitOption[] = (result.OrganizationalUnit || []).map(unit => ({
          id: unit.id,
          name: unit.name,
          code: unit.code
        }))

        if (resetOffset) {
          setOrganizationalUnits(units)
          setOffset(limit)
        } else {
          setOrganizationalUnits(prev => [...prev, ...units])
          setOffset(prev => prev + limit)
        }

        const count = result.OrganizationalUnitAggregate?.aggregate?.count || 0
        setHasMore((resetOffset ? limit : offset + limit) < count)
      } catch (error) {
        console.error('Error fetching organizational units:', error)
      } finally {
        setLoading(false)
      }
    },
    [graphqlClient, token, isManualMode, offset]
  )

  // Initial load
  useEffect(() => {
    if (!isManualMode && token && !initialSearchDone.current) {
      initialSearchDone.current = true
      fetchOrganizationalUnits('', true)
    }
  }, [isManualMode, token])

  // Auto-select current user's organizational unit
  useEffect(() => {
    if (shouldAutoSelect && !value && !autoSelectDone.current && currentUserOrgUnit && onValueChange) {
      onValueChange(currentUserOrgUnit.id)
      autoSelectDone.current = true
      if (onOrganizationalUnitChange) {
        onOrganizationalUnitChange(currentUserOrgUnit)
      }
    }
  }, [shouldAutoSelect, value, currentUserOrgUnit, onValueChange, onOrganizationalUnitChange])

  // Search handler
  const handleSearch = useCallback(
    (search: string) => {
      setSearchTerm(search)
      if (isManualMode) {
        manualOnSearch?.(search)
      } else {
        fetchOrganizationalUnits(search, true)
      }
    },
    [isManualMode, manualOnSearch, fetchOrganizationalUnits]
  )

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (isManualMode) {
      manualOnLoadMore?.()
    } else {
      fetchOrganizationalUnits(searchTerm, false)
    }
  }, [isManualMode, manualOnLoadMore, fetchOrganizationalUnits, searchTerm])

  // Value change handler
  const handleValueChange = useCallback(
    (newValue: string | null) => {
      onValueChange?.(newValue || null)

      if (newValue && onOrganizationalUnitChange) {
        const unit = organizationalUnits.find(u => u.id === newValue)
        if (unit) {
          onOrganizationalUnitChange(unit)
        } else if (initialOrganizationalUnit && initialOrganizationalUnit.id === newValue) {
          onOrganizationalUnitChange(initialOrganizationalUnit)
        } else if (currentUserOrgUnit && currentUserOrgUnit.id === newValue) {
          onOrganizationalUnitChange(currentUserOrgUnit)
        } else {
          onOrganizationalUnitChange(null)
        }
      } else {
        onOrganizationalUnitChange?.(null)
      }
    },
    [onValueChange, onOrganizationalUnitChange, organizationalUnits, initialOrganizationalUnit, currentUserOrgUnit]
  )

  // Combine initial with fetched units
  const organizationalUnitsWithInitial = useMemo(() => {
    const effectiveInitial = initialOrganizationalUnit || (shouldAutoSelect ? currentUserOrgUnit : null)
    if (!effectiveInitial) return organizationalUnits

    const hasInitial = organizationalUnits.some(u => u.id === effectiveInitial.id)
    if (hasInitial) return organizationalUnits

    return [effectiveInitial, ...organizationalUnits]
  }, [organizationalUnits, initialOrganizationalUnit, currentUserOrgUnit, shouldAutoSelect])

  return {
    organizationalUnits: isManualMode ? manualOrganizationalUnits || [] : organizationalUnits,
    loading: isManualMode ? Boolean(manualLoading) : loading,
    hasMore: isManualMode ? Boolean(manualHasMore) : hasMore,
    onSearch: handleSearch,
    onLoadMore: handleLoadMore,
    handleValueChange,
    organizationalUnitsWithInitial
  }
}
