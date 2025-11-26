import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  Badge,
  ChartConfig,
  ChartContainer,
  ChartTooltip
} from '@newwork/nw-design-system'
import { ScatterChart, Scatter, XAxis, YAxis } from 'recharts'
import { HeartOutlined, WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { HeartIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface DealHealthItem {
  id: string
  name: string
  winningChance: number
  estimatedAmount: number
  daysInPipeline: number
  healthScore: number
  healthCategory: 'excellent' | 'healthy' | 'warning' | 'critical'
  riskFactors: string[]
  account?: string
  owner?: string
  currencyCode?: string
}

export interface DealHealthData {
  healthDistribution: { excellent: number; healthy: number; warning: number; critical: number }
  matrixData: DealHealthItem[]
}

interface DealHealthMatrixProps {
  data: DealHealthData
  moduleColor?: string
}

export const DealHealthMatrix: React.FC<DealHealthMatrixProps> = ({ data, moduleColor = 'default' }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | DealHealthItem['healthCategory']>('all')

  const filteredData = useMemo(
    () =>
      selectedCategory === 'all' ? data.matrixData : data.matrixData.filter(d => d.healthCategory === selectedCategory),
    [selectedCategory, data]
  )

  // Helper function to navigate to opportunity record
  const handleOpportunityClick = (opportunityId: string) => {
    const url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId })
    navigateTo(url)
  }

  // Helper function to format currency
  const formatCurrency = (value: number, currencyCode: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      notation: 'standard',
      maximumFractionDigits: 0
    }).format(value)
  }

  const chartConfig = useMemo(
    () =>
      ({
        excellent: {
          label: 'Excellent',
          color: 'var(--nw-color-success)'
        },
        healthy: {
          label: 'Healthy',
          color: 'var(--nw-color-info)'
        },
        warning: {
          label: 'Warning',
          color: 'var(--nw-color-warning)'
        },
        critical: {
          label: 'Critical',
          color: 'var(--nw-color-destructive)'
        }
      }) satisfies ChartConfig,
    []
  )

  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      ...item,
      fill: `var(--color-${item.healthCategory})`
    }))
  }, [filteredData])

  return (
    <Card data-testid="deal-health-matrix">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={HeartIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div className="gba:flex-1">
          <CardTitle>Deal Health Matrix</CardTitle>
          <CardDescription>Opportunity health analysis and risk assessment</CardDescription>
        </div>
        {selectedCategory !== 'all' && (
          <Badge
            variant="outline"
            className="gba:cursor-pointer gba:hover:bg-gray-100"
            onClick={() => setSelectedCategory('all')}
          >
            Clear Filter
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <button
            type="button"
            className={`gba:bg-green-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all gba:text-left gba:border-0 gba:w-full ${
              selectedCategory === 'excellent'
                ? 'gba:ring-2 gba:ring-green-500 gba:bg-green-100 gba:shadow-md'
                : 'gba:hover:bg-green-100'
            }`}
            onClick={() => setSelectedCategory(selectedCategory === 'excellent' ? 'all' : 'excellent')}
            data-testid="excellent-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <CheckCircleOutlined className="gba:text-green-600" />
              <span className="gba:text-sm gba:font-medium gba:text-green-600">Excellent</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">{data.healthDistribution.excellent}</div>
          </button>
          <button
            type="button"
            className={`gba:bg-blue-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all gba:text-left gba:border-0 gba:w-full ${
              selectedCategory === 'healthy'
                ? 'gba:ring-2 gba:ring-blue-500 gba:bg-blue-100 gba:shadow-md'
                : 'gba:hover:bg-blue-100'
            }`}
            onClick={() => setSelectedCategory(selectedCategory === 'healthy' ? 'all' : 'healthy')}
            data-testid="healthy-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <HeartOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Healthy</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">{data.healthDistribution.healthy}</div>
          </button>
          <button
            type="button"
            className={`gba:bg-yellow-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all gba:text-left gba:border-0 gba:w-full ${
              selectedCategory === 'warning'
                ? 'gba:ring-2 gba:ring-yellow-500 gba:bg-yellow-100 gba:shadow-md'
                : 'gba:hover:bg-yellow-100'
            }`}
            onClick={() => setSelectedCategory(selectedCategory === 'warning' ? 'all' : 'warning')}
            data-testid="warning-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <WarningOutlined className="gba:text-yellow-600" />
              <span className="gba:text-sm gba:font-medium gba:text-yellow-600">Warning</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-yellow-900">{data.healthDistribution.warning}</div>
          </button>
          <button
            type="button"
            className={`gba:bg-red-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all gba:text-left gba:border-0 gba:w-full ${
              selectedCategory === 'critical'
                ? 'gba:ring-2 gba:ring-red-500 gba:bg-red-100 gba:shadow-md'
                : 'gba:hover:bg-red-100'
            }`}
            onClick={() => setSelectedCategory(selectedCategory === 'critical' ? 'all' : 'critical')}
            data-testid="critical-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ExclamationCircleOutlined className="gba:text-red-600" />
              <span className="gba:text-sm gba:font-medium gba:text-red-600">Critical</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-red-900">{data.healthDistribution.critical}</div>
          </button>
        </div>

        <div className="gba:h-80 gba:mb-6">
          <ChartContainer config={chartConfig} className="gba:w-full gba:h-full">
            <ScatterChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="winningChance" name="Win Chance %" unit="%" domain={[0, 100]} />
              <YAxis type="number" dataKey="healthScore" name="Health Score" domain={[0, 100]} />
              <ChartTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const d = payload[0].payload as DealHealthItem
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
                        <p className="gba:font-medium">{d.name}</p>
                        <p className="gba:text-sm gba:text-gray-600">Health Score: {d.healthScore}/100</p>
                        <p className="gba:text-sm gba:text-gray-600">Win Chance: {d.winningChance}%</p>
                        <p className="gba:text-sm gba:text-gray-600">
                          Value: {formatCurrency(d.estimatedAmount, d.currencyCode)}
                        </p>
                        <p className="gba:text-sm gba:text-gray-600">Days in Pipeline: {d.daysInPipeline}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter name="Deals" dataKey="estimatedAmount" />
            </ScatterChart>
          </ChartContainer>
        </div>

        {(selectedCategory === 'all' || selectedCategory === 'critical') && (
          <div data-testid="critical-deals-section">
            <h4 className="gba:text-lg gba:font-semibold gba:mb-3 gba:flex gba:items-center gba:gap-2">
              <ExclamationCircleOutlined className="gba:text-red-600" />
              Critical Deals Requiring Immediate Attention
            </h4>
            <div className="gba:space-y-3">
              {data.matrixData
                .filter(deal => deal.healthCategory === 'critical')
                .sort((a, b) => b.estimatedAmount - a.estimatedAmount)
                .slice(0, 5)
                .map((deal, index) => (
                  <button
                    key={deal.id}
                    type="button"
                    className="gba:p-4 gba:border-l-4 gba:border-red-500 gba:bg-red-50 gba:rounded gba:cursor-pointer gba:hover:bg-red-100 gba:transition-colors gba:text-left gba:border-0 gba:w-full"
                    data-testid={`critical-deal-${index}`}
                    onClick={() => handleOpportunityClick(deal.id)}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                      <div>
                        <div className="gba:font-medium gba:hover:underline">{deal.name}</div>
                        <div className="gba:text-sm gba:text-gray-600">
                          {deal.account && `${deal.account} • `}
                          {deal.owner && `${deal.owner} • `}
                          {deal.daysInPipeline} days in pipeline
                        </div>
                      </div>
                      <div className="gba:text-right">
                        <Badge variant="destructive">Health Score: {deal.healthScore}/100</Badge>
                        <div className="gba:text-sm gba:font-medium gba:mt-1">
                          {formatCurrency(deal.estimatedAmount, deal.currencyCode)} • {deal.winningChance}% win chance
                        </div>
                      </div>
                    </div>
                    <div className="gba:text-sm gba:text-red-700">
                      <strong>Risk Factors:</strong> {deal.riskFactors.join(', ')}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DealHealthMatrix
