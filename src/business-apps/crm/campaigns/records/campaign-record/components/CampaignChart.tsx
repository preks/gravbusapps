import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Spinner,
  Checkbox,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { ChartLineIcon, EyeIcon } from '@phosphor-icons/react'
import { useCampaignChart } from '../hooks'
import { CampaignChartProps, ChartTimeFilter } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const DATA_TEST_ID_PREFIX = 'CampaignChart'

const CHART_LINE_CONFIG = [
  { key: 'totalLeads' as const, label: 'Total Leads' },
  { key: 'totalAccounts' as const, label: 'Total Accounts' },
  { key: 'totalContacts' as const, label: 'Total Contacts' },
  { key: 'totalOpportunities' as const, label: 'Total Opportunities' }
] as const

interface ChartCardHeaderProps {
  children?: React.ReactNode
}

const ChartCardHeader: React.FC<ChartCardHeaderProps> = ({ children }) => (
  <CardHeader>
    <div className="gba:flex gba:items-center gba:justify-between">
      <CardTitle className="gba:flex gba:items-center gba:gap-2">
        <ChartLineIcon size={20} />
        {getTranslationFromI18nKeyAndLabel('campaign.chart.title', 'Campaign Performance Trends')}
      </CardTitle>
      {children}
    </div>
  </CardHeader>
)

const CampaignChart: React.FC<CampaignChartProps> = ({ campaignId, campaign, allEntities, ...props }) => {
  const [visibleLines, setVisibleLines] = useState({
    totalLeads: true,
    totalAccounts: true,
    totalContacts: true,
    totalOpportunities: true
  })

  const { chartData, isLoading, error, timeFilter, setTimeFilter, refetch } = useCampaignChart(
    props,
    campaignId,
    campaign,
    allEntities
  )

  const areaChartConfig = useMemo<ChartConfig>(
    () => ({
      totalleads: { label: 'Total Leads' },
      totalaccounts: { label: 'Total Accounts' },
      totalcontacts: { label: 'Total Contacts' },
      totalopportunities: { label: 'Total Opportunities' }
    }),
    []
  )

  const timeFilterOptions = [
    { key: 'daily' as ChartTimeFilter, label: 'Daily' },
    { key: 'weekly' as ChartTimeFilter, label: 'Weekly' },
    { key: 'monthly' as ChartTimeFilter, label: 'Monthly' },
    { key: 'yearly' as ChartTimeFilter, label: 'Yearly' }
  ]

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  const formatXAxisLabel = (value: string) => value

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <ChartCardHeader />
        <CardContent>
          <div className="gba:flex gba:justify-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <ChartCardHeader />
        <CardContent>
          <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h4 className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('campaign.chart.error.title', 'Error Loading Chart')}
                </h4>
                <p className="gba:text-sm gba:text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
                {getTranslationFromI18nKeyAndLabel('campaign.chart.retry', 'Retry')}
              </Button>
            </div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <ChartCardHeader>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:gap-1" data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}>
            {timeFilterOptions.map(option => (
              <Button
                key={option.key}
                variant={timeFilter === option.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter(option.key)}
                data-testid={`${DATA_TEST_ID_PREFIX}-filter-${option.key}`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </ChartCardHeader>
      <CardHeader>
        <div className="gba:border-t gba:border-border gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <EyeIcon size={16} className="gba:text-muted-foreground" />
              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel('campaign.chart.showLines', 'Show Lines:')}
              </span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}>
              {CHART_LINE_CONFIG.map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
                >
                  <Checkbox checked={visibleLines[line.key]} onCheckedChange={() => toggleLineVisibility(line.key)} />
                  <div
                    className="gba:w-3 gba:h-3 gba:rounded"
                    style={{
                      backgroundColor: `var(--color-${line.key.toLowerCase()})`
                    }}
                  />
                  <span className="gba:text-sm gba:text-foreground">{line.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!chartData?.data || chartData.data.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}>
            <ChartLineIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-muted-foreground" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('campaign.chart.noData.title', 'No data available')}
            </h3>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'campaign.chart.noData.message',
                'No campaign data found for the selected time period.'
              )}
            </p>
          </div>
        ) : (
          <div className="gba:h-80" data-testid={`${DATA_TEST_ID_PREFIX}-chart`}>
            <ChartContainer config={areaChartConfig} className="gba:h-80 gba:w-full">
              <AreaChart
                data={chartData.data}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20
                }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatXAxisLabel}
                  stroke="var(--color-text-secondary)"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="var(--color-text-secondary)"
                  tickFormatter={value => Math.floor(Number(value)).toString()}
                  domain={[0, 'dataMax']}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent labelFormatter={label => `Period: ${formatXAxisLabel(String(label ?? ''))}`} />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />

                {CHART_LINE_CONFIG.map(
                  line =>
                    visibleLines[line.key] && (
                      <Area
                        key={line.key}
                        type="monotone"
                        dataKey={line.key}
                        stroke={`var(--color-${line.key.toLowerCase()})`}
                        fill={`var(--color-${line.key.toLowerCase()})`}
                        fillOpacity={0.1}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 6,
                          stroke: `var(--color-${line.key.toLowerCase()})`,
                          strokeWidth: 2
                        }}
                        name={line.label}
                      />
                    )
                )}
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignChart
