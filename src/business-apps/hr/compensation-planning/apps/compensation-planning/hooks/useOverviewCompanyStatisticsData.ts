import { useMemo } from 'react'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../manager-compensation-planning/hooks/useTeamCompensationData'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../utils/buildOrgUnitDistributionInputs'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import type { OverviewOrgUnitSalaryRow } from '../components/views/OverviewOrgUnitSalaryCard'

const OVERVIEW_ORG_UNIT_LIMIT = 500

export interface OverviewCompanyStatisticsModel {
  loading: boolean
  error: string | null
  refetch: () => void
  totalHeadcount: number
  totalSalaryCost: number
  totalBonuses: number
  totalCompensation: number
  avgSalary: number
  currency: string
  moneyFormat: {
    currency: string
    minimumFractionDigits: number
    maximumFractionDigits: number
  }
  orgUnitSalaryRows: OverviewOrgUnitSalaryRow[]
  totalSalaryAcrossOrgUnits: number
  totalBonusAcrossOrgUnits: number
  teamMemberCount: number
  withSalaryCount: number
  withBandCount: number
  compaRatioDisplay: string
}

/**
 * Shared workforce / salary aggregates and org-unit rows for Overview and Budget setup.
 */
export function useOverviewCompanyStatisticsData(
  accessToken: string,
  companyId: string,
  unassignedOrgUnitLabel: string
): OverviewCompanyStatisticsModel {
  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(accessToken, companyId, OVERVIEW_ORG_UNIT_LIMIT)
  const { teamMembers, loading, error, refetch } = useTeamCompensationData({
    accessToken,
    companyId,
    requirePayrollRelevantContractType: true
  })

  const orgUnitSalaryRows = useMemo(() => {
    return buildOrgUnitDistributionInputsFromTeamMembers(teamMembers, {
      unassignedLabel: unassignedOrgUnitLabel,
      companyOrgUnits
    }).map(o => ({
      orgUnitId: o.orgUnitId,
      orgUnitName: o.orgUnitName,
      headcount: o.headcount,
      salaryCost: o.currentTotalSalaryCost,
      bonusCostYtd: o.currentTotalBonusYtd
    }))
  }, [companyOrgUnits, teamMembers, unassignedOrgUnitLabel])

  const totalSalaryAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, r) => sum + r.salaryCost, 0),
    [orgUnitSalaryRows]
  )

  const totalBonusAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, r) => sum + r.bonusCostYtd, 0),
    [orgUnitSalaryRows]
  )

  const totalHeadcount = teamMembers.length
  const totalSalaryCost = teamMembers.reduce((sum, m) => sum + (m.currentAnnualSalary ?? 0), 0)
  const totalBonuses = teamMembers.reduce((sum, m) => sum + (m.currentBonusTotal ?? 0), 0)
  const totalCompensation = totalSalaryCost + totalBonuses
  const currency = teamMembers[0]?.currency ?? 'EUR'
  const avgSalary = totalHeadcount > 0 ? totalSalaryCost / totalHeadcount : 0
  const withSalaryCount = teamMembers.filter(m => m.currentAnnualSalary != null).length
  const withBandCount = teamMembers.filter(m => m.compensationBand != null).length
  const withRatio = teamMembers.filter(m => m.compaRatio != null)
  const compaRatioDisplay =
    withRatio.length === 0
      ? '—'
      : formatNumberFunction(
          String(withRatio.reduce((s, m) => s + (m.compaRatio ?? 0), 0) / withRatio.length),
          '0.00[,]00'
        )

  const moneyFormat = useMemo(
    () => ({
      currency: extractCurrencyCode(currency),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    [currency]
  )

  return {
    loading,
    error,
    refetch,
    totalHeadcount,
    totalSalaryCost,
    totalBonuses,
    totalCompensation,
    avgSalary,
    currency,
    moneyFormat,
    orgUnitSalaryRows,
    totalSalaryAcrossOrgUnits,
    totalBonusAcrossOrgUnits,
    teamMemberCount: teamMembers.length,
    withSalaryCount,
    withBandCount,
    compaRatioDisplay
  }
}
