import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { buildPlatformUrl, navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../../api/compensationBudgetRestConfig'
import { executeEmployeeSalaryAdjustments } from '../../../../api/executeEmployeeSalaryAdjustments'
import {
  saveCompensationBudgetPlan,
  saveCompensationBudgetPlanOrganizationalUnit
} from '../../../../api/saveCompensationBudgetPlan'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import { useSubmissionsOrgUnitBudgetTable } from '../../hooks/useSubmissionsOrgUnitBudgetTable'
import { CompensationCycleSelector } from '../shared/CompensationCycleSelector'
import { SubmissionsOrgUnitBudgetTable } from './SubmissionsOrgUnitBudgetTable'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import translations from '../../_i18n'

const REVIEW_SOURCE_DEPARTMENT_SUBMISSIONS = 'department-submissions' as const
const SUBMITTED_STATUS = 'BUDGET_PLAN_SUBMITTED'
const EXECUTED_STATUS = 'BUDGET_PLAN_EXECUTED'

function buildSalaryAdjustmentPayload(rows: SubmissionsOrgUnitTableRow[]) {
  return rows.flatMap(row =>
    row.salaryAdjustments.map(adjustment => ({
      employeeId: adjustment.employeeId,
      newAnnualGrossSalary: adjustment.newAnnualGrossSalary,
      effectiveDate: row.effectiveDate ?? '',
      requestedPercent: adjustment.requestedPercent
    }))
  )
}

function buildExecutedOrgUnitBudgetBody(row: SubmissionsOrgUnitTableRow) {
  return {
    changeMode: 'UPDATE' as const,
    compensationBudgetPlanOrganizationalUnit: {
      id: row.id,
      version: row.version,
      salaryBudgetAmount: row.salaryBudgetAmount,
      salaryBudgetPercent: row.salaryBudgetPercent,
      allocationAmount: row.allocationAmount,
      bonusBudgetAmount: row.bonusBudgetAmount,
      bonusBudgetPercent: row.bonusBudgetPercent,
      budgetPlanStatus: EXECUTED_STATUS,
      compensationBudgetPlanCompany: row.compensationBudgetPlanCompanyId,
      organizationalUnit: row.organizationalUnitId
    }
  }
}

function buildExecutedCompensationPlanBody(plan: CompensationBudgetPlanRow) {
  return {
    changeMode: 'UPDATE' as const,
    compensationBudgetPlan: {
      id: plan.id,
      version: plan.version,
      name: plan.name.trim(),
      description: plan.description?.trim() ?? '',
      startDate: plan.startDate,
      endDate: plan.endDate,
      effectiveDate: plan.effectiveDate,
      budgetPlanStatus: EXECUTED_STATUS
    }
  }
}

export interface SubmissionsViewProps {
  accessToken: string
  companyId: string
  compensationPlans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  selectedCompensationPlanId: string | null
  onCompensationPlanChange: (planId: string | null) => void
  onCompensationPlansChanged?: () => void
  /** Company selector — shown next to the compensation cycle selector. */
  companyToolbar?: React.ReactNode
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({
  accessToken,
  companyId,
  compensationPlans,
  plansLoading,
  selectedCompensationPlanId,
  onCompensationPlanChange,
  onCompensationPlansChanged,
  companyToolbar
}) => {
  const { t } = useTranslation(translations)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const [selectedOrgUnitBudgetRowIds, setSelectedOrgUnitBudgetRowIds] = useState<Set<string>>(() => new Set())
  const [executingSalaryAdjustments, setExecutingSalaryAdjustments] = useState(false)
  const [salaryAdjustmentError, setSalaryAdjustmentError] = useState<string | null>(null)
  const [salaryAdjustmentMessage, setSalaryAdjustmentMessage] = useState<string | null>(null)
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

  const currencyCode = teamMembers[0]?.currency ?? 'EUR'

  const { rows, loading, error, hasCompanyBudgetRows, refetch } = useSubmissionsOrgUnitBudgetTable(
    accessToken,
    companyId,
    currencyCode,
    teamMembers,
    selectedCompensationPlanId
  )

  const submittedRows = useMemo(() => rows.filter(row => row.budgetPlanStatus === SUBMITTED_STATUS), [rows])

  const selectableRowIds = useMemo(() => new Set(submittedRows.map(row => row.id)), [submittedRows])

  useEffect(() => {
    setSelectedOrgUnitBudgetRowIds(prev => {
      const next = new Set<string>()
      for (const id of prev) {
        if (selectableRowIds.has(id)) {
          next.add(id)
        }
      }
      if (next.size === prev.size && [...prev].every(id => next.has(id))) {
        return prev
      }
      return next
    })
  }, [selectableRowIds])

  const selectedRows = useMemo(
    () => submittedRows.filter(row => selectedOrgUnitBudgetRowIds.has(row.id)),
    [selectedOrgUnitBudgetRowIds, submittedRows]
  )

  const handleToggleSubmittedRow = useCallback(
    (id: string, checked: boolean) => {
      if (!selectableRowIds.has(id)) {
        return
      }
      setSalaryAdjustmentError(null)
      setSalaryAdjustmentMessage(null)
      setSelectedOrgUnitBudgetRowIds(prev => {
        const next = new Set(prev)
        if (checked) {
          next.add(id)
        } else {
          next.delete(id)
        }
        return next
      })
    },
    [selectableRowIds]
  )

  const salaryAdjustmentSelection = useMemo(
    () => ({
      selectedIds: selectedOrgUnitBudgetRowIds,
      busy: executingSalaryAdjustments,
      selectableRowIds,
      onToggleRow: handleToggleSubmittedRow,
      t
    }),
    [executingSalaryAdjustments, handleToggleSubmittedRow, selectableRowIds, selectedOrgUnitBudgetRowIds, t]
  )

  const handleExecuteSalaryAdjustments = useCallback(async () => {
    setSalaryAdjustmentError(null)
    setSalaryAdjustmentMessage(null)

    if (selectedRows.length === 0) {
      return
    }

    const rowsWithoutEffectiveDate = selectedRows.filter(row => row.effectiveDate == null || row.effectiveDate === '')
    if (rowsWithoutEffectiveDate.length > 0) {
      setSalaryAdjustmentError(t('submissions-execute-salary-adjustments-missing-effective-date'))
      return
    }

    const adjustments = buildSalaryAdjustmentPayload(selectedRows)

    if (adjustments.length === 0) {
      setSalaryAdjustmentError(t('submissions-execute-salary-adjustments-empty'))
      return
    }

    setExecutingSalaryAdjustments(true)
    try {
      await executeEmployeeSalaryAdjustments(restClient, accessToken, { adjustments })
      for (const row of selectedRows) {
        await saveCompensationBudgetPlanOrganizationalUnit(restClient, accessToken, buildExecutedOrgUnitBudgetBody(row))
      }
      const selectedPlan = compensationPlans.find(plan => plan.id === selectedCompensationPlanId)
      if (selectedPlan) {
        await saveCompensationBudgetPlan(restClient, accessToken, buildExecutedCompensationPlanBody(selectedPlan))
      }
      setSelectedOrgUnitBudgetRowIds(new Set())
      setSalaryAdjustmentMessage(t('submissions-execute-salary-adjustments-success', { count: adjustments.length }))
      refetch()
      onCompensationPlansChanged?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('submissions-execute-salary-adjustments-error')
      setSalaryAdjustmentError(message)
    } finally {
      setExecutingSalaryAdjustments(false)
    }
  }, [
    accessToken,
    compensationPlans,
    onCompensationPlansChanged,
    refetch,
    restClient,
    selectedCompensationPlanId,
    selectedRows,
    t
  ])

  const submissionsToolbar = useMemo(
    () => (
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3" data-testid="submissions-view-toolbar">
        <CompensationCycleSelector
          plans={compensationPlans.map(p => ({ id: p.id, name: p.name }))}
          plansLoading={plansLoading}
          selectedPlanId={selectedCompensationPlanId}
          onPlanChange={onCompensationPlanChange}
          t={t}
          variant="toolbar"
        />
        {companyToolbar}
      </div>
    ),
    [compensationPlans, companyToolbar, onCompensationPlanChange, plansLoading, selectedCompensationPlanId, t]
  )

  const listLoading = loading || loadingTeam
  const listError = error ?? teamError ?? null

  const handleReviewTeam = useCallback(
    (row: SubmissionsOrgUnitTableRow) => {
      const url = buildPlatformUrl(Navigation.HR_COMPENSATION_MANAGER_PLANNING, {
        companyId,
        orgUnitId: row.organizationalUnitId,
        planOuRowId: row.id,
        supervisorReview: '1',
        teamLabel: row.organizationalUnitName,
        reviewSource: REVIEW_SOURCE_DEPARTMENT_SUBMISSIONS
      })
      navigateTo(url)
    },
    [companyId]
  )

  return (
    <div className="gba:space-y-6" data-testid="submissions-view">
      <SubmissionsOrgUnitBudgetTable
        rows={rows}
        loading={listLoading}
        error={listError}
        hasCompanyBudgetRows={hasCompanyBudgetRows}
        compensationPlanSelected={selectedCompensationPlanId != null}
        companyToolbar={submissionsToolbar}
        onReviewTeam={handleReviewTeam}
        selection={salaryAdjustmentSelection}
        selectedCount={selectedRows.length}
        executingSalaryAdjustments={executingSalaryAdjustments}
        salaryAdjustmentMessage={salaryAdjustmentMessage}
        salaryAdjustmentError={salaryAdjustmentError}
        onExecuteSalaryAdjustments={handleExecuteSalaryAdjustments}
      />
    </div>
  )
}
