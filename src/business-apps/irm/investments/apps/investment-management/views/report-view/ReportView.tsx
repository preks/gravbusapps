import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useReportFilters } from './hooks'
import { useGetInvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { useInvestmentGroups } from '../investment-view/hooks/useInvestmentGroups'
import { getDefaultInvestmentGroupIcon } from './utils/reportViewHelpers'
import { GenericReportTab } from './components/GenericReportTab'
import { ReportFiltersHeader } from './components/ReportFiltersHeader'

export interface ReportViewProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const ReportView: React.FC<ReportViewProps> = ({ accessToken, userInfo, initialSubTab, onSubTabChange }) => {
  // Fetch investment groups from catalog dynamically
  const { investmentGroups, isLoading: groupsLoading } = useInvestmentGroups(accessToken || '')

  // Normalize active tab against dynamic groups
  const normalizeTab = useCallback(
    (val?: string) => {
      if (!val) return investmentGroups[0]?.tabId || ''
      const validTabs = investmentGroups.map(g => g.tabId)
      return validTabs.includes(val) ? val : investmentGroups[0]?.tabId || ''
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

  // Fetch investment catalog data once for all tabs.
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

  // Callback for report tabs to report their available currencies (kept for compatibility but not used anymore)
  const handleCurrenciesUpdate = useCallback(() => {
    // No-op: currencies are now fetched once at parent level
  }, [])

  // Get current tab's currency state
  const selectedCurrencies = useMemo(() => {
    return currenciesByTab[activeSubTab] || []
  }, [activeSubTab, currenciesByTab])

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
      <ReportFiltersHeader
        reportFilters={reportFilters}
        selectedCurrencies={selectedCurrencies}
        onCurrenciesChange={handleCurrencyChange}
        onClearFilters={handleClearFilters}
        accessToken={accessToken}
        userInfo={userInfo}
        data-testid="report-filters-card"
      />

      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="gba:h-full gba:flex gba:flex-col">
        {/* Dynamic TabsList based on catalog groups */}
        <TabsList className="gba:flex gba:w-full gba:mb-4">
          {investmentGroups.map(group => (
            <TabsTrigger
              key={group.tabId}
              value={group.tabId}
              className="gba:flex-1"
              startIcon={getDefaultInvestmentGroupIcon()}
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
