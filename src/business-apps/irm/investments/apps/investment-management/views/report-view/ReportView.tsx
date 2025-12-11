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
import { TrendingUp, Building2, PieChart, Funnel, X } from 'lucide-react'
import { VectorTwoIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { LiquidFundReport } from './tabs/liquid-fund-report-tab/LiquidFundReport'
import { RealEstateReport } from './tabs/real-estate-report-tab/RealEstateReport'
import { EquityReport } from './tabs/equity-report-tab/EquityReport'
import { useReportFilters } from './hooks'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
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

  // Shared filter state for all tabs
  const reportFilters = useReportFilters()

  // Global transpose state for all tabs and sections
  const [isTransposed, setIsTransposed] = useState(false)

  // Track available currencies from all report tabs
  const [availableCurrencies, setAvailableCurrencies] = useState<Set<string>>(new Set())

  // Callback for report tabs to report their available currencies
  const handleCurrenciesUpdate = useCallback((currencies: string[]) => {
    setAvailableCurrencies(prev => {
      const updated = new Set(prev)
      currencies.forEach(id => updated.add(id))
      return updated
    })
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

  // Currency state
  const selectedCurrencies = useMemo(() => reportFilters.selectedCurrencies, [reportFilters.selectedCurrencies])

  // Fetch currency catalog data to map IDs to values (codes)
  const catalogClient = useCatalogManagerClient(accessToken)
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ value: string; label: string }>>([])
  const [currenciesLoading, setCurrenciesLoading] = useState(false)

  // Fetch currency catalog entries based on available currency IDs
  useEffect(() => {
    const fetchCurrencies = async () => {
      if (!accessToken || availableCurrencies.size === 0) {
        setCurrencyOptions([])
        return
      }

      setCurrenciesLoading(true)
      try {
        // Fetch all currency catalog entries
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Currency',
            version: 'v1'
          },
          {
            limit: 200,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        if (response?.data && Array.isArray(response.data)) {
          // Filter to only show currencies that exist in available currencies
          const availableSet = new Set(availableCurrencies)
          const options = response.data
            .filter(entry => availableSet.has(entry.id))
            .map(entry => ({
              value: entry.id, // Use ID as value for filtering
              label: entry.value || entry.code || entry.id // Show value (code) as label
            }))
            .sort((a, b) => a.label.localeCompare(b.label))

          setCurrencyOptions(options)
        } else {
          setCurrencyOptions([])
        }
      } catch (error) {
        console.error('Error fetching currencies:', error)
        setCurrencyOptions([])
      } finally {
        setCurrenciesLoading(false)
      }
    }

    fetchCurrencies()
  }, [accessToken, availableCurrencies, catalogClient])

  const handleCurrencyChange = useCallback(
    (currencies: string[]) => {
      // Empty array means all currencies (no filter)
      reportFilters.handleCurrencyChange(currencies)
    },
    [reportFilters]
  )

  // Transpose toggle handler
  const handleTransposeToggle = useCallback(() => {
    setIsTransposed(prev => !prev)
  }, [])

  // Clear all filters handler
  const handleClearFilters = useCallback(() => {
    reportFilters.handleStartDateChange(null)
    reportFilters.handleEndDateChange(null)
    reportFilters.handleCurrencyChange([])
    setIsTransposed(false)
  }, [reportFilters])

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
            <Funnel className="gba:w-5 gba:h-5" />
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
              {currencyOptions.length > 0 && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
                  <Combobox
                    mode="multiple"
                    value={selectedCurrencies}
                    onValueChange={handleCurrencyChange}
                    options={currencyOptions}
                    placeholder="All currencies"
                    searchPlaceholder="Search currencies..."
                    emptyText={currenciesLoading ? 'Loading...' : 'No currencies found'}
                    loading={currenciesLoading}
                    className="gba:w-[200px]"
                    data-testid="report-currency-filter"
                    allowClear
                  />
                </div>
              )}

              {/* Transpose Button */}
              <Button
                onClick={handleTransposeToggle}
                variant={isTransposed ? 'default' : 'outline'}
                size="sm"
                data-testid="report-transpose-toggle"
              >
                <VectorTwoIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {isTransposed ? 'Primary' : 'Transpose'}
              </Button>
            </div>

            {/* Clear Filters Button */}
            <Button onClick={handleClearFilters} variant="outline" size="sm" data-testid="report-clear-filters">
              <X className="gba:w-4 gba:h-4 gba:mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="gba:h-full gba:flex gba:flex-col">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-4">
          <TabsTrigger value="liquid-fund" startIcon={<TrendingUp />} data-testid="liquid-fund-analytics-tab">
            Liquid Fund
          </TabsTrigger>
          <TabsTrigger value="real-estate" startIcon={<Building2 />} data-testid="real-estate-analytics-tab">
            Real Estate
          </TabsTrigger>
          <TabsTrigger value="equity" startIcon={<PieChart />} data-testid="equity-analytics-tab">
            Equity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liquid-fund" className="gba:flex-1 gba:overflow-auto gba:mt-0">
          <LiquidFundReport
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid="liquid-fund-analytics"
            reportFilters={reportFilters}
            onCurrenciesUpdate={handleCurrenciesUpdate}
            isTransposed={isTransposed}
          />
        </TabsContent>

        <TabsContent value="real-estate" className="gba:flex-1 gba:overflow-auto gba:mt-0">
          <RealEstateReport
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid="real-estate-analytics"
            reportFilters={reportFilters}
            onCurrenciesUpdate={handleCurrenciesUpdate}
            isTransposed={isTransposed}
          />
        </TabsContent>

        <TabsContent value="equity" className="gba:flex-1 gba:overflow-auto gba:mt-0">
          <EquityReport
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid="equity-analytics"
            reportFilters={reportFilters}
            onCurrenciesUpdate={handleCurrenciesUpdate}
            isTransposed={isTransposed}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportView
