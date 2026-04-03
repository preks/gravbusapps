import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { useTeamMemberPerformanceScores } from '../../../manager-compensation-planning/hooks/useTeamMemberPerformanceScores'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import { distributeToOrgUnits, resolveCompanySalaryIncreasePool } from '../../../../utils/budgetCalculations'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../../utils/buildOrgUnitDistributionInputs'
import translations from '../../_i18n'
import { BudgetDistributionOrgUnitList } from './BudgetDistributionOrgUnitList'
import { BudgetDistributionMethodSelector, budgetDistributionMethodTitleKey } from './BudgetDistributionMethodSelector'
import { useBudgetDistributionOrgUnitBudget } from '../../hooks/useBudgetDistributionOrgUnitBudget'
import { useCompensationPlanningStore } from '../../hooks/useCompensationPlanningStore'

export interface BudgetDistributionViewProps {
  accessToken: string
  companyId: string
  companyToolbarGroup: React.ReactNode
}

interface BudgetDistributionState {
  selectedMethod: DistributionMethod
  setDistributionMethod: (method: DistributionMethod) => void
}

const useBudgetDistributionStore = create<BudgetDistributionState>(set => ({
  selectedMethod: 'proportional_headcount',
  setDistributionMethod: method => set({ selectedMethod: method })
}))

const ORG_UNIT_LIST_LIMIT = 500

/** Set to `true` to disable changing the distribution method (previous read-only behaviour). */
const LOCK_DISTRIBUTION_METHOD_SELECTION = false

function roundMoney2(value: number): number {
  return Math.round(value * 100) / 100
}

function parseCustomAmountInput(raw: string): number {
  const normalized = raw.replace(',', '.').trim()
  if (normalized === '') {
    return 0
  }
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) {
    return 0
  }
  return roundMoney2(parsed)
}

export function BudgetDistributionView({ accessToken, companyId, companyToolbarGroup }: BudgetDistributionViewProps) {
  const { t } = useTranslation(translations)
  const { selectedMethod, setDistributionMethod } = useBudgetDistributionStore()

  const { selectedDistributionCompanyBudgetId, setSelectedDistributionCompanyBudgetId } = useCompensationPlanningStore()

  const [customAmountByOrgUnitId, setCustomAmountByOrgUnitId] = useState<Record<string, string>>({})

  useEffect(() => {
    setCustomAmountByOrgUnitId({})
  }, [companyId])

  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(accessToken, companyId, ORG_UNIT_LIST_LIMIT)

  const {
    teamMembers,
    loading: loadingTeam,
    error: teamError
  } = useTeamCompensationData({
    accessToken,
    companyId
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
    selectedCompanyBudgetRow
  } = useBudgetDistributionOrgUnitBudget(accessToken, companyId, companyOrgUnits)

  const salaryIncreasePool = useMemo(() => {
    if (!selectedCompanyBudgetRow) return null
    return resolveCompanySalaryIncreasePool({
      salaryBudgetAmount: selectedCompanyBudgetRow.salaryBudgetAmount,
      salaryBudgetPercent: selectedCompanyBudgetRow.salaryBudgetPercent,
      currentTotalSalaryCost: selectedCompanyBudgetRow.currentTotalSalaryCost
    })
  }, [selectedCompanyBudgetRow])

  /** Same basis as Overview: org units implied by positions in this company (plus Unassigned when needed). */
  const orgUnitDistributionInputs = useMemo(
    () =>
      buildOrgUnitDistributionInputsFromTeamMembers(teamMembersWithPerformance, {
        unassignedLabel: t('overview-org-unit-unassigned')
      }),
    [teamMembersWithPerformance, t]
  )

  const distributionOrgUnitsForList = useMemo(
    () =>
      orgUnitDistributionInputs.map(i => ({
        id: i.orgUnitId,
        name: i.orgUnitName
      })),
    [orgUnitDistributionInputs]
  )

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
      const map = new Map<string, number>()
      for (const u of distributionOrgUnitsForList) {
        map.set(u.id, parseCustomAmountInput(customAmountByOrgUnitId[u.id] ?? ''))
      }
      return map
    }
    if (salaryIncreasePool == null || salaryIncreasePool <= 0 || orgUnitDistributionInputs.length === 0) {
      return new Map<string, number>()
    }
    return distributeToOrgUnits(salaryIncreasePool, orgUnitDistributionInputs, selectedMethod)
  }, [
    selectedMethod,
    customAmountByOrgUnitId,
    distributionOrgUnitsForList,
    salaryIncreasePool,
    orgUnitDistributionInputs
  ])

  const handleCustomAmountChange = useCallback((orgUnitId: string, value: string) => {
    setCustomAmountByOrgUnitId(prev => ({ ...prev, [orgUnitId]: value }))
  }, [])

  const listLoading = loadingTeam || loadingOrgUnitBudgets || loadingPerformanceScores
  const listError = orgUnitBudgetError ?? teamError ?? null

  const hasSelectedCompanyBudget = selectedDistributionCompanyBudgetId != null

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
    selectedCompanyBudgetRow && salaryIncreasePool != null && salaryIncreasePool > 0 ? (
      <div
        className="gba:rounded-md gba:border gba:border-border gba:bg-muted/30 gba:px-4 gba:py-3"
        data-testid="budget-distribution-preview-pool-summary"
      >
        <p className="gba:text-sm gba:text-foreground">
          {t('budget-distribution-preview-pool-summary', {
            amount: formatCurrency(salaryIncreasePool, currencyCode),
            method: t(budgetDistributionMethodTitleKey(selectedMethod))
          })}
        </p>
      </div>
    ) : hasSelectedCompanyBudget &&
      selectedCompanyBudgetRow &&
      (salaryIncreasePool == null || salaryIncreasePool <= 0) ? (
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
      </div>

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
        salaryIncreasePool={salaryIncreasePool}
        allocationByOrgUnitId={previewAllocationByOrgUnit}
        currencyCode={currencyCode}
        loading={listLoading}
        error={listError}
        hasSelectedPlan={hasSelectedCompanyBudget}
        selectedMethod={selectedMethod}
        customAmountByOrgUnitId={customAmountByOrgUnitId}
        onCustomAmountChange={handleCustomAmountChange}
        performanceFallbackToHeadcount={performanceFallbackToHeadcount}
        performancePartialScores={performancePartialScores}
        toolbarSecondary={companyToolbarGroup}
      />
    </div>
  )
}
