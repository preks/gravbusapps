import { useMemo } from 'react'
import { Typography } from 'antd'
import { DistributionChartStateContent, DistributionPieChartView } from './distributionChartShared'

const { Title, Text } = Typography

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
}

/**
 * Pay Gap Explanation Pie Chart component shows the breakdown of pay gap explanations
 * With tenure explained, performance explained, and unexplained percentages
 */
function PayGapExplanationPieChart({ data, loading = false, error = null }: Readonly<PayGapExplanationPieChartProps>) {
  // Transform data for distribution chart with explicit color mapping
  const distributionData = useMemo(() => {
    if (!data) return []

    const colorMap = {
      Tenure: '#046812', // Green
      Performance: '#3b82f6', // Blue
      Unexplained: '#a60202' // Dark red
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

  return (
    <div
      className="gba:w-full gba:h-full gba:bg-card gba:rounded-lg gba:p-6"
      data-testid="pay-gap-explanation-pie-chart"
    >
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-foreground">
          Pay Gap Explanation
        </Title>
        <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">
          Breakdown of factors explaining pay gaps in the organization
        </Text>
      </div>

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
