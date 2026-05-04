import React, { useEffect, useMemo, useState } from 'react'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import { ChartPieSliceIcon, CoinsIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { extractCurrencyCode, formatCurrencyString } from '@/common/utils/numberFormatter'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import { useCompensationBudgetPlanEmployeesByOrgUnitIds } from '../../../hooks/useCompensationBudgetPlanEmployeesByOrgUnitIds'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { distributeToEmployees } from '../../../utils/budgetCalculations'
import compensationPlanningTranslations from '../../compensation-planning/_i18n'
import { roundMoney2 } from '../../compensation-planning/utils/parseCustomBudgetInputs'
import { useManagerPlanningStore } from '../hooks/useManagerPlanningStore'
import { useManagerTeamCompensationDataDisplay } from '../hooks/useManagerTeamCompensationDataDisplay'
import { useManagerTeamEmployeeCustomBudgetMaps } from '../hooks/useManagerTeamEmployeeCustomBudgetMaps'
import translations from '../_i18n'
import { getEmployeeIdsBlockedFromManagerResubmit } from '../utils/managerEmployeeProposalResubmitEligibility'
import { sumAllocationForTeamDepartmentKpi } from '../utils/teamProposalDepartmentKpiAllocation'
import { ManagerTeamSubmittedProposalsPanel } from './ManagerTeamSubmittedProposalsPanel'
import { TeamCompensationDistributionSplitPanel } from './TeamCompensationDistributionSplitPanel'
import { TeamCompensationSaveAllocationsDialog } from './TeamCompensationSaveAllocationsDialog'

const TEAM_BUDGET_KPI_COLORS = {
  totalBudget: 'var(--nw-color-primary-500)',
  pool: 'var(--nw-color-success-500)',
  allocation: 'var(--nw-color-info-500)'
} as const

export interface TeamCompensationDistributionPanelProps {
  teamMembers: TeamMemberCompensationData[]
  filteredRows: TeamMemberCompensationData[]
  totalFiltered: number
  loading: boolean
  error: string | null
  totalSalaryBudget: number | null
  salaryBudgetLoading: boolean
  salaryBudgetError: string | null
  selectedCompanyId: string | null
  currencyCode: string
  accessToken: string | undefined
  managerEmployeeId: string | undefined
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
  /** Called after save dialog persists rows (merge returned ids into parent state). */
  onMergeSavedRowIds: (createdIdsByEmployeeId?: Record<string, string>) => void
  /** After manager submits proposals from the modal, parent locks editing. */
  proposalsLockedAfterSubmit: boolean
  onSaved?: () => void
  /** Unlocks the team budget row after the manager chooses "New proposal" (edit again). */
  onNewProposalUnlock?: () => void
}

export function TeamCompensationDistributionPanel({
  teamMembers,
  filteredRows,
  totalFiltered,
  loading,
  error,
  totalSalaryBudget,
  salaryBudgetLoading,
  salaryBudgetError,
  selectedCompanyId,
  currencyCode,
  accessToken,
  managerEmployeeId,
  planOuRowIdByOrganizationalUnitId,
  managerOrganizationalUnitId,
  onMergeSavedRowIds,
  proposalsLockedAfterSubmit,
  onSaved,
  onNewProposalUnlock
}: Readonly<TeamCompensationDistributionPanelProps>) {
  const { t } = useTranslation(translations)
  const { t: tBudget } = useTranslation(compensationPlanningTranslations)
  const { distributionMethod, setDistributionMethod } = useManagerPlanningStore()
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)

  const dataDisplay = useManagerTeamCompensationDataDisplay()

  useEffect(() => {
    if (distributionMethod === 'proportional_headcount') {
      setDistributionMethod('proportional_salary_cost')
    }
  }, [distributionMethod, setDistributionMethod])

  const activePool = totalSalaryBudget != null && totalSalaryBudget > 0 ? totalSalaryBudget : null

  const employeeInputsFull = useMemo(
    () =>
      teamMembers.map(m => ({
        employeeId: m.employeeId,
        displayName: m.displayName,
        annualSalary: m.currentAnnualSalary ?? 0,
        performanceScore: m.performanceOverallScore ?? 0
      })),
    [teamMembers]
  )

  /** Table order for rows not yet in the user’s custom input-order queue (see useManagerTeamEmployeeCustomBudgetMaps). */
  const distributionEmployeesForList = useMemo(() => filteredRows.map(m => ({ id: m.employeeId })), [filteredRows])

  const {
    customBudgetByEmployeeId,
    previewCustomAllocationByEmployeeId,
    handleCustomAmountRawChange,
    handleCustomPercentRawChange,
    handleCustomModeChange
  } = useManagerTeamEmployeeCustomBudgetMaps(
    selectedCompanyId,
    distributionMethod,
    activePool,
    distributionEmployeesForList
  )

  const allocationFullTeam = useMemo(() => {
    if (distributionMethod === 'custom') {
      return previewCustomAllocationByEmployeeId ?? new Map<string, number>()
    }
    const pool = activePool ?? 0
    if (employeeInputsFull.length === 0) {
      return new Map<string, number>()
    }
    return distributeToEmployees(pool, employeeInputsFull, distributionMethod)
  }, [distributionMethod, previewCustomAllocationByEmployeeId, activePool, employeeInputsFull])

  const allocationByEmployeeId = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of filteredRows) {
      map.set(m.employeeId, allocationFullTeam.get(m.employeeId) ?? 0)
    }
    return map
  }, [filteredRows, allocationFullTeam])

  /** Sum of preview line amounts (all team members) — drives KPIs while editing distribution, before save. */
  const previewTotalAllocated = useMemo(() => {
    let sum = 0
    for (const v of allocationFullTeam.values()) {
      sum += roundMoney2(v)
    }
    return roundMoney2(sum)
  }, [allocationFullTeam])

  const totalSalaryCostAcrossEmployees = useMemo(
    () => filteredRows.reduce((sum, m) => sum + (m.currentAnnualSalary ?? 0), 0),
    [filteredRows]
  )

  const grandTotalPositivePerformanceScores = useMemo(
    () => filteredRows.reduce((sum, m) => sum + Math.max(0, m.performanceOverallScore ?? 0), 0),
    [filteredRows]
  )

  const performanceFallbackToEqual = useMemo(() => {
    if (distributionMethod !== 'performance_weighted') return false
    return filteredRows.every(m => (m.performanceOverallScore ?? 0) <= 0)
  }, [distributionMethod, filteredRows])

  const performancePartialScores = useMemo(() => {
    if (distributionMethod !== 'performance_weighted' || performanceFallbackToEqual) return false
    const hasPositive = filteredRows.some(m => (m.performanceOverallScore ?? 0) > 0)
    const hasMissing = filteredRows.some(m => (m.performanceOverallScore ?? 0) <= 0)
    return hasPositive && hasMissing
  }, [distributionMethod, performanceFallbackToEqual, filteredRows])

  const [saveAllocationsDialogOpen, setSaveAllocationsDialogOpen] = useState(false)
  /** When true, show distribution preview even if persisted team proposals exist ("New proposal"). */
  const [preferDistributionView, setPreferDistributionView] = useState(false)

  const orgUnitPlanRowIds = useMemo(() => {
    const ids = new Set<string>()
    for (const m of teamMembers) {
      const ou = m.organizationalUnitId
      if (ou) {
        const rowId = planOuRowIdByOrganizationalUnitId.get(ou)
        if (rowId) {
          ids.add(rowId)
        }
      }
    }
    if (managerOrganizationalUnitId) {
      const rowId = planOuRowIdByOrganizationalUnitId.get(managerOrganizationalUnitId)
      if (rowId) {
        ids.add(rowId)
      }
    }
    return [...ids]
  }, [teamMembers, planOuRowIdByOrganizationalUnitId, managerOrganizationalUnitId])

  const orgUnitPlanRowIdsKey = useMemo(
    () => [...orgUnitPlanRowIds].sort((a, b) => a.localeCompare(b)).join(','),
    [orgUnitPlanRowIds]
  )

  const {
    rows: orgScopeEmployeeRows,
    loading: proposalsLoading,
    error: proposalsError,
    refetch: refetchTeamProposals
  } = useCompensationBudgetPlanEmployeesByOrgUnitIds(accessToken, orgUnitPlanRowIds)

  const teamMemberIds = useMemo(() => new Set(teamMembers.map(m => m.employeeId)), [teamMembers])

  const teamProposalRows = useMemo(
    () => orgScopeEmployeeRows.filter(r => teamMemberIds.has(r.employeeId)),
    [orgScopeEmployeeRows, teamMemberIds]
  )

  const employeeIdsBlockedFromManagerResubmit = useMemo(
    () => getEmployeeIdsBlockedFromManagerResubmit(teamProposalRows),
    [teamProposalRows]
  )

  const hasPersistedTeamProposals = teamProposalRows.length > 0
  /** When true, user sees the saved proposals list — KPIs use persisted org-unit allocation. */
  const showProposalsTable = hasPersistedTeamProposals && !preferDistributionView

  const awaitingProposalsList = orgUnitPlanRowIds.length > 0 && proposalsLoading && orgScopeEmployeeRows.length === 0

  useEffect(() => {
    setPreferDistributionView(false)
  }, [selectedCompanyId, orgUnitPlanRowIdsKey])

  const listsReady = loading === false && salaryBudgetLoading === false
  const canShowSaveAction = Boolean(
    accessToken &&
      managerEmployeeId &&
      teamMembers.length > 0 &&
      listsReady &&
      !proposalsLockedAfterSubmit &&
      !showProposalsTable
  )

  const teamBudgetKpiWidgets = useMemo((): WidgetItem[] | null => {
    if (activePool == null) {
      return null
    }
    const allocatedForKpi = showProposalsTable
      ? sumAllocationForTeamDepartmentKpi(teamProposalRows)
      : previewTotalAllocated
    const allocatedRounded = roundMoney2(allocatedForKpi)
    const unallocatedRounded = roundMoney2(Math.max(0, activePool - allocatedForKpi))
    const kpiMoney = {
      currency: extractCurrencyCode(currencyCode),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
    return [
      {
        key: 'manager-team-total-budget',
        title: t('budget-summary-total-available'),
        value:
          totalSalaryBudget == null
            ? t('budget-summary-placeholder-value')
            : formatCurrencyString(totalSalaryBudget, kpiMoney),
        valueIsString: true,
        prefix: <CurrencyCircleDollarIcon size={24} />,
        color: TEAM_BUDGET_KPI_COLORS.totalBudget,
        span: { xs: 24, sm: 8, lg: 8 }
      },
      {
        key: 'manager-team-allocated-amount',
        title: t('manager-team-allocated-amount-card-title'),
        value: formatCurrencyString(allocatedRounded, kpiMoney),
        valueIsString: true,
        prefix: <CoinsIcon size={24} />,
        color: TEAM_BUDGET_KPI_COLORS.pool,
        span: { xs: 24, sm: 8, lg: 8 },
        description: showProposalsTable
          ? t('manager-team-allocated-kpi-from-proposals')
          : t('manager-team-allocated-kpi-from-preview')
      },
      {
        key: 'manager-team-budget-allocation',
        title: t('manager-team-budget-allocation-card-title'),
        value: formatCurrencyString(unallocatedRounded, kpiMoney),
        valueIsString: true,
        prefix: <ChartPieSliceIcon size={24} />,
        color: TEAM_BUDGET_KPI_COLORS.allocation,
        span: { xs: 24, sm: 8, lg: 8 }
      }
    ]
  }, [activePool, currencyCode, previewTotalAllocated, showProposalsTable, t, teamProposalRows, totalSalaryBudget])

  const contextPoolSection = useMemo(() => {
    if (salaryBudgetLoading) {
      return null
    }
    if (teamBudgetKpiWidgets != null) {
      return (
        <WidgetGroup
          className="gba:py-0"
          widgets={teamBudgetKpiWidgets}
          skeletonCount={3}
          cardsClassName="gba:sm:grid-cols-3"
          data-testid="manager-team-budget-kpi-cards"
        />
      )
    }
    if (
      selectedCompanyId != null &&
      salaryBudgetError == null &&
      totalSalaryBudget !== null &&
      totalSalaryBudget <= 0
    ) {
      return (
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="manager-team-distribution-pool-zero">
          {tBudget('budget-distribution-preview-pool-zero')}
        </p>
      )
    }
    return null
  }, [salaryBudgetError, salaryBudgetLoading, selectedCompanyId, teamBudgetKpiWidgets, tBudget, totalSalaryBudget])

  let teamDistributionMainPanel: React.ReactNode
  if (awaitingProposalsList) {
    teamDistributionMainPanel = (
      <div
        className="gba:flex gba:min-h-[200px] gba:items-center gba:justify-center"
        data-testid="manager-team-proposals-initial-load"
      >
        <Spinner />
      </div>
    )
  } else if (showProposalsTable) {
    teamDistributionMainPanel = (
      <ManagerTeamSubmittedProposalsPanel
        teamMembers={teamMembers}
        currencyCode={currencyCode}
        proposalRows={teamProposalRows}
        proposalsLoading={proposalsLoading}
        proposalsError={proposalsError}
        accessToken={accessToken}
        managerEmployeeId={managerEmployeeId}
        onSentBackRevisionSaved={() => {
          void refetchTeamProposals()
        }}
        onNewProposal={() => {
          setPreferDistributionView(true)
          onNewProposalUnlock?.()
        }}
      />
    )
  } else {
    teamDistributionMainPanel = (
      <TeamCompensationDistributionSplitPanel
        distributionMethod={distributionMethod}
        setDistributionMethod={setDistributionMethod}
        loading={loading}
        proposalsLockedAfterSubmit={proposalsLockedAfterSubmit}
        filteredRows={filteredRows}
        totalFiltered={totalFiltered}
        activePool={activePool}
        allocationByEmployeeId={allocationByEmployeeId}
        currencyCode={currencyCode}
        error={error}
        customBudgetByEmployeeId={customBudgetByEmployeeId}
        handleCustomAmountRawChange={handleCustomAmountRawChange}
        handleCustomPercentRawChange={handleCustomPercentRawChange}
        handleCustomModeChange={handleCustomModeChange}
        performanceFallbackToEqual={performanceFallbackToEqual}
        performancePartialScores={performancePartialScores}
        totalSalaryCostAcrossEmployees={totalSalaryCostAcrossEmployees}
        grandTotalPositivePerformanceScores={grandTotalPositivePerformanceScores}
        dataDisplay={dataDisplay}
        canShowSaveAction={canShowSaveAction}
        onOpenSubmitProposals={() => setSaveAllocationsDialogOpen(true)}
        showBackToProposalsTable={preferDistributionView && hasPersistedTeamProposals}
        onBackToProposalsTable={() => {
          setPreferDistributionView(false)
        }}
      />
    )
  }

  return (
    <>
      <TeamCompensationSaveAllocationsDialog
        open={saveAllocationsDialogOpen}
        onOpenChange={setSaveAllocationsDialogOpen}
        accessToken={accessToken}
        managerEmployeeId={managerEmployeeId}
        restClient={restClient}
        teamMembers={teamMembers}
        allocationByEmployeeId={allocationFullTeam}
        distributionMethod={distributionMethod}
        distributionPool={activePool}
        currencyCode={currencyCode}
        planOuRowIdByOrganizationalUnitId={planOuRowIdByOrganizationalUnitId}
        managerOrganizationalUnitId={managerOrganizationalUnitId}
        employeeIdsBlockedFromManagerResubmit={employeeIdsBlockedFromManagerResubmit}
        onSaved={createdIds => {
          onMergeSavedRowIds(createdIds)
          setPreferDistributionView(false)
          void refetchTeamProposals()
          onSaved?.()
        }}
      />
      <div className="gba:flex gba:flex-col gba:gap-4" data-testid="manager-team-distribution-layout">
        <div data-testid="manager-team-compensation-context">{contextPoolSection}</div>

        {proposalsLockedAfterSubmit && !showProposalsTable ? (
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="manager-team-proposals-readonly-hint">
            {t('manager-team-proposals-readonly-hint')}
          </p>
        ) : null}

        {teamDistributionMainPanel}
      </div>
    </>
  )
}
