/* eslint-disable newwork-local/no-hardcoded-colors -- Recharts/Pie fills require fixed hex values per spec */
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Progress } from '@newwork/nw-design-system'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
  PieChart,
  Pie
} from 'recharts'
import { MessageSquare } from 'lucide-react'
import type { TeamMemberFeedback } from '../../hooks/useTeamFeedbackOverview'

export interface FeedbackHealthProps {
  members: TeamMemberFeedback[]
  feedbackCoverage: number
  recognitionRatio: number | null
  totalReceivedCount: number
  totalGivenCount: number
  loading: boolean
}

const employeeLabel = (m: { firstName: string; lastName: string }): string => {
  const initial = m.lastName?.trim()?.charAt(0)
  return initial ? `${m.firstName} ${initial}.` : m.firstName
}

const daysSinceLastFeedback = (iso: string | null): number | null => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

const recencyBarFill = (days: number | null): string => {
  if (days == null) return '#9ca3af'
  if (days >= 30) return '#ef4444'
  if (days >= 7) return '#eab308'
  return '#22c55e'
}

const coverageProgressClass = (pct: number): string => {
  if (pct >= 80) return '[&_[data-slot=progress-indicator]]:gba:bg-green-500'
  if (pct >= 50) return '[&_[data-slot=progress-indicator]]:gba:bg-yellow-500'
  return '[&_[data-slot=progress-indicator]]:gba:bg-red-500'
}

export const FeedbackHealth: React.FC<FeedbackHealthProps> = ({
  members,
  feedbackCoverage,
  recognitionRatio,
  totalReceivedCount,
  totalGivenCount,
  loading
}) => {
  if (loading) {
    return (
      <Card className="gba:rounded-xl">
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-5 gba:w-5 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-5 gba:w-40 gba:rounded gba:bg-muted gba:animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-8">
          <div className="gba:space-y-3 gba:rounded-lg gba:border gba:border-border gba:p-4">
            <div className="gba:h-4 gba:w-48 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-2 gba:w-full gba:rounded gba:bg-muted gba:animate-pulse" />
          </div>
          <div className="gba:h-4 gba:w-56 gba:rounded gba:bg-muted gba:animate-pulse" />
          <div className="gba:h-[250px] gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          <div className="gba:h-4 gba:w-44 gba:rounded gba:bg-muted gba:animate-pulse" />
          <div className="gba:h-40 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          <div className="gba:h-4 gba:w-52 gba:rounded gba:bg-muted gba:animate-pulse" />
          <div className="gba:h-48 gba:w-full gba:mx-auto gba:max-w-xs gba:rounded-full gba:bg-muted gba:animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const teamSize = members.length
  const membersWithReceived = members.filter(m => m.feedbackReceivedCount > 0).length

  const givenReceivedData = members.map(m => ({
    name: employeeLabel(m),
    received: m.feedbackReceivedCount,
    given: m.feedbackGivenCount
  }))

  const dayEntries = members.map(m => ({
    member: m,
    days: daysSinceLastFeedback(m.lastFeedbackDate)
  }))
  const maxKnownDays = Math.max(0, ...dayEntries.map(e => (e.days != null ? e.days : 0)))
  const noFeedbackBarDays = maxKnownDays > 0 ? maxKnownDays + 1 : 30

  const recencyData = [...dayEntries]
    .sort((a, b) => {
      const sa = a.days == null ? Number.POSITIVE_INFINITY : a.days
      const sb = b.days == null ? Number.POSITIVE_INFINITY : b.days
      if (sb !== sa) return sb - sa
      return employeeLabel(a.member).localeCompare(employeeLabel(b.member))
    })
    .map(({ member, days }) => {
      const hasFeedback = days != null
      const barDays = hasFeedback ? days : noFeedbackBarDays
      const labelText = hasFeedback ? `${days} days` : 'No feedback'
      return {
        name: employeeLabel(member),
        days: barDays,
        labelText,
        fill: recencyBarFill(days),
        tooltipDays: days
      }
    })

  const recencyChartHeight = Math.max(120, members.length * 35)

  const totalRecognition = members.reduce((s, m) => s + m.recognitionCount, 0)
  const totalDevelopmental = members.reduce((s, m) => s + m.developmentalCount, 0)
  const typedTotal = totalRecognition + totalDevelopmental
  const pieData =
    typedTotal > 0
      ? [
          { name: 'Recognition', value: totalRecognition, fill: '#22c55e' },
          { name: 'Developmental', value: totalDevelopmental, fill: '#3b82f6' }
        ]
      : []

  return (
    <Card className="gba:rounded-xl">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
          <MessageSquare className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          Feedback Health
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Feedback coverage</h3>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:p-4">
            <div className="gba:flex-1 gba:min-w-[200px] gba:space-y-2">
              <div className="gba:flex gba:items-baseline gba:justify-between gba:gap-2">
                <span className="gba:text-2xl gba:font-semibold gba:tabular-nums">{Math.round(feedbackCoverage)}%</span>
                <Badge variant="secondary" className="gba:shrink-0">
                  {membersWithReceived} of {teamSize} team members
                </Badge>
              </div>
              <Progress
                value={Math.min(100, Math.max(0, feedbackCoverage))}
                className={`gba:h-2 ${coverageProgressClass(feedbackCoverage)}`}
              />
              <p className="gba:text-xs gba:text-muted-foreground">
                {totalReceivedCount} received · {totalGivenCount} given organization-wide
              </p>
              {recognitionRatio != null ? (
                <p className="gba:text-xs gba:text-muted-foreground">
                  Recognition share (typed feedback): {recognitionRatio}%
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Given vs received by employee</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={givenReceivedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="gba:stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-28} textAnchor="end" height={56} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="received" fill="#3b82f6" name="Received" />
              <Bar dataKey="given" fill="#10b981" name="Given" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Recency (most stale first)</h3>
          <ResponsiveContainer width="100%" height={recencyChartHeight}>
            <BarChart layout="vertical" data={recencyData} margin={{ top: 4, right: 56, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="gba:stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, _name: string, item: { payload?: (typeof recencyData)[0] }) => {
                  const td = item?.payload?.tooltipDays
                  if (td == null) return ['No feedback recorded', 'Last feedback']
                  return [`${td} days ago`, 'Last feedback']
                }}
              />
              <Bar dataKey="days" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {recencyData.map((row, i) => (
                  <Cell key={`recency-${row.name}-${i}`} fill={row.fill} />
                ))}
                <LabelList
                  dataKey="labelText"
                  position="right"
                  fill="currentColor"
                  className="gba:fill-muted-foreground"
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Feedback type mix</h3>
          {pieData.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
              No feedback type data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={`pie-${entry.name}-${i}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `${value} (${typedTotal > 0 ? Math.round((value / typedTotal) * 100) : 0}%)`,
                    ''
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value, entry) => {
                    const v = (entry.payload as { value?: number } | undefined)?.value ?? 0
                    const pct = typedTotal > 0 ? Math.round((v / typedTotal) * 100) : 0
                    return `${value} (${pct}%)`
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
