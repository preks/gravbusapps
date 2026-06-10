import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { TrendingUp, Trophy, Award, Target } from 'lucide-react'
import { formatCurrency } from '@/common/utils/numberFormatter'

export interface PipelineStatisticsMetrics {
  totalValue: number
  avgOpportunitySize: number
  opportunitiesWon: number
  winRate: number // percentage
}

export interface PipelineStatisticsProps {
  pipelineId: string
  metrics: PipelineStatisticsMetrics
  currency?: string
  isLoading?: boolean
}

export const PipelineStatistics: React.FC<PipelineStatisticsProps> = ({
  pipelineId,
  metrics,
  currency = 'EUR',
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="gba:p-6">
              <div className="gba:flex gba:items-center gba:justify-center gba:h-20">
                <Spinner size="sm" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-total-value`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <TrendingUp className="gba:text-blue-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-blue-700 gba:text-sm gba:font-medium">Total Pipeline Value</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
              {formatCurrency(metrics.totalValue, currency)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-avg-opportunity-size`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Trophy className="gba:text-green-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-green-700 gba:text-sm gba:font-medium">Avg Opportunity Size</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">
              {formatCurrency(metrics.avgOpportunitySize, currency)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-opportunities-won`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Award className="gba:text-orange-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-orange-700 gba:text-sm gba:font-medium">Opportunities Won</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">{metrics.opportunitiesWon}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-win-rate`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Target className="gba:text-purple-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-purple-700 gba:text-sm gba:font-medium">Win Rate</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">{metrics.winRate.toFixed(1)}%</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PipelineStatistics
