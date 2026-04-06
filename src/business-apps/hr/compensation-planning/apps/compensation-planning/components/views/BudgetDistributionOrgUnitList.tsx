import React, { useCallback, useMemo } from 'react'
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import translations from '../../_i18n'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from './budgetDistributionCustomTypes'
import { BudgetDistributionCustomOrgUnitInputs } from './BudgetDistributionCustomOrgUnitInputs'
import { BudgetDistributionDepartmentsPagination } from './BudgetDistributionDepartmentsPagination'
import { useDepartmentPagination } from './useDepartmentPagination'

function formatShareOfTotalSalary(part: number, total: number): string {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return '—'
  }
  return `${((100 * part) / total).toFixed(1)}%`
}

/** Percent of the salary increase pool for this row’s preview allocation; null when the pool is missing or zero. */
function formatPercentOfPool(part: number, pool: number | null): string | null {
  if (pool == null || pool <= 0 || !Number.isFinite(part) || !Number.isFinite(pool)) {
    return null
  }
  return ((100 * part) / pool).toFixed(1)
}

function formatPerformanceScoreSum(value: number): string {
  if (!Number.isFinite(value)) {
    return '—'
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export interface BudgetDistributionOrgUnitListProps {
  sortedOrgUnits: CompanyOrganizationalUnit[]
  /** Employees per org unit (same scope as compensation team data / headcount split). */
  headcountByOrgUnitId: ReadonlyMap<string, number>
  /** Annual salary sum per org unit (for salary-cost distribution explanation). */
  salaryCostByOrgUnitId: ReadonlyMap<string, number>
  /** Sum of {@link salaryCostByOrgUnitId} — denominator for salary-cost share. */
  totalSalaryCostAcrossOrgUnits: number
  /** Sum of employee overall performance scores per department (same source as Performance Evaluation). */
  totalPerformanceScoreByOrgUnitId: ReadonlyMap<string, number>
  /** Sum of {@link totalPerformanceScoreByOrgUnitId} across departments (performance-weighted denominator). */
  grandTotalPerformanceScore: number
  /** Salary increase pool for preview and custom inputs. */
  distributionPool: number | null
  allocationByOrgUnitId: ReadonlyMap<string, number>
  currencyCode: string
  loading: boolean
  error: string | null
  hasSelectedPlan: boolean
  selectedMethod: DistributionMethod
  customBudgetByOrgUnitId: Record<string, OrgUnitCustomBudgetInput>
  onCustomAmountRawChange: (orgUnitId: string, value: string) => void
  onCustomPercentRawChange: (orgUnitId: string, value: string) => void
  onCustomModeChange: (orgUnitId: string, mode: CustomBudgetInputMode) => void
  performanceFallbackToHeadcount: boolean
  performancePartialScores: boolean
  toolbarSecondary?: React.ReactNode
}

export function BudgetDistributionOrgUnitList({
  sortedOrgUnits,
  headcountByOrgUnitId,
  salaryCostByOrgUnitId,
  totalSalaryCostAcrossOrgUnits,
  totalPerformanceScoreByOrgUnitId,
  grandTotalPerformanceScore,
  distributionPool,
  allocationByOrgUnitId,
  currencyCode,
  loading,
  error,
  hasSelectedPlan,
  selectedMethod,
  customBudgetByOrgUnitId,
  onCustomAmountRawChange,
  onCustomPercentRawChange,
  onCustomModeChange,
  performanceFallbackToHeadcount,
  performancePartialScores,
  toolbarSecondary
}: BudgetDistributionOrgUnitListProps) {
  const { t } = useTranslation(translations)
  const isCustom = selectedMethod === 'custom'
  const isSalaryCostMethod = selectedMethod === 'proportional_salary_cost'
  const isPerformanceMethod = selectedMethod === 'performance_weighted'

  const totalCustomAllocated = useMemo(
    () =>
      sortedOrgUnits.reduce((sum, u) => {
        return sum + (allocationByOrgUnitId.get(u.id) ?? 0)
      }, 0),
    [sortedOrgUnits, allocationByOrgUnitId]
  )

  const poolForCustomContext = distributionPool != null && distributionPool > 0 ? distributionPool : null

  /** Remaining pool after allocations from the top of the list through this row (inclusive), same order as {@link sortedOrgUnits}. */
  const sequentialPoolRemainingByOrgUnitId = useMemo(() => {
    const map = new Map<string, number>()
    const pool = distributionPool != null && distributionPool > 0 ? distributionPool : null
    if (pool == null) {
      return map
    }
    let cumulative = 0
    for (const u of sortedOrgUnits) {
      cumulative += allocationByOrgUnitId.get(u.id) ?? 0
      map.set(u.id, pool - cumulative)
    }
    return map
  }, [sortedOrgUnits, allocationByOrgUnitId, distributionPool])

  const {
    pagedItems: pagedDepartments,
    pageIndex: departmentPageIndex,
    setPageIndex: setDepartmentPageIndex,
    totalPages: departmentTotalPages,
    showPagination: showDepartmentPagination,
    total: departmentTotal
  } = useDepartmentPagination(sortedOrgUnits)

  const goDepartmentPrev = useCallback(() => {
    setDepartmentPageIndex(p => Math.max(0, p - 1))
  }, [setDepartmentPageIndex])

  const goDepartmentNext = useCallback(() => {
    setDepartmentPageIndex(p => Math.min(departmentTotalPages - 1, p + 1))
  }, [departmentTotalPages, setDepartmentPageIndex])

  return (
    <Card className="gba:w-full" data-testid="budget-distribution-departments-list">
      <CardHeader className="gba:flex gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-3 gba:space-y-0">
        <CardTitle className="gba:text-base">
          {t('budget-distribution-departments-list-title', { total: departmentTotal })}
        </CardTitle>
        {toolbarSecondary ? (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">{toolbarSecondary}</div>
        ) : null}
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-6">
            <Spinner />
          </div>
        ) : null}

        {error ? (
          <p className="gba:text-sm gba:text-destructive" data-testid="budget-distribution-departments-list-error">
            {error}
          </p>
        ) : null}

        {!hasSelectedPlan ? (
          <p
            className="gba:text-sm gba:text-muted-foreground"
            data-testid="budget-distribution-departments-list-no-plan"
          >
            {t('budget-distribution-departments-list-no-plan')}
          </p>
        ) : null}

        {hasSelectedPlan && sortedOrgUnits.length === 0 && !loading ? (
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="budget-distribution-departments-list-empty">
            {t('budget-distribution-departments-list-empty')}
          </p>
        ) : null}

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

        {isSalaryCostMethod && hasSelectedPlan && sortedOrgUnits.length > 0 && !loading ? (
          <Alert data-testid="budget-distribution-salary-cost-basis-alert">
            <AlertDescription>
              {totalSalaryCostAcrossOrgUnits <= 0
                ? t('budget-distribution-salary-cost-zero-total')
                : t('budget-distribution-salary-cost-basis-alert', {
                    total: formatCurrency(totalSalaryCostAcrossOrgUnits, currencyCode),
                    pool:
                      distributionPool != null && distributionPool > 0
                        ? formatCurrency(distributionPool, currencyCode)
                        : '—'
                  })}
            </AlertDescription>
          </Alert>
        ) : null}

        {isPerformanceMethod && hasSelectedPlan && sortedOrgUnits.length > 0 && !loading ? (
          <Alert data-testid="budget-distribution-performance-basis-alert">
            <AlertDescription>
              {grandTotalPerformanceScore <= 0
                ? t('budget-distribution-performance-zero-total')
                : t('budget-distribution-performance-basis-alert', {
                    total: formatPerformanceScoreSum(grandTotalPerformanceScore),
                    pool:
                      distributionPool != null && distributionPool > 0
                        ? formatCurrency(distributionPool, currencyCode)
                        : '—'
                  })}
            </AlertDescription>
          </Alert>
        ) : null}

        {hasSelectedPlan && sortedOrgUnits.length > 0 && !loading ? (
          <>
            <ul className="gba:divide-y gba:divide-border gba:rounded-md gba:border gba:border-border gba:min-w-0">
              {isCustom ? (
                <li
                  className="gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-center gba:gap-x-4 gba:border-b gba:border-border gba:bg-muted/40 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground"
                  data-testid="budget-distribution-custom-column-headers"
                >
                  <span>{t('budget-distribution-col-org-unit')}</span>
                  <span>{t('budget-distribution-custom-column-amount')}</span>
                  <span>{t('budget-distribution-custom-column-details')}</span>
                </li>
              ) : null}
              {pagedDepartments.map(unit => {
                const amount = allocationByOrgUnitId.get(unit.id) ?? 0
                const poolPercentPoints = formatPercentOfPool(amount, distributionPool)
                const headcount = headcountByOrgUnitId.get(unit.id) ?? 0
                const unitSalaryCost = salaryCostByOrgUnitId.get(unit.id) ?? 0
                const unitPerformanceSum = totalPerformanceScoreByOrgUnitId.get(unit.id) ?? 0
                return (
                  <li
                    key={unit.id}
                    className={
                      isCustom
                        ? 'gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-start gba:gap-x-4 gba:gap-y-2 gba:px-4 gba:py-3'
                        : 'gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3'
                    }
                    data-testid={`budget-distribution-department-row-${unit.id}`}
                  >
                    <div className={isCustom ? 'gba:min-w-0' : 'gba:min-w-0 gba:flex-1'}>
                      <div className="gba:font-medium gba:text-foreground">{unit.name}</div>
                      <div
                        className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
                        data-testid={`budget-distribution-department-employees-${unit.id}`}
                      >
                        {t('budget-distribution-org-unit-employee-count', { count: headcount })}
                      </div>
                      {isSalaryCostMethod && !isCustom ? (
                        <div
                          className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
                          data-testid={`budget-distribution-department-salary-cost-${unit.id}`}
                        >
                          {t('budget-distribution-salary-cost-row-detail', {
                            salary: formatCurrency(unitSalaryCost, currencyCode),
                            share: formatShareOfTotalSalary(unitSalaryCost, totalSalaryCostAcrossOrgUnits)
                          })}
                        </div>
                      ) : null}
                      {isPerformanceMethod && !isCustom ? (
                        <div
                          className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
                          data-testid={`budget-distribution-department-performance-${unit.id}`}
                        >
                          {t('budget-distribution-performance-row-detail', {
                            sum: formatPerformanceScoreSum(unitPerformanceSum),
                            share: formatShareOfTotalSalary(unitPerformanceSum, grandTotalPerformanceScore)
                          })}
                        </div>
                      ) : null}
                    </div>
                    {isCustom ? (
                      <BudgetDistributionCustomOrgUnitInputs
                        orgUnitId={unit.id}
                        currencyCode={currencyCode}
                        amount={amount}
                        distributionPool={distributionPool}
                        poolRemainingSequential={sequentialPoolRemainingByOrgUnitId.get(unit.id) ?? null}
                        customBudget={customBudgetByOrgUnitId[unit.id]}
                        onAmountRawChange={onCustomAmountRawChange}
                        onPercentRawChange={onCustomPercentRawChange}
                        onModeChange={onCustomModeChange}
                        t={t}
                      />
                    ) : (
                      <span className="gba:flex gba:shrink-0 gba:flex-wrap gba:items-baseline gba:justify-end gba:gap-x-2 gba:text-right">
                        <span
                          className="gba:tabular-nums gba:text-foreground"
                          data-testid={`budget-distribution-allocation-${unit.id}`}
                        >
                          {formatCurrency(amount, currencyCode)}
                        </span>
                        {poolPercentPoints != null ? (
                          <span
                            className="gba:text-sm gba:tabular-nums gba:text-muted-foreground"
                            data-testid={`budget-distribution-allocation-pool-percent-${unit.id}`}
                          >
                            {t('budget-distribution-allocation-pool-percent', {
                              percent: poolPercentPoints
                            })}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            {showDepartmentPagination ? (
              <BudgetDistributionDepartmentsPagination
                pageIndex={departmentPageIndex}
                totalPages={departmentTotalPages}
                onPrev={goDepartmentPrev}
                onNext={goDepartmentNext}
                t={t}
              />
            ) : null}
            {isCustom && poolForCustomContext != null && totalCustomAllocated > poolForCustomContext + 0.01 ? (
              <div className="gba:pt-2" data-testid="budget-distribution-custom-total-summary">
                <Alert data-testid="budget-distribution-custom-exceeds-pool-alert">
                  <AlertDescription>
                    {t('budget-distribution-custom-exceeds-pool', {
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
