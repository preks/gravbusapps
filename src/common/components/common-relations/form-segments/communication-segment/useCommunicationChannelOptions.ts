import React from 'react'
import { useLocale } from '@newwork/nw-design-system'
import { COMMUNICATION_CHANNEL } from '@/common/constants/commonCatalogs'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

export type CommunicationChannelOption = {
  value: string
  label: string
  iconName?: string
}

const getLocalizedLabel = (entry: CatalogEntry, locale?: string): string => {
  const translatedValue = locale
    ? entry.translations?.find(translation => translation.localeCode === locale)?.value
    : ''
  if (translatedValue?.trim()) return translatedValue
  return entry.value || entry.displayValue || entry.code || entry.id
}

/**
 * Loads CommunicationChannel catalog entries once per segment (shared across all channel rows).
 */
export const useCommunicationChannelOptions = (accessToken?: string) => {
  const { locale } = useLocale()
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: accessToken || '' })
  const fetchCatalogEntriesRef = React.useRef(fetchCatalogEntriesByIdentifier)
  fetchCatalogEntriesRef.current = fetchCatalogEntriesByIdentifier

  const [options, setOptions] = React.useState<CommunicationChannelOption[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!accessToken) {
      setOptions([])
      setLoading(false)
      return
    }

    let isMounted = true
    const [catalogIdentifier, version = 'v1'] = COMMUNICATION_CHANNEL.split(':')

    const loadCommunicationChannels = async () => {
      setLoading(true)
      try {
        const { entries } = await fetchCatalogEntriesRef.current(catalogIdentifier, {
          version,
          limit: 100,
          orderBy: [
            { field: 'displayOrder', direction: 'ASC_NULLS_LAST' },
            { field: 'value', direction: 'ASC' }
          ]
        })

        if (!isMounted) return

        setOptions(
          entries.map(entry => ({
            value: entry.id,
            label: getLocalizedLabel(entry, locale),
            iconName: entry.additionalValue3?.trim() || undefined
          }))
        )
      } catch (error) {
        console.error(
          'Failed to load communication channels:',
          error instanceof Error ? error.message : 'Unknown error'
        )
        if (isMounted) setOptions([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadCommunicationChannels()

    return () => {
      isMounted = false
    }
  }, [accessToken, locale])

  return { options, loading }
}
