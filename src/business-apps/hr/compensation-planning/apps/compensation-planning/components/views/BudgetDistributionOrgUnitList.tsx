import React, { useCallback, useMemo } from 'react'
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import translations from '../../_i18n'
import { BudgetDistributionDepartmentsPagination } from './BudgetDistributionDepartmentsPagination'
import { useDepartmentPagination } from './useDepartmentPagination'

function formatShareOfTotalSalary(part: number, total: number): string {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return '—'
  }
  return `${((100 * part) / total).toFixed(1)}%`
}

function formatPercentOfWhole(part: number, whole: number): string | null {
  if (whole <= 0 || !Number.isFinite(part) || !Number.isFinite(whole)) {
    return null
  }
  return ((100 * part) / whole).toFixed(1)
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
  /** Salary increase pool (for salary-cost formula line). */
  salaryIncreasePool: number | null
  allocationByOrgUnitId: ReadonlyMap<string, number>
  currencyCode: string
  loading: boolean
  error: string | null
  hasSelectedPlan: boolean
  selectedMethod: DistributionMethod
  customAmountByOrgUnitId: Record<string, string>
  onCustomAmountChange: (orgUnitId: string, value: string) => void
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
  salaryIncreasePool,
  allocationByOrgUnitId,
  currencyCode,
  loading,
  error,
  hasSelectedPlan,
  selectedMethod,
  customAmountByOrgUnitId,
  onCustomAmountChange,
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

  const poolForCustomContext = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : null
  const totalDiffersFromPool =
    poolForCustomContext != null && Math.abs(totalCustomAllocated - poolForCustomContext) > 0.01

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
                      salaryIncreasePool != null && salaryIncreasePool > 0
                        ? formatCurrency(salaryIncreasePool, currencyCode)
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
                      salaryIncreasePool != null && salaryIncreasePool > 0
                        ? formatCurrency(salaryIncreasePool, currencyCode)
                        : '—'
                  })}
            </AlertDescription>
          </Alert>
        ) : null}

        {hasSelectedPlan && sortedOrgUnits.length > 0 && !loading ? (
          <>
            <ul className="gba:divide-y gba:divide-border gba:rounded-md gba:border gba:border-border">
              {pagedDepartments.map(unit => {
                const amount = allocationByOrgUnitId.get(unit.id) ?? 0
                const headcount = headcountByOrgUnitId.get(unit.id) ?? 0
                const unitSalaryCost = salaryCostByOrgUnitId.get(unit.id) ?? 0
                const unitPerformanceSum = totalPerformanceScoreByOrgUnitId.get(unit.id) ?? 0
                const inputId = `budget-distribution-custom-amount-${unit.id}`
                return (
                  <li
                    key={unit.id}
                    className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3"
                    data-testid={`budget-distribution-department-row-${unit.id}`}
                  >
                    <div className="gba:min-w-0 gba:flex-1">
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
                      <div className="gba:flex gba:min-w-[14rem] gba:flex-col gba:gap-1">
                        <Label htmlFor={inputId} className="gba:text-xs gba:text-muted-foreground">
                          {t('budget-distribution-custom-amount-label')}
                        </Label>
                        <Input
                          id={inputId}
                          type="text"
                          inputMode="decimal"
                          value={customAmountByOrgUnitId[unit.id] ?? ''}
                          onChange={e => onCustomAmountChange(unit.id, e.target.value)}
                          placeholder="0"
                          data-testid={`budget-distribution-custom-input-${unit.id}`}
                        />
                        {amount > 0 ? (
                          <div
                            className="gba:space-y-0.5 gba:text-xs gba:text-muted-foreground"
                            data-testid={`budget-distribution-custom-meaning-${unit.id}`}
                          >
                            <p data-testid={`budget-distribution-custom-parsed-${unit.id}`}>
                              {t('budget-distribution-custom-parsed-amount', {
                                amount: formatCurrency(amount, currencyCode)
                              })}
                            </p>
                            {poolForCustomContext != null ? (
                              <p data-testid={`budget-distribution-custom-pool-pct-${unit.id}`}>
                                {t('budget-distribution-custom-percent-of-pool', {
                                  percent: formatPercentOfWhole(amount, poolForCustomContext) ?? '—'
                                })}
                              </p>
                            ) : null}
                            {totalCustomAllocated > 0 && (poolForCustomContext == null || totalDiffersFromPool) ? (
                              <p data-testid={`budget-distribution-custom-total-pct-${unit.id}`}>
                                {t('budget-distribution-custom-percent-of-total', {
                                  percent: formatPercentOfWhole(amount, totalCustomAllocated) ?? '—'
                                })}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span
                        className="gba:shrink-0 gba:tabular-nums gba:text-foreground"
                        data-testid={`budget-distribution-allocation-${unit.id}`}
                      >
                        {formatCurrency(amount, currencyCode)}
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
            {isCustom && totalCustomAllocated > 0 ? (
              <div className="gba:space-y-2" data-testid="budget-distribution-custom-total-summary">
                {poolForCustomContext != null ? (
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {t('budget-distribution-custom-total-vs-pool', {
                      total: formatCurrency(totalCustomAllocated, currencyCode),
                      percent: formatPercentOfWhole(totalCustomAllocated, poolForCustomContext) ?? '—'
                    })}
                  </p>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {t('budget-distribution-custom-total-only', {
                      total: formatCurrency(totalCustomAllocated, currencyCode)
                    })}
                  </p>
                )}
                {poolForCustomContext != null && totalCustomAllocated > poolForCustomContext + 0.01 ? (
                  <Alert data-testid="budget-distribution-custom-exceeds-pool-alert">
                    <AlertDescription>
                      {t('budget-distribution-custom-exceeds-pool', {
                        total: formatCurrency(totalCustomAllocated, currencyCode),
                        pool: formatCurrency(poolForCustomContext, currencyCode),
                        diff: formatCurrency(totalCustomAllocated - poolForCustomContext, currencyCode)
                      })}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {poolForCustomContext != null &&
                totalCustomAllocated + 0.01 < poolForCustomContext &&
                totalCustomAllocated > 0 ? (
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {t('budget-distribution-custom-under-pool', {
                      remaining: formatCurrency(poolForCustomContext - totalCustomAllocated, currencyCode)
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
