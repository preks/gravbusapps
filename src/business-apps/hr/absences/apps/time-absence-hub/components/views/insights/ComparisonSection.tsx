import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { GitBranchIcon } from '@phosphor-icons/react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UseOrgAttendanceDataReturn } from '../../../hooks/useOrgAttendanceData'
import { aggregateByDimension, EmployeeDimension } from '../../../utils/insightsAggregation'
import { ChartTooltip } from './shared/ChartTooltip'

interface ComparisonSectionProps {
  attendanceData: UseOrgAttendanceDataReturn
}

const I18N_PREFIX = 'lowcoder:time_absence_hub.insights.comparison'

const tt = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(`${I18N_PREFIX}.${key}`, fallback)

type Metric = 'worked' | 'overtime' | 'missing'

const buildMetricOptions = (): { id: Metric; label: string }[] => [
  { id: 'worked', label: tt('metric_worked', 'Worked vs planned hours') },
  { id: 'overtime', label: tt('metric_overtime', 'Overtime vs deficit hours') },
  { id: 'missing', label: tt('metric_missing', 'Missing logs vs manual corrections') }
]

interface BreakdownChartProps {
  title: string
  data: ReturnType<typeof aggregateByDimension>
  metric: Metric
  emptyText: string
}

const BreakdownChart: React.FC<BreakdownChartProps> = ({ title, data, metric, emptyText }) => {
  const slice = data.slice(0, 10)
  const isEmpty = slice.length === 0
  return (
    <Card className="gba:p-4 gba:flex-1 gba:min-w-80 gba:shadow-none">
      <h5 className="gba:text-sm gba:font-medium gba:m-0">{title}</h5>
      {isEmpty ? (
        <p className="gba:text-xs gba:text-muted-foreground gba:py-12 gba:text-center">{emptyText}</p>
      ) : (
        <div className="gba:mt-3 gba:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slice} margin={{ top: 10, right: 24, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} fontSize={11} height={60} />
              <YAxis fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <BreakdownBars metric={metric} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

const BreakdownBars: React.FC<{ metric: Metric }> = ({ metric }) => {
  if (metric === 'worked') {
    return (
      <>
        <Bar dataKey="workedHours" name={tt('worked', 'Worked (h)')} fill="var(--nw-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="plannedHours"
          name={tt('planned', 'Planned (h)')}
          fill="var(--nw-chart-2)"
          radius={[4, 4, 0, 0]}
        />
      </>
    )
  }
  if (metric === 'overtime') {
    return (
      <>
        <Bar
          dataKey="overtimeHours"
          name={tt('overtime', 'Overtime (h)')}
          fill="var(--nw-success)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="deficitHours"
          name={tt('deficit', 'Deficit (h)')}
          fill="var(--nw-destructive)"
          radius={[4, 4, 0, 0]}
        />
      </>
    )
  }
  return (
    <>
      <Bar
        dataKey="missingLogs"
        name={tt('missing_logs', 'Missing logs')}
        fill="var(--nw-warning)"
        radius={[4, 4, 0, 0]}
      />
      <Bar
        dataKey="manualCorrections"
        name={tt('manual_corrections', 'Manual corrections')}
        fill="var(--nw-info)"
        radius={[4, 4, 0, 0]}
      />
    </>
  )
}

const DIMENSION_TITLES: Record<EmployeeDimension, () => string> = {
  department: () => tt('by_department', 'By department'),
  location: () => tt('by_location', 'By location'),
  legalEntity: () => tt('by_legal_entity', 'By legal entity')
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({ attendanceData }) => {
  const [metric, setMetric] = useState<Metric>('worked')
  const metricOptions = useMemo(() => buildMetricOptions(), [])
  const emptyText = tt('no_data', 'No attendance data for the selected range.')

  const dimensions: EmployeeDimension[] = ['department', 'location', 'legalEntity']

  const breakdowns = useMemo(
    () =>
      dimensions.map(dimension => ({
        dimension,
        data: aggregateByDimension(
          {
            attendance: attendanceData.attendance,
            employees: attendanceData.employees,
            dateRange: attendanceData.dateRange,
            holidays: attendanceData.holidays,
            absenceNet: attendanceData.absenceNet
          },
          dimension
        )
      })),
    [
      attendanceData.absenceNet,
      attendanceData.attendance,
      attendanceData.dateRange,
      attendanceData.employees,
      attendanceData.holidays
    ]
  )

  return (
    <Card className="gba:shadow-none" data-testid="time-absence-hub-comparison-section">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <GitBranchIcon size={18} />
          {tt('section_title', 'Comparisons')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-3">
        <div
          className="gba:flex gba:flex-wrap gba:items-center gba:gap-2"
          data-testid="time-absence-hub-comparison-metric-toggle"
          role="radiogroup"
          aria-label={tt('metric_toggle_label', 'Metric')}
        >
          <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{tt('metric_toggle_label', 'Metric')}:</span>
          {metricOptions.map(option => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={metric === option.id}
              className={
                metric === option.id
                  ? 'gba:rounded-full gba:border gba:border-primary gba:bg-primary gba:text-primary-foreground gba:px-3 gba:py-1 gba:text-xs'
                  : 'gba:rounded-full gba:border gba:border-border gba:bg-background gba:px-3 gba:py-1 gba:text-xs gba:text-foreground'
              }
              onClick={() => setMetric(option.id)}
              data-testid={`time-absence-hub-comparison-metric-${option.id}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="gba:flex gba:flex-wrap gba:gap-3">
          {breakdowns.map(({ dimension, data }) => (
            <BreakdownChart
              key={dimension}
              title={DIMENSION_TITLES[dimension]()}
              data={data}
              metric={metric}
              emptyText={emptyText}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ComparisonSection
