import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { TrendUpIcon } from '@phosphor-icons/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UseOrgAttendanceDataReturn } from '../../../hooks/useOrgAttendanceData'
import { aggregateAttendanceByWeek } from '../../../utils/insightsAggregation'

interface TimeTrackingTrendsSectionProps {
  attendanceData: UseOrgAttendanceDataReturn
}

const I18N_PREFIX = 'lowcoder:time_absence_hub.insights.time_tracking'

const tt = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(`${I18N_PREFIX}.${key}`, fallback)

const formatHours = (hours: number): string => `${Math.round(hours * 10) / 10} h`

interface MetricCardProps {
  title: string
  value: string
  description: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description }) => (
  <Card className="gba:flex-1 gba:min-w-48">
    <CardContent className="gba:flex gba:flex-col gba:gap-1 gba:py-4">
      <span className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {title}
      </span>
      <span className="gba:text-2xl gba:font-semibold gba:text-foreground">{value}</span>
      <span className="gba:text-xs gba:text-muted-foreground">{description}</span>
    </CardContent>
  </Card>
)

const ChartTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  return (
    <div className="gba:bg-card gba:p-3 gba:border gba:rounded gba:shadow gba:min-w-40">
      <p className="gba:font-medium gba:mb-2 gba:text-sm">{label}</p>
      <div className="gba:space-y-1 gba:text-xs">
        {payload.map(entry => (
          <p key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
            <span className="gba:font-medium">{entry.name}:</span>
            <span>{typeof entry.value === 'number' ? Math.round(entry.value * 10) / 10 : entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

export const TimeTrackingTrendsSection: React.FC<TimeTrackingTrendsSectionProps> = ({ attendanceData }) => {
  const buckets = useMemo(() => aggregateAttendanceByWeek(attendanceData.attendance), [attendanceData.attendance])

  const totals = useMemo(() => {
    const acc = buckets.reduce(
      (sum, bucket) => ({
        worked: sum.worked + bucket.workedHours,
        planned: sum.planned + bucket.plannedHours,
        overtime: sum.overtime + bucket.overtimeHours,
        deficit: sum.deficit + bucket.deficitHours,
        missing: sum.missing + bucket.missingLogs,
        manual: sum.manual + bucket.manualCorrections
      }),
      { worked: 0, planned: 0, overtime: 0, deficit: 0, missing: 0, manual: 0 }
    )
    const net = acc.worked - acc.planned
    return { ...acc, net }
  }, [buckets])

  return (
    <Card data-testid="time-absence-hub-time-tracking-trends">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <TrendUpIcon size={18} />
          {tt('section_title', 'Time tracking trends')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:flex-wrap gba:gap-3">
          <MetricCard
            title={tt('worked_vs_target', 'Worked vs target')}
            value={`${formatHours(totals.worked)} / ${formatHours(totals.planned)}`}
            description={tt('worked_vs_target_desc', 'Aggregated across the filtered population.')}
          />
          <MetricCard
            title={tt('overtime', 'Overtime')}
            value={formatHours(totals.overtime)}
            description={tt('overtime_desc', 'Sum of positive difference minutes.')}
          />
          <MetricCard
            title={tt('deficit', 'Deficit')}
            value={formatHours(totals.deficit)}
            description={tt('deficit_desc', 'Sum of negative difference minutes (absolute).')}
          />
          <MetricCard
            title={tt('net_difference', 'Net difference')}
            value={`${totals.net >= 0 ? '+' : ''}${formatHours(totals.net)}`}
            description={tt('net_difference_desc', 'Effective minus planned across the population.')}
          />
        </div>

        <ChartCard
          title={tt('worked_target_trend', 'Worked vs target by week')}
          empty={buckets.length === 0}
          emptyText={tt('no_data', 'No attendance data for the selected range.')}
        >
          <ComposedChart data={buckets} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekLabel" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="workedHours" name={tt('worked', 'Worked')} fill="var(--nw-chart-1)" radius={[4, 4, 0, 0]} />
            <Line
              dataKey="plannedHours"
              name={tt('planned', 'Planned')}
              stroke="var(--nw-foreground)"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </ComposedChart>
        </ChartCard>

        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-4">
          <ChartCard
            title={tt('overtime_deficit_trend', 'Overtime / deficit by week')}
            empty={buckets.length === 0}
            emptyText={tt('no_data', 'No attendance data for the selected range.')}
          >
            <BarChart data={buckets} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar
                dataKey="overtimeHours"
                name={tt('overtime', 'Overtime')}
                fill="var(--nw-success)"
                radius={[4, 4, 0, 0]}
                stackId="diff"
              />
              <Bar
                dataKey="deficitHours"
                name={tt('deficit', 'Deficit')}
                fill="var(--nw-destructive)"
                radius={[4, 4, 0, 0]}
                stackId="diff"
              />
            </BarChart>
          </ChartCard>

          <ChartCard
            title={tt('logs_quality_trend', 'Missing logs and manual corrections by week')}
            empty={buckets.length === 0}
            emptyText={tt('no_data', 'No attendance data for the selected range.')}
          >
            <BarChart data={buckets} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar
                dataKey="missingLogs"
                name={tt('missing_logs', 'Missing logs')}
                fill="var(--nw-warning)"
                radius={[4, 4, 0, 0]}
                stackId="quality"
              />
              <Bar
                dataKey="manualCorrections"
                name={tt('manual_corrections', 'Manual corrections')}
                fill="var(--nw-info)"
                radius={[4, 4, 0, 0]}
                stackId="quality"
              />
            </BarChart>
          </ChartCard>
        </div>
      </CardContent>
    </Card>
  )
}

interface ChartCardProps {
  title: string
  empty: boolean
  emptyText: string
  children: React.ReactElement
}

const ChartCard: React.FC<ChartCardProps> = ({ title, empty, emptyText, children }) => (
  <Card className="gba:p-4">
    <h5 className="gba:text-sm gba:font-medium gba:mb-3">{title}</h5>
    {empty ? (
      <p className="gba:text-xs gba:text-muted-foreground gba:py-12 gba:text-center">{emptyText}</p>
    ) : (
      <div className="gba:h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    )}
  </Card>
)

export default TimeTrackingTrendsSection
