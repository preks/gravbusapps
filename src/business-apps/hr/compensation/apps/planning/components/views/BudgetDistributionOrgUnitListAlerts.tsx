import React from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'

type BudgetDistributionTranslate = (key: string, args?: Record<string, string | number>) => string

export interface BudgetDistributionOrgUnitListAlertsProps {
  t: BudgetDistributionTranslate
  hasSelectedPlan: boolean
  departmentCount: number
  loading: boolean
  performanceFallbackToHeadcount: boolean
  performancePartialScores: boolean
  isSalaryCostMethod: boolean
  totalSalaryCostAcrossOrgUnits: number
  currencyCode: string
}

export function BudgetDistributionOrgUnitListAlerts({
  t,
  hasSelectedPlan,
  departmentCount,
  loading,
  performanceFallbackToHeadcount,
  performancePartialScores,
  isSalaryCostMethod,
  totalSalaryCostAcrossOrgUnits,
  currencyCode
}: Readonly<BudgetDistributionOrgUnitListAlertsProps>) {
  const showMethodAlerts = hasSelectedPlan && departmentCount > 0 && !loading

  return (
    <>
      {performanceFallbackToHeadcount ? (
        <Alert data-testid="budget-distribution-performance-fallback-alert">
          <AlertDescription>{t('budget-distribution-performance-fallback-headcount')}</AlertDescription>
        </Alert>
      ) : null}

      {performancePartialScores ? (
        <Alert data-testid="budget-distribution-performance-partial-alert">
          <AlertDescription>{t('budget-distribution-performance-partial-scores')}</AlertDescription>
        </Alert>
      ) : null}

      {isSalaryCostMethod && showMethodAlerts ? (
        <Alert data-testid="budget-distribution-salary-cost-basis-alert">
          <AlertDescription>
            {totalSalaryCostAcrossOrgUnits <= 0
              ? t('budget-distribution-salary-cost-zero-total')
              : t('budget-distribution-salary-cost-basis-alert', {
                  total: formatCurrency(totalSalaryCostAcrossOrgUnits, currencyCode)
                })}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}
