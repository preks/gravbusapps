'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@newwork/nw-design-system'
import { PiRocketLaunch, PiTrendUp, PiGift, PiChartLineUp, PiTarget, PiStar, PiChartBar } from 'react-icons/pi'
import { GrowthData, MilestoneType } from '../../../types/compensationTypes'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'

interface GrowthMilestoneCardProps {
  growthData: GrowthData
  loading: boolean
}

/**
 * Get icon component for milestone type
 */
const getMilestoneIcon = (type: MilestoneType) => {
  const iconClass = 'gba:w-5 gba:h-5'
  switch (type) {
    case 'Promotion':
      return <PiRocketLaunch className={iconClass} />
    case 'Salary Increase':
      return <PiTrendUp className={iconClass} />
    case 'Bonus Payout':
      return <PiGift className={iconClass} />
    case 'Equity Grant':
      return <PiChartLineUp className={iconClass} />
    case 'Band Movement':
      return <PiTarget className={iconClass} />
    case 'Merit Increase':
      return <PiStar className={iconClass} />
    case 'Market Adjustment':
      return <PiChartBar className={iconClass} />
    default:
      return <PiTrendUp className={iconClass} />
  }
}

/**
 * Get color class for milestone type
 */
const getMilestoneColor = (type: MilestoneType): string => {
  switch (type) {
    case 'Promotion':
      return 'gba:bg-success-secondary/20 gba:text-success'
    case 'Bonus Payout':
      return 'gba:bg-primary/10 gba:text-primary'
    case 'Equity Grant':
      return 'gba:bg-info-secondary/20 gba:text-info'
    case 'Band Movement':
      return 'gba:bg-warning-secondary/20 gba:text-warning'
    default:
      return 'gba:bg-accent gba:text-foreground'
  }
}

/**
 * Growth Milestone Card Component
 * Displays timeline of career milestones and compensation events
 */
const GrowthMilestoneCard: React.FC<GrowthMilestoneCardProps> = ({ growthData, loading }) => {
  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date for display
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <Card data-testid="growth-milestones-card">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.career_milestones', 'Career Milestones')}
          </CardTitle>
          <CardDescription>Loading milestones...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">Loading milestone data...</div>
        </CardContent>
      </Card>
    )
  }

  // Sort milestones by date (newest first)
  const sortedMilestones = [...growthData.milestones].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <Card data-testid="growth-milestones-card">
      <CardHeader>
        <CardTitle>
          {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.career_milestones', 'Career Milestones')}
        </CardTitle>
        <CardDescription>Timeline of significant compensation events</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedMilestones.length === 0 ? (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">No milestones recorded yet.</div>
        ) : (
          <div className="gba:space-y-4">
            {sortedMilestones.map(milestone => (
              <div
                key={milestone.id}
                className="gba:relative gba:flex gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:hover:bg-accent/50 gba:transition-colors"
                data-testid={`milestone-item-${milestone.id}`}
              >
                {/* Icon */}
                <div className={`gba:flex-shrink-0 gba:p-3 gba:rounded-lg ${getMilestoneColor(milestone.type)}`}>
                  {getMilestoneIcon(milestone.type)}
                </div>

                {/* Content */}
                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        <h4 className="gba:font-semibold gba:text-foreground">{milestone.title}</h4>
                        <span className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded gba:bg-muted gba:text-muted-foreground">
                          {milestone.type}
                        </span>
                      </div>
                      <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{formatDate(milestone.date)}</div>
                      {milestone.description && (
                        <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{milestone.description}</div>
                      )}
                      {milestone.reason && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:italic">{milestone.reason}</div>
                      )}
                    </div>

                    {/* Amount Change */}
                    <div className="gba:text-right gba:flex-shrink-0">
                      {milestone.previousAmount && milestone.previousAmount > 0 ? (
                        <>
                          <div className="gba:text-lg gba:font-bold gba:text-success">
                            {formatCurrency(milestone.changeAmount)}
                          </div>
                          <div className="gba:text-sm gba:text-success">
                            {formatPercentage(milestone.changePercentage)}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            {formatCurrency(milestone.previousAmount)} → {formatCurrency(milestone.newAmount)}
                          </div>
                        </>
                      ) : milestone.changeAmount > 0 ? (
                        <>
                          <div className="gba:text-lg gba:font-bold gba:text-success">
                            +{formatCurrency(milestone.changeAmount)}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            {milestone.type === 'Bonus Payout' ? 'Bonus' : 'Addition'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="gba:text-lg gba:font-bold gba:text-foreground">
                            {formatCurrency(milestone.newAmount)}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">Starting point</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GrowthMilestoneCard
