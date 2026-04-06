import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, useTranslation } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import translations from '../../_i18n'

export interface OverviewOrgUnitSalaryRow {
  orgUnitId: string
  orgUnitName: string
  headcount: number
  salaryCost: number
  bonusCostYtd: number
}

export interface OverviewOrgUnitSalaryCardProps {
  rows: OverviewOrgUnitSalaryRow[]
  totalSalaryAcrossUnits: number
  totalBonusAcrossUnits: number
  currency: string
  teamMemberCount: number
}

function formatShareOfTotal(part: number, total: number): string {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return '—'
  }
  return `${((100 * part) / total).toFixed(1)}%`
}

export const OverviewOrgUnitSalaryCard: React.FC<OverviewOrgUnitSalaryCardProps> = ({
  rows,
  totalSalaryAcrossUnits,
  totalBonusAcrossUnits,
  currency,
  teamMemberCount
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card className="gba:w-full" data-testid="compensation-overview-org-unit-salary-card">
      <CardHeader>
        <CardTitle className="gba:text-base">{t('overview-section-org-unit-salary-title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p
            className="gba:text-sm gba:text-muted-foreground"
            data-testid="compensation-overview-org-unit-salary-empty"
          >
            {t(teamMemberCount === 0 ? 'overview-org-unit-salary-no-employees' : 'overview-org-unit-salary-empty')}
          </p>
        ) : (
          <>
            <ul
              className="gba:max-h-[min(24rem,50vh)] gba:divide-y gba:divide-border gba:overflow-y-auto gba:rounded-md gba:border gba:border-border"
              data-testid="compensation-overview-org-unit-salary-list"
            >
              {rows.map(row => (
                <li
                  key={row.orgUnitId}
                  className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-3 gba:px-4 gba:py-3"
                  data-testid={`compensation-overview-org-unit-salary-row-${row.orgUnitId}`}
                >
                  <div className="gba:min-w-0">
                    <div className="gba:font-medium gba:text-foreground">{row.orgUnitName}</div>
                    <div className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground">
                      {t('budget-distribution-org-unit-employee-count', { count: row.headcount })}
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div>
                      <div className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                        {t('overview-org-unit-block-annual-salary-label')}
                      </div>
                      <div className="gba:font-medium gba:tabular-nums gba:text-foreground">
                        {formatCurrency(row.salaryCost, currency)}
                      </div>
                      <div className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground">
                        {t('overview-org-unit-salary-share-line', {
                          share: formatShareOfTotal(row.salaryCost, totalSalaryAcrossUnits)
                        })}
                      </div>
                    </div>
                    <div className="gba:mt-3">
                      <div className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                        {t('overview-org-unit-block-bonuses-ytd-label')}
                      </div>
                      <div className="gba:font-medium gba:tabular-nums gba:text-foreground">
                        {formatCurrency(row.bonusCostYtd, currency)}
                      </div>
                      <div className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground">
                        {t('overview-org-unit-bonus-share-line', {
                          share: formatShareOfTotal(row.bonusCostYtd, totalBonusAcrossUnits)
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Separator className="gba:my-4" />
            <div
              className="gba:flex gba:flex-wrap gba:items-end gba:justify-between gba:gap-4"
              data-testid="compensation-overview-org-unit-salary-total"
            >
              <span className="gba:text-sm gba:font-semibold">{t('overview-org-unit-salary-total-row')}</span>
              <div className="gba:flex gba:flex-col gba:items-end gba:gap-2">
                <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-end gba:gap-x-3 gba:gap-y-0.5">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-total-salary')}</span>
                  <span className="gba:text-sm gba:font-semibold gba:tabular-nums">
                    {formatCurrency(totalSalaryAcrossUnits, currency)}
                  </span>
                </div>
                <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-end gba:gap-x-3 gba:gap-y-0.5">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-bonuses-ytd')}</span>
                  <span className="gba:text-sm gba:font-semibold gba:tabular-nums">
                    {formatCurrency(totalBonusAcrossUnits, currency)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
