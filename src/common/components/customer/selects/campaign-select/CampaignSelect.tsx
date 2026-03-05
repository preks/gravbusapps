import React, { useMemo } from 'react'
import { Combobox } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerCampaigns } from '@/common/data/customer/hooks/useCustomerCampaigns'
import { getCatalogEntryField } from '@/common/data/catalog/utils/catalogTranslationUtils'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

export interface CampaignOption {
  id: string
  name: string
  type?: {
    id: string
    value: string
    code: string
    translations?: CatalogEntry['translations']
  }
  typeRef?: string
}

export interface CampaignSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  /** Called with the full campaign object (id + name) when the selection changes */
  onCampaignOptionChange?: (campaign: { id: string; name: string } | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string

  // Required: Business app context for hook
  businessAppContext: BusinessAppContextProps

  // Optional: Pre-selected campaign data (for immediate display)
  selectedCampaign?: CampaignOption | null
}

// Helper function to get empty text based on loading and error state
const getEmptyText = (loading?: boolean, error?: Error | null): string => {
  if (loading) return 'Loading...'
  if (error) return 'Error loading campaigns'
  return 'No campaigns found'
}

const CampaignSelect = React.forwardRef<HTMLButtonElement, CampaignSelectProps & Record<string, any>>(
  (
    {
      value,
      onValueChange,
      onCampaignOptionChange,
      placeholder = 'Search Campaign...',
      searchPlaceholder = 'Type to search...',
      className,
      'data-testid': dataTestId = 'campaign-select',
      businessAppContext,
      selectedCampaign,
      ...rest
    },
    ref
  ) => {
    const {
      options: campaignsOptions,
      loading,
      error,
      hasMore,
      search,
      loadMore
    } = useCustomerCampaigns(businessAppContext.accessToken)

    // Initialize with empty search to load default campaigns on mount
    React.useEffect(() => {
      search('')
    }, [search])

    const handleValueChange = React.useCallback(
      (id: string | null) => {
        onValueChange?.(id)
        if (onCampaignOptionChange) {
          if (!id) {
            onCampaignOptionChange(null)
          } else {
            const match = campaignsOptions.find(c => c.id === id)
            onCampaignOptionChange(match ? { id: match.id, name: match.name } : { id, name: id })
          }
        }
      },
      [onValueChange, onCampaignOptionChange, campaignsOptions]
    )

    // Transform campaigns to Combobox options with type display
    const options: any[] = useMemo(() => {
      return (campaignsOptions || []).map((campaign: any) => {
        const campaignName = campaign.name || campaign.label || 'Unknown Campaign'
        const typeEntry = campaign.type || (selectedCampaign?.id === campaign.id ? selectedCampaign?.type : null)

        // Get translated type value using catalog translation utils
        const typeDisplayValue = typeEntry
          ? getCatalogEntryField(
              {
                id: typeEntry.id,
                value: typeEntry.value,
                code: typeEntry.code,
                translations: typeEntry.translations || []
              } as CatalogEntry,
              'value'
            )
          : null

        return {
          value: campaign.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{campaignName}</div>
                {typeDisplayValue && (
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:text-left">
                    {typeDisplayValue}
                  </div>
                )}
              </div>
            </div>
          )
        } as any
      })
    }, [campaignsOptions, selectedCampaign])

    // Add selected campaign to options if it's not already there and matches current value
    const finalOptions = useMemo(() => {
      if (selectedCampaign && value === selectedCampaign.id) {
        const exists = options.some(opt => opt.value === selectedCampaign.id)
        if (!exists) {
          const typeDisplayValue = selectedCampaign.type
            ? getCatalogEntryField(
                {
                  id: selectedCampaign.type.id,
                  value: selectedCampaign.type.value,
                  code: selectedCampaign.type.code,
                  translations: selectedCampaign.type.translations || []
                } as CatalogEntry,
                'value'
              )
            : null

          return [
            {
              value: selectedCampaign.id,
              label: (
                <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
                  <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                    <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">
                      {selectedCampaign.name}
                    </div>
                    {typeDisplayValue && (
                      <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:text-left">
                        {typeDisplayValue}
                      </div>
                    )}
                  </div>
                </div>
              )
            } as any,
            ...options
          ]
        }
      }
      return options
    }, [options, selectedCampaign, value])

    return (
      <Combobox
        ref={ref as any}
        className={`gba:[&&]:h-auto ${className || ''}`}
        options={finalOptions as any}
        value={value || ''}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={getEmptyText(loading, error)}
        onSearch={search}
        searchDebounce={300}
        loading={Boolean(loading)}
        onLoadMore={loadMore}
        hasMore={Boolean(hasMore)}
        data-testid={dataTestId}
        align="start"
        {...rest}
      />
    )
  }
)

CampaignSelect.displayName = 'CampaignSelect'

export default CampaignSelect
