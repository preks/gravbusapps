import React, { useState, useMemo, useCallback } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Tabs, TabsContent, TabsList, TabsTrigger, Spinner } from '@newwork/nw-design-system'
import { Landmark, Clock, Layers } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AnalyticsFilters } from './types'
import { AnalyticsTable } from './components/LiquidFundReportTable'
import { ReportFilterPanel, useReportFilters, ColumnConfig } from '../components/shared'
import { useInvestmentLiquidFundReportCatalog } from './hooks/useInvestmentLiquidFundReportCatalog'

// Using separate DatePicker components for start and end dates

interface LiquidFundReportProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const LiquidFundReport: React.FC<LiquidFundReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'liquid-fund-analytics'
}) => {
  // Sub-tab management - Start with Bank Deposits since Overview is removed
  const [activeSubTab, setActiveSubTab] = useState<string>('tab1')

  // Fetch catalog to get columns for each liquid fund type
  const { catalogData } = useInvestmentLiquidFundReportCatalog({ accessToken, userInfo })

  // Map tab IDs to liquid fund type codes
  const tabToLiquidFundTypeCode: Record<string, string> = {
    tab1: 'BANK_DEPOSITE',
    tab2: 'FIXED_TERM_DEPOSIT',
    tab3: 'MONEY_MARKET_FUNDS' // Multiple types tab - use Money Market Funds as base
  }

  // Define initial columns dynamically based on the ACTIVE TAB's liquid fund type
  const initialColumns: ColumnConfig[] = useMemo(() => {
    const columns: ColumnConfig[] = [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true }
    ]

    // Get the liquid fund type for the active tab
    const activeTypeCode = tabToLiquidFundTypeCode[activeSubTab]

    // If catalog is loaded, get columns for the active liquid fund type only
    if (catalogData?.investmentLiquidFundTypes && activeTypeCode) {
      const activeLiquidFundType = catalogData.investmentLiquidFundTypes.find(type => type.code === activeTypeCode)

      if (activeLiquidFundType?.objectValue?.formFields) {
        activeLiquidFundType.objectValue.formFields.forEach(group => {
          group.fields.forEach(field => {
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

  // Create filters for specific investment types (Overview removed)
  const bankDepositFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Bank Deposit',
      onCurrenciesChange: handleCurrenciesUpdate
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      handleCurrenciesUpdate
    ]
  )

  const fixedTermDepositFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Fixed-Term Deposit',
      onCurrenciesChange: handleCurrenciesUpdate
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      handleCurrenciesUpdate
    ]
  )

  const multipleTypesFilters = useMemo(
    (): AnalyticsFilters => ({
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: 'Money Market Funds,Pension Fund,Equity,Bond', // Multiple types separated by comma
      onCurrenciesChange: handleCurrenciesUpdate
    }),
    [
      reportFilters.computedFilters.startDate,
      reportFilters.computedFilters.endDate,
      reportFilters.computedFilters.currencyIds,
      handleCurrenciesUpdate
    ]
  )

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
      {/* Filters Section */}
      <ReportFilterPanel
        filters={reportFilters}
        accessToken={accessToken}
        availableCurrencyIds={Array.from(availableCurrencies)}
        variant="simple"
        title={getTranslationFromI18nKeyAndLabel('filters.title', 'Filters')}
        data-testid={`${dataTestId}-filters`}
      />

      {/* Analytics Tables with Sub-tabs - Overview removed */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
          <TabsTrigger value="tab1" startIcon={<Landmark />} data-testid={`${dataTestId}-tab1`}>
            Bank Deposits
          </TabsTrigger>
          <TabsTrigger value="tab2" startIcon={<Clock />} data-testid={`${dataTestId}-tab2`}>
            Fixed-Term Deposits
          </TabsTrigger>
          <TabsTrigger value="tab3" startIcon={<Layers />} data-testid={`${dataTestId}-tab3`}>
            Multiple Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tab1" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={bankDepositFilters}
            investmentType="Bank Deposits"
            title="Liquid Fund Analytics - Bank Deposits"
            isTransposed={reportFilters.isTransposed}
            visibleColumns={reportFilters.visibleColumns}
            data-testid={`${dataTestId}-bank-deposits-table`}
          />
        </TabsContent>

        <TabsContent value="tab2" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={fixedTermDepositFilters}
            investmentType="Fixed-Term Deposits"
            title="Liquid Fund Analytics - Fixed-Term Deposits"
            isTransposed={reportFilters.isTransposed}
            visibleColumns={reportFilters.visibleColumns}
            data-testid={`${dataTestId}-fixed-term-deposits-table`}
          />
        </TabsContent>

        <TabsContent value="tab3" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={multipleTypesFilters}
            investmentType="Multiple Investment Types"
            title="Liquid Fund Analytics - Money Market, Pension, Equity & Bond"
            isTransposed={reportFilters.isTransposed}
            visibleColumns={reportFilters.visibleColumns}
            data-testid={`${dataTestId}-multiple-types-table`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LiquidFundReport
