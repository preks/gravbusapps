import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Tabs, TabsContent, TabsList, TabsTrigger, Alert, Spinner } from '@newwork/nw-design-system'
import { Building2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { RealEstateAnalyticsTable } from './components/RealEstateAnalyticsTable'
import { useRealEstateInvestmentTypes } from './hooks/useRealEstateInvestmentTypes'
import type { RealEstateReportFilters } from './types'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ReportFilterPanel, useReportFilters, ColumnConfig } from '../components/shared'

// Using separate DatePicker components for start and end dates

interface RealEstateReportProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const RealEstateReport: React.FC<RealEstateReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics'
}) => {
  // Fetch dynamic real estate investment types from catalog
  const {
    investmentTypes,
    loading: typesLoading,
    error: typesError,
    catalogData
  } = useRealEstateInvestmentTypes(accessToken)

  // Use catalog types if available, otherwise use empty array (only Overview tab)
  const effectiveInvestmentTypes = typesError || investmentTypes.length === 0 ? [] : investmentTypes

  // Sub-tab management - start with first investment type
  const [activeSubTab, setActiveSubTab] = useState<string>('')

  // Get initial investment type from URL parameter
  const getInitialInvestmentType = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const investmentTypeFromUrl = urlParams.get('investmentType')

    if (effectiveInvestmentTypes.length === 0) {
      return ''
    }

    // Validate against available investment types
    if (investmentTypeFromUrl && effectiveInvestmentTypes.some(type => type.code === investmentTypeFromUrl)) {
      return investmentTypeFromUrl
    }

    // Fall back to first available investment type
    return effectiveInvestmentTypes[0].code
  }, [effectiveInvestmentTypes])

  // Update URL when activeSubTab changes using platform navigation utilities
  const updateUrl = useCallback((investmentType: string) => {
    try {
      const currentUrl = new URL(window.location.href)
      const params: Record<string, string> = {}

      // Preserve existing query parameters
      currentUrl.searchParams.forEach((value, key) => {
        params[key] = value
      })

      // Update investmentType parameter
      params.investmentType = investmentType

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
  }, [])

  // Unified handler for activeSubTab changes
  const handleSetActiveSubTab = useCallback(
    (code: string) => {
      setActiveSubTab(code)
      updateUrl(code)
    },
    [updateUrl]
  )

  // Initialize tab from URL when investment types are loaded
  useEffect(() => {
    if (!activeSubTab) {
      // Wait for loading to complete before making decisions
      if (typesLoading) {
        return
      }

      if (effectiveInvestmentTypes.length === 0) {
        setActiveSubTab('overview')
        updateUrl('overview')
        return
      }
      const initialType = getInitialInvestmentType()
      if (initialType) {
        setActiveSubTab(initialType)
        updateUrl(initialType)
      }
    }
  }, [effectiveInvestmentTypes, activeSubTab, getInitialInvestmentType, updateUrl, typesLoading])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentType = getInitialInvestmentType()
      if (currentType) {
        setActiveSubTab(currentType)
        // Do not call updateUrl when handling popstate to avoid creating additional history entries
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [getInitialInvestmentType])

  // Define initial columns dynamically based on the ACTIVE TAB's investment type
  const initialColumns: ColumnConfig[] = useMemo(() => {
    const columns: ColumnConfig[] = [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true }
    ]

    // If catalog is loaded and we have an active sub-tab, get columns for that investment type
    if (catalogData?.investmentTypes && activeSubTab && activeSubTab !== 'overview') {
      // Find the active investment type in the catalog
      const activeInvestmentType = catalogData.investmentTypes.find((type: any) => type.code === activeSubTab)

      if (activeInvestmentType?.objectValue?.formFields) {
        activeInvestmentType.objectValue.formFields.forEach((group: any) => {
          group.fields.forEach((field: any) => {
            // Use the same ID generation as the table transformer (property with dots -> underscores)
            const columnId = field.property.replace(/\./g, '_')
            columns.push({
              id: columnId,
              label: field.label,
              visible: true // All visible by default
            })
          })
        })
      }
    } else {
      // Fallback to common columns if catalog not loaded yet or on overview tab
      columns.push(
        { id: 'name', label: 'Name', visible: true },
        { id: 'proprietor', label: 'Proprietor', visible: true },
        { id: 'location', label: 'Location', visible: true },
        { id: 'size', label: 'Size', visible: true },
        { id: 'buildingYear', label: 'Building Year', visible: true },
        { id: 'annualNetColdRent', label: 'Annual Net Cold Rent', visible: true },
        { id: 'occupancyPercent', label: 'Occupancy %', visible: true },
        { id: 'funding', label: 'Funding', visible: true }
      )
    }

    return columns
  }, [catalogData, activeSubTab])

  // Shared filter state and logic
  const reportFilters = useReportFilters(initialColumns)

  // Track available currencies from table data
  const [availableCurrencies, setAvailableCurrencies] = useState<Set<string>>(new Set())

  // Callback for tables to report their available currencies
  const handleCurrenciesUpdate = useCallback((currencies: string[]) => {
    setAvailableCurrencies(prev => {
      const updated = new Set(prev)
      currencies.forEach(id => updated.add(id))
      return updated
    })
  }, [])

  // Find the selected investment type from catalog
  const selectedInvestmentType = useMemo(() => {
    return effectiveInvestmentTypes.find(type => type.code === activeSubTab)
  }, [activeSubTab, effectiveInvestmentTypes])

  // Create filters for real estate analytics (with investment type filtering)
  const realEstateAnalyticsFilters = useMemo((): RealEstateReportFilters => {
    return {
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: selectedInvestmentType?.code || undefined
    }
  }, [
    reportFilters.computedFilters.startDate,
    reportFilters.computedFilters.endDate,
    reportFilters.computedFilters.currencyIds,
    selectedInvestmentType
  ])

  // Show loading state while investment types are being fetched
  const showLoadingWarning = typesLoading && !typesError
  const showErrorWarning = typesError && effectiveInvestmentTypes.length === 0

  // Don't render filter-dependent content until filters are initialized
  if (!reportFilters.filtersInitialized) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  return (
    <div className="gba:space-y-6 gba:p-6" data-testid={dataTestId}>
      {/* Warning messages */}
      {showLoadingWarning && (
        <Alert variant="default" data-testid={`${dataTestId}-types-loading-alert`}>
          {getTranslationFromI18nKeyAndLabel(
            'realEstate.analytics.loadingTypes',
            'Loading investment types from catalog... Showing Overview only.'
          )}
        </Alert>
      )}

      {showErrorWarning && (
        <Alert variant="destructive" data-testid={`${dataTestId}-types-error-alert`}>
          {getTranslationFromI18nKeyAndLabel(
            'realEstate.analytics.typesError',
            'Unable to load investment types from catalog. Showing Overview only.'
          )}
        </Alert>
      )}

      {/* Filters Section */}
      <ReportFilterPanel
        filters={reportFilters}
        accessToken={accessToken}
        availableCurrencyIds={Array.from(availableCurrencies)}
        variant="card"
        title={getTranslationFromI18nKeyAndLabel('filters.title', 'Filters')}
        description={getTranslationFromI18nKeyAndLabel(
          'realEstate.analytics.filters.description',
          'Configure time period for the real estate analytics view'
        )}
        data-testid={`${dataTestId}-filters`}
      />

      {/* Real Estate Analytics Tables with Dynamic Sub-tabs */}
      {/*
        Use a synthetic "overview" tab if no catalog types are available.
      */}
      <Tabs
        value={activeSubTab}
        onValueChange={handleSetActiveSubTab}
        className="gba:w-full"
        data-testid={`${dataTestId}-tabs`}
      >
        {(() => {
          const typesForTabs =
            effectiveInvestmentTypes.length > 0
              ? effectiveInvestmentTypes
              : [{ code: 'overview', value: getTranslationFromI18nKeyAndLabel('common.overview', 'Overview') }]
          return (
            <>
              <TabsList
                className="gba:grid gba:w-full"
                style={{ gridTemplateColumns: `repeat(${Math.max(typesForTabs.length, 1)}, minmax(0, 1fr))` }}
              >
                {typesForTabs.map(type => (
                  <TabsTrigger
                    key={type.code}
                    value={type.code}
                    startIcon={<Building2 />}
                    data-testid={`${dataTestId}-${type.code.toLowerCase()}-tab`}
                  >
                    {type.value}
                  </TabsTrigger>
                ))}
              </TabsList>
              {typesForTabs.map(type => (
                <TabsContent key={type.code} value={type.code} className="gba:mt-6">
                  <RealEstateAnalyticsTable
                    accessToken={accessToken}
                    userInfo={userInfo}
                    filters={realEstateAnalyticsFilters}
                    investmentType={type.code === 'overview' ? '' : type.code}
                    investmentTypeValue={type.value}
                    title={`${type.value} Analytics`}
                    catalogData={catalogData}
                    isTransposed={reportFilters.isTransposed}
                    visibleColumns={reportFilters.visibleColumns}
                    onCurrenciesChange={handleCurrenciesUpdate}
                    data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
                  />
                </TabsContent>
              ))}
            </>
          )
        })()}
      </Tabs>
    </div>
  )
}

export default RealEstateReport
