import React, { useLayoutEffect, useState } from 'react'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TeamAvailabilityData, TeamAbsenceEntry, AbsenceReasonSummary, BottleneckDay } from './types'

const CHART_COLOR_TOKENS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
] as const
const FALLBACK_CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b']

function resolveCssColor(token: string, fallback: string): string {
  if (typeof document === 'undefined' || typeof window === 'undefined') return fallback
  try {
    const el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.setProperty('background-color', token)
    el.style.setProperty('position', 'absolute')
    el.style.setProperty('visibility', 'hidden')
    el.style.setProperty('pointer-events', 'none')
    document.body.appendChild(el)
    const resolved = window.getComputedStyle(el).backgroundColor
    document.body.removeChild(el)
    return resolved && resolved !== 'rgba(0, 0, 0, 0)' && resolved !== 'transparent' ? resolved : fallback
  } catch {
    return fallback
  }
}

function formatDateRange(start: string, end: string | null | undefined): string {
  if (!end || end === start) return start
  return `${start} – ${end}`
}

export const TeamAvailabilityDisplay: React.FC<{ data: TeamAvailabilityData }> = ({ data }) => {
  const [chartColors, setChartColors] = useState<string[]>(FALLBACK_CHART_COLORS)

  useLayoutEffect(() => {
    setChartColors(CHART_COLOR_TOKENS.map((t, i) => resolveCssColor(t, FALLBACK_CHART_COLORS[i])))
  }, [])

  const dateRange = data.dateFrom && data.dateTo ? `${data.dateFrom} – ${data.dateTo}` : null
  const hasAbsences = data.absences.length > 0
  const hasReasons = data.reasonSummary.length > 0
  const hasBottlenecks = (data.bottleneckDays?.length ?? 0) > 0

  const typeIdToIndex: Record<string, number> = {}
  data.reasonSummary.forEach((r, i) => {
    if (r.typeId && typeIdToIndex[r.typeId] === undefined) typeIdToIndex[r.typeId] = i % chartColors.length
  })

  const getTypeColor = (typeId: string) => chartColors[typeIdToIndex[typeId] ?? 0] ?? chartColors[0]

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="team-availability-display">
      {(data.title || dateRange) && (
        <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          {data.title && (
            <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:bg-clip-text gba:text-transparent">
              {data.title}
            </CardTitle>
          )}
          {(data.description || dateRange) && (
            <div className="gba:mt-1 gba:space-y-0.5">
              {data.description && <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>}
              {dateRange && <p className="gba:text-xs gba:text-muted-foreground">{dateRange}</p>}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className="gba:p-6">
        {!hasAbsences && !hasReasons ? (
          <p className="gba:text-sm gba:text-muted-foreground">No absences in this period.</p>
        ) : (
          <div className="gba:space-y-8">
            {hasReasons && (
              <section className="gba:space-y-4" data-testid="team-availability-reasons">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Overview by reason</h3>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {data.reasonSummary.map((r: AbsenceReasonSummary) => (
                    <span
                      key={r.typeId}
                      className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-sm"
                      style={{
                        backgroundColor: `${getTypeColor(r.typeId)}20`,
                        color: getTypeColor(r.typeId),
                        border: `1px solid ${getTypeColor(r.typeId)}`
                      }}
                      data-testid={`team-availability-reason-${r.typeId}`}
                    >
                      <span
                        className="gba:w-2 gba:h-2 gba:rounded-full gba:shrink-0"
                        style={{ backgroundColor: getTypeColor(r.typeId) }}
                      />
                      {r.typeValue}: {r.count}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {hasAbsences && (
              <section className="gba:space-y-4" data-testid="team-availability-absences">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Absences</h3>
                <div className="gba:space-y-2">
                  {data.absences.map((a: TeamAbsenceEntry) => (
                    <div
                      key={a.id}
                      className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:py-2 gba:px-3 gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border"
                      data-testid={`team-availability-absence-${a.id}`}
                    >
                      <span className="gba:text-sm gba:font-medium gba:text-foreground gba:min-w-[8rem]">
                        {a.employeeName ?? a.employeeId}
                      </span>
                      <span className="gba:text-sm gba:text-muted-foreground">
                        {formatDateRange(a.startDate, a.endDate)}
                      </span>
                      <Badge
                        variant="secondary"
                        className="gba:shrink-0"
                        style={{
                          backgroundColor: `${getTypeColor(a.type.id)}20`,
                          color: getTypeColor(a.type.id),
                          border: `1px solid ${getTypeColor(a.type.id)}`
                        }}
                      >
                        {a.type.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasBottlenecks && data.bottleneckDays && (
              <section className="gba:space-y-4" data-testid="team-availability-bottlenecks">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Bottleneck days</h3>
                <p className="gba:text-xs gba:text-muted-foreground">Days with many team members absent</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.bottleneckDays.map((d: BottleneckDay) => ({
                      date: d.date,
                      absent: d.absentCount,
                      total: d.totalTeamSize ?? 0
                    }))}
                    margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, _name: string, props: { payload: { date: string; total: number } }) =>
                        props.payload.total
                          ? `${value} absent of ${props.payload.total} (${Math.round((value / props.payload.total) * 100)}%)`
                          : `${value} absent`
                      }
                      labelFormatter={(label: string) => `Date: ${label}`}
                    />
                    <Bar dataKey="absent" name="Absent" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
