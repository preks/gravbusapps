import React, { useCallback, useMemo } from 'react'
import { Alert, AlertDescription, Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { BudgetDistributionCustomOrgUnitInputs } from '../../compensation-planning/components/views/BudgetDistributionCustomOrgUnitInputs'
import { BudgetDistributionDepartmentsPagination } from '../../compensation-planning/components/views/BudgetDistributionDepartmentsPagination'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../compensation-planning/components/views/budgetDistributionCustomTypes'
import { useDepartmentPagination } from '../../compensation-planning/components/views/useDepartmentPagination'
import { formatPercentOfPool, formatPerformanceScoreValue, formatShareOfTotal } from './managerTeamDistributionFormat'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationEmployeeDistributionListProps {
  sortedMembers: TeamMemberCompensationData[]
  distributionPool: number | null
  allocationByEmployeeId: ReadonlyMap<string, number>
  currencyCode: string
  loading: boolean
  error: string | null
  selectedMethod: DistributionMethod
  customBudgetByEmployeeId: Record<string, OrgUnitCustomBudgetInput>
  onCustomAmountRawChange: (employeeId: string, value: string) => void
  onCustomPercentRawChange: (employeeId: string, value: string) => void
  onCustomModeChange: (employeeId: string, mode: CustomBudgetInputMode) => void
  performanceFallbackToEqual: boolean
  performancePartialScores: boolean
  totalSalaryCostAcrossEmployees: number
  grandTotalPositivePerformanceScores: number
  cardTitle: string
  tBudget: TranslateBudget
  emptyMessage: string
}

export function TeamCompensationEmployeeDistributionList({
  sortedMembers,
  distributionPool,
  allocationByEmployeeId,
  currencyCode,
  loading,
  error,
  selectedMethod,
  customBudgetByEmployeeId,
  onCustomAmountRawChange,
  onCustomPercentRawChange,
  onCustomModeChange,
  performanceFallbackToEqual,
  performancePartialScores,
  totalSalaryCostAcrossEmployees,
  grandTotalPositivePerformanceScores,
  cardTitle,
  tBudget,
  emptyMessage
}: Readonly<TeamCompensationEmployeeDistributionListProps>) {
  const isCustom = selectedMethod === 'custom'
  const isSalaryCostMethod = selectedMethod === 'proportional_salary_cost'
  const isPerformanceMethod = selectedMethod === 'performance_weighted'

  const poolForCustomContext = distributionPool != null && distributionPool > 0 ? distributionPool : null

  const totalCustomAllocated = useMemo(
    () => sortedMembers.reduce((sum, m) => sum + (allocationByEmployeeId.get(m.employeeId) ?? 0), 0),
    [sortedMembers, allocationByEmployeeId]
  )

  const sequentialPoolRemainingByEmployeeId = useMemo(() => {
    const map = new Map<string, number>()
    const pool = distributionPool != null && distributionPool > 0 ? distributionPool : null
    if (pool == null) {
      return map
    }
    let cumulative = 0
    for (const m of sortedMembers) {
      cumulative += allocationByEmployeeId.get(m.employeeId) ?? 0
      map.set(m.employeeId, pool - cumulative)
    }
    return map
  }, [sortedMembers, allocationByEmployeeId, distributionPool])

  const listItems = useMemo(() => sortedMembers.map(m => ({ id: m.employeeId })), [sortedMembers])

  const {
    pagedItems: pagedIds,
    pageIndex,
    setPageIndex,
    totalPages,
    showPagination
  } = useDepartmentPagination(listItems)

  const pagedMemberSet = useMemo(() => new Set(pagedIds.map(p => p.id)), [pagedIds])

  const pagedMembers = useMemo(
    () => sortedMembers.filter(m => pagedMemberSet.has(m.employeeId)),
    [sortedMembers, pagedMemberSet]
  )

  const goPrev = useCallback(() => {
    setPageIndex(p => Math.max(0, p - 1))
  }, [setPageIndex])

  const goNext = useCallback(() => {
    setPageIndex(p => Math.min(totalPages - 1, p + 1))
  }, [setPageIndex, totalPages])

  return (
    <Card className="gba:w-full" data-testid="manager-team-distribution-employee-list">
      <CardHeader className="gba:flex gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-3 gba:space-y-0">
        <CardTitle className="gba:text-base">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-6">
            <Spinner />
          </div>
        ) : null}

        {error ? (
          <p className="gba:text-sm gba:text-destructive" data-testid="manager-team-distribution-list-error">
            {error}
          </p>
        ) : null}

        {loading === false && sortedMembers.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="manager-team-distribution-list-empty">
            {emptyMessage}
          </p>
        ) : null}

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

        {isSalaryCostMethod && sortedMembers.length > 0 && loading === false ? (
          <Alert data-testid="manager-team-distribution-salary-cost-basis-alert">
            <AlertDescription>
              {totalSalaryCostAcrossEmployees <= 0
                ? tBudget('budget-distribution-salary-cost-zero-total')
                : tBudget('budget-distribution-salary-cost-basis-alert', {
                    total: formatCurrency(totalSalaryCostAcrossEmployees, currencyCode),
                    pool:
                      distributionPool != null && distributionPool > 0
                        ? formatCurrency(distributionPool, currencyCode)
                        : '—'
                  })}
            </AlertDescription>
          </Alert>
        ) : null}

        {isPerformanceMethod &&
        sortedMembers.length > 0 &&
        loading === false &&
        performanceFallbackToEqual === false ? (
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

        {sortedMembers.length > 0 && loading === false ? (
          <>
            <ul className="gba:divide-y gba:divide-border gba:rounded-md gba:border gba:border-border gba:min-w-0">
              {isCustom ? (
                <li
                  className="gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-center gba:gap-x-4 gba:border-b gba:border-border gba:bg-muted/40 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground"
                  data-testid="manager-team-distribution-custom-column-headers"
                >
                  <span>{tBudget('manager-team-distribution-col-employee')}</span>
                  <span>{tBudget('budget-distribution-custom-column-amount')}</span>
                  <span>{tBudget('budget-distribution-custom-column-details')}</span>
                </li>
              ) : null}
              {pagedMembers.map(member => {
                const amount = allocationByEmployeeId.get(member.employeeId) ?? 0
                const poolPercentPoints = formatPercentOfPool(amount, distributionPool)
                const annual = member.currentAnnualSalary ?? 0
                const score = member.performanceOverallScore ?? 0
                return (
                  <li
                    key={member.employeeId}
                    className={
                      isCustom
                        ? 'gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-start gba:gap-x-4 gba:gap-y-2 gba:px-4 gba:py-3'
                        : 'gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3'
                    }
                    data-testid={`manager-team-distribution-row-${member.employeeId}`}
                  >
                    <div className={isCustom ? 'gba:min-w-0' : 'gba:min-w-0 gba:flex-1'}>
                      <div className="gba:font-medium gba:text-foreground">{member.displayName}</div>
                      {member.jobPosition ? (
                        <div className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground">{member.jobPosition}</div>
                      ) : null}
                      {isSalaryCostMethod && !isCustom ? (
                        <div
                          className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
                          data-testid={`manager-team-distribution-salary-${member.employeeId}`}
                        >
                          {tBudget('budget-distribution-salary-cost-row-detail', {
                            salary: formatCurrency(annual, currencyCode),
                            share: formatShareOfTotal(annual, totalSalaryCostAcrossEmployees)
                          })}
                        </div>
                      ) : null}
                      {isPerformanceMethod && !isCustom && !performanceFallbackToEqual ? (
                        <div
                          className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
                          data-testid={`manager-team-distribution-performance-${member.employeeId}`}
                        >
                          {tBudget('budget-distribution-performance-row-detail', {
                            sum: formatPerformanceScoreValue(score),
                            share: formatShareOfTotal(score, grandTotalPositivePerformanceScores)
                          })}
                        </div>
                      ) : null}
                    </div>
                    {isCustom ? (
                      <BudgetDistributionCustomOrgUnitInputs
                        orgUnitId={member.employeeId}
                        currencyCode={currencyCode}
                        amount={amount}
                        distributionPool={distributionPool}
                        poolRemainingSequential={sequentialPoolRemainingByEmployeeId.get(member.employeeId) ?? null}
                        customBudget={customBudgetByEmployeeId[member.employeeId]}
                        onAmountRawChange={onCustomAmountRawChange}
                        onPercentRawChange={onCustomPercentRawChange}
                        onModeChange={onCustomModeChange}
                        t={tBudget}
                      />
                    ) : (
                      <span className="gba:flex gba:shrink-0 gba:flex-wrap gba:items-baseline gba:justify-end gba:gap-x-2 gba:text-right">
                        <span
                          className="gba:tabular-nums gba:text-foreground"
                          data-testid={`manager-team-distribution-allocation-${member.employeeId}`}
                        >
                          {formatCurrency(amount, currencyCode)}
                        </span>
                        {poolPercentPoints === null ? null : (
                          <span
                            className="gba:text-sm gba:tabular-nums gba:text-muted-foreground"
                            data-testid={`manager-team-distribution-pool-percent-${member.employeeId}`}
                          >
                            {tBudget('budget-distribution-allocation-pool-percent', {
                              percent: poolPercentPoints
                            })}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            {showPagination ? (
              <BudgetDistributionDepartmentsPagination
                pageIndex={pageIndex}
                totalPages={totalPages}
                onPrev={goPrev}
                onNext={goNext}
                t={tBudget as (key: string, args?: Record<string, unknown>) => string}
              />
            ) : null}
            {isCustom && poolForCustomContext != null && totalCustomAllocated > poolForCustomContext + 0.01 ? (
              <div className="gba:pt-2" data-testid="manager-team-distribution-custom-exceeds">
                <Alert data-testid="manager-team-distribution-custom-exceeds-pool-alert">
                  <AlertDescription>
                    {tBudget('budget-distribution-custom-exceeds-pool', {
                      total: formatCurrency(totalCustomAllocated, currencyCode),
                      pool: formatCurrency(poolForCustomContext, currencyCode),
                      diff: formatCurrency(totalCustomAllocated - poolForCustomContext, currencyCode)
                    })}
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
