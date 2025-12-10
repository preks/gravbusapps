import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { TrendingUp, Trophy, Award, Target } from 'lucide-react'

const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`
  }
}

export interface PipelineStatisticsMetrics {
  totalValue: number
  avgDealSize: number
  dealsWon: number
  winRate: number // percentage
}

export interface PipelineStatisticsProps {
  pipelineId: string
  metrics: PipelineStatisticsMetrics
  currency?: string
}

export const PipelineStatistics: React.FC<PipelineStatisticsProps> = ({ pipelineId, metrics, currency = 'EUR' }) => {
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
          <div data-testid={`pipeline-${pipelineId}-avg-deal-size`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Trophy className="gba:text-green-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-green-700 gba:text-sm gba:font-medium">Avg Deal Size</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">
              {formatCurrency(metrics.avgDealSize, currency)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-deals-won`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Award className="gba:text-orange-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-orange-700 gba:text-sm gba:font-medium">Deals Won</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">{metrics.dealsWon}</div>
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
