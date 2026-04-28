import React, { useMemo } from 'react'
import { ChartPieSliceIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { extractCurrencyCode, formatCurrencyString } from '@/common/utils/numberFormatter'
import { roundMoney2 } from '../../../../utils/budgetAmountPercentSync'
import { cn } from '@/common/utils/cn'

const STAT_ICON_BOX =
  'gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-border gba:bg-muted/40'

function SummaryStatBlock({
  label,
  valueFormatted,
  subtext,
  icon
}: Readonly<{
  label: string
  valueFormatted: string
  subtext: string
  icon: React.ReactNode
}>) {
  return (
    <div
      className={cn(
        'gba:flex gba:h-full gba:min-h-0 gba:flex-col gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-6'
      )}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <span className="gba:min-w-0 gba:flex-1 gba:text-left gba:text-sm gba:font-normal gba:leading-snug gba:text-muted-foreground">
          {label}
        </span>
        <span className={cn(STAT_ICON_BOX, 'gba:text-muted-foreground')} aria-hidden>
          {icon}
        </span>
      </div>
      <p className="gba:mt-4 gba:text-left gba:text-3xl gba:font-bold gba:tabular-nums gba:leading-none gba:tracking-tight gba:text-foreground">
        {valueFormatted}
      </p>
      <p className="gba:mt-3 gba:text-left gba:text-sm gba:font-normal gba:leading-snug gba:text-muted-foreground">
        {subtext}
      </p>
    </div>
  )
}

export interface BudgetDistributionAllocatedSummaryCardProps {
  salaryBudgetAmount: number
  allocationAmount: number
  currencyCode: string
  t: (key: string, args?: Record<string, string | number>) => string
}

export function BudgetDistributionAllocatedSummaryCard({
  salaryBudgetAmount,
  allocationAmount,
  currencyCode,
  t
}: Readonly<BudgetDistributionAllocatedSummaryCardProps>) {
  const { salaryFormatted, allocationFormatted } = useMemo(() => {
    const kpiMoney = {
      currency: extractCurrencyCode(currencyCode),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
    return {
      salaryFormatted: formatCurrencyString(roundMoney2(salaryBudgetAmount), kpiMoney),
      allocationFormatted: formatCurrencyString(roundMoney2(allocationAmount), kpiMoney)
    }
  }, [allocationAmount, currencyCode, salaryBudgetAmount])

  return (
    <div className="gba:w-full" data-testid="budget-distribution-allocated-summary-card">
      <div
        className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2"
        data-testid="budget-distribution-allocated-summary-kpis"
      >
        <SummaryStatBlock
          label={t('budget-distribution-no-pool-summary-salary-budget')}
          valueFormatted={salaryFormatted}
          subtext={t('budget-distribution-no-pool-summary-salary-budget-hint')}
          icon={<CurrencyCircleDollarIcon size={20} weight="regular" aria-hidden />}
        />
        <SummaryStatBlock
          label={t('budget-distribution-no-pool-summary-allocation')}
          valueFormatted={allocationFormatted}
          subtext={t('budget-distribution-no-pool-summary-allocation-hint')}
          icon={<ChartPieSliceIcon size={20} weight="regular" aria-hidden />}
        />
      </div>
    </div>
  )
}
