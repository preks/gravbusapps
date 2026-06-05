import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Progress, EmptyState, Spinner } from '@newwork/nw-design-system'
import { TrendingDown, BarChart3 } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/common/utils/numberFormatter'

export interface OpportunityStage {
  id: string
  name: string
  ref: string
  order: number
  color?: string
}

export interface OpportunityFunnelData {
  stage: OpportunityStage
  count: number
  value: number
  percentage: number
}

export interface OpportunityFunnelProps {
  funnelData: OpportunityFunnelData[]
  pipelineId: string
  currency?: string
  isLoading?: boolean
}

export const OpportunityFunnel: React.FC<OpportunityFunnelProps> = ({
  funnelData,
  pipelineId,
  currency = 'EUR',
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <BarChart3 className="gba:h-5 gba:w-5 gba:text-blue-600" />
            </div>
            <CardTitle>Opportunity Funnel</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-40">
            <div className="gba:text-center">
              <Spinner size="sm" />
              <div className="gba:mt-2 gba:text-sm gba:text-gray-600">Loading funnel...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!funnelData || funnelData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <TrendingDown className="gba:h-5 gba:w-5 gba:text-blue-600" />
            </div>
            <CardTitle>Opportunity Funnel</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            type="no-data"
            title="No Funnel Data"
            description="No opportunities found for this pipeline"
            data-testid="opportunity-funnel-empty-state"
          />
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...funnelData.map(stage => stage.count))
  const totalOpportunities = funnelData.reduce((sum, stage) => sum + stage.count, 0)
  const totalValue = funnelData.reduce((sum, stage) => sum + stage.value, 0)

  return (
    <Card data-testid={`opportunity-funnel-${pipelineId}`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <TrendingDown className="gba:h-5 gba:w-5 gba:text-blue-600" />
            </div>
            <CardTitle>Opportunity Funnel</CardTitle>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <BarChart3 className="gba:h-4 gba:w-4 gba:text-blue-500" />
            <span className="gba:text-sm gba:text-gray-600 gba:font-medium">{totalOpportunities} total</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="gba:space-y-5">
          {funnelData.map((stage, index) => {
            const progressPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            const avgOpportunitySize = stage.count > 0 ? stage.value / stage.count : 0

            return (
              <div
                key={stage.stage.id}
                data-testid={`funnel-stage-${stage.stage.ref}`}
                className="gba:group gba:transition-all gba:duration-200 hover:gba:bg-gray-50 gba:p-4 gba:rounded-lg gba:-m-4"
              >
                {/* Stage Header */}
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-3">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:w-3 gba:h-3 gba:rounded-full gba:shadow-sm gba:bg-blue-500" />
                    <span className="gba:font-semibold gba:text-gray-900 gba:text-base">{stage.stage.name}</span>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:text-sm gba:text-gray-600">{stage.count} opportunities</div>
                    <div className="gba:text-lg gba:font-bold gba:text-gray-900">
                      {formatCurrency(stage.value, currency)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="gba:mb-3">
                  <Progress
                    value={progressPercent}
                    className="gba:h-2 gba:transition-all gba:duration-300 group-hover:gba:shadow-sm"
                  />
                </div>

                {/* Stage Metrics */}
                <div className="gba:flex gba:justify-between gba:items-center gba:text-sm">
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <span className="gba:text-gray-500">{formatPercentage(stage.percentage)} of total</span>
                    <span className="gba:text-gray-500">Avg: {formatCurrency(avgOpportunitySize, currency)}</span>
                  </div>
                  {index < funnelData.length - 1 && <div className="gba:text-gray-400 gba:text-xs">→ Next stage</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Funnel Summary */}
        <div className="gba:mt-6 gba:bg-linear-to-r gba:from-gray-50 gba:to-blue-50 gba:rounded-xl gba:p-5 gba:border gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
            <span className="gba:text-gray-700 gba:font-semibold gba:text-base">Funnel Summary</span>
            <div className="gba:p-1 gba:bg-blue-100 gba:rounded-md">
              <BarChart3 className="gba:h-4 gba:w-4 gba:text-blue-600" />
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded-lg gba:shadow-sm">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{totalOpportunities}</div>
              <div className="gba:text-sm gba:text-gray-600 gba:font-medium">Total Opportunities</div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded-lg gba:shadow-sm">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                {formatCurrency(totalValue, currency)}
              </div>
              <div className="gba:text-sm gba:text-gray-600 gba:font-medium">Total Value</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OpportunityFunnel
