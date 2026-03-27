import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface OpportunityAggregates {
  count: number
  totalEstimatedAmount: number | null
  avgEstimatedAmount: number | null
  totalInvestmentAmount: number | null
  avgInvestmentAmount: number | null
}

function formatAmount(value: number | null | undefined, currencyCode: string): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export interface OpportunityAggregatesBarProps {
  aggregates: OpportunityAggregates
  displayCurrencyCode?: string
  dataTestId?: string
}

export const OpportunityAggregatesBar: React.FC<OpportunityAggregatesBarProps> = ({
  aggregates,
  displayCurrencyCode = 'EUR',
  dataTestId = 'opportunity-aggregates-bar'
}) => {
  const labelCount = getTranslationFromI18nKeyAndLabel('irm:opportunity.aggregates.count', 'Count:')
  const labelTotalEstimated = getTranslationFromI18nKeyAndLabel(
    'irm:opportunity.aggregates.totalEstimatedAmount',
    'Total Estimated Amount:'
  )
  const labelAvgEstimated = getTranslationFromI18nKeyAndLabel(
    'irm:opportunity.aggregates.avgEstimatedAmount',
    'Average Estimated Amount:'
  )
  const labelTotalInvestment = getTranslationFromI18nKeyAndLabel(
    'irm:opportunity.aggregates.totalInvestmentAmount',
    'Total Investment Amount:'
  )
  const labelAvgInvestment = getTranslationFromI18nKeyAndLabel(
    'irm:opportunity.aggregates.avgInvestmentAmount',
    'Average Investment Amount:'
  )

  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-x-6 gba:gap-y-2 gba:px-1 gba:py-3 gba:border-t gba:border-border gba:bg-muted/40 gba:text-sm"
      data-testid={dataTestId}
    >
      <div data-testid={`${dataTestId}-count`}>
        <span className="gba:text-muted-foreground">{labelCount} </span>
        <span className="gba:font-medium gba:text-foreground">{aggregates.count}</span>
      </div>
      <div data-testid={`${dataTestId}-total-estimated`}>
        <span className="gba:text-muted-foreground">{labelTotalEstimated} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatAmount(aggregates.totalEstimatedAmount, displayCurrencyCode)}
        </span>
      </div>
      <div data-testid={`${dataTestId}-avg-estimated`}>
        <span className="gba:text-muted-foreground">{labelAvgEstimated} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatAmount(aggregates.avgEstimatedAmount, displayCurrencyCode)}
        </span>
      </div>
      <div data-testid={`${dataTestId}-total-investment`}>
        <span className="gba:text-muted-foreground">{labelTotalInvestment} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatAmount(aggregates.totalInvestmentAmount, displayCurrencyCode)}
        </span>
      </div>
      <div data-testid={`${dataTestId}-avg-investment`}>
        <span className="gba:text-muted-foreground">{labelAvgInvestment} </span>
        <span className="gba:font-medium gba:font-mono gba:text-foreground">
          {formatAmount(aggregates.avgInvestmentAmount, displayCurrencyCode)}
        </span>
      </div>
    </div>
  )
}
