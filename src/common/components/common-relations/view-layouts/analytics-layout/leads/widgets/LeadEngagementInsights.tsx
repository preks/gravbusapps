import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'

export interface LeadRatingItem {
  rating: string
  count: number
  percentage: number
}

export interface LeadEngagementInsightsProps {
  leadsByRating: LeadRatingItem[]
  leadHealthIndicators?: Array<{ label: string; value: number; status?: 'good' | 'warning' | 'bad' }>
  conversionRate: number
  avgTimeToConversion?: number
  leadsOverTime?: Array<{ date: string; leadsCreated: number }>
  highQualityPercentage?: number
  moduleColor?: string
  isLoading?: boolean
}

export const LeadEngagementInsights: React.FC<LeadEngagementInsightsProps> = ({
  leadsByRating,
  conversionRate,
  avgTimeToConversion,
  leadsOverTime,
  highQualityPercentage = 0,
  isLoading = false
}) => {
  const engagementLevels = (leadsByRating || []).map((rating, index) => {
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'] // success, info, warn, danger
    const descriptions = ['Highly engaged', 'Good engagement', 'Moderate engagement', 'Low engagement']
    return {
      level: rating.rating,
      count: rating.count,
      percentage: rating.percentage,
      color: colors[index] || '#6B7280',
      description: descriptions[index] || 'Engagement level'
    }
  })

  // Calculate real health indicators from various data sources (matching archived version)
  const healthFactors = [
    {
      factor: 'Response Rate',
      score: conversionRate || 0, // Use actual conversion rate directly
      target: 25,
      description: 'Actual lead conversion rate'
    },
    {
      factor: 'Lead Quality',
      score: Math.min(highQualityPercentage, 100), // ✅ Now from backend aggregate
      target: 60,
      description: 'Percentage of high-quality (Hot/Warm) leads'
    },
    {
      factor: 'Pipeline Health',
      score: (() => {
        // Combine conversion rate and speed for pipeline health
        if (!conversionRate || !avgTimeToConversion) return 0

        const conversionScore = Math.min(conversionRate * 2, 50) // Up to 50 points for conversion rate
        const speedScore = avgTimeToConversion > 0 ? Math.max(50 - avgTimeToConversion / 2, 0) : 0 // Up to 50 points for speed

        return Math.min(conversionScore + speedScore, 100)
      })(),
      target: 70,
      description: 'Based on conversion rate and conversion speed'
    },
    {
      factor: 'Volume Stability',
      score: (() => {
        // Calculate real variance from leads created over time
        if (!leadsOverTime || leadsOverTime.length < 3) return 0

        const recentPeriods = leadsOverTime.slice(-6) // Last 6 periods
        const leadCounts = recentPeriods.map(period => period.leadsCreated)
        const average = leadCounts.reduce((sum, count) => sum + count, 0) / leadCounts.length

        if (average === 0) return 0

        // Calculate coefficient of variation (lower = more stable)
        const variance = leadCounts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / leadCounts.length
        const standardDeviation = Math.sqrt(variance)
        const coefficientOfVariation = standardDeviation / average

        // Convert to stability score (100 = perfectly stable, 0 = highly volatile)
        return Math.max(100 - coefficientOfVariation * 100, 0)
      })(),
      target: 80,
      description: 'Consistency of lead creation over time'
    }
  ]

  // Calculate overall engagement score from real metrics (matching archived version)
  const overallEngagementScore = Math.round(
    healthFactors.reduce((sum, factor) => sum + factor.score, 0) / healthFactors.length
  )

  if (isLoading) {
    return (
      <div className="gba:grid gba:grid-cols-2 gba:gap-6">
        <Card data-testid="lead-engagement-levels">
          <CardHeader>
            <CardTitle className="gba:text-base">Lead Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="lead-health-indicators">
          <CardHeader>
            <CardTitle className="gba:text-base">Lead Health Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-6">
      <Card data-testid="lead-engagement-levels">
        <CardHeader>
          <CardTitle className="gba:text-base">Lead Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-3">
            {engagementLevels.length > 0 ? (
              engagementLevels.map(item => (
                <div key={item.level} className="gba:p-2 gba:border gba:rounded">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                    <span className="gba:text-sm gba:font-medium">{item.level}</span>
                    <span className="gba:font-bold">{item.count}</span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:flex-1 gba:bg-gray-200 gba:rounded-full gba:h-2">
                      <div
                        className="gba:h-2 gba:rounded-full"
                        style={{ backgroundColor: item.color, width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="gba:text-xs gba:text-gray-500">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:py-4">
                <p className="gba:text-sm">No rating data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="lead-health-indicators">
        <CardHeader>
          <CardTitle className="gba:text-base">Lead Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            <div className="gba:text-center gba:p-3 gba:bg-green-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">{overallEngagementScore}%</div>
              <div className="gba:text-sm gba:text-gray-600">Pipeline Health</div>
            </div>

            <div className="gba:space-y-2">
              {healthFactors.map(item => (
                <div key={item.factor} className="gba:space-y-1">
                  <div className="gba:flex gba:justify-between gba:text-sm">
                    <span>{item.factor}</span>
                    <span className="gba:font-medium">{Math.round(item.score)}%</span>
                  </div>
                  <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                    <div
                      className={`gba:h-2 gba:rounded-full ${item.score >= item.target ? 'gba:bg-green-500' : item.score >= item.target * 0.7 ? 'gba:bg-yellow-500' : 'gba:bg-red-500'}`}
                      style={{ width: `${Math.min(item.score, 100)}%` }}
                    />
                  </div>
                  <div className="gba:text-xs gba:text-gray-500">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LeadEngagementInsights
