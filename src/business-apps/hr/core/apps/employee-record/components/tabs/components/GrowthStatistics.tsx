'use client'

import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { PiTrendUp, PiChartLineUp, PiTarget } from 'react-icons/pi'
import { GrowthData } from '../../../types/compensationTypes'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'

interface GrowthStatisticsProps {
  growthData: GrowthData
  loading: boolean
}

/**
 * Growth Statistics Component
 * Displays KPI cards for compensation growth metrics
 */
const GrowthStatistics: React.FC<GrowthStatisticsProps> = ({ growthData, loading }) => {
  // Format currency for display
  const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

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
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.total_growth', 'Total Growth')}
            </div>
            {loading ? (
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">-</div>
            ) : (
              <>
                <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                  {formatPercentage(totalGrowth.changePercentage)}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {formatCurrency(totalGrowth.startAmount)} → {formatCurrency(totalGrowth.currentAmount)}
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
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.avg_annual_increase', 'Avg Annual Increase')}
            </div>
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
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.career_milestones', 'Career Milestones')}
            </div>
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
