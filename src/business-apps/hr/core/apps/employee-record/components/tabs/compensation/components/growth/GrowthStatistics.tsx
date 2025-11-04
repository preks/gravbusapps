'use client'

import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { PiTrendUp, PiChartLineUp, PiTarget } from 'react-icons/pi'
import { GrowthData } from '../../types/compensationTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'

interface GrowthStatisticsProps {
  t: (key: string, params?: any) => string
  growthData: GrowthData
  loading: boolean
  locale: string
}

/**
 * Growth Statistics Component
 * Displays KPI cards for compensation growth metrics
 */
const GrowthStatistics: React.FC<GrowthStatisticsProps> = ({ t, growthData, loading, locale }) => {
  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const { totalGrowth, averageAnnualIncrease, totalMilestonesCount } = growthData

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="growth-statistics">
      {/* Total Growth Card */}
      <Card className="gba:p-6" data-testid="growth-total-card">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex-1">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('growth-total-growth')}</div>
            {loading ? (
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">-</div>
            ) : (
              <>
                <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                  {formatPercentage(totalGrowth.changePercentage)}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {formatCurrencyString(totalGrowth.startAmount, {
                    currency: 'EUR',
                    locale: locale,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}{' '}
                  →{' '}
                  {formatCurrencyString(totalGrowth.currentAmount, {
                    currency: 'EUR',
                    locale: locale,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </div>
              </>
            )}
          </div>
          <div className="gba:p-3 gba:rounded-lg gba:bg-success-secondary/20">
            <PiTrendUp className="gba:w-6 gba:h-6 gba:text-success" />
          </div>
        </div>
      </Card>

      {/* Average Annual Increase Card */}
      <Card className="gba:p-6" data-testid="growth-annual-card">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex-1">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('growth-avg-annual-increase')}</div>
            {loading ? (
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">-</div>
            ) : (
              <>
                <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                  {formatPercentage(averageAnnualIncrease)}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">Per year over 3 years</div>
              </>
            )}
          </div>
          <div className="gba:p-3 gba:rounded-lg gba:bg-info-secondary/20">
            <PiChartLineUp className="gba:w-6 gba:h-6 gba:text-info" />
          </div>
        </div>
      </Card>

      {/* Career Milestones Card */}
      <Card className="gba:p-6" data-testid="growth-milestones-card">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex-1">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('growth-career-milestones')}</div>
            {loading ? (
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">-</div>
            ) : (
              <>
                <div className="gba:text-3xl gba:font-bold gba:text-foreground">{totalMilestonesCount}</div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">Significant events</div>
              </>
            )}
          </div>
          <div className="gba:p-3 gba:rounded-lg gba:bg-primary/10">
            <PiTarget className="gba:w-6 gba:h-6 gba:text-primary" />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default GrowthStatistics
