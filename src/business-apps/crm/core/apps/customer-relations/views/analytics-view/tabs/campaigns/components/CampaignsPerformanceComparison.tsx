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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const CampaignsPerformanceComparison: React.FC<CampaignsAnalyticsComponentProps> = ({
  campaignComparisons = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
          <p className="gba:font-semibold gba:mb-2">{label}</p>
          <div className="gba:space-y-1">
            <p className="gba:text-sm">
              <span className="gba:text-blue-600">Leads:</span> {data.leadsCount}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-green-600">Accounts:</span> {data.accountsCount}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-purple-600">Contacts:</span> {data.contactsCount}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-orange-600">Opportunities:</span> {data.opportunitiesCount}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-red-600">Revenue:</span> {formatCurrency(data.totalRevenue)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card data-testid="campaigns-performance-comparison-loading">
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
      <Card data-testid="campaigns-performance-comparison-error">
        <CardContent className="gba:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              {getTranslationFromI18nKeyAndLabel(
                'campaigns.analytics.performanceComparison.error',
                'Error loading performance comparison data'
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
    <Card data-testid="campaigns-performance-comparison">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'campaigns.analytics.performanceComparison.title',
              'Campaign Performance Comparison'
            )}
          </CardTitle>
          <div className="gba:flex gba:gap-2">
            <Button variant={chartType === 'bar' ? 'default' : 'outline'} size="sm" onClick={() => setChartType('bar')}>
              Bar Chart
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              Line Chart
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:p-6">
        {campaignComparisons.length === 0 ? (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }}>
            {getTranslationFromI18nKeyAndLabel(
              'campaigns.analytics.performanceComparison.noData',
              'No campaign performance data available'
            )}
          </div>
        ) : (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={campaignComparisons} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="campaignName" angle={-45} textAnchor="end" height={80} interval={0} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leadsCount" fill="#1890ff" name="Leads" />
                  <Bar dataKey="accountsCount" fill="#52c41a" name="Accounts" />
                  <Bar dataKey="contactsCount" fill="#722ed1" name="Contacts" />
                  <Bar dataKey="opportunitiesCount" fill="#fa8c16" name="Opportunities" />
                </BarChart>
              ) : (
                <LineChart data={campaignComparisons} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="campaignName" angle={-45} textAnchor="end" height={80} interval={0} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="leadsCount" stroke="#1890ff" name="Leads" strokeWidth={2} />
                  <Line type="monotone" dataKey="accountsCount" stroke="#52c41a" name="Accounts" strokeWidth={2} />
                  <Line type="monotone" dataKey="contactsCount" stroke="#722ed1" name="Contacts" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="opportunitiesCount"
                    stroke="#fa8c16"
                    name="Opportunities"
                    strokeWidth={2}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignsPerformanceComparison
