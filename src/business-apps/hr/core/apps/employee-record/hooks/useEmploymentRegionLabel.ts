import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { GET_CATALOG_ENTRY_BY_ID } from '../queries/queries'

interface CatalogEntryResult {
  id: string
  value: string
  additionalValue3?: string | null
  translations?: Array<{ value: string }>
}

/**
 * Employment region label for the Working Conditions card. Returns the label only when
 * the region is linked to the employee's address country; otherwise '' (card shows "-").
 */
export function useEmploymentRegionLabel(
  accessToken: string,
  regionRef: string | undefined,
  addressCountryId: string | undefined
): string {
  const [label, setLabel] = useState('')
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!regionRef?.trim() || !addressCountryId?.trim()) {
      setLabel('')
      return
    }
    let cancelled = false
    const locale = getCurrentActiveUserLocale() || 'en-US'
    graphqlClient
      .request<{ CatalogEntry: CatalogEntryResult[] }>(GET_CATALOG_ENTRY_BY_ID, {
        entryId: regionRef,
        activeUserLocale: locale
      })
      .then(res => {
        if (cancelled) return
        const entry = res?.CatalogEntry?.[0] ?? (res as any)?.catalogEntry?.[0]
        if (!entry) {
          setLabel('')
          return
        }
        const regionParentCountryId = entry.additionalValue3 ?? null
        const isLinkedToAddressCountry = regionParentCountryId === addressCountryId
        setLabel(isLinkedToAddressCountry ? getCatalogValue(entry) || '' : '')
      })
      .catch(() => {
        if (!cancelled) setLabel('')
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, regionRef, addressCountryId, graphqlClient])

  return label
}
