import { useState, useCallback, useEffect } from 'react'
import {
  fetchOrganizationalUnitData,
  OrganizationalUnitItem,
  QueryVariablesOrganizationalUnit
} from '../queries/OrganizationalUnitQueries'
import { SelectOption } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

const UNITS_PER_PAGE = 20

export interface UseOrganizationalUnitsProps {
  accessToken: string
  structureId: string
  search?: string
}

export interface UseOrganizationalUnitsReturn {
  organizationalUnits: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  loadMore: () => void
  retry: () => void
}

const convertToSelectOption = (unit: OrganizationalUnitItem): SelectOption => ({
  id: unit.id,
  name: unit.name,
  label: unit.name,
  value: unit.id
})

export const useOrganizationalUnits = ({
  accessToken,
  structureId,
  search
}: UseOrganizationalUnitsProps): UseOrganizationalUnitsReturn => {
  const client = useGraphqlClient(accessToken)
  const [organizationalUnits, setOrganizationalUnits] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [fetchVersion, setFetchVersion] = useState(0)

  useEffect(() => {
    if (!accessToken || !client || !structureId) {
      return
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const variables: QueryVariablesOrganizationalUnit = {
          structureId,
          offset: 0,
          limit: UNITS_PER_PAGE,
          search
        }
        const data = await fetchOrganizationalUnitData(client, variables)
        if (cancelled) {
          return
        }
        const newUnits = data.OrganizationalUnit || []
        const newSelectOptions = newUnits.map(convertToSelectOption)
        const count = data.OrganizationalUnitAggregate.aggregate.count
        setOrganizationalUnits(newSelectOptions)
        setTotal(count)
        const nextOffset = newUnits.length
        setOffset(nextOffset)
        setHasMore(nextOffset < count && newUnits.length === UNITS_PER_PAGE)
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load organizational units'
          console.error('Error loading organizational units:', err)
          setError(message)
          setHasMore(false)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [accessToken, client, structureId, search, fetchVersion])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !client || !structureId) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const variables: QueryVariablesOrganizationalUnit = {
        structureId,
        offset,
        limit: UNITS_PER_PAGE,
        search
      }
      const data = await fetchOrganizationalUnitData(client, variables)
      const newUnits = data.OrganizationalUnit || []
      const newSelectOptions = newUnits.map(convertToSelectOption)
      setOrganizationalUnits(prev => [...prev, ...newSelectOptions])
      const nextOffset = offset + newUnits.length
      setOffset(nextOffset)
      setHasMore(nextOffset < total && newUnits.length === UNITS_PER_PAGE)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load organizational units'
      console.error('Error loading organizational units:', err)
      setError(message)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, accessToken, client, structureId, search, offset, total])

  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    setOffset(0)
    setFetchVersion(v => v + 1)
  }, [])

  return {
    organizationalUnits,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    retry
  }
}
