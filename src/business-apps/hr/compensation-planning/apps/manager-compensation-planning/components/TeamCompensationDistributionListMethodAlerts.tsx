import React from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationDistributionListMethodAlertsProps {
  performanceFallbackToEqual: boolean
  performancePartialScores: boolean
  isSalaryCostMethod: boolean
  sortedMembersLength: number
  loading: boolean
  totalSalaryCostAcrossEmployees: number
  currencyCode: string
  tBudget: TranslateBudget
}

export function TeamCompensationDistributionListMethodAlerts({
  performanceFallbackToEqual,
  performancePartialScores,
  isSalaryCostMethod,
  sortedMembersLength,
  loading,
  totalSalaryCostAcrossEmployees,
  currencyCode,
  tBudget
}: Readonly<TeamCompensationDistributionListMethodAlertsProps>) {
  return (
    <>
      {performanceFallbackToEqual ? (
        <Alert data-testid="manager-team-distribution-performance-fallback-equal-alert">
          <AlertDescription>{tBudget('manager-team-distribution-performance-fallback-equal')}</AlertDescription>
        </Alert>
      ) : null}

      {performancePartialScores ? (
        <Alert data-testid="manager-team-distribution-performance-partial-alert">
          <AlertDescription>{tBudget('manager-team-distribution-performance-partial-scores')}</AlertDescription>
        </Alert>
      ) : null}

      {isSalaryCostMethod && sortedMembersLength > 0 && loading === false ? (
        <Alert data-testid="manager-team-distribution-salary-cost-basis-alert">
          <AlertDescription>
            {totalSalaryCostAcrossEmployees <= 0
              ? tBudget('budget-distribution-salary-cost-zero-total')
              : tBudget('budget-distribution-salary-cost-basis-alert', {
                  total: formatCurrency(totalSalaryCostAcrossEmployees, currencyCode)
                })}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}
