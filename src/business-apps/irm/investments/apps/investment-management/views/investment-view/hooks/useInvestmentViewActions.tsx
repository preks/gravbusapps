import React, { useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentExport } from './useInvestmentExport'
import type { InvestmentGroup } from './useInvestmentGroups'
import type { InvestmentListColumnConfiguration } from '../utils/investmentListColumnTransformer'
import { CurrencyFilter } from '../../analytics-view/shared/components/CurrencyFilter'

interface UseInvestmentViewActionsOptions {
  accessToken: string | undefined
  currentSection: string
  currentState: any
  selectedFilters: Record<string, any>
  selectedCurrency: string
  currencyCodes: string[]
  onCurrencyChange: (currency: string) => void
  investmentGroups: InvestmentGroup[]
  activeGroup: InvestmentGroup | undefined
  activeColumnConfig: InvestmentListColumnConfiguration | undefined
  activeTabCount: number
  displayCurrencyCode: string
}

export const useInvestmentViewActions = ({
  accessToken,
  currentSection,
  currentState,
  selectedFilters,
  selectedCurrency,
  currencyCodes,
  onCurrencyChange,
  investmentGroups,
  activeGroup,
  activeColumnConfig,
  activeTabCount,
  displayCurrencyCode
}: UseInvestmentViewActionsOptions) => {
  const primaryAction = useMemo(() => {
    const actionContext =
      currentSection === 'overview'
        ? {
            context: FlowContextName.investmentCreate,
            contextData: {
              fromView: 'investments',
              fromSubView: 'overview',
              investmentGroupSelection: 'manual'
            }
          }
        : activeGroup
          ? {
              context: FlowContextName.investmentCreate,
              contextData: {
                investmentGroup: activeGroup.id,
                fromView: 'investments',
                fromSubView: activeGroup.tabId,
                investmentGroupSelection: 'auto'
              }
            }
          : null

    if (!actionContext) return null

    const label =
      currentSection === 'overview'
        ? getTranslationFromI18nKeyAndLabel('investment:investment.addInvestment', 'Add Investment')
        : `Add ${activeGroup?.label || 'Investment'}`

    return (
      <AppAction
        variant="create-primary"
        contexts={[actionContext]}
        accessToken={accessToken || ''}
        data-testid={`${currentSection}-add-action`}
        emptyState="hide"
      >
        {label}
      </AppAction>
    )
  }, [accessToken, activeGroup, currentSection])

  const exportFilenamePrefix =
    currentSection === 'overview'
      ? 'investments'
      : activeGroup?.label?.toLowerCase().replace(/\s+/g, '-') || 'investments'
  const { isExporting, handleExportCsv, handleExportExcel } = useInvestmentExport({
    accessToken: accessToken || '',
    currentState,
    selectedFilters,
    currentSection,
    investmentGroups,
    totalCount: activeTabCount,
    filenamePrefix: exportFilenamePrefix,
    displayCurrencyCode,
    ...(activeColumnConfig ? { columnConfig: activeColumnConfig } : {})
  })

  const secondaryActions = (
    <>
      <CurrencyFilter
        value={selectedCurrency}
        currencies={currencyCodes}
        onChange={onCurrencyChange}
        allOptionLabel={getTranslationFromI18nKeyAndLabel('currency.filter.all', 'All')}
        dataTestId="investment-view-currency-filter"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleExportCsv}
        disabled={isExporting || activeTabCount === 0}
        title={isExporting ? 'Exporting…' : `Export ${activeTabCount} investments as CSV`}
        data-testid="export-investments-csv"
      >
        <DownloadIcon size={16} />
        CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExportExcel}
        disabled={isExporting || activeTabCount === 0}
        title={isExporting ? 'Exporting…' : `Export ${activeTabCount} investments as Excel`}
        data-testid="export-investments-excel"
      >
        <FileXlsIcon size={16} />
        Excel
      </Button>
    </>
  )

  return { primaryAction, secondaryActions }
}
