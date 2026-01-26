import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { Combobox, Alert, AlertDescription, Avatar, AvatarFallback } from '@newwork/nw-design-system'
import { CurrencyDollar } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface CostCenter {
  id: string
  name: string
  code?: string
  description?: string
}

interface CostCenterSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onChange?: (costCenter: CostCenter | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  dataTestId?: string
  error?: string | null
  businessAppContext?: BusinessAppContextProps
  disabled?: boolean
}

const COST_CENTERS_QUERY = `
  query CostCenters($search: String, $limit: Int, $offset: Int) {
    CostCenter(where: { name: { _ilike: $search } }, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      id
      name
      code
      description
    }
  }
`

const CostCenterSelect = React.forwardRef<HTMLButtonElement, CostCenterSelectProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      placeholder = 'Search Cost Center...',
      searchPlaceholder = 'Type to search...',
      className,
      dataTestId = 'cost-center-select',
      error,
      businessAppContext,
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const accessToken = businessAppContext?.accessToken || ''
    const graphQLClient = useGraphQLClient(accessToken)

    const [costCenters, setCostCenters] = useState<CostCenter[]>([])
    const [loading, setLoading] = useState(false)
    const [queryError, setQueryError] = useState<string | null>(null)

    const fetchCostCenters = useCallback(
      async (search?: string) => {
        if (!accessToken) return

        setLoading(true)
        setQueryError(null)

        try {
          const searchPattern = search ? `%${search}%` : '%'
          const response = await graphQLClient.request<{ CostCenter: CostCenter[] }>(COST_CENTERS_QUERY, {
            search: searchPattern,
            limit: 20,
            offset: 0
          })

          setCostCenters(response.CostCenter || [])
        } catch (err) {
          console.error('Error fetching cost centers:', err)
          setQueryError(err instanceof Error ? err.message : 'Failed to load cost centers')
        } finally {
          setLoading(false)
        }
      },
      [accessToken, graphQLClient]
    )

    // Initial load
    useEffect(() => {
      if (accessToken) {
        fetchCostCenters()
      }
    }, [accessToken, fetchCostCenters])

    // Search function
    const searchCostCenters = useCallback(
      (searchTerm: string) => {
        fetchCostCenters(searchTerm)
      },
      [fetchCostCenters]
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

          const selectedCostCenter = costCenters.find(c => c.id === newValue)
          if (selectedCostCenter) {
            onChange(selectedCostCenter)
          } else {
            onChange(null)
          }
        }
      },
      [onValueChange, onChange, costCenters]
    )

    // Build options
    const options = useMemo(() => {
      return costCenters.map(costCenter => {
        return {
          value: costCenter.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full gba:min-w-0">
              <Avatar className="gba:self-center gba:flex-shrink-0" size="sm">
                <AvatarFallback className="gba:text-xs">
                  <CurrencyDollar className="gba:w-4 gba:h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1 gba:overflow-hidden">
                <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{costCenter.name || ''}</div>
                {(costCenter.code || costCenter.description) && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-left gba:min-w-0">
                    {costCenter.code && (
                      <span className="gba:text-muted-foreground gba:truncate gba:shrink-0">{costCenter.code}</span>
                    )}
                    {costCenter.code && costCenter.description && (
                      <span className="gba:text-muted-foreground gba:shrink-0">·</span>
                    )}
                    {costCenter.description && (
                      <span className="gba:text-muted-foreground gba:truncate gba:min-w-0">
                        {costCenter.description}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }
      })
    }, [costCenters])

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
          emptyText={loading ? 'Loading...' : 'No cost centers found'}
          onSearch={searchCostCenters}
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

CostCenterSelect.displayName = 'CostCenterSelect'

export default CostCenterSelect
export type { CostCenterSelectProps, CostCenter }
