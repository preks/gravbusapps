import { useCallback, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataDisplay,
  Input,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import translations from '../../_i18n'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from './budgetDistributionCustomTypes'
import { BudgetDistributionOrgUnitListAlerts } from './BudgetDistributionOrgUnitListAlerts'
import { BudgetDistributionOrgUnitListPagedContent } from './BudgetDistributionOrgUnitListPagedContent'
import { useDepartmentPagination } from './useDepartmentPagination'
import { roundMoney2 } from '../../utils/parseCustomBudgetInputs'

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
  /** When true, render without an outer Card (for split-panel layout next to method list). */
  embedded?: boolean
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
  embedded = false
}: Readonly<BudgetDistributionOrgUnitListProps>) {
  const { t } = useTranslation(translations)
  const [departmentSearch, setDepartmentSearch] = useState('')
  const debouncedDepartmentSearch = useDebounce(departmentSearch, 300)
  const isCustom = selectedMethod === 'custom'
  const isSalaryCostMethod = selectedMethod === 'proportional_salary_cost'
  const isPerformanceMethod = selectedMethod === 'performance_weighted'

  const filteredSortedOrgUnits = useMemo(() => {
    const q = debouncedDepartmentSearch.trim().toLowerCase()
    if (!q) {
      return sortedOrgUnits
    }
    return sortedOrgUnits.filter(u => u.name.toLowerCase().includes(q))
  }, [sortedOrgUnits, debouncedDepartmentSearch])

  const totalCustomAllocated = useMemo(
    () =>
      sortedOrgUnits.reduce((sum, u) => {
        return sum + (allocationByOrgUnitId.get(u.id) ?? 0)
      }, 0),
    [sortedOrgUnits, allocationByOrgUnitId]
  )

  const poolForCustomContext = distributionPool != null && distributionPool > 0 ? distributionPool : null

  /** Custom mode: pool minus sum of preview allocations (same value on every row; KPI also shows this above). */
  const customPoolUnallocatedGlobal = useMemo(() => {
    if (poolForCustomContext == null) {
      return null
    }
    return roundMoney2(poolForCustomContext - totalCustomAllocated)
  }, [poolForCustomContext, totalCustomAllocated])

  const {
    pagedItems: pagedDepartments,
    pageIndex: departmentPageIndex,
    setPageIndex: setDepartmentPageIndex,
    totalPages: departmentTotalPages,
    showPagination: showDepartmentPagination,
    total: departmentTotal
  } = useDepartmentPagination(filteredSortedOrgUnits)

  const goDepartmentPrev = useCallback(() => {
    setDepartmentPageIndex(p => Math.max(0, p - 1))
  }, [setDepartmentPageIndex])

  const goDepartmentNext = useCallback(() => {
    setDepartmentPageIndex(p => Math.min(departmentTotalPages - 1, p + 1))
  }, [departmentTotalPages, setDepartmentPageIndex])

  const showDepartmentsTable = hasSelectedPlan && sortedOrgUnits.length > 0 && !loading
  const showSearchEmpty =
    hasSelectedPlan && sortedOrgUnits.length > 0 && filteredSortedOrgUnits.length === 0 && !loading

  const headerBlock = (
    <div className="gba:flex gba:flex-col gba:gap-3 sm:gba:flex-row sm:gba:flex-wrap sm:gba:items-center sm:gba:justify-between">
      <div className="gba:min-w-0">
        <CardTitle className="gba:text-base">
          {t('budget-distribution-departments-list-title', { total: departmentTotal })}
        </CardTitle>
      </div>
      {showDepartmentsTable ? (
        <Input
          type="search"
          value={departmentSearch}
          onChange={e => setDepartmentSearch(e.target.value)}
          placeholder={t('budget-distribution-departments-search-placeholder')}
          className="gba:w-full sm:gba:max-w-xs"
          aria-label={t('budget-distribution-departments-search-placeholder')}
          data-testid="budget-distribution-departments-search"
        />
      ) : null}
    </div>
  )

  const bodyBlock = (
    <div className="gba:space-y-4">
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
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="budget-distribution-departments-list-no-plan">
          {t('budget-distribution-departments-list-no-plan')}
        </p>
      )}

      {hasSelectedPlan && sortedOrgUnits.length === 0 && !loading ? (
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="budget-distribution-departments-list-empty">
          {t('budget-distribution-departments-list-empty')}
        </p>
      ) : null}

      {showSearchEmpty ? (
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="budget-distribution-departments-search-empty">
          {t('budget-distribution-departments-search-empty')}
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

      {showDepartmentsTable && !showSearchEmpty ? (
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
          customPoolUnallocatedGlobal={customPoolUnallocatedGlobal}
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
    </div>
  )

  if (embedded) {
    return (
      <DataDisplay
        data-testid="budget-distribution-departments-display"
        titleSections={[
          {
            id: 'departments',
            label: t('budget-distribution-departments-toolbar-title'),
            metadata: { count: departmentTotal, isLoading: loading }
          }
        ]}
        currentSection="departments"
        toolbarDensity="default"
        searchValue={departmentSearch}
        searchPlaceholder={t('budget-distribution-departments-search-placeholder')}
        onSearchChange={setDepartmentSearch}
      >
        <div
          className="gba:flex gba:w-full gba:min-w-0 gba:flex-col gba:gap-4"
          data-testid="budget-distribution-departments-list"
        >
          {bodyBlock}
        </div>
      </DataDisplay>
    )
  }

  return (
    <Card className="gba:w-full" data-testid="budget-distribution-departments-list">
      <CardHeader className="gba:space-y-0">{headerBlock}</CardHeader>
      <CardContent className="gba:space-y-4">{bodyBlock}</CardContent>
    </Card>
  )
}
