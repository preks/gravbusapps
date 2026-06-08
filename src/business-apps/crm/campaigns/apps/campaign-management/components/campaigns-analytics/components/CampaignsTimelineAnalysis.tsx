import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  useTranslation,
  type ChartConfig
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis } from 'recharts'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import {
  CampaignsAnalyticsComponentProps,
  TimelinePeriod,
  TIMELINE_PERIODS,
  CampaignsTimelineData
} from '../types/CampaignsAnalyticsTypes'
import { NW_CHART_COLOR_VARS } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'
import translations from '../../../../../_i18n'
import { TooltipWrapper, TooltipDataLine } from '@/common/components/customer/campaign-management/ChartHelpers'
import dayjs from 'dayjs'

interface CampaignsTimelineAnalysisProps extends CampaignsAnalyticsComponentProps {
  timelinePeriod?: TimelinePeriod
  onTimelinePeriodChange?: (period: TimelinePeriod) => void
}

/**
 * Custom tooltip for timeline chart
 * Extracted to improve performance and testability
 */
interface TimelineTooltipData {
  cumulativeCampaigns: number
  cumulativeLeads: number
  cumulativeAccounts: number
  cumulativeContacts: number
  cumulativeOpportunities: number
}

interface TimelineTooltipProps {
  active?: boolean
  payload?: Array<{ payload: TimelineTooltipData }>
  label?: string
}

const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <TooltipWrapper title={label || 'Timeline'}>
        <TooltipDataLine label="Campaigns" value={data.cumulativeCampaigns} color={NW_CHART_COLOR_VARS[0]} />
        <TooltipDataLine label="Leads" value={data.cumulativeLeads} color={NW_CHART_COLOR_VARS[1]} />
        <TooltipDataLine label="Accounts" value={data.cumulativeAccounts} color={NW_CHART_COLOR_VARS[2]} />
        <TooltipDataLine label="Contacts" value={data.cumulativeContacts} color={NW_CHART_COLOR_VARS[3]} />
        <TooltipDataLine label="Opportunities" value={data.cumulativeOpportunities} color={NW_CHART_COLOR_VARS[4]} />
      </TooltipWrapper>
    )
  }
  return null
}

const LINE_CONFIG = [
  { key: 'cumulativeCampaigns', dataKey: 'cumulativeCampaigns', name: 'Campaigns' },
  { key: 'cumulativeLeads', dataKey: 'cumulativeLeads', name: 'Leads' },
  { key: 'cumulativeAccounts', dataKey: 'cumulativeAccounts', name: 'Accounts' },
  { key: 'cumulativeContacts', dataKey: 'cumulativeContacts', name: 'Contacts' },
  { key: 'cumulativeOpportunities', dataKey: 'cumulativeOpportunities', name: 'Opportunities' }
] as const

const TIMELINE_CHART_CONFIG: ChartConfig = {
  cumulativeCampaigns: { label: 'Campaigns', color: NW_CHART_COLOR_VARS[0] },
  cumulativeLeads: { label: 'Leads', color: NW_CHART_COLOR_VARS[1] },
  cumulativeAccounts: { label: 'Accounts', color: NW_CHART_COLOR_VARS[2] },
  cumulativeContacts: { label: 'Contacts', color: NW_CHART_COLOR_VARS[3] },
  cumulativeOpportunities: { label: 'Opportunities', color: NW_CHART_COLOR_VARS[4] }
}

const CampaignsTimelineAnalysis: React.FC<CampaignsTimelineAnalysisProps> = ({
  timelineAnalysis = [],
  isLoading = false,
  error = null,
  onRetry,
  timelinePeriod = 'last-year',
  onTimelinePeriodChange
}) => {
  const { t } = useTranslation(translations)
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

  // Helper function to initialize cumulative values object
  const initializeCumulativeValues = () => ({
    cumulativeCampaigns: 0,
    cumulativeLeads: 0,
    cumulativeAccounts: 0,
    cumulativeContacts: 0,
    cumulativeOpportunities: 0,
    cumulativeRevenue: 0
  })

  // Helper function to update cumulative values from data
  const updateCumulativeValues = (data: CampaignsTimelineData) => ({
    cumulativeCampaigns: data.cumulativeCampaigns,
    cumulativeLeads: data.cumulativeLeads,
    cumulativeAccounts: data.cumulativeAccounts,
    cumulativeContacts: data.cumulativeContacts,
    cumulativeOpportunities: data.cumulativeOpportunities,
    cumulativeRevenue: data.cumulativeRevenue
  })

  // Helper function to fill forward cumulative values
  const fillForwardCumulativeValues = (
    data: CampaignsTimelineData,
    lastValues: ReturnType<typeof initializeCumulativeValues>
  ) => {
    data.cumulativeCampaigns = lastValues.cumulativeCampaigns
    data.cumulativeLeads = lastValues.cumulativeLeads
    data.cumulativeAccounts = lastValues.cumulativeAccounts
    data.cumulativeContacts = lastValues.cumulativeContacts
    data.cumulativeOpportunities = lastValues.cumulativeOpportunities
    data.cumulativeRevenue = lastValues.cumulativeRevenue
  }

  // Helper function to group and aggregate timeline data based on the period
  const aggregateTimelineData = useMemo(() => {
    if (!timelineAnalysis || timelineAnalysis.length === 0) return []

    const endDate = dayjs()
    let startDate: dayjs.Dayjs
    let numberOfMonths: number

    // Calculate start date and month count based on period
    switch (timelinePeriod) {
      case 'last-month':
        numberOfMonths = 1
        startDate = endDate.subtract(numberOfMonths - 1, 'month').startOf('month')
        break
      case 'last-quarter':
        numberOfMonths = 3
        startDate = endDate.subtract(numberOfMonths - 1, 'month').startOf('month')
        break
      case 'last-6-months':
        numberOfMonths = 6
        startDate = endDate.subtract(numberOfMonths - 1, 'month').startOf('month')
        break
      case 'last-year':
        numberOfMonths = 12
        startDate = endDate.subtract(numberOfMonths - 1, 'month').startOf('month')
        break
      case 'historical':
        numberOfMonths = 60 // 5 years
        startDate = endDate.subtract(4, 'year').startOf('year')
        break
      default:
        numberOfMonths = 12
        startDate = endDate.subtract(11, 'month').startOf('month')
    }

    // For historical view (5 years), group by year
    if (timelinePeriod === 'historical') {
      const yearMap = new Map<string, CampaignsTimelineData>()

      // Pre-populate all years in the range
      const startYear = startDate.year()
      const endYear = endDate.year()
      for (let year = startYear; year <= endYear; year++) {
        const yearKey = year.toString()
        yearMap.set(yearKey, {
          date: yearKey,
          campaignsCreated: 0,
          cumulativeCampaigns: 0,
          leadsGenerated: 0,
          cumulativeLeads: 0,
          accountsCreated: 0,
          cumulativeAccounts: 0,
          contactsCreated: 0,
          cumulativeContacts: 0,
          opportunitiesCreated: 0,
          cumulativeOpportunities: 0,
          dailyRevenue: 0,
          cumulativeRevenue: 0
        })
      }

      // Aggregate data into years
      timelineAnalysis.forEach(data => {
        const year = dayjs(data.date).format('YYYY')
        if (!yearMap.has(year)) return

        const yearData = yearMap.get(year)!
        yearData.campaignsCreated += data.campaignsCreated
        yearData.leadsGenerated += data.leadsGenerated
        yearData.accountsCreated += data.accountsCreated
        yearData.contactsCreated += data.contactsCreated
        yearData.opportunitiesCreated += data.opportunitiesCreated
        yearData.dailyRevenue += data.dailyRevenue

        // Use the last cumulative values for each year
        yearData.cumulativeCampaigns = data.cumulativeCampaigns
        yearData.cumulativeLeads = data.cumulativeLeads
        yearData.cumulativeAccounts = data.cumulativeAccounts
        yearData.cumulativeContacts = data.cumulativeContacts
        yearData.cumulativeOpportunities = data.cumulativeOpportunities
        yearData.cumulativeRevenue = data.cumulativeRevenue
      })

      // Fill forward cumulative values for years with no data
      const yearArray = Array.from(yearMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      let lastCumulativeValues = initializeCumulativeValues()

      return yearArray.map(([, yearData]) => {
        if (yearData.cumulativeCampaigns > 0) {
          lastCumulativeValues = updateCumulativeValues(yearData)
        } else {
          // Fill forward from last known values
          fillForwardCumulativeValues(yearData, lastCumulativeValues)
        }
        return yearData
      })
    }

    // For all other periods (month-based), group by year-month
    const monthMap = new Map<string, CampaignsTimelineData>()

    // Pre-populate exactly the number of months we need
    for (let i = 0; i < numberOfMonths; i++) {
      const currentMonth = startDate.add(i, 'month')
      const monthKey = currentMonth.format('YYYY-MM')
      const monthLabel = currentMonth.format('MMM YYYY')

      monthMap.set(monthKey, {
        date: monthLabel,
        campaignsCreated: 0,
        cumulativeCampaigns: 0,
        leadsGenerated: 0,
        cumulativeLeads: 0,
        accountsCreated: 0,
        cumulativeAccounts: 0,
        contactsCreated: 0,
        cumulativeContacts: 0,
        opportunitiesCreated: 0,
        cumulativeOpportunities: 0,
        dailyRevenue: 0,
        cumulativeRevenue: 0
      })
    }

    // Aggregate data into months
    timelineAnalysis.forEach(data => {
      const monthKey = dayjs(data.date).format('YYYY-MM')
      if (!monthMap.has(monthKey)) return

      const monthData = monthMap.get(monthKey)!
      monthData.campaignsCreated += data.campaignsCreated
      monthData.leadsGenerated += data.leadsGenerated
      monthData.accountsCreated += data.accountsCreated
      monthData.contactsCreated += data.contactsCreated
      monthData.opportunitiesCreated += data.opportunitiesCreated
      monthData.dailyRevenue += data.dailyRevenue

      // Use the last cumulative values for each month
      monthData.cumulativeCampaigns = data.cumulativeCampaigns
      monthData.cumulativeLeads = data.cumulativeLeads
      monthData.cumulativeAccounts = data.cumulativeAccounts
      monthData.cumulativeContacts = data.cumulativeContacts
      monthData.cumulativeOpportunities = data.cumulativeOpportunities
      monthData.cumulativeRevenue = data.cumulativeRevenue
    })

    // Fill forward cumulative values for months with no data
    const monthArray = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    let lastCumulativeValues = initializeCumulativeValues()

    return monthArray.map(([, monthData]) => {
      if (monthData.cumulativeCampaigns > 0) {
        lastCumulativeValues = updateCumulativeValues(monthData)
      } else {
        // Fill forward from last known values
        fillForwardCumulativeValues(monthData, lastCumulativeValues)
      }
      return monthData
    })
  }, [timelineAnalysis, timelinePeriod])

  // Format X-axis label based on the grouped data
  const formatXAxisLabel = (value: string) => {
    // The value is already formatted (either "MMM YYYY" or "YYYY")
    return value
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
              {t('campaigns-analytics-timelineAnalysis-error')}
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gba:ml-2">
                  {t('common-retry')}
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
        <div className="gba:flex gba:justify-between gba:items-start gba:gap-4">
          <CardTitle>{t('campaigns-analytics-timelineAnalysis-title')}</CardTitle>
          <div className="gba:flex gba:flex-col gba:gap-2">
            {/* Timeline Period Filters */}
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-end">
              {TIMELINE_PERIODS.map(period => (
                <Button
                  key={period.value}
                  variant={timelinePeriod === period.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTimelinePeriodChange?.(period.value)}
                  data-testid={`timeline-period-${period.value}`}
                >
                  {period.label}
                </Button>
              ))}
            </div>
            {/* Line Visibility Toggles */}
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-end">
              {Object.entries(visibleLines).map(([key, isVisible]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLine(key as keyof typeof visibleLines)}
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  {isVisible ? <EyeIcon /> : <EyeSlashIcon />}
                  {key
                    .replace(/cumulative/g, '') // NOSONAR: replaceAll not available in current TypeScript lib
                    .replace(/([A-Z])/g, ' $1') // NOSONAR: replaceAll not available in current TypeScript lib
                    .trim()
                    .toLowerCase()
                    .replace(/^\w/, (c: string) => c.toUpperCase())}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:p-6">
        {aggregateTimelineData.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            {t('campaigns-analytics-timelineAnalysis-noData')}
          </div>
        ) : (
          <div className="gba:h-[500px]">
            <ChartContainer config={TIMELINE_CHART_CONFIG} className="gba:h-[500px] gba:w-full">
              <LineChart
                data={aggregateTimelineData}
                margin={{ top: 20, right: 30, left: 20, bottom: timelinePeriod === 'historical' ? 30 : 50 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatXAxisLabel}
                  angle={timelinePeriod === 'historical' ? 0 : -45}
                  textAnchor={timelinePeriod === 'historical' ? 'middle' : 'end'}
                  height={timelinePeriod === 'historical' ? 30 : 80}
                />
                <YAxis />
                <ChartTooltip content={<TimelineTooltip />} />
                <ChartLegend content={<ChartLegendContent />} />

                {LINE_CONFIG.map(
                  lineConfig =>
                    visibleLines[lineConfig.key] && (
                      <Line
                        key={lineConfig.key}
                        type="monotone"
                        dataKey={lineConfig.dataKey}
                        stroke={`var(--color-${lineConfig.dataKey})`}
                        name={lineConfig.name}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    )
                )}
              </LineChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignsTimelineAnalysis
