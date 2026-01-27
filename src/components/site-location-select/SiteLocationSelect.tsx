import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { Combobox, Alert, AlertDescription, Avatar, AvatarFallback } from '@newwork/nw-design-system'
import { MapPin } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface SiteLocation {
  id: string
  name: string
  code?: string
}

interface SiteLocationSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onChange?: (siteLocation: SiteLocation | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  dataTestId?: string
  error?: string | null
  businessAppContext?: BusinessAppContextProps
  disabled?: boolean
}

const SITE_LOCATIONS_QUERY = `
  query SiteLocations($search: String, $limit: Int, $offset: Int) {
    SiteLocation(where: { name: { _ilike: $search } }, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      id
      name
      code
    }
  }
`

const SiteLocationSelect = React.forwardRef<HTMLButtonElement, SiteLocationSelectProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      placeholder = 'Search Site Location...',
      searchPlaceholder = 'Type to search...',
      className,
      dataTestId = 'site-location-select',
      error,
      businessAppContext,
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const accessToken = businessAppContext?.accessToken || ''
    const graphQLClient = useGraphQLClient(accessToken)

    const [siteLocations, setSiteLocations] = useState<SiteLocation[]>([])
    const [loading, setLoading] = useState(false)
    const [queryError, setQueryError] = useState<string | null>(null)

    const fetchSiteLocations = useCallback(
      async (search?: string) => {
        if (!accessToken) return

        setLoading(true)
        setQueryError(null)

        try {
          const searchPattern = search ? `%${search}%` : '%'
          const response = await graphQLClient.request<{ SiteLocation: SiteLocation[] }>(SITE_LOCATIONS_QUERY, {
            search: searchPattern,
            limit: 20,
            offset: 0
          })

          setSiteLocations(response.SiteLocation || [])
        } catch (err) {
          console.error('Error fetching site locations:', err)
          setQueryError(err instanceof Error ? err.message : 'Failed to load site locations')
        } finally {
          setLoading(false)
        }
      },
      [accessToken, graphQLClient]
    )

    // Initial load
    useEffect(() => {
      if (accessToken) {
        fetchSiteLocations()
      }
    }, [accessToken, fetchSiteLocations])

    // Search function
    const searchSiteLocations = useCallback(
      (searchTerm: string) => {
        fetchSiteLocations(searchTerm)
      },
      [fetchSiteLocations]
    )

    // Handle value change
    const handleValueChange = useCallback(
      (newValue: string | null) => {
        if (onValueChange) {
          onValueChange(newValue)
        }

        if (onChange) {
          if (!newValue) {
            onChange(null)
            return
          }

          const selectedSiteLocation = siteLocations.find(s => s.id === newValue)
          if (selectedSiteLocation) {
            onChange(selectedSiteLocation)
          } else {
            onChange(null)
          }
        }
      },
      [onValueChange, onChange, siteLocations]
    )

    // Build options
    const options = useMemo(() => {
      return siteLocations.map(siteLocation => {
        return {
          value: siteLocation.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full gba:min-w-0">
              <Avatar className="gba:self-center gba:flex-shrink-0" size="sm">
                <AvatarFallback className="gba:text-xs">
                  <MapPin className="gba:w-4 gba:h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1 gba:overflow-hidden">
                <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{siteLocation.name || ''}</div>
                {siteLocation.code && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-left gba:min-w-0">
                    <span className="gba:text-muted-foreground gba:truncate gba:shrink-0">{siteLocation.code}</span>
                  </div>
                )}
              </div>
            </div>
          )
        }
      })
    }, [siteLocations])

    return (
      <div className="gba:space-y-2 gba:w-full gba:max-w-full gba:min-w-0" data-testid={dataTestId}>
        <Combobox
          ref={ref as any}
          className={`gba:[&&]:h-auto gba:w-full gba:max-w-full gba:min-w-0 ${className || ''}`}
          options={options as any}
          value={value || ''}
          onValueChange={handleValueChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={loading ? 'Loading...' : 'No site locations found'}
          onSearch={searchSiteLocations}
          searchDebounce={300}
          loading={Boolean(loading)}
          disabled={disabled || !accessToken}
          data-testid={dataTestId}
          align="start"
          {...rest}
        />

        {/* Error Display */}
        {(error || queryError) && (
          <Alert variant="destructive">
            <AlertDescription>{error || queryError}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }
)

SiteLocationSelect.displayName = 'SiteLocationSelect'

export default SiteLocationSelect
export type { SiteLocationSelectProps, SiteLocation }
