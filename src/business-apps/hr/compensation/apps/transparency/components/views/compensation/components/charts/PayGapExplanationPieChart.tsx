import {
  DistributionChartStateContent,
  DistributionPieChartView
} from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/components/views/compensation/components/charts/distributionChartShared.tsx'
import { useMemo } from 'react'

interface PayGapExplanationData {
  tenureExplainedPercent: number
  performanceExplainedPercent: number
  unexplainedPercent: number
  totalEmployees: number
}

interface PayGapExplanationPieChartProps {
  data: PayGapExplanationData | null
  loading?: boolean
  error?: string | null
  embedded?: boolean
  className?: string
}

/**
 * Pay Gap Explanation Pie Chart component shows the breakdown of pay gap explanations
 * With tenure explained, performance explained, and unexplained percentages
 */
function PayGapExplanationPieChart({
  data,
  loading = false,
  error = null,
  embedded = false,
  className
}: Readonly<PayGapExplanationPieChartProps>) {
  const distributionData = useMemo(() => {
    if (!data) return []

    const colorMap = {
      Tenure: '#046812',
      Performance: '#3b82f6',
      Unexplained: '#a60202'
    }

    return [
      {
        name: 'Tenure',
        count: data.tenureExplainedPercent,
        percentage: data.tenureExplainedPercent
      },
      {
        name: 'Performance',
        count: data.performanceExplainedPercent,
        percentage: data.performanceExplainedPercent
      },
      {
        name: 'Unexplained',
        count: data.unexplainedPercent,
        percentage: data.unexplainedPercent
      }
    ]
      .filter(item => item.count > 0)
      .map(item => ({
        name: item.name,
        value: item.count,
        percentage: Number(item.percentage.toFixed(2)),
        fill: colorMap[item.name as keyof typeof colorMap]
      }))
  }, [data])

  const shellClassName = embedded
    ? `gba:flex gba:flex-col gba:flex-1 gba:min-h-0 ${className ?? ''}`
    : `gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-6 ${className ?? ''}`

  return (
    <div className={shellClassName} data-testid="pay-gap-explanation-pie-chart">
      <DistributionChartStateContent
        loading={loading}
        error={error}
        hasData={distributionData.length > 0}
        errorMessage="Error loading pay gap data"
        emptyMessage="No pay gap data available"
        loadingTestId="pay-gap-explanation-loading"
        emptyTestId="pay-gap-explanation-empty"
      >
        <DistributionPieChartView chartData={distributionData} />
      </DistributionChartStateContent>
    </div>
  )
}

export default PayGapExplanationPieChart
