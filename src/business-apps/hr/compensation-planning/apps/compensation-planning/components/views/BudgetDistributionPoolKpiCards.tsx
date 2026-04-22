import React, { useMemo } from 'react'
import { ChartPieSliceIcon, CoinsIcon } from '@phosphor-icons/react'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { extractCurrencyCode, formatCurrencyString } from '@/common/utils/numberFormatter'
import { roundMoney2 } from '../../../../utils/budgetAmountPercentSync'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import { budgetDistributionMethodTitleKey } from './BudgetDistributionMethodSelector'

const KPI_COLORS = {
  pool: 'var(--nw-color-success-500)',
  remaining: 'var(--nw-color-info-500)'
} as const

export interface BudgetDistributionPoolKpiCardsProps {
  pool: number
  allocationByOrgUnitId: ReadonlyMap<string, number>
  currencyCode: string
  selectedMethod: DistributionMethod
  loading: boolean
  t: (key: string, args?: Record<string, string | number>) => string
}

export function BudgetDistributionPoolKpiCards({
  pool,
  allocationByOrgUnitId,
  currencyCode,
  selectedMethod,
  loading,
  t
}: Readonly<BudgetDistributionPoolKpiCardsProps>) {
  const totalPreviewAllocated = useMemo(() => {
    let sum = 0
    for (const v of allocationByOrgUnitId.values()) {
      sum += v
    }
    return roundMoney2(sum)
  }, [allocationByOrgUnitId])

  const widgets = useMemo((): WidgetItem[] => {
    const kpiMoney = {
      currency: extractCurrencyCode(currencyCode),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
    const remaining = roundMoney2(Math.max(0, pool - totalPreviewAllocated))
    return [
      {
        key: 'budget-distribution-kpi-pool',
        title: t('budget-distribution-pool-primary-label'),
        value: formatCurrencyString(pool, kpiMoney),
        valueIsString: true,
        prefix: <CoinsIcon size={24} aria-hidden />,
        color: KPI_COLORS.pool,
        span: { xs: 24, sm: 12, lg: 12 },
        description: t('budget-distribution-using-method', {
          method: t(budgetDistributionMethodTitleKey(selectedMethod))
        })
      },
      {
        key: 'budget-distribution-kpi-remaining',
        title: t('budget-distribution-kpi-remaining-title'),
        value: formatCurrencyString(remaining, kpiMoney),
        valueIsString: true,
        prefix: <ChartPieSliceIcon size={24} aria-hidden />,
        color: KPI_COLORS.remaining,
        span: { xs: 24, sm: 12, lg: 12 }
      }
    ]
  }, [currencyCode, pool, selectedMethod, t, totalPreviewAllocated])

  return (
    <WidgetGroup
      className="gba:py-0"
      isLoading={loading}
      widgets={widgets}
      skeletonCount={2}
      cardsClassName="gba:sm:grid-cols-2"
      data-testid="budget-distribution-kpi-cards"
    />
  )
}
