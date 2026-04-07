import React, { useCallback } from 'react'
import { buildPlatformUrl, navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { useSubmissionsOrgUnitBudgetTable } from '../../hooks/useSubmissionsOrgUnitBudgetTable'
import { SubmissionsOrgUnitBudgetTable } from './SubmissionsOrgUnitBudgetTable'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'

export interface SubmissionsViewProps {
  accessToken: string
  companyId: string
  /** Company selector in the submissions table toolbar. */
  companyToolbar?: React.ReactNode
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({ accessToken, companyId, companyToolbar }) => {
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
    teamMembers
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
        companyToolbar={companyToolbar}
        onReviewTeam={handleReviewTeam}
      />
    </div>
  )
}
