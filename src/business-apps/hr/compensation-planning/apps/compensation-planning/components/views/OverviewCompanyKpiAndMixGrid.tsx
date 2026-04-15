import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { CompensationOverviewStatistics } from '../CompensationOverviewStatistics'
import type { OverviewCompanyStatisticsModel } from '../../hooks/useOverviewCompanyStatisticsData'

export interface OverviewCompanyKpiAndMixGridProps {
  data: OverviewCompanyStatisticsModel
  t: (key: string, args?: Record<string, string | number>) => string
}

/** KPI row + compensation mix / workforce snapshot cards (shared by Overview plan detail and Budget setup). */
export function OverviewCompanyKpiAndMixGrid({ data, t }: Readonly<OverviewCompanyKpiAndMixGridProps>) {
  const {
    loading,
    error,
    refetch,
    totalHeadcount,
    totalSalaryCost,
    totalBonuses,
    avgSalary,
    currency,
    moneyFormat,
    withSalaryCount,
    withBandCount,
    compaRatioDisplay
  } = data

  return (
    <>
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
                    {formatCurrencyString(data.totalCompensation, moneyFormat)}
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
                  {formatNumberFunction(String(withSalaryCount), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-with-band')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatNumberFunction(String(withBandCount), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-compa')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">{compaRatioDisplay}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
