import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
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
import { useTranslation } from '@newwork/nw-design-system'
import { NW_CHART_COLOR_VARS } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'
import translations from '../../../_i18n'

const DATA_TEST_ID_PREFIX = 'CampaignChart'
const CARD_BACKGROUND_CLASS = 'gba:bg-muted'

// Chart line configuration using design-system chart tokens (aligned with areaChartConfig)
const CHART_LINE_CONFIG = [
  { key: 'totalLeads' as const, labelKey: 'campaign-kpis-totalLeads', color: NW_CHART_COLOR_VARS[0] },
  { key: 'totalAccounts' as const, labelKey: 'campaign-kpis-totalAccounts', color: NW_CHART_COLOR_VARS[1] },
  { key: 'totalContacts' as const, labelKey: 'campaign-kpis-totalContacts', color: NW_CHART_COLOR_VARS[2] },
  { key: 'totalOpportunities' as const, labelKey: 'campaign-kpis-totalOpportunities', color: NW_CHART_COLOR_VARS[3] }
] as const

interface ChartCardHeaderProps {
  children?: React.ReactNode
  title: string
}

const ChartCardHeader: React.FC<ChartCardHeaderProps> = ({ children, title }) => (
  <CardHeader>
    <div className="gba:flex gba:items-center gba:justify-between">
      <CardTitle className="gba:flex gba:items-center gba:gap-2">
        <ChartLineIcon size={20} />
        {title}
      </CardTitle>
      {children}
    </div>
  </CardHeader>
)

const CampaignChart: React.FC<CampaignChartProps> = ({ campaignId, campaign, ...props }) => {
  const { t } = useTranslation(translations)
  // Line visibility state
  const [visibleLines, setVisibleLines] = useState({
    totalLeads: true,
    totalAccounts: true,
    totalContacts: true,
    totalOpportunities: true
  })

  const { chartData, isLoading, error, timeFilter, setTimeFilter, refetch } = useCampaignChart(
    props,
    campaignId,
    campaign
  )

  const areaChartConfig = useMemo<ChartConfig>(
    () => ({
      totalLeads: { label: 'Total Leads', color: NW_CHART_COLOR_VARS[0] },
      totalAccounts: { label: 'Total Accounts', color: NW_CHART_COLOR_VARS[1] },
      totalContacts: { label: 'Total Contacts', color: NW_CHART_COLOR_VARS[2] },
      totalOpportunities: { label: 'Total Opportunities', color: NW_CHART_COLOR_VARS[3] }
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

  // Custom label formatter for X-axis
  const formatXAxisLabel = (value: string) => {
    // All time filters currently use the same format
    return value
  }

  if (isLoading) {
    return (
      <Card className={CARD_BACKGROUND_CLASS} data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <ChartCardHeader title={t('campaign-chart-title')} />
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
      <Card className={CARD_BACKGROUND_CLASS} data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <ChartCardHeader title={t('campaign-chart-title')} />
        <CardContent>
          <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h4 className="gba:text-sm gba:font-medium">{t('campaign-chart-error-title')}</h4>
                <p className="gba:text-sm gba:text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
                {t('campaign-chart-retry')}
              </Button>
            </div>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={CARD_BACKGROUND_CLASS} data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <ChartCardHeader title={t('campaign-chart-title')}>
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
              <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('campaign-chart-showLines')}</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}>
              {CHART_LINE_CONFIG.map(line => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
                >
                  <Checkbox checked={visibleLines[line.key]} onCheckedChange={() => toggleLineVisibility(line.key)} />
                  <div className="gba:w-3 gba:h-3 gba:rounded" style={{ backgroundColor: line.color }} />
                  <span className="gba:text-sm gba:text-foreground">{t(line.labelKey)}</span>
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
              {t('campaign-chart-noData-title')}
            </h3>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('campaign-chart-noData-message')}</p>
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
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
                        stroke={`var(--color-${line.key})`}
                        fill={`var(--color-${line.key})`}
                        fillOpacity={0.1}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
                        name={t(line.labelKey)}
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
