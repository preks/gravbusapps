import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { buildPlatformUrl, navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import { useSubmissionsOrgUnitBudgetTable } from '../../hooks/useSubmissionsOrgUnitBudgetTable'
import { CompensationCycleSelector } from '../shared/CompensationCycleSelector'
import { SubmissionsOrgUnitBudgetTable } from './SubmissionsOrgUnitBudgetTable'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import translations from '../../_i18n'

export interface SubmissionsViewProps {
  accessToken: string
  companyId: string
  compensationPlans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  selectedCompensationPlanId: string | null
  onCompensationPlanChange: (planId: string | null) => void
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
  companyToolbar
}) => {
  const { t } = useTranslation(translations)
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

  const { rows, loading, error, hasCompanyBudgetRows } = useSubmissionsOrgUnitBudgetTable(
    accessToken,
    companyId,
    currencyCode,
    teamMembers,
    selectedCompensationPlanId
  )

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
        teamLabel: row.organizationalUnitName
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
        companyToolbar={submissionsToolbar}
        onReviewTeam={handleReviewTeam}
      />
    </div>
  )
}
