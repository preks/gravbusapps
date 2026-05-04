import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { HeartbeatIcon } from '@phosphor-icons/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UseOrgAttendanceDataReturn } from '../../../hooks/useOrgAttendanceData'
import {
  aggregateByDimension,
  computeDailyPresence,
  countAbsenceDaysByDimension
} from '../../../utils/insightsAggregation'
import { ChartTooltip } from './shared/ChartTooltip'

interface CombinedHealthSectionProps {
  attendanceData: UseOrgAttendanceDataReturn
}

const I18N_PREFIX = 'lowcoder:time_absence_hub.insights.combined_health'

const tt = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(`${I18N_PREFIX}.${key}`, fallback)

interface ChartShellProps {
  title: string
  description: string
  empty: boolean
  emptyText: string
  children: React.ReactElement
}

const ChartShell: React.FC<ChartShellProps> = ({ title, description, empty, emptyText, children }) => (
  <Card className="gba:p-4 gba:flex-1 gba:min-w-80">
    <h5 className="gba:text-sm gba:font-medium gba:m-0">{title}</h5>
    <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{description}</p>
    {empty ? (
      <p className="gba:text-xs gba:text-muted-foreground gba:py-12 gba:text-center">{emptyText}</p>
    ) : (
      <div className="gba:mt-3 gba:h-60">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    )}
  </Card>
)

export const CombinedHealthSection: React.FC<CombinedHealthSectionProps> = ({ attendanceData }) => {
  const burnoutByDept = useMemo(() => {
    const breakdowns = aggregateByDimension(attendanceData.attendance, attendanceData.employees, 'department')
    return breakdowns
      .filter(entry => entry.headcount > 0)
      .map(entry => ({
        label: entry.label,
        avgOvertimePerEmp: Math.round((entry.overtimeHours / Math.max(1, entry.headcount)) * 10) / 10,
        deficitPerEmp: Math.round((entry.deficitHours / Math.max(1, entry.headcount)) * 10) / 10
      }))
      .sort((a, b) => b.avgOvertimePerEmp - a.avgOvertimePerEmp)
      .slice(0, 10)
  }, [attendanceData.attendance, attendanceData.employees])

  const absenceLoadByDept = useMemo(() => {
    const workedByDept = aggregateByDimension(attendanceData.attendance, attendanceData.employees, 'department')
    const absenceCountByDept = countAbsenceDaysByDimension(
      attendanceData.absences,
      attendanceData.employees,
      'department'
    )
    return workedByDept
      .map(entry => ({
        label: entry.label,
        workedHours: Math.round(entry.workedHours * 10) / 10,
        absenceDays: absenceCountByDept.get(entry.key) ?? 0
      }))
      .filter(entry => entry.workedHours > 0 || entry.absenceDays > 0)
      .sort((a, b) => b.workedHours - a.workedHours)
      .slice(0, 10)
  }, [attendanceData.attendance, attendanceData.absences, attendanceData.employees])

  const dailyPresence = useMemo(
    () => computeDailyPresence(attendanceData.attendance, attendanceData.employees.length),
    [attendanceData.attendance, attendanceData.employees.length]
  )

  return (
    <Card data-testid="time-absence-hub-combined-health">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <HeartbeatIcon size={18} />
          {tt('section_title', 'Combined health indicators')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-wrap gba:gap-3">
        <ChartShell
          title={tt('burnout_title', 'Burnout signal by department')}
          description={tt(
            'burnout_desc',
            'Average overtime hours per employee in range, with cumulative deficit per employee.'
          )}
          empty={burnoutByDept.length === 0}
          emptyText={tt('no_data', 'No data for the selected range.')}
        >
          <BarChart data={burnoutByDept} margin={{ top: 10, right: 24, left: 0, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} fontSize={11} height={60} />
            <YAxis fontSize={12} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="avgOvertimePerEmp"
              name={tt('avg_overtime_per_emp', 'Avg overtime / employee')}
              fill="var(--nw-warning)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="deficitPerEmp"
              name={tt('deficit_per_emp', 'Deficit / employee')}
              fill="var(--nw-destructive)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartShell>

        <ChartShell
          title={tt('absence_load_title', 'Absence load vs worked hours')}
          description={tt('absence_load_desc', 'Worked hours and absence days per department, top 10.')}
          empty={absenceLoadByDept.length === 0}
          emptyText={tt('no_data', 'No data for the selected range.')}
        >
          <BarChart data={absenceLoadByDept} margin={{ top: 10, right: 24, left: 0, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} fontSize={11} height={60} />
            <YAxis yAxisId="left" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              yAxisId="left"
              dataKey="workedHours"
              name={tt('worked_hours', 'Worked hours')}
              fill="var(--nw-chart-1)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="absenceDays"
              name={tt('absence_days', 'Absence days')}
              fill="var(--nw-chart-3)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartShell>

        <ChartShell
          title={tt('availability_title', 'Department availability over time')}
          description={tt(
            'availability_desc',
            'Daily presence rate computed as employees with attendance / population size.'
          )}
          empty={dailyPresence.length === 0}
          emptyText={tt('no_data', 'No data for the selected range.')}
        >
          <AreaChart data={dailyPresence} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dayLabel" fontSize={11} />
            <YAxis fontSize={12} unit="%" domain={[0, 100]} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area
              type="monotone"
              dataKey="presenceRate"
              name={tt('presence_rate', 'Presence rate (%)')}
              stroke="var(--nw-success)"
              fill="var(--nw-success)"
              fillOpacity={0.25}
            />
          </AreaChart>
        </ChartShell>
      </CardContent>
    </Card>
  )
}

export default CombinedHealthSection
