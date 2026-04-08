import React, { useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import translations from '../../_i18n'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from './budgetDistributionCustomTypes'
import { BudgetDistributionOrgUnitListAlerts } from './BudgetDistributionOrgUnitListAlerts'
import { BudgetDistributionOrgUnitListPagedContent } from './BudgetDistributionOrgUnitListPagedContent'
import { useDepartmentPagination } from './useDepartmentPagination'

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
}: Readonly<BudgetDistributionOrgUnitListProps>) {
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

  const showDepartmentsTable = hasSelectedPlan && sortedOrgUnits.length > 0 && !loading

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

        {hasSelectedPlan ? null : (
          <p
            className="gba:text-sm gba:text-muted-foreground"
            data-testid="budget-distribution-departments-list-no-plan"
          >
            {t('budget-distribution-departments-list-no-plan')}
          </p>
        )}

        {hasSelectedPlan && sortedOrgUnits.length === 0 && !loading ? (
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="budget-distribution-departments-list-empty">
            {t('budget-distribution-departments-list-empty')}
          </p>
        ) : null}

        <BudgetDistributionOrgUnitListAlerts
          t={t}
          hasSelectedPlan={hasSelectedPlan}
          departmentCount={sortedOrgUnits.length}
          loading={loading}
          performanceFallbackToHeadcount={performanceFallbackToHeadcount}
          performancePartialScores={performancePartialScores}
          isSalaryCostMethod={isSalaryCostMethod}
          isPerformanceMethod={isPerformanceMethod}
          totalSalaryCostAcrossOrgUnits={totalSalaryCostAcrossOrgUnits}
          grandTotalPerformanceScore={grandTotalPerformanceScore}
          distributionPool={distributionPool}
          currencyCode={currencyCode}
        />

        {showDepartmentsTable ? (
          <BudgetDistributionOrgUnitListPagedContent
            t={t}
            isCustom={isCustom}
            isSalaryCostMethod={isSalaryCostMethod}
            isPerformanceMethod={isPerformanceMethod}
            pagedDepartments={pagedDepartments}
            allocationByOrgUnitId={allocationByOrgUnitId}
            headcountByOrgUnitId={headcountByOrgUnitId}
            salaryCostByOrgUnitId={salaryCostByOrgUnitId}
            totalPerformanceScoreByOrgUnitId={totalPerformanceScoreByOrgUnitId}
            totalSalaryCostAcrossOrgUnits={totalSalaryCostAcrossOrgUnits}
            grandTotalPerformanceScore={grandTotalPerformanceScore}
            distributionPool={distributionPool}
            poolForCustomContext={poolForCustomContext}
            totalCustomAllocated={totalCustomAllocated}
            sequentialPoolRemainingByOrgUnitId={sequentialPoolRemainingByOrgUnitId}
            customBudgetByOrgUnitId={customBudgetByOrgUnitId}
            currencyCode={currencyCode}
            onCustomAmountRawChange={onCustomAmountRawChange}
            onCustomPercentRawChange={onCustomPercentRawChange}
            onCustomModeChange={onCustomModeChange}
            showDepartmentPagination={showDepartmentPagination}
            departmentPageIndex={departmentPageIndex}
            departmentTotalPages={departmentTotalPages}
            onDepartmentPrev={goDepartmentPrev}
            onDepartmentNext={goDepartmentNext}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
