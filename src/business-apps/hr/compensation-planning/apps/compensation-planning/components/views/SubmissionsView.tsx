import React from 'react'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { useSubmissionsOrgUnitBudgetTable } from '../../hooks/useSubmissionsOrgUnitBudgetTable'
import { SubmissionsOrgUnitBudgetTable } from './SubmissionsOrgUnitBudgetTable'

export interface SubmissionsViewProps {
  accessToken: string
  companyId: string
  companyToolbarGroup: React.ReactNode
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({ accessToken, companyId, companyToolbarGroup }) => {
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

  return (
    <div className="gba:space-y-6" data-testid="submissions-view">
      <SubmissionsOrgUnitBudgetTable
        rows={rows}
        loading={listLoading}
        error={listError}
        hasCompanyBudgetRows={hasCompanyBudgetRows}
        toolbarSecondary={companyToolbarGroup}
      />
    </div>
  )
}
