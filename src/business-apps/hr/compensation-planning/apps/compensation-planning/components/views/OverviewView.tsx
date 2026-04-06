import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, useTranslation } from '@newwork/nw-design-system'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../../utils/buildOrgUnitDistributionInputs'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { CompensationOverviewStatistics } from '../CompensationOverviewStatistics'
import { OverviewOrgUnitSalaryCard } from './OverviewOrgUnitSalaryCard'
import translations from '../../_i18n'

const OVERVIEW_ORG_UNIT_LIMIT = 500

interface OverviewViewProps {
  accessToken: string
  companyId: string
}

export const OverviewView: React.FC<OverviewViewProps> = ({ accessToken, companyId }) => {
  const { t } = useTranslation(translations)
  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(accessToken, companyId, OVERVIEW_ORG_UNIT_LIMIT)
  const { teamMembers, loading, error, refetch } = useTeamCompensationData({
    accessToken,
    companyId,
    requirePayrollRelevantContractType: true
  })

  const orgUnitSalaryRows = useMemo(() => {
    return buildOrgUnitDistributionInputsFromTeamMembers(teamMembers, {
      unassignedLabel: t('overview-org-unit-unassigned'),
      companyOrgUnits
    }).map(o => ({
      orgUnitId: o.orgUnitId,
      orgUnitName: o.orgUnitName,
      headcount: o.headcount,
      salaryCost: o.currentTotalSalaryCost,
      bonusCostYtd: o.currentTotalBonusYtd
    }))
  }, [companyOrgUnits, teamMembers, t])

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
  const currency = teamMembers[0]?.currency ?? 'EUR'
  const avgSalary = totalHeadcount > 0 ? totalSalaryCost / totalHeadcount : 0

  return (
    <div className="gba:space-y-6">
      <CompensationOverviewStatistics
        employeeCount={totalHeadcount}
        annualSalaryCost={totalSalaryCost}
        averageSalary={avgSalary}
        bonusesYtd={totalBonuses}
        currency={currency}
        isLoading={loading}
        error={error}
        onRetry={refetch}
      />

      {!loading && !error && (
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
          <Card data-testid="compensation-overview-breakdown-card">
            <CardHeader>
              <CardTitle>{t('overview-section-breakdown-title')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:flex gba:flex-col gba:gap-3">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-total-salary')}</span>
                  <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                    {formatCurrency(totalSalaryCost, currency)}
                  </span>
                </div>
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-bonuses-ytd')}</span>
                  <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                    {formatCurrency(totalBonuses, currency)}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:font-semibold">{t('overview-row-total-comp')}</span>
                <span className="gba:text-sm gba:font-semibold gba:tabular-nums">
                  {formatCurrency(totalSalaryCost + totalBonuses, currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="compensation-overview-workforce-card">
            <CardHeader>
              <CardTitle>{t('overview-section-workforce-title')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-employees')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatNumberFunction(String(totalHeadcount), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-with-salary')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatNumberFunction(String(teamMembers.filter(m => m.currentAnnualSalary != null).length), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-with-band')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatNumberFunction(String(teamMembers.filter(m => m.compensationBand != null).length), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-compa')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {(() => {
                    const withRatio = teamMembers.filter(m => m.compaRatio != null)
                    if (withRatio.length === 0) return '—'
                    const avg = withRatio.reduce((s, m) => s + (m.compaRatio ?? 0), 0) / withRatio.length
                    return formatNumberFunction(String(avg), '0.00[,]00')
                  })()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && !error && (
        <OverviewOrgUnitSalaryCard
          rows={orgUnitSalaryRows}
          totalSalaryAcrossUnits={totalSalaryAcrossOrgUnits}
          totalBonusAcrossUnits={totalBonusAcrossOrgUnits}
          currency={currency}
          teamMemberCount={teamMembers.length}
        />
      )}
    </div>
  )
}
