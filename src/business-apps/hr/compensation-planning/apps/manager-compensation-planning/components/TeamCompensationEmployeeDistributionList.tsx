import React, { useCallback, useMemo } from 'react'
import { Alert, AlertDescription, Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS } from '../../compensation-planning/components/views/budgetDistributionDepartmentGrid'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../compensation-planning/components/views/budgetDistributionCustomTypes'
import { BudgetDistributionDepartmentsPagination } from '../../compensation-planning/components/views/BudgetDistributionDepartmentsPagination'
import { useDepartmentPagination } from '../../compensation-planning/components/views/useDepartmentPagination'
import { formatPerformanceScoreValue } from './managerTeamDistributionFormat'
import { TeamCompensationEmployeeDistributionMemberRow } from './TeamCompensationEmployeeDistributionMemberRow'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationEmployeeDistributionListProps {
  /** When true, omit outer Card (used inside split-panel layout next to method list). */
  embedded?: boolean
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
  /** When true, custom allocation inputs are read-only (e.g. after proposals are submitted). */
  inputsDisabled?: boolean
}

export function TeamCompensationEmployeeDistributionList({
  embedded = false,
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
  emptyMessage,
  inputsDisabled = false
}: Readonly<TeamCompensationEmployeeDistributionListProps>) {
  const isCustom = selectedMethod === 'custom'
  const isSalaryCostMethod = selectedMethod === 'proportional_salary_cost'
  const isPerformanceMethod = selectedMethod === 'performance_weighted'

  const poolForCustomContext = distributionPool != null && distributionPool > 0 ? distributionPool : null

  const totalCustomAllocated = useMemo(
    () => sortedMembers.reduce((sum, m) => sum + (allocationByEmployeeId.get(m.employeeId) ?? 0), 0),
    [sortedMembers, allocationByEmployeeId]
  )

  const customPoolUnallocatedGlobal = useMemo(() => {
    if (poolForCustomContext == null) {
      return null
    }
    return poolForCustomContext - totalCustomAllocated
  }, [poolForCustomContext, totalCustomAllocated])

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

  const listBody = (
    <div className="gba:space-y-4">
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
                  total: formatCurrency(totalSalaryCostAcrossEmployees, currencyCode)
                })}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPerformanceMethod && sortedMembers.length > 0 && loading === false && performanceFallbackToEqual === false ? (
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
          <div
            className="gba:min-w-0 gba:overflow-x-auto gba:rounded-md gba:border gba:border-border"
            data-testid="manager-team-distribution-table-scroll"
          >
            <ul className="gba:min-w-[28rem] gba:divide-y gba:divide-border">
              {isCustom ? null : (
                <li
                  className={`${BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS} gba:sticky gba:top-0 gba:z-10 gba:border-b gba:border-border gba:bg-background/95 gba:px-4 gba:py-2 gba:backdrop-blur-sm gba:text-xs gba:font-medium gba:text-muted-foreground`}
                  data-testid="manager-team-distribution-standard-column-headers"
                >
                  <span>{tBudget('manager-team-distribution-col-employee')}</span>
                  <span className="gba:text-right">{tBudget('budget-distribution-col-allocation')}</span>
                  <span className="gba:text-right">{tBudget('budget-distribution-col-pool-share')}</span>
                </li>
              )}
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
              {pagedMembers.map(member => (
                <TeamCompensationEmployeeDistributionMemberRow
                  key={member.employeeId}
                  member={member}
                  isCustom={isCustom}
                  isSalaryCostMethod={isSalaryCostMethod}
                  isPerformanceMethod={isPerformanceMethod}
                  performanceFallbackToEqual={performanceFallbackToEqual}
                  currencyCode={currencyCode}
                  amount={allocationByEmployeeId.get(member.employeeId) ?? 0}
                  distributionPool={distributionPool}
                  totalSalaryCostAcrossEmployees={totalSalaryCostAcrossEmployees}
                  grandTotalPositivePerformanceScores={grandTotalPositivePerformanceScores}
                  customPoolUnallocatedGlobal={customPoolUnallocatedGlobal}
                  customBudgetByEmployeeId={customBudgetByEmployeeId}
                  onCustomAmountRawChange={onCustomAmountRawChange}
                  onCustomPercentRawChange={onCustomPercentRawChange}
                  onCustomModeChange={onCustomModeChange}
                  tBudget={tBudget}
                  inputsDisabled={inputsDisabled}
                />
              ))}
            </ul>
          </div>
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
    </div>
  )

  if (embedded) {
    return (
      <div className="gba:min-w-0" data-testid="manager-team-distribution-employee-list">
        {listBody}
      </div>
    )
  }

  return (
    <Card className="gba:w-full" data-testid="manager-team-distribution-employee-list">
      <CardHeader className="gba:flex gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-3 gba:space-y-0">
        <CardTitle className="gba:text-base">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">{listBody}</CardContent>
    </Card>
  )
}
