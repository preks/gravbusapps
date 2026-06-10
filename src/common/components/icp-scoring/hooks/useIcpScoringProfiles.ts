import { useEffect, useState } from 'react'
import { IDEAL_CUSTOMER_PROFILES_CATALOG } from '@/common/data/customer/constants/customerCatalogs'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'

export interface IcpScoringProfileOption {
  id: string
  label: string
}

export function useIcpScoringProfiles(accessToken: string, loadErrorMessage: string) {
  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })
  const [profileOptions, setProfileOptions] = useState<IcpScoringProfileOption[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profilesError, setProfilesError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken.trim()) {
      setProfileOptions([])
      return
    }

    let cancelled = false

    const loadProfiles = async () => {
      try {
        setProfilesLoading(true)
        setProfilesError(null)
        const response = await fetchCatalogEntries({
          catalogIdentifier: IDEAL_CUSTOMER_PROFILES_CATALOG,
          version: 'v1',
          limit: 200,
          offset: 0
        })

        if (cancelled) {
          return
        }

        setProfileOptions(
          response.entries.map(entry => ({
            id: entry.id,
            label: (entry.value && String(entry.value).trim()) || entry.displayValue || entry.code || entry.id
          }))
        )
      } catch {
        if (!cancelled) {
          setProfilesError(loadErrorMessage)
        }
      } finally {
        if (!cancelled) {
          setProfilesLoading(false)
        }
      }
    }

    loadProfiles().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [accessToken, fetchCatalogEntries, loadErrorMessage])

  return {
    profileOptions,
    profilesLoading,
    profilesError
  }
}
