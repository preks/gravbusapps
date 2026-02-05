import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { DataDisplay, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EquityAnalyticsFilters } from './types'
import { InvestmentReportTable } from '../../components/shared/InvestmentReportTable'
import { EQUITY_TABLE_CONFIG } from '../../components/shared/tableConfigs'
import { useEquityInvestmentTypes } from './hooks/useEquityInvestmentTypes'
import { useGetInvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { UseReportFiltersReturn, ColumnConfig, useReportFilters } from '../../hooks'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'
import { generateFiltersFromCatalog } from '../../utils/catalogFilterGenerator'

interface EquityReportProps extends BusinessAppContextProps {
  'data-testid'?: string
  reportFilters: UseReportFiltersReturn
  onCurrenciesUpdate: (currencies: string[]) => void
  isTransposed: boolean
}

export const EquityReport: React.FC<EquityReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'equity-analytics',
  reportFilters,
  onCurrenciesUpdate,
  isTransposed
}) => {
  // Fetch dynamic equity investment types from catalog
  const { investmentTypes, error: typesError } = useEquityInvestmentTypes(accessToken)

  // Fetch catalog data for dynamic columns
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData({ accessToken, userInfo })
  const [catalogData, setCatalogData] = useState<any>(null)

  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const data = await fetchInvestmentCatalogData()
        setCatalogData(data)
      } catch (error) {
        console.error('Error loading catalog data:', error)
      }
    }

    if (accessToken) {
      loadCatalogData()
    }
  }, [accessToken, fetchInvestmentCatalogData])

  // Use catalog types if available, otherwise use empty array (only Overview tab)
  const effectiveInvestmentTypes = typesError || investmentTypes.length === 0 ? [] : investmentTypes

  // Section management - start with first investment type
  const [currentSection, setCurrentSection] = useState<string>('')

  // Search state
  const [search, setSearch] = useState<string>('')

  // Filter state for report-specific filters
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})

  // Fetch filter groups using descriptors
  const filterGroups = useFilterGroups({ accessToken, userInfo }, 'InvestmentReport', INVESTMENT_REPORT_DESCRIPTORS, {
    limit: 100
  })

  // Track total counts for each section
  const [totalCounts, setTotalCounts] = useState<Record<string, { count: number; isLoading: boolean }>>({})

  // Track initial load status for each section
  const [initialLoadDone, setInitialLoadDone] = useState<Record<string, boolean>>({})

  // Get initial investment type from URL parameter
  const getInitialInvestmentType = useCallback(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
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
      const currentUrl = new URL(globalThis.location.href)
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
      if (globalThis.history?.replaceState) {
        globalThis.history.replaceState({}, '', newUrl)
      }
    } catch (error) {
      console.warn('Failed to update URL:', error)
    }
  }, [])

  // Unified handler for currentSection changes
  const handleSectionChange = useCallback(
    (code: string) => {
      setCurrentSection(code)
      updateUrl(code)
    },
    [updateUrl]
  )

  // Initialize section from URL when investment types are loaded
  useEffect(() => {
    if (effectiveInvestmentTypes.length > 0 && !currentSection) {
      const initialType = getInitialInvestmentType()
      if (initialType) {
        setCurrentSection(initialType)
        updateUrl(initialType)
      }
    }
  }, [effectiveInvestmentTypes, currentSection, getInitialInvestmentType, updateUrl])

  // Restore section from URL on browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentType = getInitialInvestmentType()
      if (currentType) setCurrentSection(currentType)
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [getInitialInvestmentType])

  // Define initial columns - same for all equity tabs since they share the same structure
  const initialColumns: ColumnConfig[] = useMemo(() => {
    const columns: ColumnConfig[] = [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true }
    ]

    // If catalog is loaded, get columns from the EQUITY investment group
    if (catalogData?.investmentGroups) {
      // Find the equity investment group
      const equityGroup = catalogData.investmentGroups.find((group: any) => group.code === 'EQUITY')

      if (equityGroup?.objectValue) {
        // Parse objectValue if it's a string
        const parsedObjectValue =
          typeof equityGroup.objectValue === 'string' ? JSON.parse(equityGroup.objectValue) : equityGroup.objectValue

        parsedObjectValue?.formFields?.forEach((group: any) => {
          group.fields.forEach((field: any) => {
            // Filter out fields with report: false (not for report tables)
            if (field.report === false) {
              return
            }
            // Use the same ID generation as the table transformer (property with dots -> underscores)
            const columnId = field.property.replaceAll('.', '_')
            columns.push({
              id: columnId,
              label: field.label,
              visible: true // All visible by default
            })
          })
        })
      }
    } else {
      // Fallback to common columns if catalog not loaded yet
      columns.push(
        { id: 'name', label: 'Name', visible: true },
        { id: 'company', label: 'Company', visible: true },
        { id: 'sector', label: 'Sector', visible: true },
        { id: 'shares', label: 'Shares', visible: true },
        { id: 'sharePrice', label: 'Share Price', visible: true },
        { id: 'totalValue', label: 'Total Value', visible: true },
        { id: 'gainLoss', label: 'Gain/Loss', visible: true },
        { id: 'returnPercent', label: 'Return %', visible: true }
      )
    }

    return columns
  }, [catalogData])

  // Column config is managed separately per report component
  const localReportFilters = useReportFilters(initialColumns)

  // Callback for tables to report their total counts
  const handleTotalCountUpdate = useCallback((sectionId: string, count: number, isLoading: boolean) => {
    setTotalCounts(prev => ({
      ...prev,
      [sectionId]: { count, isLoading }
    }))
    // Mark section as loaded when loading completes
    if (!isLoading) {
      setInitialLoadDone(prev => {
        // Only update if not already done
        if (prev[sectionId]) {
          return prev
        }
        return {
          ...prev,
          [sectionId]: true
        }
      })
    }
  }, []) // Remove initialLoadDone from dependencies to prevent infinite loops

  // Find the selected investment type from catalog
  const selectedInvestmentType = useMemo(() => {
    if (currentSection === 'overview') return undefined
    return effectiveInvestmentTypes.find(type => type.code === currentSection)
  }, [currentSection, effectiveInvestmentTypes])

  // Generate filter configuration dynamically from catalog
  // Note: Equity uses GROUP-level catalog (same fields for all equity types: Mezzanine, Venture, etc.)
  const dynamicFilterConfig = useMemo(() => {
    if (!catalogData?.investmentGroups) {
      // Return empty config if catalog not loaded yet
      return { id: 'equity-report-filters-empty', name: 'Equity Report Filters', groups: [] }
    }

    // Find the EQUITY investment group (not individual types)
    const equityGroup = catalogData.investmentGroups.find((group: any) => group.code === 'EQUITY')
    if (!equityGroup?.objectValue) {
      return { id: 'equity-report-filters-empty', name: 'Equity Report Filters', groups: [] }
    }

    // Parse objectValue if it's a string
    const parsedObjectValue =
      typeof equityGroup.objectValue === 'string' ? JSON.parse(equityGroup.objectValue) : equityGroup.objectValue

    if (!parsedObjectValue?.formFields) {
      return { id: 'equity-report-filters-empty', name: 'Equity Report Filters', groups: [] }
    }

    // Generate filters from catalog formFields
    const catalogGeneratedConfig = generateFiltersFromCatalog(
      parsedObjectValue.formFields,
      'equity', // Entity prefix for equityInvestment fields
      'equity-report-filters-dynamic',
      'Equity Report Filters'
    )

    // Populate multi-select filter options from filterGroups (for catalog-based filters)
    return buildDynamicFilterConfig(catalogGeneratedConfig, INVESTMENT_REPORT_DESCRIPTORS, filterGroups)
  }, [catalogData, filterGroups])

  // Create filters for equity analytics (with investment type filtering)
  const equityAnalyticsFilters = useMemo((): EquityAnalyticsFilters => {
    const filters = {
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: selectedInvestmentType?.code || undefined,
      search: search || undefined,
      // Merge in report-specific filters from the filter UI
      ...selectedFilters
    }

    return filters
  }, [
    reportFilters.computedFilters.startDate,
    reportFilters.computedFilters.endDate,
    reportFilters.computedFilters.currencyIds,
    selectedInvestmentType,
    search,
    selectedFilters,
    currentSection
  ])

  // Convert columnConfig to availableColumns/visibleColumns for DataDisplay
  const availableColumns = useMemo(
    () =>
      localReportFilters.columnConfig
        .filter(col => col.id !== 'investment') // Remove Investment column from visibility controller
        .map(col => ({ id: col.id, label: col.label })),
    [localReportFilters.columnConfig]
  )

  const visibleColumns = useMemo(() => localReportFilters.visibleColumns, [localReportFilters.visibleColumns])

  const handleVisibleColumnsChange = useCallback(
    (newVisibleColumns: string[]) => {
      localReportFilters.columnConfig.forEach(col => {
        const visible = newVisibleColumns.includes(col.id)
        if (col.visible !== visible && !col.disabled) {
          localReportFilters.handleColumnVisibilityChange(col.id, visible)
        }
      })
    },
    [localReportFilters]
  )

  // Filter change handler
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setSelectedFilters(newFilters)
  }, [])

  // Primary action for "Add Report" - memoized to prevent reload on tab change
  const primaryActions = useMemo(() => {
    return (
      <AppAction
        variant="create-primary"
        contexts={[
          {
            context: FlowContextName.investmentReportCreate,
            contextData: {}
          }
        ]}
        accessToken={accessToken || ''}
        data-testid="report-view-add-report-action"
      >
        {getTranslationFromI18nKeyAndLabel('investment.reports.addReport', 'Add Report')}
      </AppAction>
    )
  }, [accessToken])

  // Don't render filter-dependent content until filters are initialized
  if (!localReportFilters.filtersInitialized) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  return (
    <div data-testid={dataTestId}>
      {/* Equity Analytics Tables with DataDisplay titleSections */}
      <DataDisplay
        titleSections={effectiveInvestmentTypes.map(type => ({
          id: type.code,
          label: type.value,
          metadata: {
            count: totalCounts[type.code]?.count || 0,
            isLoading: totalCounts[type.code]?.isLoading || false
          }
        }))}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        searchValue={search}
        searchPlaceholder="Search investments..."
        onSearchChange={setSearch}
        filters={selectedFilters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={handleFilterChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        primaryAction={primaryActions}
        toolbarDensity="default"
      >
        {effectiveInvestmentTypes.map(type => (
          <div key={type.code} style={{ display: currentSection === type.code ? 'block' : 'none' }}>
            <InvestmentReportTable
              config={EQUITY_TABLE_CONFIG}
              accessToken={accessToken}
              userInfo={userInfo}
              filters={equityAnalyticsFilters}
              investmentType={type.code}
              investmentTypeValue={type.value}
              catalogData={catalogData}
              isTransposed={isTransposed}
              onCurrenciesChange={onCurrenciesUpdate}
              visibleColumns={visibleColumns}
              onTotalCountChange={(count, isLoading) => handleTotalCountUpdate(type.code, count, isLoading)}
              isInitialLoad={!initialLoadDone[type.code]}
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
            />
          </div>
        ))}
      </DataDisplay>
    </div>
  )
}

export default EquityReport
