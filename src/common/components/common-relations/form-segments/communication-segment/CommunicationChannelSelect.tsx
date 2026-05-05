import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useLocale } from '@newwork/nw-design-system'
import { COMMUNICATION_CHANNEL } from '@/common/constants/commonCatalogs'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import { getPhosphorIcon } from '@/common/utils/phosphorIconUtils'

type CommunicationChannelOption = {
  value: string
  label: string
  icon?: string
}

interface CommunicationChannelSelectProps {
  accessToken?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  'data-testid'?: string
}

const getLocalizedLabel = (entry: CatalogEntry, locale?: string): string => {
  const translatedValue = locale
    ? entry.translations?.find(translation => translation.localeCode === locale)?.value
    : ''
  if (translatedValue?.trim()) return translatedValue
  return entry.value || entry.displayValue || entry.code || entry.id
}

const getFallbackLabel = (value: string): string => {
  const code = value.split(':').pop() || value
  return code
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(segment => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ')
}

const CommunicationChannelLabel: React.FC<{ label: string; icon?: string }> = ({ label, icon }) => {
  const IconComponent = icon ? getPhosphorIcon(icon) : null

  return (
    <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      {IconComponent ? <IconComponent className="gba:h-4 gba:w-4 gba:flex-none" aria-hidden="true" /> : null}
      <span className="gba:min-w-0 gba:flex-1 gba:truncate">{label}</span>
    </span>
  )
}

const CommunicationChannelSelect: React.FC<CommunicationChannelSelectProps> = ({
  accessToken,
  value,
  onValueChange,
  disabled = false,
  invalid = false,
  describedBy,
  'data-testid': dataTestId
}) => {
  const { locale } = useLocale()
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: accessToken || '' })
  const [options, setOptions] = React.useState<CommunicationChannelOption[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!accessToken) {
      setOptions([])
      return
    }

    let isMounted = true
    const [catalogIdentifier, version = 'v1'] = COMMUNICATION_CHANNEL.split(':')

    const loadCommunicationChannels = async () => {
      setLoading(true)
      try {
        const { entries } = await fetchCatalogEntriesByIdentifier(catalogIdentifier, {
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
            icon: entry.additionalValue3 || undefined
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
  }, [accessToken, fetchCatalogEntriesByIdentifier, locale])

  const selectedOption = options.find(option => option.value === value)
  const selectedLabel = selectedOption?.label || (value ? getFallbackLabel(value) : '')

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || loading || !accessToken}
      showClearButton={false}
    >
      <SelectTrigger
        className="gba:h-full gba:w-44 gba:rounded-none gba:border-0 gba:bg-transparent gba:shadow-none focus:gba:ring-0 focus-visible:gba:ring-0"
        data-testid={dataTestId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={loading ? 'Loading...' : 'Select...'} className="gba:min-w-0 gba:flex-1">
          {selectedLabel ? (
            <CommunicationChannelLabel label={selectedLabel} icon={selectedOption?.icon} />
          ) : (
            <span className="gba:text-muted-foreground">Select...</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="gba:w-56 gba:max-w-56 gba:overflow-y-auto">
        {options.map(option => (
          <SelectItem
            key={option.value}
            value={option.value}
            data-testid={dataTestId ? `${dataTestId}-item-${option.value}` : undefined}
            title={option.label}
          >
            <CommunicationChannelLabel label={option.label} icon={option.icon} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default CommunicationChannelSelect
