import React, { useState, useMemo, useCallback } from 'react'
import { DataDisplay, Spinner, AiButton } from '@newwork/nw-design-system'
import { Upload } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AnalyticsFilters } from './types'
import { AnalyticsTable } from './components/LiquidFundReportTable'
import { UseReportFiltersReturn, ColumnConfig, useReportFilters } from '../../hooks'
import { useInvestmentLiquidFundReportCatalog } from './hooks/useInvestmentLiquidFundReportCatalog'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface LiquidFundReportProps extends BusinessAppContextProps {
  'data-testid'?: string
  reportFilters: UseReportFiltersReturn
  onCurrenciesUpdate: (currencies: string[]) => void
  isTransposed: boolean
}

export const LiquidFundReport: React.FC<LiquidFundReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'liquid-fund-analytics',
  reportFilters,
  onCurrenciesUpdate,
  isTransposed
}) => {
  // Section management - Start with Bank Deposits since Overview is removed
  const [currentSection, setCurrentSection] = useState<string>('bank-deposits')

  // Search state
  const [search, setSearch] = useState<string>('')

  // Track total counts for each section
  const [totalCounts, setTotalCounts] = useState<Record<string, { count: number; isLoading: boolean }>>({
    'bank-deposits': { count: 0, isLoading: true },
    'fixed-term-deposits': { count: 0, isLoading: true },
    'multiple-types': { count: 0, isLoading: true }
  })

  // Track initial load state for each section
  const [initialLoadDone, setInitialLoadDone] = useState<Record<string, boolean>>({
    'bank-deposits': false,
    'fixed-term-deposits': false,
    'multiple-types': false
  })

  // Fetch catalog to get columns for each liquid fund type
  const { catalogData } = useInvestmentLiquidFundReportCatalog({ accessToken, userInfo })

  // Map section IDs to liquid fund type codes
  const sectionToLiquidFundTypeCode: Record<string, string> = {
    'bank-deposits': 'BANK_DEPOSITE',
    'fixed-term-deposits': 'FIXED_TERM_DEPOSIT',
    'multiple-types': 'MONEY_MARKET_FUNDS' // Multiple types section - use Money Market Funds as base
  }

  // Define initial columns dynamically based on the ACTIVE SECTION's liquid fund type
  const initialColumns: ColumnConfig[] = useMemo(() => {
    const columns: ColumnConfig[] = [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true }
    ]

    // Get the liquid fund type for the active section
    const activeTypeCode = sectionToLiquidFundTypeCode[currentSection]

    // If catalog is loaded, get columns for the active liquid fund type only
    if (catalogData?.investmentLiquidFundTypes && activeTypeCode) {
      const activeLiquidFundType = catalogData.investmentLiquidFundTypes.find(type => type.code === activeTypeCode)

      if (activeLiquidFundType?.objectValue?.formFields) {
        // Parse objectValue if it's a string
        const parsedObjectValue =
          typeof activeLiquidFundType.objectValue === 'string'
            ? JSON.parse(activeLiquidFundType.objectValue)
            : activeLiquidFundType.objectValue

        parsedObjectValue.formFields?.forEach(group => {
          group.fields.forEach(field => {
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

  // Callback for tables to report their total counts
  const handleTotalCountUpdate = useCallback(
    (sectionId: string, count: number, isLoading: boolean) => {
      setTotalCounts(prev => ({
        ...prev,
        [sectionId]: { count, isLoading }
      }))

      // Mark initial load as done when loading completes
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
    },
    [] // Remove initialLoadDone from dependencies to prevent infinite loops
  )

  // Create filters for specific investment types (Overview removed)
  // Use shared filters from parent (reportFilters) for date range and currency
  const bankDepositFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Bank Deposit',
      search: search || undefined,
      onCurrenciesChange: onCurrenciesUpdate
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      search,
      onCurrenciesUpdate
    ]
  )

  const fixedTermDepositFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Fixed-Term Deposit',
      search: search || undefined,
      onCurrenciesChange: onCurrenciesUpdate
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      search,
      onCurrenciesUpdate
    ]
  )

  const multipleTypesFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Money Market Funds,Pension Fund,Equity,Bond', // Multiple types separated by comma
      search: search || undefined,
      onCurrenciesChange: onCurrenciesUpdate
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      search,
      onCurrenciesUpdate
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

  // Secondary action for "Upload Report" - using AiButton like in record
  const secondaryActions = useMemo(() => {
    return (
      <AppAction
        contexts={[{ context: FlowContextName.investmentReportUpload, contextData: {} }]}
        accessToken={accessToken || ''}
        emptyState="hide"
        prefixDataTestId="report-view-upload-report"
      >
        <AiButton
          variant="default"
          size="default"
          showIcon={true}
          icon={<Upload style={{ height: '1rem', width: '1rem' }} />}
          iconPosition="before"
          data-testid="report-view-upload-report-button"
        >
          {getTranslationFromI18nKeyAndLabel('investment.reports.uploadReport', 'Upload Report')}
        </AiButton>
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
        primaryAction={primaryActions}
        secondaryActions={secondaryActions}
        toolbarDensity="default"
      >
        {/* Render all sections to load data in parallel, but only show active one */}
        <div style={{ display: currentSection === 'bank-deposits' ? 'block' : 'none' }}>
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={bankDepositFilters}
            investmentType="Bank Deposits"
            isTransposed={isTransposed}
            visibleColumns={visibleColumns}
            onTotalCountChange={(count, isLoading) => handleTotalCountUpdate('bank-deposits', count, isLoading)}
            data-testid={`${dataTestId}-bank-deposits-table`}
            isInitialLoad={!initialLoadDone['bank-deposits']}
          />
        </div>
        <div style={{ display: currentSection === 'fixed-term-deposits' ? 'block' : 'none' }}>
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={fixedTermDepositFilters}
            investmentType="Fixed-Term Deposits"
            isTransposed={isTransposed}
            visibleColumns={visibleColumns}
            onTotalCountChange={(count, isLoading) => handleTotalCountUpdate('fixed-term-deposits', count, isLoading)}
            data-testid={`${dataTestId}-fixed-term-deposits-table`}
            isInitialLoad={!initialLoadDone['fixed-term-deposits']}
          />
        </div>
        <div style={{ display: currentSection === 'multiple-types' ? 'block' : 'none' }}>
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={multipleTypesFilters}
            investmentType="Multiple Investment Types"
            isTransposed={isTransposed}
            visibleColumns={visibleColumns}
            onTotalCountChange={(count, isLoading) => handleTotalCountUpdate('multiple-types', count, isLoading)}
            data-testid={`${dataTestId}-multiple-types-table`}
            isInitialLoad={!initialLoadDone['multiple-types']}
          />
        </div>
      </DataDisplay>
    </div>
  )
}

export default LiquidFundReport
