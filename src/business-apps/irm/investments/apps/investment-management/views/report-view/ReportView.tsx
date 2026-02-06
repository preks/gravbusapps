import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  DateInput,
  Combobox,
  Button
} from '@newwork/nw-design-system'
import { TrendUpIcon, BuildingsIcon, ChartPieIcon, FunnelIcon, XIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { LiquidFundReport } from './tabs/liquid-fund-report-tab/LiquidFundReport'
import { RealEstateReport } from './tabs/real-estate-report-tab/RealEstateReport'
import { EquityReport } from './tabs/equity-report-tab/EquityReport'
import { useReportFilters } from './hooks'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useGetInvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import dayjs from 'dayjs'

export interface ReportViewProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const ReportView: React.FC<ReportViewProps> = ({
  accessToken,
  userInfo,
  initialSubTab = 'liquid-fund',
  onSubTabChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab)

  // Shared filter state for all tabs (date range is shared)
  const reportFilters = useReportFilters()

  // Tab-specific currency filters
  const [liquidFundCurrencies, setLiquidFundCurrencies] = useState<string[]>([])
  const [realEstateCurrencies, setRealEstateCurrencies] = useState<string[]>([])
  const [equityCurrencies, setEquityCurrencies] = useState<string[]>([])

  // Fetch investment catalog data ONCE for all tabs (shared across Equity, Real Estate, Liquid Fund)
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData({ accessToken, userInfo })
  const [catalogData, setCatalogData] = useState<any>(null)

  useEffect(() => {
    const loadCatalogData = async () => {
      if (!accessToken) return

      try {
        const data = await fetchInvestmentCatalogData()
        setCatalogData(data)
      } catch (error) {
        console.error('Error loading investment catalog data:', error)
      }
    }

    loadCatalogData()
  }, [accessToken, fetchInvestmentCatalogData])

  // Fetch available currencies ONCE using the same hook as Investment tab
  const { currencies: currencyOptions } = useAvailableCurrencies(
    { accessToken, userInfo },
    {
      filters: { entity: 'InvestmentReport' as any },
      returnFormat: 'full'
    }
  )

  // Callback for report tabs to report their available currencies (kept for compatibility but not used anymore)
  const handleCurrenciesUpdate = useCallback(() => {
    // No-op: currencies are now fetched once at parent level
  }, [])

  // Date range state for DateInput - expects [string | null, string | null] | null
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

  // Get current tab's currency state
  const selectedCurrencies = useMemo(() => {
    switch (activeSubTab) {
      case 'liquid-fund':
        return liquidFundCurrencies
      case 'real-estate':
        return realEstateCurrencies
      case 'equity':
        return equityCurrencies
      default:
        return []
    }
  }, [activeSubTab, liquidFundCurrencies, realEstateCurrencies, equityCurrencies])

  // Transform currency options from hook to combobox format
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

  const handleCurrencyChange = useCallback(
    (currencies: string[]) => {
      // Update only the current tab's currency filter
      switch (activeSubTab) {
        case 'liquid-fund':
          setLiquidFundCurrencies(currencies)
          break
        case 'real-estate':
          setRealEstateCurrencies(currencies)
          break
        case 'equity':
          setEquityCurrencies(currencies)
          break
      }
    },
    [activeSubTab]
  )

  // Clear all filters handler - only clears current tab's currency filter
  const handleClearFilters = useCallback(() => {
    reportFilters.handleStartDateChange(null)
    reportFilters.handleEndDateChange(null)
    // Clear only current tab's currency filter
    switch (activeSubTab) {
      case 'liquid-fund':
        setLiquidFundCurrencies([])
        break
      case 'real-estate':
        setRealEstateCurrencies([])
        break
      case 'equity':
        setEquityCurrencies([])
        break
    }
  }, [reportFilters, activeSubTab])

  // Update URL when tab changes using safe navigation
  useEffect(() => {
    const updateURL = () => {
      try {
        const currentUrl = new URL(window.location.href)
        const params: Record<string, string> = {}

        // Preserve existing query parameters
        currentUrl.searchParams.forEach((value, key) => {
          params[key] = value
        })

        // Update the analytics sub view parameter
        params.analyticsSubView = activeSubTab

        // Use platform URL builder for safe navigation
        const newUrl = buildPlatformUrl(currentUrl.pathname, params)

        // Use safe history manipulation
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', newUrl)
        }
      } catch (error) {
        console.warn('Failed to update URL:', error)
        // Fallback: just update the state without URL manipulation
      }
    }

    updateURL()

    // Notify parent component of tab change
    if (onSubTabChange) {
      onSubTabChange(activeSubTab)
    }
  }, [activeSubTab, onSubTabChange])

  const handleTabChange = (tabValue: string) => {
    setActiveSubTab(tabValue)
  }

  // Create tab-specific filter objects with their own currency states
  const liquidFundFilters = useMemo(
    () => ({
      ...reportFilters,
      selectedCurrencies: liquidFundCurrencies,
      computedFilters: {
        ...reportFilters.computedFilters,
        currencyIds: liquidFundCurrencies
      },
      handleCurrencyChange: setLiquidFundCurrencies
    }),
    [reportFilters, liquidFundCurrencies]
  )

  const realEstateFilters = useMemo(
    () => ({
      ...reportFilters,
      selectedCurrencies: realEstateCurrencies,
      computedFilters: {
        ...reportFilters.computedFilters,
        currencyIds: realEstateCurrencies
      },
      handleCurrencyChange: setRealEstateCurrencies
    }),
    [reportFilters, realEstateCurrencies]
  )

  const equityFilters = useMemo(
    () => ({
      ...reportFilters,
      selectedCurrencies: equityCurrencies,
      computedFilters: {
        ...reportFilters.computedFilters,
        currencyIds: equityCurrencies
      },
      handleCurrencyChange: setEquityCurrencies
    }),
    [reportFilters, equityCurrencies]
  )

  return (
    <div data-testid="analytics-container" className="gba:h-full gba:flex gba:flex-col">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:mb-4">
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Analytics</h1>
          <p className="gba:text-gray-600">Analyze investment performance and portfolio metrics</p>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="gba:mb-6" data-testid="report-filters-card">
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
              {/* Date Range Filter */}
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

              {/* Currency Filter */}
              {currencyComboboxOptions.length > 0 && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
                  <Combobox
                    mode="multiple"
                    value={selectedCurrencies}
                    onValueChange={handleCurrencyChange}
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

            {/* Clear Filters Button */}
            <Button onClick={handleClearFilters} variant="outline" size="sm" data-testid="report-clear-filters">
              <XIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="gba:h-full gba:flex gba:flex-col">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-4">
          <TabsTrigger value="liquid-fund" startIcon={<TrendUpIcon />} data-testid="liquid-fund-analytics-tab">
            Liquid Fund
          </TabsTrigger>
          <TabsTrigger value="real-estate" startIcon={<BuildingsIcon />} data-testid="real-estate-analytics-tab">
            Real Estate
          </TabsTrigger>
          <TabsTrigger value="equity" startIcon={<ChartPieIcon />} data-testid="equity-analytics-tab">
            Equity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liquid-fund" className="gba:flex-1 gba:overflow-auto gba:mt-0">
          <LiquidFundReport
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid="liquid-fund-analytics"
            reportFilters={liquidFundFilters}
            onCurrenciesUpdate={handleCurrenciesUpdate}
            catalogData={catalogData}
            enabled={activeSubTab === 'liquid-fund'}
          />
        </TabsContent>

        <TabsContent value="real-estate" className="gba:flex-1 gba:overflow-auto gba:mt-0">
          <RealEstateReport
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid="real-estate-analytics"
            reportFilters={realEstateFilters}
            onCurrenciesUpdate={handleCurrenciesUpdate}
            catalogData={catalogData}
            enabled={activeSubTab === 'real-estate'}
          />
        </TabsContent>

        <TabsContent value="equity" className="gba:flex-1 gba:overflow-auto gba:mt-0">
          <EquityReport
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid="equity-analytics"
            reportFilters={equityFilters}
            onCurrenciesUpdate={handleCurrenciesUpdate}
            catalogData={catalogData}
            enabled={activeSubTab === 'equity'}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportView
