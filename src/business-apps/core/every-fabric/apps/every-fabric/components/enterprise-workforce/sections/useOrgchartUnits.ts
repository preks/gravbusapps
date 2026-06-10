// Data hooks for the orgchart-registration unit picker.
//
// `useOrgchartUnits` lists selectable organizational units (scoped to the
// active structure, like FlowBot's `_resolve_org_unit`), with search +
// pagination shaped for the design-system `Combobox`. `useOrgchartUnitName`
// resolves a single unit id back to a friendly name for the "registered"
// summary card.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OrgchartUnit {
  id: string
  name: string
  type?: string | null
  companyName?: string | null
  memberCount: number
}

interface UseOrgchartUnitsResult {
  units: OrgchartUnit[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: string
  setSearch: (query: string) => void
  loadMore: () => void
}

const PAGE_SIZE = 20

const ACTIVE_STRUCTURE_QUERY = `
  query ActiveOrgchartStructure {
    Structure(where: { isActive: { _eq: true } }, limit: 1) {
      id
    }
  }
`

const ORG_UNITS_QUERY = `
  query OrgchartUnitsPicker(
    $limit: Int
    $offset: Int
    $where: OrganizationalUnitBoolExp
    $orderBy: [OrganizationalUnitOrderBy!]
  ) {
    OrganizationalUnit(limit: $limit, offset: $offset, where: $where, orderBy: $orderBy) {
      id
      name
      type
      company {
        name
      }
      employeePositionsAggregate {
        aggregate {
          count
        }
      }
    }
    OrganizationalUnitAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

const ORG_UNIT_BY_ID_QUERY = `
  query OrgchartUnitById($id: uuid!) {
    OrganizationalUnit(where: { id: { _eq: $id } }, limit: 1) {
      id
      name
    }
  }
`

interface RawOrgUnit {
  id: string
  name: string
  type?: string | null
  company?: { name?: string | null } | null
  employeePositionsAggregate?: { aggregate?: { count?: number | null } | null } | null
}

function mapUnit(raw: RawOrgUnit): OrgchartUnit {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type ?? null,
    companyName: raw.company?.name ?? null,
    memberCount: raw.employeePositionsAggregate?.aggregate?.count ?? 0
  }
}

function buildWhere(structureId: string | null, search: string): Record<string, unknown> {
  const conditions: Array<Record<string, unknown>> = [{ isDeleted: { _eq: false } }]
  if (structureId) {
    conditions.push({ structureId: { _eq: structureId } })
  }
  const trimmed = search.trim()
  if (trimmed) {
    conditions.push({ name: { _ilike: `%${trimmed}%` } })
  }
  return conditions.length > 1 ? { _and: conditions } : conditions[0]
}

/** List selectable organizational units with search + infinite pagination. */
export function useOrgchartUnits(accessToken: string): UseOrgchartUnitsResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [units, setUnits] = useState<OrgchartUnit[]>([])
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Resolved once; `null` means "could not resolve" so we query unscoped.
  const structureIdRef = useRef<string | null>(null)
  const structureResolvedRef = useRef(false)

  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean, currentSearch: string) => {
      if (!accessToken) return
      setLoading(true)
      setError(null)
      try {
        if (!structureResolvedRef.current) {
          try {
            const structureResult = await graphqlClient.request<{ Structure: Array<{ id: string }> }>(
              ACTIVE_STRUCTURE_QUERY
            )
            structureIdRef.current = structureResult.Structure?.[0]?.id ?? null
          } catch {
            structureIdRef.current = null
          }
          structureResolvedRef.current = true
        }

        const where = buildWhere(structureIdRef.current, currentSearch)
        const result = await graphqlClient.request<{
          OrganizationalUnit: RawOrgUnit[]
          OrganizationalUnitAggregate: { aggregate: { count: number } }
        }>(ORG_UNITS_QUERY, {
          limit: PAGE_SIZE,
          offset: pageOffset,
          where,
          orderBy: [{ name: 'ASC' }]
        })

        const page = (result.OrganizationalUnit || []).map(mapUnit)
        setTotal(result.OrganizationalUnitAggregate?.aggregate?.count ?? 0)
        setUnits(prev => (append ? [...prev, ...page] : page))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organizational units')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    setOffset(0)
    void fetchPage(0, false, search)
  }, [search, fetchPage])

  const loadMore = useCallback(() => {
    if (loading) return
    const nextOffset = offset + PAGE_SIZE
    setOffset(nextOffset)
    void fetchPage(nextOffset, true, search)
  }, [loading, offset, search, fetchPage])

  return {
    units,
    loading,
    error,
    hasMore: units.length < total,
    search,
    setSearch,
    loadMore
  }
}

/** Resolve a single org unit id to its display name (for the registered card). */
export function useOrgchartUnitName(accessToken: string, orgUnitId?: string | null): string | null {
  const graphqlClient = useGraphQLClient(accessToken)
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!accessToken || !orgUnitId) {
      setName(null)
      return
    }
    graphqlClient
      .request<{ OrganizationalUnit: Array<{ id: string; name: string }> }>(ORG_UNIT_BY_ID_QUERY, {
        id: orgUnitId
      })
      .then(result => {
        if (!cancelled) setName(result.OrganizationalUnit?.[0]?.name ?? null)
      })
      .catch(() => {
        if (!cancelled) setName(null)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, orgUnitId, graphqlClient])

  return name
}
