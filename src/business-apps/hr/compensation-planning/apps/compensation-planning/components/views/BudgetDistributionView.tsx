import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { WidgetGroup } from '@/components/widget-group'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { useTeamMemberPerformanceScores } from '../../../manager-compensation-planning/hooks/useTeamMemberPerformanceScores'
import { roundMoney2 } from '../../../../utils/budgetAmountPercentSync'
import { distributeToOrgUnits, resolveCompanySalaryIncreasePool } from '../../../../utils/budgetCalculations'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../../utils/buildOrgUnitDistributionInputs'
import translations from '../../_i18n'
import { BudgetDistributionOrgUnitList } from './BudgetDistributionOrgUnitList'
import { BudgetDistributionMethodSelector } from './BudgetDistributionMethodSelector'
import { useBudgetDistributionOrgUnitBudget } from '../../hooks/useBudgetDistributionOrgUnitBudget'
import { useCompensationPlanningStore } from '../../hooks/useCompensationPlanningStore'
import { useBudgetDistributionViewStore } from '../../hooks/budgetDistributionViewStore'
import { useBudgetDistributionCustomBudgetMaps } from '../../hooks/useBudgetDistributionCustomBudgetMaps'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../../api/compensationBudgetRestConfig'
import { BudgetDistributionDistributeDialog } from './BudgetDistributionDistributeDialog'
import { BudgetDistributionContextCard } from './BudgetDistributionContextCard'
import { BudgetDistributionPoolKpiCards } from './BudgetDistributionPoolKpiCards'
import { BudgetDistributionAllocatedSummaryCard } from './BudgetDistributionAllocatedSummaryCard'

export interface BudgetDistributionViewProps {
  accessToken: string
  companyId: string
  /** Company selector in the context card row, before the company budget dropdown. */
  companyToolbar?: React.ReactNode
}

const ORG_UNIT_LIST_LIMIT = 500

/** Set to `true` to disable changing the distribution method (previous read-only behaviour). */
const LOCK_DISTRIBUTION_METHOD_SELECTION = false

export function BudgetDistributionView({
  accessToken,
  companyId,
  companyToolbar
}: Readonly<BudgetDistributionViewProps>) {
  const { t } = useTranslation(translations)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const [distributeOpen, setDistributeOpen] = useState(false)
  const { selectedMethod, setDistributionMethod } = useBudgetDistributionViewStore()

  const { selectedDistributionCompanyBudgetId, setSelectedDistributionCompanyBudgetId } = useCompensationPlanningStore()

  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(accessToken, companyId, ORG_UNIT_LIST_LIMIT)

  const {
    teamMembers,
    loading: loadingTeam,
    error: teamError
  } = useTeamCompensationData({
    accessToken,
    companyId,
    /** Same scope as Overview / budget setup (payroll-relevant contract types). */
    requirePayrollRelevantContractType: true
  })

  const employeeIdsForPerformance = useMemo(() => [...new Set(teamMembers.map(m => m.employeeId))], [teamMembers])

  const { scoreByEmployeeId, loading: loadingPerformanceScores } = useTeamMemberPerformanceScores(
    accessToken,
    employeeIdsForPerformance
  )

  const teamMembersWithPerformance = useMemo(
    () =>
      teamMembers.map(m => ({
        ...m,
        performanceOverallScore: scoreByEmployeeId.get(m.employeeId) ?? null
      })),
    [teamMembers, scoreByEmployeeId]
  )

  const currencyCode = teamMembers[0]?.currency ?? 'EUR'

  const {
    loading: loadingOrgUnitBudgets,
    error: orgUnitBudgetError,
    companyBudgetPlanOptions,
    selectedCompanyBudgetRow,
    rows: distributionOrgUnitRows,
    refetchOrgUnitRows,
    refetchCompanyBudgetPlans
  } = useBudgetDistributionOrgUnitBudget(accessToken, companyId, companyOrgUnits)

  /** Same basis as Overview: org units implied by positions in this company (plus Unassigned when needed). */
  const orgUnitDistributionInputs = useMemo(
    () =>
      buildOrgUnitDistributionInputsFromTeamMembers(teamMembersWithPerformance, {
        unassignedLabel: t('overview-org-unit-unassigned'),
        companyOrgUnits
      }),
    [companyOrgUnits, teamMembersWithPerformance, t]
  )

  const distributionOrgUnitsForList = useMemo(
    () =>
      orgUnitDistributionInputs.map(i => ({
        id: i.orgUnitId,
        name: i.orgUnitName
      })),
    [orgUnitDistributionInputs]
  )

  /**
   * Undistributed company salary-increase pool = total minus sum of OU `salary_budget_amount` (HR distribution).
   * Company `allocation_amount` is updated on distribute to match total deployed to OUs (see distribute dialog).
   */
  const salaryIncreasePool = useMemo(() => {
    if (!selectedCompanyBudgetRow) return null
    const total = resolveCompanySalaryIncreasePool({
      salaryBudgetAmount: selectedCompanyBudgetRow.salaryBudgetAmount,
      salaryBudgetPercent: selectedCompanyBudgetRow.salaryBudgetPercent,
      currentTotalSalaryCost: selectedCompanyBudgetRow.currentTotalSalaryCost
    })
    if (total <= 0) return null
    const deployedToOrgUnits = distributionOrgUnitRows.reduce(
      (sum, r) => roundMoney2(sum + roundMoney2(r.salaryBudgetAmount)),
      0
    )
    return Math.max(0, roundMoney2(total - deployedToOrgUnits))
  }, [selectedCompanyBudgetRow, distributionOrgUnitRows])

  const activeDistributionPool = salaryIncreasePool

  const {
    customBudgetByOrgUnitId,
    previewCustomAllocationByOrgUnit,
    customAmountModeRawTotalRequested,
    customAmountRequestExceedsPool,
    customOverPoolAmount,
    handleCustomAmountRawChange,
    handleCustomPercentRawChange,
    handleCustomModeChange,
    clearCustomBudgetInputs
  } = useBudgetDistributionCustomBudgetMaps(companyId, selectedMethod, salaryIncreasePool, distributionOrgUnitsForList)

  const handleDistributeSaved = useCallback(async () => {
    clearCustomBudgetInputs()
    await Promise.all([refetchOrgUnitRows(), refetchCompanyBudgetPlans()])
  }, [clearCustomBudgetInputs, refetchCompanyBudgetPlans, refetchOrgUnitRows])

  const headcountByOrgUnitId = useMemo(() => {
    const map = new Map<string, number>()
    for (const input of orgUnitDistributionInputs) {
      map.set(input.orgUnitId, input.headcount)
    }
    return map
  }, [orgUnitDistributionInputs])

  const salaryCostByOrgUnitId = useMemo(() => {
    const map = new Map<string, number>()
    for (const input of orgUnitDistributionInputs) {
      map.set(input.orgUnitId, input.currentTotalSalaryCost)
    }
    return map
  }, [orgUnitDistributionInputs])

  const totalSalaryCostAcrossOrgUnits = useMemo(
    () => orgUnitDistributionInputs.reduce((sum, u) => sum + u.currentTotalSalaryCost, 0),
    [orgUnitDistributionInputs]
  )

  /** Per org unit: **average** overall performance (mean of employee scores in the unit), or null when no scores loaded. */
  const averagePerformanceByOrgUnitId = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const input of orgUnitDistributionInputs) {
      map.set(input.orgUnitId, input.averagePerformanceRating)
    }
    return map
  }, [orgUnitDistributionInputs])

  /** Sum of department **average** scores — denominator for share-of-weight display in the performance method. */
  const sumOfDepartmentAverageScores = useMemo(
    () => orgUnitDistributionInputs.reduce((sum, u) => sum + Math.max(0, u.averagePerformanceRating ?? 0), 0),
    [orgUnitDistributionInputs]
  )

  const performanceFallbackToHeadcount = useMemo(() => {
    if (selectedMethod !== 'performance_weighted') return false
    return orgUnitDistributionInputs.every(ou => (ou.averagePerformanceRating ?? 0) <= 0)
  }, [selectedMethod, orgUnitDistributionInputs])

  const performancePartialScores = useMemo(() => {
    if (selectedMethod !== 'performance_weighted' || performanceFallbackToHeadcount) return false
    const hasPositive = orgUnitDistributionInputs.some(ou => (ou.averagePerformanceRating ?? 0) > 0)
    const hasMissing = orgUnitDistributionInputs.some(ou => (ou.averagePerformanceRating ?? 0) <= 0)
    return hasPositive && hasMissing
  }, [selectedMethod, performanceFallbackToHeadcount, orgUnitDistributionInputs])

  const previewAllocationByOrgUnit = useMemo(() => {
    if (selectedMethod === 'custom') {
      return previewCustomAllocationByOrgUnit ?? new Map<string, number>()
    }
    if (activeDistributionPool == null || activeDistributionPool <= 0 || orgUnitDistributionInputs.length === 0) {
      return new Map<string, number>()
    }
    return distributeToOrgUnits(activeDistributionPool, orgUnitDistributionInputs, selectedMethod)
  }, [selectedMethod, previewCustomAllocationByOrgUnit, activeDistributionPool, orgUnitDistributionInputs])

  const listLoading = loadingTeam || loadingOrgUnitBudgets || loadingPerformanceScores
  const listError = orgUnitBudgetError ?? teamError ?? null

  const hasSelectedCompanyBudget = selectedDistributionCompanyBudgetId != null
  const hasDistributablePool = activeDistributionPool != null && activeDistributionPool > 0
  /** Hide the distribution preview panel when a plan is loaded and there is no remaining increase pool to split. */
  const showDistributionPreviewPanel =
    listLoading || !hasSelectedCompanyBudget || selectedCompanyBudgetRow == null || hasDistributablePool
  const canOpenDistribute =
    Boolean(accessToken) &&
    hasSelectedCompanyBudget &&
    selectedCompanyBudgetRow != null &&
    !listLoading &&
    hasDistributablePool

  const planSelect = (
    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      <span className="gba:shrink-0 gba:text-sm gba:font-semibold gba:text-foreground">
        {t('budget-distribution-compensation-cycle-label')}
      </span>
      <Select
        value={selectedDistributionCompanyBudgetId ?? undefined}
        onValueChange={val => setSelectedDistributionCompanyBudgetId(val || null)}
        disabled={companyBudgetPlanOptions.length === 0}
      >
        <SelectTrigger
          className="gba:min-w-0 gba:w-[300px] gba:max-w-full"
          data-testid="budget-distribution-compensation-cycle-select"
        >
          <SelectValue placeholder={t('budget-distribution-compensation-cycle-placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {companyBudgetPlanOptions.map(opt => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const standalonePoolKpiSection = useMemo(() => {
    if (!hasSelectedCompanyBudget) {
      return null
    }
    if (!selectedCompanyBudgetRow) {
      if (listLoading) {
        return (
          <WidgetGroup
            isLoading
            widgets={[]}
            skeletonCount={2}
            cardsClassName="gba:sm:grid-cols-2"
            data-testid="budget-distribution-kpi-cards-loading"
          />
        )
      }
      return null
    }
    if (activeDistributionPool == null || activeDistributionPool <= 0) {
      return (
        <BudgetDistributionAllocatedSummaryCard
          salaryBudgetAmount={selectedCompanyBudgetRow.salaryBudgetAmount}
          allocationAmount={selectedCompanyBudgetRow.allocationAmount}
          currencyCode={currencyCode}
          t={t}
        />
      )
    }
    return (
      <BudgetDistributionPoolKpiCards
        pool={activeDistributionPool}
        allocationByOrgUnitId={previewAllocationByOrgUnit}
        currencyCode={currencyCode}
        selectedMethod={selectedMethod}
        loading={listLoading}
        t={t}
        customRequestExceedsPool={customAmountRequestExceedsPool}
        overPoolAmount={customOverPoolAmount}
      />
    )
  }, [
    activeDistributionPool,
    currencyCode,
    customAmountRequestExceedsPool,
    customOverPoolAmount,
    hasSelectedCompanyBudget,
    listLoading,
    previewAllocationByOrgUnit,
    selectedCompanyBudgetRow,
    selectedMethod,
    t
  ])

  return (
    <div className="gba:space-y-4" data-testid="budget-distribution-view">
      <BudgetDistributionContextCard
        title={t('budget-distribution-context-card-title')}
        planSelect={planSelect}
        companyToolbar={companyToolbar}
      />

      {standalonePoolKpiSection ? (
        <div className="gba:w-full" data-testid="budget-distribution-pool-kpi-standalone">
          {standalonePoolKpiSection}
        </div>
      ) : null}

      <BudgetDistributionDistributeDialog
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        accessToken={accessToken}
        restClient={restClient}
        sortedOrgUnits={distributionOrgUnitsForList}
        orgUnitBudgetRows={distributionOrgUnitRows}
        allocationByOrgUnitId={previewAllocationByOrgUnit}
        distributionPool={activeDistributionPool}
        currencyCode={currencyCode}
        companyBudgetRow={selectedCompanyBudgetRow}
        onSaved={handleDistributeSaved}
      />

      {showDistributionPreviewPanel ? (
        <Card className="gba:w-full" data-testid="budget-distribution-method-departments-panel">
          <CardHeader className="gba:flex gba:flex-row gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:border-border gba:pb-4">
            <CardTitle className="gba:min-w-0 gba:text-base gba:font-semibold gba:text-foreground">
              {t('budget-distribution-split-panel-title')}
            </CardTitle>
            <Button
              type="button"
              className="gba:shrink-0"
              onClick={() => setDistributeOpen(true)}
              disabled={!canOpenDistribute}
              data-testid="budget-distribution-distribute-open"
            >
              {t('budget-distribution-distribute-button')}
            </Button>
          </CardHeader>
          <CardContent className="gba:p-0">
            <div className="gba:flex gba:min-h-0 gba:flex-col gba:md:flex-row gba:md:items-stretch">
              <aside
                className="gba:flex gba:w-full gba:max-w-xs gba:shrink-0 gba:flex-col gba:border-b gba:border-border gba:bg-muted/30 gba:p-4 md:gba:max-w-none md:gba:w-64 md:gba:border-b-0 md:gba:border-r"
                data-testid="budget-distribution-method-sidebar"
              >
                <p className="gba:mb-3 gba:w-full gba:max-w-xs gba:text-sm gba:font-medium gba:text-muted-foreground md:gba:max-w-none">
                  {t('budget-distribution-split-panel-methods-column-title')}
                </p>
                <BudgetDistributionMethodSelector
                  variant="sidebar"
                  selectedMethod={selectedMethod}
                  onMethodChange={setDistributionMethod}
                  disabled={LOCK_DISTRIBUTION_METHOD_SELECTION}
                  sectionTitle={t('budget-distribution-method-section-title')}
                  t={t}
                />
              </aside>
              <div
                className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:bg-background gba:p-4"
                data-testid="budget-distribution-departments-panel-main"
              >
                <BudgetDistributionOrgUnitList
                  embedded
                  sortedOrgUnits={distributionOrgUnitsForList}
                  headcountByOrgUnitId={headcountByOrgUnitId}
                  salaryCostByOrgUnitId={salaryCostByOrgUnitId}
                  totalSalaryCostAcrossOrgUnits={totalSalaryCostAcrossOrgUnits}
                  averagePerformanceByOrgUnitId={averagePerformanceByOrgUnitId}
                  sumOfDepartmentAverageScores={sumOfDepartmentAverageScores}
                  distributionPool={activeDistributionPool}
                  allocationByOrgUnitId={previewAllocationByOrgUnit}
                  currencyCode={currencyCode}
                  loading={listLoading}
                  error={listError}
                  hasSelectedPlan={hasSelectedCompanyBudget}
                  selectedMethod={selectedMethod}
                  customBudgetByOrgUnitId={customBudgetByOrgUnitId}
                  onCustomAmountRawChange={handleCustomAmountRawChange}
                  onCustomPercentRawChange={handleCustomPercentRawChange}
                  onCustomModeChange={handleCustomModeChange}
                  performanceFallbackToHeadcount={performanceFallbackToHeadcount}
                  performancePartialScores={performancePartialScores}
                  customAmountRequestExceedsPool={customAmountRequestExceedsPool}
                  customAmountModeRawTotalRequested={customAmountModeRawTotalRequested}
                  customOverPoolAmount={customOverPoolAmount}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
