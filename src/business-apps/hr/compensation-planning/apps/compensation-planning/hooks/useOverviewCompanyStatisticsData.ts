import { useMemo } from 'react'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../manager-compensation-planning/hooks/useTeamCompensationData'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../utils/buildOrgUnitDistributionInputs'
import type { OverviewOrgUnitSalaryRow } from '../components/views/OverviewOrgUnitSalaryCard'

const OVERVIEW_ORG_UNIT_LIMIT = 500

export interface OverviewCompanyStatisticsModel {
  loading: boolean
  error: string | null
  orgUnitSalaryRows: OverviewOrgUnitSalaryRow[]
  totalSalaryAcrossOrgUnits: number
  totalBonusAcrossOrgUnits: number
  teamMemberCount: number
}

export function useOverviewCompanyStatisticsData(
  accessToken: string,
  companyId: string,
  unassignedOrgUnitLabel: string
): OverviewCompanyStatisticsModel {
  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(accessToken, companyId, OVERVIEW_ORG_UNIT_LIMIT)
  const { teamMembers, loading, error } = useTeamCompensationData({
    accessToken,
    companyId,
    requirePayrollRelevantContractType: true
  })

  const orgUnitSalaryRows = useMemo(() => {
    return buildOrgUnitDistributionInputsFromTeamMembers(teamMembers, {
      unassignedLabel: unassignedOrgUnitLabel,
      companyOrgUnits
    }).map(orgUnit => ({
      orgUnitId: orgUnit.orgUnitId,
      orgUnitName: orgUnit.orgUnitName,
      headcount: orgUnit.headcount,
      salaryCost: orgUnit.currentTotalSalaryCost,
      bonusCostYtd: orgUnit.currentTotalBonusYtd
    }))
  }, [companyOrgUnits, teamMembers, unassignedOrgUnitLabel])

  const totalSalaryAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, row) => sum + row.salaryCost, 0),
    [orgUnitSalaryRows]
  )

  const totalBonusAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, row) => sum + row.bonusCostYtd, 0),
    [orgUnitSalaryRows]
  )

  return {
    loading,
    error,
    orgUnitSalaryRows,
    totalSalaryAcrossOrgUnits,
    totalBonusAcrossOrgUnits,
    teamMemberCount: teamMembers.length
  }
}
