import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../../utils/buildOrgUnitDistributionInputs'
import { extractCurrencyCode, formatCurrencyString } from '@/common/utils/numberFormatter'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { CompensationOverviewStatistics } from '../CompensationOverviewStatistics'
import { OverviewOrgUnitSalaryCard } from './OverviewOrgUnitSalaryCard'

const OVERVIEW_ORG_UNIT_LIMIT = 500

export interface OverviewCompanyStatisticsSectionProps {
  accessToken: string
  companyId: string
  t: (key: string, args?: Record<string, string | number>) => string
}

/**
 * Company-scoped workforce and salary overview (not tied to a selected compensation cycle).
 */
export function OverviewCompanyStatisticsSection({
  accessToken,
  companyId,
  t
}: Readonly<OverviewCompanyStatisticsSectionProps>) {
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
  const totalCompensation = totalSalaryCost + totalBonuses
  const currency = teamMembers[0]?.currency ?? 'EUR'
  const avgSalary = totalHeadcount > 0 ? totalSalaryCost / totalHeadcount : 0

  const moneyFormat = useMemo(
    () => ({
      currency: extractCurrencyCode(currency),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    [currency]
  )

  return (
    <div className="gba:space-y-6" data-testid="overview-company-statistics-section">
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
        <div
          className="gba:grid gba:grid-cols-1 gba:items-stretch gba:gap-6 gba:lg:grid-cols-2"
          data-testid="overview-mix-workforce-row"
        >
          <Card className="gba:flex gba:h-full gba:w-full gba:flex-col" data-testid="compensation-overview-mix-card">
            <CardHeader>
              <CardTitle>{t('overview-section-breakdown-title')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:flex gba:flex-1 gba:flex-col gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-total-salary')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatCurrencyString(totalSalaryCost, moneyFormat)}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-bonuses-ytd')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatCurrencyString(totalBonuses, moneyFormat)}
                </span>
              </div>
              <div className="gba:mt-auto gba:border-t gba:border-border gba:pt-3">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                  <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                    {t('overview-row-total-comp')}
                  </span>
                  <span className="gba:text-sm gba:font-semibold gba:tabular-nums">
                    {formatCurrencyString(totalCompensation, moneyFormat)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="gba:flex gba:h-full gba:w-full gba:flex-col"
            data-testid="compensation-overview-workforce-card"
          >
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
