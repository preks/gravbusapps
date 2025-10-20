import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts'
import {
  DollarOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  RadarChartOutlined
} from '@ant-design/icons'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const CampaignsRevenueAnalysis: React.FC<CampaignsAnalyticsComponentProps> = ({
  campaignComparisons = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [chartType, setChartType] = useState<'revenue-bar' | 'revenue-pie' | 'revenue-area' | 'revenue-radar'>(
    'revenue-bar'
  )

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  // Prepare revenue data for different visualizations with better filtering
  const revenueData = campaignComparisons
    .filter(campaign => campaign.totalRevenue > 0 && campaign.leadsCount > 0 && campaign.opportunitiesCount > 0)
    .map(campaign => ({
      name: campaign.campaignName.length > 15 ? campaign.campaignName.substring(0, 15) + '...' : campaign.campaignName,
      fullName: campaign.campaignName,
      revenue: campaign.totalRevenue,
      winRate: campaign.winRate,
      opportunitiesCount: campaign.opportunitiesCount,
      wonOpportunitiesCount: campaign.wonOpportunitiesCount,
      status: campaign.status,
      // Calculate revenue per opportunity
      revenuePerOpportunity: campaign.opportunitiesCount > 0 ? campaign.totalRevenue / campaign.opportunitiesCount : 0,
      // Calculate revenue efficiency (revenue per lead)
      revenuePerLead: campaign.leadsCount > 0 ? campaign.totalRevenue / campaign.leadsCount : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Colors for pie chart
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316']

  // Custom tooltips for different chart types
  const RevenueBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
          <p className="gba:font-semibold gba:mb-2">{data.fullName}</p>
          <div className="gba:space-y-1">
            <p className="gba:text-sm">
              <span className="gba:text-green-600">Revenue:</span> {formatCurrency(data.revenue)}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-blue-600">Win Rate:</span> {data.winRate.toFixed(1)}%
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-purple-600">Revenue/Opportunity:</span>{' '}
              {formatCurrency(data.revenuePerOpportunity)}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-orange-600">Revenue/Lead:</span> {formatCurrency(data.revenuePerLead)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const RevenuePieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = ((data.revenue / revenueData.reduce((sum, item) => sum + item.revenue, 0)) * 100).toFixed(1)
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
          <p className="gba:font-semibold gba:mb-2">{data.fullName}</p>
          <p className="gba:text-sm">
            <span className="gba:text-green-600">Revenue:</span> {formatCurrency(data.revenue)} ({percentage}%)
          </p>
          <p className="gba:text-sm">
            <span className="gba:text-blue-600">Status:</span> {data.status}
          </p>
        </div>
      )
    }
    return null
  }

  // Radar chart data - normalize values for better visualization
  const radarData = revenueData.slice(0, 6).map(campaign => {
    const maxRevenue = Math.max(...revenueData.map(c => c.revenue))
    const maxWinRate = 100
    const maxRevenuePerOpp = Math.max(...revenueData.map(c => c.revenuePerOpportunity))
    const maxRevenuePerLead = Math.max(...revenueData.map(c => c.revenuePerLead))

    return {
      campaign: campaign.name,
      fullName: campaign.fullName,
      Revenue: (campaign.revenue / maxRevenue) * 100,
      'Win Rate': campaign.winRate,
      'Rev/Opp': (campaign.revenuePerOpportunity / maxRevenuePerOpp) * 100,
      'Rev/Lead': (campaign.revenuePerLead / maxRevenuePerLead) * 100,
      Opportunities: (campaign.opportunitiesCount / Math.max(...revenueData.map(c => c.opportunitiesCount))) * 100
    }
  })

  const renderChart = () => {
    switch (chartType) {
      case 'revenue-bar':
        return (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip content={<RevenueBarTooltip />} />
                <Bar dataKey="revenue" fill="#10B981" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )

      case 'revenue-pie':
        return (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="revenue"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<RevenuePieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )

      case 'revenue-area':
        return (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip content={<RevenueBarTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )

      case 'revenue-radar':
        return (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="campaign" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tickFormatter={value => `${value}%`} />
                <Radar
                  name="Revenue"
                  dataKey="Revenue"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Radar
                  name="Win Rate"
                  dataKey="Win Rate"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Radar
                  name="Rev/Opp"
                  dataKey="Rev/Opp"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Radar
                  name="Rev/Lead"
                  dataKey="Rev/Lead"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <Card data-testid="campaigns-revenue-analysis-loading">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid="campaigns-revenue-analysis-error">
        <CardContent className="gba:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              {getTranslationFromI18nKeyAndLabel(
                'campaigns.analytics.revenueAnalysis.error',
                'Error loading revenue analysis data'
              )}
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gba:ml-2">
                  {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="campaigns-revenue-analysis">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <DollarOutlined style={{ color: '#10B981' }} />
            {getTranslationFromI18nKeyAndLabel('campaigns.analytics.revenueAnalysis.title', 'Won Revenue Analysis')}
          </CardTitle>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={chartType === 'revenue-bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('revenue-bar')}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <BarChartOutlined />
              Bar
            </Button>
            <Button
              variant={chartType === 'revenue-pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('revenue-pie')}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <PieChartOutlined />
              Pie
            </Button>
            <Button
              variant={chartType === 'revenue-area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('revenue-area')}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <LineChartOutlined />
              Area
            </Button>
            <Button
              variant={chartType === 'revenue-radar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('revenue-radar')}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <RadarChartOutlined />
              Radar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:p-6">
        {revenueData.length === 0 ? (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }}>
            {getTranslationFromI18nKeyAndLabel(
              'campaigns.analytics.revenueAnalysis.noData',
              'No revenue data available - campaigns have not generated any won revenue yet'
            )}
          </div>
        ) : (
          <>
            {/* Revenue Insights - Horizontal Layout */}
            <div
              className="gba:mb-3 gba:p-3 gba:rounded-lg"
              style={{ backgroundColor: 'var(--color-surface-secondary)' }}
            >
              <div className="gba:flex gba:justify-between gba:items-center gba:text-sm gba:gap-4">
                <div className="gba:text-center gba:flex-1">
                  <span className="gba:font-semibold" style={{ color: 'var(--color-success-600)' }}>
                    {formatCurrency(revenueData.reduce((sum, item) => sum + item.revenue, 0))}
                  </span>
                  <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Total Won
                  </span>
                </div>
                <div className="gba:text-center gba:flex-1">
                  <span className="gba:font-semibold" style={{ color: 'var(--color-primary-600)' }}>
                    {formatCurrency(
                      revenueData.length > 0
                        ? revenueData.reduce((sum, item) => sum + item.revenue, 0) / revenueData.length
                        : 0
                    )}
                  </span>
                  <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Avg/Campaign
                  </span>
                </div>
                <div className="gba:text-center gba:flex-1">
                  <span className="gba:font-semibold" style={{ color: 'var(--color-warning-600)' }}>
                    {revenueData[0]?.name || 'N/A'}
                  </span>
                  <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Top Campaign
                  </span>
                </div>
              </div>
            </div>

            {renderChart()}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignsRevenueAnalysis
