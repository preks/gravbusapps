'use client'

import { useEffect, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { CatalogEntry, GetCatalogEntriesParams, GetCatalogsParams } from '@/common/types/CatalogTypes'

export type AbsenceGroup = CatalogEntry

const useAbsenceGroups = (accessToken: string) => {
  const client = useCatalogManagerClient(accessToken)
  const [groups, setGroups] = useState<AbsenceGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!accessToken || !client) {
      setGroups([])
      setLoading(false)
      return
    }

    const fetchAbsenceGroups = async () => {
      setLoading(true)
      setError(null)

      try {
        const pathParams: GetCatalogEntriesParams = {
          catalogIdentifier: 'AbsenceGroup',
          version: 'v1'
        }
        const queryParams: GetCatalogsParams = {
          includeLocalizedVersions: true,
          localeCode: 'en-US',
          limit: 200,
          offset: 0
        }

        const response = await client.getCatalogEntriesList(pathParams, queryParams)
        setGroups((response?.data as AbsenceGroup[]) || [])
      } catch (err) {
        const resolvedError = err instanceof Error ? err : new Error('Failed to fetch absence groups')
        console.error('[useAbsenceGroups] Failed to fetch absence groups:', resolvedError.message)
        setError(resolvedError)
        setGroups([])
        toast.error(resolvedError.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAbsenceGroups()
  }, [accessToken, client])

  return {
    groups,
    loading,
    error
  }
}

export default useAbsenceGroups
