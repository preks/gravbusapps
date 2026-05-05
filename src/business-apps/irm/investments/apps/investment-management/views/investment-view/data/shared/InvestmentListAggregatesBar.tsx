import React from 'react'
import type { InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatFlatCurrencyAmount } from './investmentAggregatesFormat'

export interface InvestmentListAggregatesBarProps {
  listAggregates: InvestmentListAggregates
  dataTestIdPrefix: string
  /** Display currency for flat totals (multi-currency not yet modeled in aggregates). */
  displayCurrencyCode?: string
}

/**
 * Summary strip below the investment DataTable: filtered count and server-side numeric totals.
 */
export const InvestmentListAggregatesBar: React.FC<InvestmentListAggregatesBarProps> = ({
  listAggregates,
  dataTestIdPrefix,
  displayCurrencyCode = 'EUR'
}) => {
  const labelFilteredCount = getTranslationFromI18nKeyAndLabel(
    'investment:list.aggregates.investmentsFiltered',
    'Investments (filtered):'
  )
  const labelTotalInvestment = getTranslationFromI18nKeyAndLabel(
    'investment:list.aggregates.totalInvestment',
    'Total investment:'
  )
  const labelMarketValue = getTranslationFromI18nKeyAndLabel('investment:list.aggregates.marketValue', 'Market value:')
  const labelAvgTotalInvestment = getTranslationFromI18nKeyAndLabel(
    'investment:list.aggregates.avgTotalInvestment',
    'Average investment:'
  )
  const labelAvgMarketValue = getTranslationFromI18nKeyAndLabel(
    'investment:list.aggregates.avgMarketValue',
    'Average market value:'
  )
  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-x-6 gba:gap-y-2 gba:px-1 gba:py-3 gba:border-t gba:border-border gba:bg-muted/40 gba:text-sm"
      data-testid={`${dataTestIdPrefix}-aggregates-bar`}
    >
      <div data-testid={`${dataTestIdPrefix}-aggregate-count`}>
        <span className="gba:text-muted-foreground">{labelFilteredCount} </span>
        <span className="gba:font-medium gba:text-foreground">{listAggregates.count}</span>
      </div>
      <div data-testid={`${dataTestIdPrefix}-aggregate-total-investment`}>
        <span className="gba:text-muted-foreground">{labelTotalInvestment} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatFlatCurrencyAmount(listAggregates.totalInvestmentAmount, displayCurrencyCode)}
        </span>
      </div>
      <div data-testid={`${dataTestIdPrefix}-aggregate-avg-total-investment`}>
        <span className="gba:text-muted-foreground">{labelAvgTotalInvestment} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatFlatCurrencyAmount(listAggregates.avgTotalInvestmentAmount, displayCurrencyCode)}
        </span>
      </div>
      <div data-testid={`${dataTestIdPrefix}-aggregate-market-value`}>
        <span className="gba:text-muted-foreground">{labelMarketValue} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatFlatCurrencyAmount(listAggregates.investmentMarketValue, displayCurrencyCode)}
        </span>
      </div>
      <div data-testid={`${dataTestIdPrefix}-aggregate-avg-market-value`}>
        <span className="gba:text-muted-foreground">{labelAvgMarketValue} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatFlatCurrencyAmount(listAggregates.avgInvestmentMarketValue, displayCurrencyCode)}
        </span>
      </div>
    </div>
  )
}
