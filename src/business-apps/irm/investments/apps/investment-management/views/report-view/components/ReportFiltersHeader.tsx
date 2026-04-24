import React, { useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Label, DateInput, Combobox, Button } from '@newwork/nw-design-system'
import { FunnelIcon, XIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import type { UseReportFiltersReturn } from '../hooks'

export interface ReportFiltersHeaderProps extends BusinessAppContextProps {
  /**
   * Shared filter state. Provides the start/end dates and the change handlers
   * for them. Currency state is owned by the parent (it differs between the
   * portfolio view's per-tab map and the record view's single scope).
   */
  reportFilters: UseReportFiltersReturn
  /** Currently selected currency IDs. */
  selectedCurrencies: string[]
  /** Notifies parent of currency selection changes. */
  onCurrenciesChange: (currencies: string[]) => void
  /**
   * Optional override for the "Clear filters" button. Defaults to clearing the
   * date range and currency selection.
   */
  onClearFilters?: () => void
  'data-testid'?: string
}

/**
 * Shared filters header for investment report surfaces.
 *
 * Renders the Date Range + Currency filter card used at the top of the
 * portfolio investment report view AND the investment record's reports tab.
 * Owning this in one place keeps both surfaces visually and behaviorally
 * identical.
 *
 * Currency state is *not* owned by this component because the two consumers
 * model it differently (portfolio: per-tab map; record: single scope).
 */
export const ReportFiltersHeader: React.FC<ReportFiltersHeaderProps> = ({
  reportFilters,
  selectedCurrencies,
  onCurrenciesChange,
  onClearFilters,
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'report-filters-card'
}) => {
  // Available currency options for the InvestmentReport entity.
  const { currencies: currencyOptions } = useAvailableCurrencies(
    { accessToken, userInfo },
    {
      filters: { entity: 'InvestmentReport' as any },
      returnFormat: 'full'
    }
  )

  const dateRangeValue = useMemo((): [string | null, string | null] | null => {
    if (!reportFilters.startDate && !reportFilters.endDate) {
      return null
    }
    return [
      reportFilters.startDate ? reportFilters.startDate.format('YYYY-MM-DD') : null,
      reportFilters.endDate ? reportFilters.endDate.format('YYYY-MM-DD') : null
    ]
  }, [reportFilters.startDate, reportFilters.endDate])

  const handleDateRangeChange = useCallback(
    (value: string | [string | null, string | null] | null) => {
      if (!value) {
        reportFilters.handleStartDateChange(null)
        reportFilters.handleEndDateChange(null)
      } else if (Array.isArray(value)) {
        const startDate = value[0] ? dayjs(value[0]) : null
        const endDate = value[1] ? dayjs(value[1]) : null
        reportFilters.handleStartDateChange(startDate)
        reportFilters.handleEndDateChange(endDate)
      }
    },
    [reportFilters]
  )

  const currencyComboboxOptions = useMemo(() => {
    if (!Array.isArray(currencyOptions)) return []
    return currencyOptions
      .filter((currency): currency is { id: string; code: string; value: string } => typeof currency !== 'string')
      .map(currency => ({
        value: currency.id,
        label: currency.code || currency.value || currency.id
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [currencyOptions])

  const handleClearFilters = useCallback(() => {
    if (onClearFilters) {
      onClearFilters()
      return
    }
    reportFilters.handleStartDateChange(null)
    reportFilters.handleEndDateChange(null)
    onCurrenciesChange([])
  }, [onClearFilters, reportFilters, onCurrenciesChange])

  return (
    <Card className="gba:mb-6" data-testid={dataTestId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <FunnelIcon className="gba:w-5 gba:h-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <div className="gba:border-t gba:border-border" />
      <CardContent>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Date Range:</Label>
              <DateInput
                type="date"
                mode="range"
                value={dateRangeValue}
                onChange={handleDateRangeChange}
                placeholder="Start date"
                placeholderEnd="End date"
                showClearButton
                className="gba:w-[300px]"
                data-testid="report-date-range-filter"
              />
            </div>

            {currencyComboboxOptions.length > 0 && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
                <Combobox
                  mode="multiple"
                  value={selectedCurrencies}
                  onValueChange={onCurrenciesChange}
                  options={currencyComboboxOptions}
                  placeholder="All currencies"
                  searchPlaceholder="Search currencies..."
                  emptyText="No currencies found"
                  className="gba:w-[200px]"
                  data-testid="report-currency-filter"
                  allowClear
                />
              </div>
            )}
          </div>

          <Button onClick={handleClearFilters} variant="outline" size="sm" data-testid="report-clear-filters">
            <XIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ReportFiltersHeader
