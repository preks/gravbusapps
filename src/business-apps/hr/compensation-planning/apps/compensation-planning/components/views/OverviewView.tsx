import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, useTranslation } from '@newwork/nw-design-system'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { formatCurrency } from '../../../../utils/budgetCalculations'
import { CompensationOverviewStatistics } from '../CompensationOverviewStatistics'
import translations from '../../_i18n'

interface OverviewViewProps {
  accessToken: string
  companyId: string
}

export const OverviewView: React.FC<OverviewViewProps> = ({ accessToken, companyId }) => {
  const { t } = useTranslation(translations)
  const { teamMembers, loading, error, refetch } = useTeamCompensationData({
    accessToken,
    companyId
  })

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
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">{totalHeadcount}</span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-with-salary')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {teamMembers.filter(m => m.currentAnnualSalary != null).length}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-with-band')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {teamMembers.filter(m => m.compensationBand != null).length}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-compa')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {(() => {
                    const withRatio = teamMembers.filter(m => m.compaRatio != null)
                    if (withRatio.length === 0) return '—'
                    const avg = withRatio.reduce((s, m) => s + (m.compaRatio ?? 0), 0) / withRatio.length
                    return avg.toFixed(2)
                  })()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
