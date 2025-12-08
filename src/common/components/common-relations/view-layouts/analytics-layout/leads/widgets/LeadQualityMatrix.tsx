import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from '@newwork/nw-design-system'
import { PercentageOutlined } from '@ant-design/icons'

export interface LeadsBySourceItem {
  source: string
  count: number
  percentage: number
  conversionRate?: number
}

export interface LeadQualityMatrixProps {
  data: {
    totalLeads: number
    conversionRate: number
    leadsBySource: LeadsBySourceItem[]
  }
  moduleColor?: string
  isLoading?: boolean
}

export const LeadQualityMatrix: React.FC<LeadQualityMatrixProps> = ({ data, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card data-testid="lead-quality-matrix">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PercentageOutlined />
            Lead Quality Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
            <Spinner size="large" />
          </div>
        </CardContent>
      </Card>
    )
  }
  const realQualityScore = data?.conversionRate ? Math.round(data.conversionRate * 2.5 + 25) : 25

  const sourceQualityInsights = (data?.leadsBySource || []).map(source => {
    const volumeScore = Math.min(source.percentage * 1.5, 100) // How much of total leads this source represents
    const efficiencyScore = Math.min((source.conversionRate || 0) * 1.2, 100) // Actual conversion rate for this source
    const qualityScore = Math.round((volumeScore + efficiencyScore) / 2)
    const quality = (score: number) =>
      score >= 85
        ? { level: 'Excellent', color: 'green' }
        : score >= 70
          ? { level: 'Good', color: 'blue' }
          : score >= 55
            ? { level: 'Fair', color: 'yellow' }
            : { level: 'Poor', color: 'red' }
    const q = quality(qualityScore)
    return {
      source: source.source,
      count: source.count,
      percentage: source.percentage,
      qualityScore,
      qualityLevel: q.level,
      color: q.color
    }
  })

  const totalSources = data?.leadsBySource?.length || 0
  const sourceDiversification = Math.min((totalSources / 8) * 100, 100)

  return (
    <Card data-testid="lead-quality-matrix">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PercentageOutlined />
          Lead Quality Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <div className="gba:text-center gba:p-4 gba:bg-gradient-to-r gba:from-green-50 gba:to-blue-50 gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-green-600">{realQualityScore}</div>
            <div className="gba:text-sm gba:text-gray-600">Overall Quality Score</div>
            <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
              Based on {data?.conversionRate?.toFixed(1)}% conversion rate and source performance
            </div>
          </div>

          <div className="gba:space-y-2">
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700">Source Quality Analysis</h4>
            {sourceQualityInsights.length > 0 ? (
              sourceQualityInsights.map(s => (
                <div
                  key={s.source}
                  className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-gray-50 gba:rounded"
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className={`gba:w-3 gba:h-3 gba:rounded-full gba:bg-${s.color}-500`} />
                    <div>
                      <span className="gba:text-sm gba:font-medium">{s.source}</span>
                      <div className="gba:text-xs gba:text-gray-500">
                        {s.qualityLevel} Quality (Score: {s.qualityScore})
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {s.count} leads ({s.percentage.toFixed(1)}%)
                  </Badge>
                </div>
              ))
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:py-4">
                <p className="gba:text-sm">No source data available</p>
              </div>
            )}
          </div>

          <div className="gba:space-y-2">
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700">Portfolio Health</h4>
            <div className="gba:space-y-1">
              <div className="gba:flex gba:justify-between gba:text-sm">
                <span>Source Diversification</span>
                <span className="gba:font-medium">{Math.round(sourceDiversification)}%</span>
              </div>
              <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                <div
                  className={`${sourceDiversification >= 60 ? 'gba:bg-green-500' : sourceDiversification >= 30 ? 'gba:bg-yellow-500' : 'gba:bg-red-500'} gba:h-2 gba:rounded-full`}
                  style={{ width: `${sourceDiversification}%` }}
                />
              </div>
              <div className="gba:text-xs gba:text-gray-500">{totalSources} active lead sources</div>
            </div>
            <div className="gba:space-y-1">
              <div className="gba:flex gba:justify-between gba:text-sm">
                <span>Conversion Efficiency</span>
                <span className="gba:font-medium">{data?.conversionRate?.toFixed(1) || '0.0'}%</span>
              </div>
              <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                <div
                  className={`${(data?.conversionRate || 0) >= 25 ? 'gba:bg-green-500' : (data?.conversionRate || 0) >= 15 ? 'gba:bg-yellow-500' : 'gba:bg-red-500'} gba:h-2 gba:rounded-full`}
                  style={{ width: `${Math.min((data?.conversionRate || 0) * 4, 100)}%` }}
                />
              </div>
              <div className="gba:text-xs gba:text-gray-500">Lead to conversion success rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default LeadQualityMatrix
