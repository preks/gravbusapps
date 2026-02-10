import React, { useState, useMemo, useCallback } from 'react'
import { DataDisplay, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AnalyticsFilters } from './types'
import { InvestmentReportTable } from '../../components/shared/InvestmentReportTable'
import { LIQUID_FUND_TABLE_CONFIG } from '../../components/shared/tableConfigs'
import { transformReportsToAnalyticsData } from './utils/liquidFundDataTransformer'
import { convertDynamicColumnsToConfig, createLiquidFundStaticColumns } from './utils/liquidFundColumnAdapter'
import { UseReportFiltersReturn, ColumnConfig, useReportFilters } from '../../hooks'
import { useInvestmentLiquidFundReportCatalog } from './hooks/useInvestmentLiquidFundReportCatalog'
import { useReportTabCounts } from '../../hooks/useReportTabCounts'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Static mapping of section IDs to liquid fund type codes
const SECTION_TO_LIQUID_FUND_TYPE: Record<string, string> = {
  'bank-deposits': 'BANK_DEPOSITE',
  'fixed-term-deposits': 'FIXED_TERM_DEPOSIT',
  'multiple-types': 'MONEY_MARKET_FUNDS' // Multiple types section - use Money Market Funds as base
}

interface LiquidFundReportProps extends BusinessAppContextProps {
  'data-testid'?: string
  reportFilters: UseReportFiltersReturn
  onCurrenciesUpdate: (currencies: string[]) => void
  catalogData?: any
  enabled?: boolean
}

export const LiquidFundReport: React.FC<LiquidFundReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'liquid-fund-analytics',
  reportFilters,
  onCurrenciesUpdate,
  catalogData: providedCatalogData,
  enabled = true
}) => {
  // Section management - Start with Bank Deposits since Overview is removed
  const [currentSection, setCurrentSection] = useState<string>('bank-deposits')

  // Search state
  const [search, setSearch] = useState<string>('')

  // Sorting state (following investment tab pattern)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  // Fetch catalog to get columns for each liquid fund type
  const { catalogData, getDynamicColumnsForType } = useInvestmentLiquidFundReportCatalog({
    accessToken,
    userInfo,
    catalogData: providedCatalogData
  })

  // Fetch counts for all tabs in this group
  const { counts, isLoading: countsLoading } = useReportTabCounts({
    investmentGroup: 'LIQUID_FUND',
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
  const totalCounts = useMemo(
    () => ({
      'bank-deposits': { count: counts['bank-deposits'] || 0, isLoading: countsLoading },
      'fixed-term-deposits': { count: counts['fixed-term-deposits'] || 0, isLoading: countsLoading },
      'multiple-types': { count: counts['multiple-types'] || 0, isLoading: countsLoading }
    }),
    [counts, countsLoading]
  )

  // Helper to generate columns for a specific section
  const generateColumnsForSection = useCallback(
    (sectionId: string) => {
      const staticColumns = createLiquidFundStaticColumns()
      const typeCode = SECTION_TO_LIQUID_FUND_TYPE[sectionId]

      if (!typeCode) return staticColumns

      const dynamicCols = getDynamicColumnsForType(typeCode)
      const convertedDynamicCols = convertDynamicColumnsToConfig(dynamicCols)

      return [...staticColumns, ...convertedDynamicCols]
    },
    [getDynamicColumnsForType]
  )

  // Define initial columns dynamically based on the ACTIVE SECTION's liquid fund type
  const initialColumns: ColumnConfig[] = useMemo(() => {
    const columns: ColumnConfig[] = [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true }
    ]

    // Get the liquid fund type for the active section
    const activeTypeCode = SECTION_TO_LIQUID_FUND_TYPE[currentSection]

    // If catalog is loaded, get columns for the active liquid fund type only
    if (catalogData?.investmentLiquidFundTypes && activeTypeCode) {
      const activeLiquidFundType = catalogData.investmentLiquidFundTypes.find(type => type.code === activeTypeCode)

      if (activeLiquidFundType?.objectValue?.formFields) {
        // Parse objectValue if it's a string
        const parsedObjectValue =
          typeof activeLiquidFundType.objectValue === 'string'
            ? JSON.parse(activeLiquidFundType.objectValue)
            : activeLiquidFundType.objectValue

        parsedObjectValue.formFields?.forEach((group: any) => {
          group.fields.forEach((field: any) => {
            // Filter out fields with report: false (not for report tables)
            if (field.report === false) {
              return
            }
            // Use the same ID generation as the table transformer (property with dots -> underscores)
            const columnId = field.property.split('.').join('_')
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
        { id: 'proprietor', label: 'Proprietor', visible: true },
        { id: 'currency', label: 'Currency', visible: true },
        { id: 'openingBalance', label: 'Opening Balance', visible: true },
        { id: 'incoming', label: 'Incoming', visible: true },
        { id: 'outgoing', label: 'Outgoing', visible: true },
        { id: 'realized', label: 'Realized', visible: true },
        { id: 'gainsLosses', label: 'Gains/Losses', visible: true },
        { id: 'closingBalance', label: 'Closing Balance', visible: true },
        { id: 'timeWeightedReturn', label: 'Time-Weighted Return', visible: true },
        { id: 'interestRate', label: 'Interest Rate', visible: false },
        { id: 'maturityDate', label: 'Maturity Date', visible: false }
      )
    }

    return columns
  }, [catalogData, currentSection])

  // Column config is managed separately per report component
  const localReportFilters = useReportFilters(initialColumns)

  // Create filters for specific investment types (Overview removed)
  // Use shared filters from parent (reportFilters) for date range and currency
  // Note: onCurrenciesChange is passed separately to InvestmentReportTable, not in filters
  const bankDepositFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Bank Deposit',
      search: search || undefined
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      search
    ]
  )

  const fixedTermDepositFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Fixed-Term Deposit',
      search: search || undefined
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      search
    ]
  )

  const multipleTypesFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Multiple Types', // This triggers exclusion of Bank Deposit and Fixed-Term Deposit in GraphQL query
      search: search || undefined
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      search
    ]
  )

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

  // Define sortable columns (matching investment tab pattern)
  // Note: Most liquid fund fields are stored in additionalProperties (JSONB) and are NOT sortable
  // Only investment name, date, and totalInvestmentAmount can be sorted
  const sortableColumns = useMemo(
    () => [
      { id: 'investment', label: 'Investment' },
      { id: 'date', label: 'Date' },
      { id: 'investment_totalInvestmentAmount', label: 'Total Investment Amount' }
      // All other fields (name, proprietor, bank, currency, etc.) are stored in additionalProperties
      // and cannot be sorted due to JSONB database limitations
    ],
    []
  )

  // Memoize column overrides to prevent infinite loops from unstable references
  const bankDepositColumns = useMemo(() => generateColumnsForSection('bank-deposits'), [generateColumnsForSection])

  const fixedTermDepositColumns = useMemo(
    () => generateColumnsForSection('fixed-term-deposits'),
    [generateColumnsForSection]
  )

  const multipleTypesColumns = useMemo(() => generateColumnsForSection('multiple-types'), [generateColumnsForSection])

  // Memoize data transformers to prevent infinite loops from unstable references
  // Note: All filtering is now done server-side, so transformer just transforms the data
  const bankDepositTransformer = useCallback((reports: any[]) => transformReportsToAnalyticsData(reports), [])

  const fixedTermDepositTransformer = useCallback((reports: any[]) => transformReportsToAnalyticsData(reports), [])

  const multipleTypesTransformer = useCallback((reports: any[]) => transformReportsToAnalyticsData(reports), [])

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
      {/* Analytics Tables with DataDisplay titleSections */}
      <DataDisplay
        titleSections={[
          {
            id: 'bank-deposits',
            label: 'Bank Deposits',
            metadata: {
              count: totalCounts['bank-deposits'].count,
              isLoading: totalCounts['bank-deposits'].isLoading
            }
          },
          {
            id: 'fixed-term-deposits',
            label: 'Fixed-Term Deposits',
            metadata: {
              count: totalCounts['fixed-term-deposits'].count,
              isLoading: totalCounts['fixed-term-deposits'].isLoading
            }
          },
          {
            id: 'multiple-types',
            label: 'Multiple Types',
            metadata: {
              count: totalCounts['multiple-types'].count,
              isLoading: totalCounts['multiple-types'].isLoading
            }
          }
        ]}
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        searchValue={search}
        searchPlaceholder="Search investments..."
        onSearchChange={setSearch}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={primaryActions}
        toolbarDensity="default"
      >
        {/* Render all sections to load data in parallel, but only show active one */}
        <div style={{ display: currentSection === 'bank-deposits' ? 'block' : 'none' }}>
          <InvestmentReportTable
            config={LIQUID_FUND_TABLE_CONFIG}
            accessToken={accessToken}
            userInfo={userInfo}
            filters={bankDepositFilters}
            investmentType=""
            investmentTypeValue="Bank Deposits"
            catalogData={catalogData}
            visibleColumns={visibleColumns}
            onCurrenciesChange={onCurrenciesUpdate}
            enabled={enabled && currentSection === 'bank-deposits'}
            dataTransformer={bankDepositTransformer}
            columnsOverride={bankDepositColumns}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortingChange={handleSortingChange}
            data-testid={`${dataTestId}-bank-deposits-table`}
          />
        </div>
        <div style={{ display: currentSection === 'fixed-term-deposits' ? 'block' : 'none' }}>
          <InvestmentReportTable
            config={LIQUID_FUND_TABLE_CONFIG}
            accessToken={accessToken}
            userInfo={userInfo}
            filters={fixedTermDepositFilters}
            investmentType=""
            investmentTypeValue="Fixed-Term Deposits"
            catalogData={catalogData}
            visibleColumns={visibleColumns}
            onCurrenciesChange={onCurrenciesUpdate}
            enabled={enabled && currentSection === 'fixed-term-deposits'}
            dataTransformer={fixedTermDepositTransformer}
            columnsOverride={fixedTermDepositColumns}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortingChange={handleSortingChange}
            data-testid={`${dataTestId}-fixed-term-deposits-table`}
          />
        </div>
        <div style={{ display: currentSection === 'multiple-types' ? 'block' : 'none' }}>
          <InvestmentReportTable
            config={LIQUID_FUND_TABLE_CONFIG}
            accessToken={accessToken}
            userInfo={userInfo}
            filters={multipleTypesFilters}
            investmentType=""
            investmentTypeValue="Multiple Investment Types"
            catalogData={catalogData}
            visibleColumns={visibleColumns}
            onCurrenciesChange={onCurrenciesUpdate}
            enabled={enabled && currentSection === 'multiple-types'}
            dataTransformer={multipleTypesTransformer}
            columnsOverride={multipleTypesColumns}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortingChange={handleSortingChange}
            data-testid={`${dataTestId}-multiple-types-table`}
          />
        </div>
      </DataDisplay>
    </div>
  )
}

export default LiquidFundReport
