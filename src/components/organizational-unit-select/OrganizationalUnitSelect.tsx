import React from 'react'
import { Combobox } from '@newwork/nw-design-system'
import { Building2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useOrganizationalUnitSelect, type OrganizationalUnitOption } from './useOrganizationalUnitSelect'

export interface OrganizationalUnitSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onOrganizationalUnitChange?: (orgUnit: OrganizationalUnitOption | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string

  // Context
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialOrganizationalUnit?: OrganizationalUnitOption | null
  autoSelect?: 'current-user'

  // Manual mode (for backward compatibility)
  organizationalUnits?: OrganizationalUnitOption[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

const OrganizationalUnitSelect = React.forwardRef<HTMLButtonElement, OrganizationalUnitSelectProps>(
  (
    {
      value,
      onValueChange,
      onOrganizationalUnitChange,
      placeholder = 'Search Organizational Unit...',
      searchPlaceholder = 'Type to search...',
      className,
      'data-testid': dataTestId = 'organizational-unit-select',
      businessAppContext,
      accessToken,
      initialOrganizationalUnit,
      autoSelect,
      organizationalUnits: manualOrganizationalUnits,
      onSearch: manualOnSearch,
      loading: manualLoading,
      hasMore: manualHasMore,
      onLoadMore: manualOnLoadMore,
      ...rest
    },
    ref
  ) => {
    const { organizationalUnitsWithInitial, loading, hasMore, onSearch, onLoadMore, handleValueChange } =
      useOrganizationalUnitSelect({
        value,
        onValueChange,
        onOrganizationalUnitChange,
        businessAppContext,
        accessToken,
        initialOrganizationalUnit,
        autoSelect,
        organizationalUnits: manualOrganizationalUnits,
        onSearch: manualOnSearch,
        loading: manualLoading,
        hasMore: manualHasMore,
        onLoadMore: manualOnLoadMore
      })

    // Build options
    const options = React.useMemo(() => {
      return organizationalUnitsWithInitial.map(unit => ({
        value: unit.id,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
            <Building2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
              <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{unit.name}</div>
              {unit.code && (
                <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:text-left">{unit.code}</div>
              )}
            </div>
          </div>
        )
      }))
    }, [organizationalUnitsWithInitial])

    return (
      <Combobox
        ref={ref as any}
        className={`gba:[&&]:h-auto ${className || ''}`}
        options={options as any}
        value={value || ''}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={loading ? 'Loading...' : 'No organizational units found'}
        onSearch={onSearch}
        searchDebounce={300}
        loading={Boolean(loading)}
        onLoadMore={onLoadMore}
        hasMore={Boolean(hasMore)}
        data-testid={dataTestId}
        align="start"
        {...rest}
      />
    )
  }
)

OrganizationalUnitSelect.displayName = 'OrganizationalUnitSelect'

export default OrganizationalUnitSelect
