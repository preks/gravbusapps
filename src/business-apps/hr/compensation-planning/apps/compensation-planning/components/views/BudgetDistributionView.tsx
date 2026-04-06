import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { useTeamMemberPerformanceScores } from '../../../manager-compensation-planning/hooks/useTeamMemberPerformanceScores'
import { distributeToOrgUnits, resolveCompanySalaryIncreasePool } from '../../../../utils/budgetCalculations'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../../utils/buildOrgUnitDistributionInputs'
import translations from '../../_i18n'
import { BudgetDistributionOrgUnitList } from './BudgetDistributionOrgUnitList'
import { BudgetDistributionMethodSelector, budgetDistributionMethodTitleKey } from './BudgetDistributionMethodSelector'
import { useBudgetDistributionOrgUnitBudget } from '../../hooks/useBudgetDistributionOrgUnitBudget'
import { useCompensationPlanningStore } from '../../hooks/useCompensationPlanningStore'
import { useBudgetDistributionViewStore } from '../../hooks/budgetDistributionViewStore'
import { useBudgetDistributionCustomBudgetMaps } from '../../hooks/useBudgetDistributionCustomBudgetMaps'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../../api/compensationBudgetRestConfig'
import { BudgetDistributionDistributeDialog } from './BudgetDistributionDistributeDialog'

export interface BudgetDistributionViewProps {
  accessToken: string
  companyId: string
  companyToolbarGroup: React.ReactNode
}

const ORG_UNIT_LIST_LIMIT = 500

/** Set to `true` to disable changing the distribution method (previous read-only behaviour). */
const LOCK_DISTRIBUTION_METHOD_SELECTION = false

export function BudgetDistributionView({ accessToken, companyId, companyToolbarGroup }: BudgetDistributionViewProps) {
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

  const handleDistributeSaved = useCallback(async () => {
    await Promise.all([refetchOrgUnitRows(), refetchCompanyBudgetPlans()])
  }, [refetchCompanyBudgetPlans, refetchOrgUnitRows])

  const salaryIncreasePool = useMemo(() => {
    if (!selectedCompanyBudgetRow) return null
    return resolveCompanySalaryIncreasePool({
      salaryBudgetAmount: selectedCompanyBudgetRow.salaryBudgetAmount,
      salaryBudgetPercent: selectedCompanyBudgetRow.salaryBudgetPercent,
      currentTotalSalaryCost: selectedCompanyBudgetRow.currentTotalSalaryCost
    })
  }, [selectedCompanyBudgetRow])

  const activeDistributionPool = salaryIncreasePool

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

  const {
    customBudgetByOrgUnitId,
    previewCustomAllocationByOrgUnit,
    handleCustomAmountRawChange,
    handleCustomPercentRawChange,
    handleCustomModeChange
  } = useBudgetDistributionCustomBudgetMaps(companyId, selectedMethod, salaryIncreasePool, distributionOrgUnitsForList)

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

  const totalPerformanceScoreByOrgUnitId = useMemo(() => {
    const map = new Map<string, number>()
    for (const input of orgUnitDistributionInputs) {
      map.set(input.orgUnitId, input.totalPerformanceScore)
    }
    return map
  }, [orgUnitDistributionInputs])

  const grandTotalPerformanceScore = useMemo(
    () => orgUnitDistributionInputs.reduce((sum, u) => sum + u.totalPerformanceScore, 0),
    [orgUnitDistributionInputs]
  )

  const performanceFallbackToHeadcount = useMemo(() => {
    if (selectedMethod !== 'performance_weighted') return false
    return orgUnitDistributionInputs.every(ou => ou.totalPerformanceScore <= 0)
  }, [selectedMethod, orgUnitDistributionInputs])

  const performancePartialScores = useMemo(() => {
    if (selectedMethod !== 'performance_weighted' || performanceFallbackToHeadcount) return false
    const hasPositive = orgUnitDistributionInputs.some(ou => ou.totalPerformanceScore > 0)
    const hasMissing = orgUnitDistributionInputs.some(ou => ou.totalPerformanceScore <= 0)
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
  const canOpenDistribute =
    Boolean(accessToken) && hasSelectedCompanyBudget && selectedCompanyBudgetRow != null && !listLoading

  const planSelect = (
    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      <span className="gba:shrink-0 gba:text-sm gba:text-muted-foreground">
        {t('budget-distribution-company-plan-label')}
      </span>
      <Select
        value={selectedDistributionCompanyBudgetId ?? undefined}
        onValueChange={val => setSelectedDistributionCompanyBudgetId(val || null)}
        disabled={companyBudgetPlanOptions.length === 0}
      >
        <SelectTrigger className="gba:w-[300px]" data-testid="budget-distribution-company-plan-select">
          <SelectValue placeholder={t('budget-distribution-company-plan-placeholder')} />
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

  const distributionPreviewSummary =
    selectedCompanyBudgetRow && activeDistributionPool != null && activeDistributionPool > 0 ? (
      <div
        className="gba:rounded-md gba:border gba:border-border gba:bg-muted/30 gba:px-4 gba:py-3"
        data-testid="budget-distribution-preview-pool-summary"
      >
        <p className="gba:text-sm gba:text-foreground">
          {t('budget-distribution-preview-pool-summary', {
            amount: formatCurrency(activeDistributionPool, currencyCode),
            method: t(budgetDistributionMethodTitleKey(selectedMethod))
          })}
        </p>
      </div>
    ) : hasSelectedCompanyBudget &&
      selectedCompanyBudgetRow &&
      (activeDistributionPool == null || activeDistributionPool <= 0) ? (
      <p className="gba:text-sm gba:text-muted-foreground" data-testid="budget-distribution-preview-pool-zero">
        {t('budget-distribution-preview-pool-zero')}
      </p>
    ) : null

  return (
    <div className="gba:space-y-4" data-testid="budget-distribution-view">
      <div
        className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-3"
        data-testid="budget-distribution-company-budget-row"
      >
        {planSelect}
        <Button
          type="button"
          onClick={() => setDistributeOpen(true)}
          disabled={!canOpenDistribute}
          data-testid="budget-distribution-distribute-open"
        >
          {t('budget-distribution-distribute-button')}
        </Button>
      </div>

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
        selectedDistributionMethod={selectedMethod}
        onSaved={handleDistributeSaved}
      />

      <BudgetDistributionMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={setDistributionMethod}
        disabled={LOCK_DISTRIBUTION_METHOD_SELECTION}
        sectionTitle={t('budget-distribution-method-section-title')}
        t={t}
      />

      {distributionPreviewSummary}

      <BudgetDistributionOrgUnitList
        sortedOrgUnits={distributionOrgUnitsForList}
        headcountByOrgUnitId={headcountByOrgUnitId}
        salaryCostByOrgUnitId={salaryCostByOrgUnitId}
        totalSalaryCostAcrossOrgUnits={totalSalaryCostAcrossOrgUnits}
        totalPerformanceScoreByOrgUnitId={totalPerformanceScoreByOrgUnitId}
        grandTotalPerformanceScore={grandTotalPerformanceScore}
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
        toolbarSecondary={companyToolbarGroup}
      />
    </div>
  )
}
