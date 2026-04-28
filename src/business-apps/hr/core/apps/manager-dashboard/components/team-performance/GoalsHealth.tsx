import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Progress,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Spinner
} from '@newwork/nw-design-system'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { TeamMemberPerformance, PerformanceGoal } from '../../hooks/useTeamPerformance'
import { goalStackCategory } from '../../utils/managerPerformanceGoalMetrics'

const GOALS_COLORS = {
  onTrack: 'var(--nw-color-success-500)',
  atRisk: 'var(--nw-color-warning-500)',
  behindTarget: 'var(--nw-color-danger-500)',
  achieved: 'var(--nw-color-primary-500)'
} as const

interface GoalsHealthProps {
  members: TeamMemberPerformance[]
  totalGoals: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  loading: boolean
}

interface AttentionRow {
  employeeName: string
  goal: PerformanceGoal
}

const formatDueDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

const formatStatusLabel = (status: PerformanceGoal['status']): string =>
  status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())

const computeStackCounts = (members: TeamMemberPerformance[]) => {
  let onTrack = 0
  let atRisk = 0
  let behindTarget = 0
  let achieved = 0
  for (const m of members) {
    for (const g of m.goals) {
      const cat = goalStackCategory(g)
      if (cat === 'onTrack') onTrack++
      else if (cat === 'atRisk') atRisk++
      else if (cat === 'behindTarget') behindTarget++
      else achieved++
    }
  }
  return { onTrack, atRisk, behindTarget, achieved }
}

export const GoalsHealth: React.FC<GoalsHealthProps> = ({
  members,
  totalGoals,
  goalsOnTrack,
  goalsAtRisk,
  goalsBehindTarget,
  loading
}) => {
  const stackData = [{ name: 'Team', ...computeStackCounts(members) }]

  const attentionRowsRaw: AttentionRow[] = members.flatMap(m =>
    m.goals
      .filter(g => {
        const cat = goalStackCategory(g)
        return cat === 'atRisk' || cat === 'behindTarget'
      })
      .map(g => ({
        employeeName: `${m.firstName} ${m.lastName}`.trim(),
        goal: g
      }))
  )
  attentionRowsRaw.sort((a, b) => a.goal.progressPercent - b.goal.progressPercent)
  const attentionRows = attentionRowsRaw.slice(0, 10)

  const sortedMembers = [...members].sort((a, b) => a.averageProgress - b.averageProgress)

  if (loading) {
    return (
      <Card className="gba:rounded-xl">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">Goals Health</CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:rounded-xl">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">Goals Health</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        <div
          aria-label={`${totalGoals} total goals, ${goalsOnTrack} on track, ${goalsAtRisk} at risk, ${goalsBehindTarget} behind target`}
        >
          <ResponsiveContainer width="100%" height={80}>
            <BarChart layout="vertical" data={stackData} margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="gba:stroke-muted" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide width={0} />
              <Tooltip />
              <Bar dataKey="onTrack" stackId="goals" fill={GOALS_COLORS.onTrack} name="On Track" />
              <Bar dataKey="atRisk" stackId="goals" fill={GOALS_COLORS.atRisk} name="At Risk" />
              <Bar dataKey="behindTarget" stackId="goals" fill={GOALS_COLORS.behindTarget} name="Behind Target" />
              <Bar dataKey="achieved" stackId="goals" fill={GOALS_COLORS.achieved} name="Achieved" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="gba:text-sm gba:font-semibold gba:mb-3">Goals needing attention</h4>
          {attentionRows.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">All goals on track</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="gba:text-right">Progress</TableHead>
                  <TableHead>Due date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionRows.map(({ employeeName, goal }) => (
                  <TableRow key={`${goal.id}-${employeeName}`}>
                    <TableCell className="gba:font-medium">{employeeName}</TableCell>
                    <TableCell className="gba:max-w-[200px] gba:truncate" title={goal.title}>
                      {goal.title}
                    </TableCell>
                    <TableCell>
                      {goal.status === 'AT_RISK' ? (
                        <Badge variant="warning" className="gba:text-xs">
                          {formatStatusLabel(goal.status)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gba:text-xs">
                          {formatStatusLabel(goal.status)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="gba:text-right gba:tabular-nums">{goal.progressPercent}%</TableCell>
                    <TableCell className="gba:whitespace-nowrap gba:text-muted-foreground gba:text-sm">
                      {formatDueDate(goal.dueDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div>
          <h4 className="gba:text-sm gba:font-semibold gba:mb-3">Progress by employee</h4>
          <ul className="gba:space-y-4">
            {sortedMembers.map(m => {
              const name = `${m.firstName} ${m.lastName}`.trim()
              return (
                <li key={m.employeeId}>
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:mb-1">
                    <span className="gba:text-sm gba:font-medium gba:truncate">{name}</span>
                    <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0">
                      {m.goalsOnTrack}/{m.totalGoals} goals on track
                    </span>
                  </div>
                  <Progress value={m.averageProgress} className="gba:h-2" />
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
