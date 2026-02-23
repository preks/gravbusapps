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
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { FunnelIcon, XIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useReportFilters } from './hooks'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useGetInvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { useInvestmentGroups } from '../investment-view/hooks/useInvestmentGroups'
import { getIconForGroup } from './utils/reportViewHelpers'
import { GenericReportTab } from './components/GenericReportTab'
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
  // Fetch investment groups from catalog dynamically
  const { investmentGroups, isLoading: groupsLoading } = useInvestmentGroups(accessToken || '')

  // Normalize active tab against dynamic groups
  const normalizeTab = useCallback(
    (val?: string) => {
      if (!val) return investmentGroups[0]?.tabId || 'liquid-fund'
      const validTabs = investmentGroups.map(g => g.tabId)
      return validTabs.includes(val) ? val : investmentGroups[0]?.tabId || 'liquid-fund'
    },
    [investmentGroups]
  )

  const [activeSubTab, setActiveSubTab] = useState(() => normalizeTab(initialSubTab))

  // Update active tab when groups load and current tab is invalid
  useEffect(() => {
    if (investmentGroups.length > 0) {
      const normalized = normalizeTab(activeSubTab)
      if (normalized !== activeSubTab) {
        setActiveSubTab(normalized)
      }
    }
  }, [investmentGroups, activeSubTab, normalizeTab])

  // Shared filter state for all tabs (date range is shared)
  const reportFilters = useReportFilters()

  // Dynamic per-tab currency filters (map of tabId -> currency array)
  const [currenciesByTab, setCurrenciesByTab] = useState<Record<string, string[]>>({})

  // Initialize currency state for all groups when they load
  useEffect(() => {
    if (investmentGroups.length > 0 && Object.keys(currenciesByTab).length === 0) {
      const initial: Record<string, string[]> = {}
      investmentGroups.forEach(group => {
        initial[group.tabId] = []
      })
      setCurrenciesByTab(initial)
    }
  }, [investmentGroups, currenciesByTab])

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
    return currenciesByTab[activeSubTab] || []
  }, [activeSubTab, currenciesByTab])

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
      setCurrenciesByTab(prev => ({ ...prev, [activeSubTab]: currencies }))
    },
    [activeSubTab]
  )

  // Clear all filters handler - only clears current tab's currency filter
  const handleClearFilters = useCallback(() => {
    reportFilters.handleStartDateChange(null)
    reportFilters.handleEndDateChange(null)
    // Clear only current tab's currency filter
    setCurrenciesByTab(prev => ({ ...prev, [activeSubTab]: [] }))
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

  // Helper to get filters for any tab (dynamic)
  const getFiltersForTab = useCallback(
    (tabId: string) => {
      const currencies = currenciesByTab[tabId] || []
      return {
        ...reportFilters,
        selectedCurrencies: currencies,
        computedFilters: {
          ...reportFilters.computedFilters,
          currencyIds: currencies
        },
        handleCurrencyChange: (newCurrencies: string[]) => {
          setCurrenciesByTab(prev => ({ ...prev, [tabId]: newCurrencies }))
        }
      }
    },
    [reportFilters, currenciesByTab]
  )

  // Show loading state while groups are being fetched
  if (groupsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
        <Spinner data-testid="report-view-loading-spinner" />
      </div>
    )
  }

  // Show error state if no groups found
  if (investmentGroups.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
        <Card className="gba:max-w-md">
          <CardContent className="gba:p-8 gba:text-center">
            <p className="gba:text-muted-foreground">No investment groups found in catalog.</p>
          </CardContent>
        </Card>
      </div>
    )
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
        {/* Dynamic TabsList based on catalog groups */}
        <TabsList
          className="gba:grid gba:w-full gba:mb-4"
          style={{ gridTemplateColumns: `repeat(${investmentGroups.length}, 1fr)` }}
        >
          {investmentGroups.map(group => (
            <TabsTrigger
              key={group.tabId}
              value={group.tabId}
              startIcon={getIconForGroup(group.code)}
              data-testid={`${group.tabId}-analytics-tab`}
            >
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Dynamic TabsContent based on catalog groups - all use GenericReportTab */}
        {investmentGroups.map(group => (
          <TabsContent key={group.tabId} value={group.tabId} className="gba:flex-1 gba:overflow-auto gba:mt-0">
            <GenericReportTab
              investmentGroup={group.code}
              groupLabel={group.label}
              accessToken={accessToken}
              userInfo={userInfo}
              data-testid={`${group.tabId}-analytics`}
              reportFilters={getFiltersForTab(group.tabId)}
              onCurrenciesUpdate={handleCurrenciesUpdate}
              catalogData={catalogData}
              enabled={activeSubTab === group.tabId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default ReportView
