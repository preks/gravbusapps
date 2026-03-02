import { useState, useCallback, useEffect } from 'react'
import { fetchOrgUnitById, OrganizationalUnitItem } from '../../job-position/queries/OrganizationalUnitQueries'
import { SelectOption } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface UseOrgUnitByIdProps {
  accessToken: string
  orgUnitId: string | undefined
  structureId?: string
}

export interface UseOrgUnitByIdReturn {
  orgUnit: SelectOption | null
  orgUnitRaw: OrganizationalUnitItem | null
  loading: boolean
  error: string | null
}

/**
 * Fetches a single organizational unit by id. Used to ensure the target org unit
 * is available for display (e.g. when preselecting from process payload).
 */
export const useOrgUnitById = ({ accessToken, orgUnitId, structureId }: UseOrgUnitByIdProps): UseOrgUnitByIdReturn => {
  const client = useGraphqlClient(accessToken)
  const [orgUnitRaw, setOrgUnitRaw] = useState<OrganizationalUnitItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orgUnit: SelectOption | null =
    orgUnitRaw != null
      ? { id: orgUnitRaw.id, name: orgUnitRaw.name, label: orgUnitRaw.name, value: orgUnitRaw.id }
      : null

  const fetch = useCallback(async () => {
    if (!orgUnitId || !accessToken || !client) {
      setOrgUnitRaw(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchOrgUnitById(client, { id: orgUnitId, structureId })
      const unit = data.OrganizationalUnit?.[0] ?? null
      setOrgUnitRaw(unit)
    } catch (err: any) {
      console.error('Error fetching org unit by id:', err)
      setError(err.message || 'Failed to load organizational unit')
      setOrgUnitRaw(null)
    } finally {
      setLoading(false)
    }
  }, [client, accessToken, orgUnitId, structureId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { orgUnit, orgUnitRaw, loading, error }
}
