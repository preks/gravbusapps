import React, { useMemo } from 'react'
import type { InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getPerformanceColorClass, getPerformanceSign } from './investmentPerformanceDisplay'
import { computePortfolioPerformanceFromSums, formatFlatCurrencyAmount } from './investmentAggregatesFormat'

export interface InvestmentListAggregatesBarProps {
  listAggregates: InvestmentListAggregates
  /** When true, show EBITDA and portfolio performance derived from sums (equity tab). */
  showEquityMetrics: boolean
  dataTestIdPrefix: string
  /** Display currency for flat totals (multi-currency not yet modeled in aggregates). */
  displayCurrencyCode?: string
}

/**
 * Summary strip below the investment DataTable: filtered count and server-side numeric totals.
 */
export const InvestmentListAggregatesBar: React.FC<InvestmentListAggregatesBarProps> = ({
  listAggregates,
  showEquityMetrics,
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
  const labelPerformance = getTranslationFromI18nKeyAndLabel(
    'investment:list.aggregates.performancePortfolio',
    'Performance (portfolio):'
  )
  const labelEbitda = getTranslationFromI18nKeyAndLabel('investment:list.aggregates.ebitdaSum', 'EBITDA (sum):')
  const labelEbitdaAvg = getTranslationFromI18nKeyAndLabel('investment:list.aggregates.ebitdaAvg', 'EBITDA (average):')

  const performance = useMemo(
    () =>
      computePortfolioPerformanceFromSums(listAggregates.totalInvestmentAmount, listAggregates.investmentMarketValue),
    [listAggregates.totalInvestmentAmount, listAggregates.investmentMarketValue]
  )

  const perfAbsFormatted = formatFlatCurrencyAmount(Math.abs(performance.amount), displayCurrencyCode)
  const perfSign = getPerformanceSign(performance.amount === 0, performance.amount > 0)
  const perfPct = performance.percent != null ? `${perfSign}${Math.abs(performance.percent).toFixed(2)}%` : '—'

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
      {showEquityMetrics && (
        <>
          <div
            className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-x-1"
            data-testid={`${dataTestIdPrefix}-aggregate-performance`}
          >
            <span className="gba:text-muted-foreground">{labelPerformance} </span>
            <span className={`gba:font-medium gba:font-mono ${getPerformanceColorClass(performance.amount, 'amount')}`}>
              {performance.amount === 0 ? '' : perfSign}
              {perfAbsFormatted}
            </span>
            <span className={`gba:ml-1 ${getPerformanceColorClass(performance.percent ?? 0, 'percentage')}`}>
              ({perfPct})
            </span>
          </div>
          <div data-testid={`${dataTestIdPrefix}-aggregate-ebitda`}>
            <span className="gba:text-muted-foreground">{labelEbitda} </span>
            <span className="gba:font-medium gba:font-mono gba:text-foreground">
              {formatFlatCurrencyAmount(listAggregates.ebitdaAmount, displayCurrencyCode)}
            </span>
          </div>
          <div data-testid={`${dataTestIdPrefix}-aggregate-avg-ebitda`}>
            <span className="gba:text-muted-foreground">{labelEbitdaAvg} </span>
            <span className="gba:font-medium gba:font-mono gba:text-foreground">
              {formatFlatCurrencyAmount(listAggregates.avgEbitdaAmount, displayCurrencyCode)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
