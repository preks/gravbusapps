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
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const CampaignsTimelineAnalysis: React.FC<CampaignsAnalyticsComponentProps> = ({
  timelineAnalysis = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [visibleLines, setVisibleLines] = useState({
    cumulativeCampaigns: true,
    cumulativeLeads: true,
    cumulativeAccounts: true,
    cumulativeContacts: true,
    cumulativeOpportunities: true
  })

  // Toggle line visibility
  const toggleLine = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
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
              <span className="gba:text-blue-600">Campaigns:</span> {data.cumulativeCampaigns}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-green-600">Leads:</span> {data.cumulativeLeads}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-purple-600">Accounts:</span> {data.cumulativeAccounts}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-orange-600">Contacts:</span> {data.cumulativeContacts}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-red-600">Opportunities:</span> {data.cumulativeOpportunities}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card data-testid="campaigns-timeline-analysis-loading">
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
      <Card data-testid="campaigns-timeline-analysis-error">
        <CardContent className="gba:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              {getTranslationFromI18nKeyAndLabel(
                'campaigns.analytics.timelineAnalysis.error',
                'Error loading timeline analysis data'
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
    <Card data-testid="campaigns-timeline-analysis">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start">
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'campaigns.analytics.timelineAnalysis.title',
              'Cumulative Entity Growth'
            )}
          </CardTitle>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {Object.entries(visibleLines).map(([key, isVisible]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => toggleLine(key as keyof typeof visibleLines)}
                className="gba:flex gba:items-center gba:gap-1"
              >
                {isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                {key
                  .replace('cumulative', '')
                  .replace(/([A-Z])/g, ' $1')
                  .toLowerCase()}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:p-6">
        {timelineAnalysis.length === 0 ? (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }}>
            {getTranslationFromI18nKeyAndLabel(
              'campaigns.analytics.timelineAnalysis.noData',
              'No timeline data available'
            )}
          </div>
        ) : (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={value => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {visibleLines.cumulativeCampaigns && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeCampaigns"
                    stroke="#1890ff"
                    name="Campaigns"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}

                {visibleLines.cumulativeLeads && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeLeads"
                    stroke="#52c41a"
                    name="Leads"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}

                {visibleLines.cumulativeAccounts && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeAccounts"
                    stroke="#722ed1"
                    name="Accounts"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}

                {visibleLines.cumulativeContacts && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeContacts"
                    stroke="#fa8c16"
                    name="Contacts"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}

                {visibleLines.cumulativeOpportunities && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeOpportunities"
                    stroke="#f5222d"
                    name="Opportunities"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignsTimelineAnalysis
