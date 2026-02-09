import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { DataDisplay, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentReportTable } from '../../components/shared/InvestmentReportTable'
import { REAL_ESTATE_TABLE_CONFIG } from '../../components/shared/tableConfigs'
import { useRealEstateInvestmentTypes } from './hooks/useRealEstateInvestmentTypes'
import type { RealEstateReportFilters } from './types'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { UseReportFiltersReturn, ColumnConfig, useReportFilters } from '../../hooks'
import { useReportTabCounts } from '../../hooks/useReportTabCounts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'
import { generateFiltersFromCatalog } from '../../utils/catalogFilterGenerator'

interface RealEstateReportProps extends BusinessAppContextProps {
  'data-testid'?: string
  reportFilters: UseReportFiltersReturn
  onCurrenciesUpdate: (currencies: string[]) => void
  catalogData?: any
  enabled?: boolean
}

export const RealEstateReport: React.FC<RealEstateReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics',
  reportFilters,
  onCurrenciesUpdate,
  catalogData: providedCatalogData,
  enabled = true
}) => {
  // Fetch dynamic real estate investment types from catalog
  const {
    investmentTypes,
    loading: typesLoading,
    error: typesError,
    catalogData
  } = useRealEstateInvestmentTypes({ accessToken, catalogData: providedCatalogData })

  // Use catalog types if available, otherwise use empty array (only Overview tab)
  const effectiveInvestmentTypes = typesError || investmentTypes.length === 0 ? [] : investmentTypes

  // Section management - start with first investment type
  const [currentSection, setCurrentSection] = useState<string>('')

  // Search state
  const [search, setSearch] = useState<string>('')

  // Filter state for report-specific filters
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})

  // Sorting state (following investment tab pattern)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  // Fetch filter groups using descriptors
  const filterGroups = useFilterGroups({ accessToken, userInfo }, 'InvestmentReport', INVESTMENT_REPORT_DESCRIPTORS, {
    limit: 100
  })

  // Fetch counts for all tabs in this group
  const { counts, isLoading: countsLoading } = useReportTabCounts({
    investmentGroup: 'REAL_ESTATE',
    investmentTypes: effectiveInvestmentTypes,
    accessToken,
    filters: {
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      search
    },
    enabled
  })

  // Convert counts to the format expected by the component
  const totalCounts = useMemo(() => {
    const result: Record<string, { count: number; isLoading: boolean }> = {}
    effectiveInvestmentTypes.forEach(type => {
      result[type.code] = { count: counts[type.code] || 0, isLoading: countsLoading }
    })
    return result
  }, [counts, countsLoading, effectiveInvestmentTypes])

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
      // Fallback: just update the state without URL manipulation
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
    if (!currentSection) {
      // Wait for loading to complete before making decisions
      if (typesLoading) {
        return
      }

      if (effectiveInvestmentTypes.length === 0) {
        setCurrentSection('overview')
        updateUrl('overview')
        return
      }
      const initialType = getInitialInvestmentType()
      if (initialType) {
        setCurrentSection(initialType)
        updateUrl(initialType)
      }
    }
  }, [effectiveInvestmentTypes, currentSection, getInitialInvestmentType, updateUrl, typesLoading])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentType = getInitialInvestmentType()
      if (currentType) {
        setCurrentSection(currentType)
        // Do not call updateUrl when handling popstate to avoid creating additional history entries
      }
    }

    globalThis.addEventListener('popstate', handlePopState)

    return () => {
      globalThis.removeEventListener('popstate', handlePopState)
    }
  }, [getInitialInvestmentType])

  // Define initial columns dynamically based on the ACTIVE TAB's investment type
  const initialColumns: ColumnConfig[] = useMemo(() => {
    const columns: ColumnConfig[] = [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true }
    ]

    // If catalog is loaded and we have an active section, get columns for that investment type
    if (catalogData?.investmentTypes && currentSection && currentSection !== 'overview') {
      // Find the active investment type in the catalog
      const activeInvestmentType = catalogData.investmentTypes.find((type: any) => type.code === currentSection)

      if (activeInvestmentType?.objectValue?.formFields) {
        // Parse objectValue if it's a string
        const parsedObjectValue =
          typeof activeInvestmentType.objectValue === 'string'
            ? JSON.parse(activeInvestmentType.objectValue)
            : activeInvestmentType.objectValue

        parsedObjectValue.formFields?.forEach((group: any) => {
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
  }, [catalogData, currentSection])

  // Column config is managed separately per report component
  const localReportFilters = useReportFilters(initialColumns)

  // Find the selected investment type from catalog
  const selectedInvestmentType = useMemo(() => {
    return effectiveInvestmentTypes.find(type => type.code === currentSection)
  }, [currentSection, effectiveInvestmentTypes])

  // Generate filter configuration dynamically from catalog
  // Note: Real Estate uses TYPE-level catalog (different fields per type: Loans, Development, Property, etc.)
  const dynamicFilterConfig = useMemo(() => {
    if (!catalogData?.investmentTypes || !currentSection || currentSection === 'overview') {
      // Return empty config if catalog not loaded or on overview
      return { id: 'real-estate-report-filters-empty', name: 'Real Estate Report Filters', groups: [] }
    }

    // Find the active investment type in the catalog (TYPE-level config)
    const activeInvestmentType = catalogData.investmentTypes.find((type: any) => type.code === currentSection)
    if (!activeInvestmentType?.objectValue) {
      return { id: 'real-estate-report-filters-empty', name: 'Real Estate Report Filters', groups: [] }
    }

    // Parse objectValue if it's a string
    const parsedObjectValue =
      typeof activeInvestmentType.objectValue === 'string'
        ? JSON.parse(activeInvestmentType.objectValue)
        : activeInvestmentType.objectValue

    if (!parsedObjectValue?.formFields) {
      return { id: 'real-estate-report-filters-empty', name: 'Real Estate Report Filters', groups: [] }
    }

    // Generate filters from catalog formFields
    const catalogGeneratedConfig = generateFiltersFromCatalog(
      parsedObjectValue.formFields,
      'realEstate', // Entity prefix for realEstateInvestment fields
      'real-estate-report-filters-dynamic',
      'Real Estate Report Filters'
    )

    // Populate multi-select filter options from filterGroups (for catalog-based filters)
    return buildDynamicFilterConfig(catalogGeneratedConfig, INVESTMENT_REPORT_DESCRIPTORS, filterGroups)
  }, [catalogData, currentSection, filterGroups])

  // Create filters for real estate analytics (with investment type filtering)
  const realEstateAnalyticsFilters = useMemo((): RealEstateReportFilters => {
    return {
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: selectedInvestmentType?.code || undefined,
      search: search || undefined,
      // Merge in report-specific filters from the filter UI
      ...selectedFilters
    }
  }, [
    reportFilters.computedFilters.startDate,
    reportFilters.computedFilters.endDate,
    reportFilters.computedFilters.currencyIds,
    selectedInvestmentType,
    search,
    selectedFilters
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

  // Convert sorting to DataTable format
  const sorting = useMemo(() => {
    if (!sortField) return []
    return [{ id: sortField, desc: sortOrder === 'DESC' }]
  }, [sortField, sortOrder])

  // Handle sorting changes (following investment tab pattern)
  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    if (newSorting.length === 0) {
      setSortField('')
      setSortOrder('DESC')
    } else {
      const firstSort = newSorting[0]
      setSortField(firstSort.id)
      setSortOrder(firstSort.desc ? 'DESC' : 'ASC')
    }
  }, [])

  // Filter change handler
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setSelectedFilters(newFilters)
  }, [])

  // Define sortable columns (matching investment tab pattern)
  // Catalog columns with direct paths (not additionalProperties) are sortable
  // The column key mapping converts realEstateInvestment.* -> realEstateInvestmentReport.*
  const sortableColumns = useMemo(
    () => [
      { id: 'investment', label: 'Investment' },
      { id: 'date', label: 'Date' },
      // Common InvestmentReport sortable fields
      { id: 'totalInvestmentAmount', label: 'Total Investment Amount' },
      { id: 'investmentMarketValue', label: 'Market Value' },
      { id: 'debtFinancingAmount', label: 'Debt Financing' },
      { id: 'requiredCapitalAmount', label: 'Required Capital' },
      { id: 'forecastedRevenueAmount', label: 'Forecasted Revenue' },
      { id: 'forecastedProfitAmount', label: 'Forecasted Profit' },
      { id: 'stakePercentage', label: 'Stake %' },
      { id: 'irr', label: 'IRR' },
      { id: 'moic', label: 'MOIC' },
      // Loan fields (if applicable)
      { id: 'loanRecipientName', label: 'Loan Recipient' },
      { id: 'loanAmount', label: 'Loan Amount' },
      { id: 'loanOpenCommitmentAmount', label: 'Open Commitment' },
      { id: 'loanInterestRate', label: 'Loan Interest Rate' },
      { id: 'loanStartDate', label: 'Loan Start Date' },
      { id: 'loanEndDate', label: 'Loan End Date' },
      { id: 'loanInterestClaim', label: 'Interest Claim' },
      // Real Estate specific sortable fields (catalog uses realEstateInvestment.*, maps to realEstateInvestmentReport.*)
      { id: 'realEstateInvestment_size', label: 'Size' },
      { id: 'realEstateInvestment_numberOfUnits', label: 'Number of Units' },
      { id: 'realEstateInvestment_occupancyPercent', label: 'Occupancy %' },
      { id: 'realEstateInvestment_annualNetColdRent', label: 'Annual Net Cold Rent' },
      { id: 'realEstateInvestment_funding', label: 'Funding' },
      { id: 'realEstateInvestment_actualAnnualExpenses', label: 'Actual Annual Expenses' },
      { id: 'realEstateInvestment_targetAnnualExpenses', label: 'Target Annual Expenses' },
      { id: 'realEstateInvestment_locality', label: 'Locality' },
      { id: 'realEstateInvestment_postalCode', label: 'Postal Code' }
    ],
    []
  )

  // Primary action for "Add Report" - memoized to prevent reload on tab change
  const primaryActions = useMemo(() => {
    return (
      <AppAction
        variant="create-primary"
        contexts={[
          {
            context: FlowContextName.investmentReportCreate,
            contextData: { investmentId: '' }
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

  // Prepare sections for DataDisplay
  const typesForSections =
    effectiveInvestmentTypes.length > 0
      ? effectiveInvestmentTypes
      : [{ code: 'overview', value: getTranslationFromI18nKeyAndLabel('common.overview', 'Overview') }]

  return (
    <div data-testid={dataTestId}>
      {/* Real Estate Analytics Tables with Dynamic DataDisplay titleSections */}
      <DataDisplay
        titleSections={typesForSections.map(type => ({
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
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={primaryActions}
        toolbarDensity="default"
      >
        {typesForSections.map(type => (
          <div key={type.code} style={{ display: currentSection === type.code ? 'block' : 'none' }}>
            <InvestmentReportTable
              config={REAL_ESTATE_TABLE_CONFIG}
              accessToken={accessToken}
              userInfo={userInfo}
              filters={realEstateAnalyticsFilters}
              investmentType={type.code === 'overview' ? '' : type.code}
              investmentTypeValue={type.value}
              catalogData={catalogData}
              visibleColumns={visibleColumns}
              onCurrenciesChange={onCurrenciesUpdate}
              enabled={enabled && currentSection === type.code}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortingChange={handleSortingChange}
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
            />
          </div>
        ))}
      </DataDisplay>
    </div>
  )
}

export default RealEstateReport
