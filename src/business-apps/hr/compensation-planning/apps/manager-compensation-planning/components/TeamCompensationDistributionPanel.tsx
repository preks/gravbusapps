import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataDisplay,
  useTranslation
} from '@newwork/nw-design-system'
import { ChartPieSliceIcon, CoinsIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { extractCurrencyCode, formatCurrencyString } from '@/common/utils/numberFormatter'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { distributeToEmployees } from '../../../utils/budgetCalculations'
import compensationPlanningTranslations from '../../compensation-planning/_i18n'
import { roundMoney2 } from '../../compensation-planning/utils/parseCustomBudgetInputs'
import {
  BudgetDistributionMethodSelector,
  budgetDistributionMethodTitleKey
} from '../../compensation-planning/components/views/BudgetDistributionMethodSelector'
import { useManagerPlanningStore } from '../hooks/useManagerPlanningStore'
import { useManagerTeamCompensationDataDisplay } from '../hooks/useManagerTeamCompensationDataDisplay'
import { useManagerTeamEmployeeCustomBudgetMaps } from '../hooks/useManagerTeamEmployeeCustomBudgetMaps'
import translations from '../_i18n'
import { TeamCompensationEmployeeDistributionList } from './TeamCompensationEmployeeDistributionList'
import { TeamCompensationSaveAllocationsDialog } from './TeamCompensationSaveAllocationsDialog'

const EXCLUDED_DISTRIBUTION_METHODS = ['proportional_headcount'] as const

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
  onSaved?: () => void
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
  onSaved
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

  const distributionEmployeesForList = useMemo(() => teamMembers.map(m => ({ id: m.employeeId })), [teamMembers])

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

  const totalPreviewAllocated = useMemo(() => {
    return teamMembers.reduce((sum, m) => sum + (allocationFullTeam.get(m.employeeId) ?? 0), 0)
  }, [teamMembers, allocationFullTeam])

  const allocationByEmployeeId = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of filteredRows) {
      map.set(m.employeeId, allocationFullTeam.get(m.employeeId) ?? 0)
    }
    return map
  }, [filteredRows, allocationFullTeam])

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

  const listsReady = loading === false && salaryBudgetLoading === false
  const canShowSaveAction = Boolean(accessToken && managerEmployeeId && teamMembers.length > 0 && listsReady)

  const teamBudgetKpiWidgets = useMemo((): WidgetItem[] | null => {
    if (activePool == null) {
      return null
    }
    const unallocatedRounded = roundMoney2(Math.max(0, activePool - totalPreviewAllocated))
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
          totalSalaryBudget != null
            ? formatCurrencyString(totalSalaryBudget, kpiMoney)
            : t('budget-summary-placeholder-value'),
        valueIsString: true,
        prefix: <CurrencyCircleDollarIcon size={24} />,
        color: TEAM_BUDGET_KPI_COLORS.totalBudget,
        span: { xs: 24, sm: 8, lg: 8 }
      },
      {
        key: 'manager-team-distribution-pool-summary',
        title: tBudget('budget-distribution-pool-primary-label'),
        value: formatCurrencyString(activePool, kpiMoney),
        valueIsString: true,
        prefix: <CoinsIcon size={24} />,
        color: TEAM_BUDGET_KPI_COLORS.pool,
        span: { xs: 24, sm: 8, lg: 8 },
        description: tBudget('budget-distribution-using-method', {
          method: tBudget(budgetDistributionMethodTitleKey(distributionMethod))
        })
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
  }, [activePool, currencyCode, distributionMethod, t, tBudget, totalPreviewAllocated, totalSalaryBudget])

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

  const cardTitle = t('team-summary', { count: totalFiltered })

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
        onSaved={onSaved}
      />
      <div className="gba:flex gba:flex-col gba:gap-4" data-testid="manager-team-distribution-layout">
        <div data-testid="manager-team-compensation-context">{contextPoolSection}</div>

        <Card className="gba:w-full" data-testid="manager-team-distribution-preview-panel">
          <CardHeader className="gba:flex gba:flex-row gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:border-border gba:pb-4">
            <CardTitle className="gba:min-w-0 gba:text-base gba:font-semibold gba:text-foreground">
              {tBudget('budget-distribution-split-panel-title')}
            </CardTitle>
            <Button
              type="button"
              className="gba:shrink-0"
              disabled={!canShowSaveAction}
              onClick={() => setSaveAllocationsDialogOpen(true)}
              data-testid="manager-team-save-allocations-open"
            >
              {t('manager-team-save-allocations')}
            </Button>
          </CardHeader>
          <CardContent className="gba:p-0">
            <div className="gba:flex gba:min-h-0 gba:flex-col gba:md:flex-row gba:md:items-stretch">
              <aside
                className="gba:flex gba:w-full gba:max-w-xs gba:shrink-0 gba:flex-col gba:border-b gba:border-border gba:bg-muted/30 gba:p-4 md:gba:max-w-none md:gba:w-64 md:gba:border-b-0 md:gba:border-r"
                data-testid="manager-team-distribution-method-sidebar"
              >
                <p className="gba:mb-3 gba:w-full gba:max-w-xs gba:text-sm gba:font-medium gba:text-muted-foreground md:gba:max-w-none">
                  {tBudget('budget-distribution-split-panel-methods-column-title')}
                </p>
                <BudgetDistributionMethodSelector
                  variant="sidebar"
                  selectedMethod={distributionMethod}
                  onMethodChange={setDistributionMethod}
                  disabled={loading}
                  sectionTitle={t('manager-team-distribution-method-section')}
                  t={tBudget}
                  excludedMethods={EXCLUDED_DISTRIBUTION_METHODS}
                />
              </aside>
              <div
                className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:bg-background gba:p-4"
                data-testid="manager-team-distribution-list-pane"
              >
                <DataDisplay
                  data-testid="manager-team-compensation-display"
                  titleSections={[
                    {
                      id: 'team-members',
                      label: t('table-section-title'),
                      metadata: { count: totalFiltered, isLoading: loading }
                    }
                  ]}
                  currentSection="team-members"
                  toolbarDensity="default"
                  searchValue={dataDisplay.searchQuery}
                  searchPlaceholder={t('search-placeholder')}
                  onSearchChange={dataDisplay.setSearchQuery}
                >
                  <TeamCompensationEmployeeDistributionList
                    embedded
                    sortedMembers={filteredRows}
                    distributionPool={activePool}
                    allocationByEmployeeId={allocationByEmployeeId}
                    currencyCode={currencyCode}
                    loading={loading}
                    error={error}
                    selectedMethod={distributionMethod}
                    customBudgetByEmployeeId={customBudgetByEmployeeId}
                    onCustomAmountRawChange={handleCustomAmountRawChange}
                    onCustomPercentRawChange={handleCustomPercentRawChange}
                    onCustomModeChange={handleCustomModeChange}
                    performanceFallbackToEqual={performanceFallbackToEqual}
                    performancePartialScores={performancePartialScores}
                    totalSalaryCostAcrossEmployees={totalSalaryCostAcrossEmployees}
                    grandTotalPositivePerformanceScores={grandTotalPositivePerformanceScores}
                    cardTitle={cardTitle}
                    tBudget={tBudget}
                    emptyMessage={t('table-empty')}
                  />
                </DataDisplay>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
