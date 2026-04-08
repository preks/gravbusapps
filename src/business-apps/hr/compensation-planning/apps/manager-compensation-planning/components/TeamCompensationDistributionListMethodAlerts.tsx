import React from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { formatPerformanceScoreValue } from './managerTeamDistributionFormat'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationDistributionListMethodAlertsProps {
  performanceFallbackToEqual: boolean
  performancePartialScores: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
  sortedMembersLength: number
  loading: boolean
  totalSalaryCostAcrossEmployees: number
  currencyCode: string
  grandTotalPositivePerformanceScores: number
  distributionPool: number | null
  tBudget: TranslateBudget
}

export function TeamCompensationDistributionListMethodAlerts({
  performanceFallbackToEqual,
  performancePartialScores,
  isSalaryCostMethod,
  isPerformanceMethod,
  sortedMembersLength,
  loading,
  totalSalaryCostAcrossEmployees,
  currencyCode,
  grandTotalPositivePerformanceScores,
  distributionPool,
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

      {isPerformanceMethod && sortedMembersLength > 0 && loading === false && performanceFallbackToEqual === false ? (
        <Alert data-testid="manager-team-distribution-performance-basis-alert">
          <AlertDescription>
            {grandTotalPositivePerformanceScores <= 0
              ? tBudget('budget-distribution-performance-zero-total')
              : tBudget('budget-distribution-performance-basis-alert', {
                  total: formatPerformanceScoreValue(grandTotalPositivePerformanceScores),
                  pool:
                    distributionPool != null && distributionPool > 0
                      ? formatCurrency(distributionPool, currencyCode)
                      : '—'
                })}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}
