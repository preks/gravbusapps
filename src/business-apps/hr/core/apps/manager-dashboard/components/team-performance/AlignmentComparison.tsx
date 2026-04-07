/* eslint-disable newwork-local/no-hardcoded-colors -- Recharts bar fills require fixed hex values per spec */
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Scale, AlertTriangle } from 'lucide-react'
import type { AlignmentGap } from '../../utils/dashboardComputations'

export interface AlignmentComparisonProps {
  gaps: AlignmentGap[]
  ratingScaleLimit: number
  loading: boolean
}

const shortEmployeeName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fullName
  if (parts.length === 1) return parts[0]
  const last = parts[parts.length - 1]
  const initial = last.charAt(0)
  return initial ? `${parts[0]} ${initial}.` : parts[0]
}

const formatScore = (v: number | null): string => {
  if (v == null) return '—'
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

const perspectiveTooltip = (
  value: number,
  key: string,
  payload: { selfRaw: number | null; peerRaw: number | null; managerRaw: number | null }
) => {
  const map: Record<string, number | null> = {
    Self: payload.selfRaw,
    Peer: payload.peerRaw,
    Manager: payload.managerRaw
  }
  const raw = map[key]
  const label = raw == null ? `${key}: —` : `${key}: ${raw % 1 === 0 ? String(raw) : raw.toFixed(1)}`
  return [label, '']
}

const gapTextClass = (gap: number): string => {
  if (gap > 1) return 'gba:text-red-600 gba:dark:text-red-400 gba:font-semibold'
  if (gap > 0.5) return 'gba:text-amber-600 gba:dark:text-amber-400 gba:font-semibold'
  return 'gba:text-green-600 gba:dark:text-green-400 gba:font-semibold'
}

export const AlignmentComparison: React.FC<AlignmentComparisonProps> = ({ gaps, ratingScaleLimit, loading }) => {
  if (loading) {
    return (
      <Card className="gba:rounded-xl">
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-5 gba:w-5 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-5 gba:w-64 gba:rounded gba:bg-muted gba:animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-8">
          <div className="gba:h-[280px] gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          <div className="gba:space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="gba:h-12 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasPerspectiveData = gaps.some(g => g.selfAvg != null || g.peerAvg != null || g.managerAvg != null)

  if (!hasPerspectiveData) {
    return (
      <Card className="gba:rounded-xl">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Scale className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
            Alignment & Perspective Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
            No perspective data available
          </p>
        </CardContent>
      </Card>
    )
  }

  const barData = gaps.map(g => ({
    name: shortEmployeeName(g.employeeName),
    self: g.selfAvg ?? 0,
    peer: g.peerAvg ?? 0,
    manager: g.managerAvg ?? 0,
    selfRaw: g.selfAvg,
    peerRaw: g.peerAvg,
    managerRaw: g.managerAvg
  }))

  return (
    <Card className="gba:rounded-xl">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
          <Scale className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          Alignment & Perspective Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Self vs peer vs manager</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="gba:stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-28} textAnchor="end" height={56} />
              <YAxis domain={[0, ratingScaleLimit]} tick={{ fontSize: 11 }} allowDecimals />
              <Tooltip
                formatter={(value: number, name: string, props: { payload?: (typeof barData)[0] }) =>
                  perspectiveTooltip(value, name, props.payload ?? ({} as (typeof barData)[0]))
                }
              />
              <Legend />
              <Bar dataKey="self" fill="#3b82f6" name="Self" />
              <Bar dataKey="peer" fill="#10b981" name="Peer" />
              <Bar dataKey="manager" fill="#f59e0b" name="Manager" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Perspective gap ranking</h3>
          <ul className="gba:list-none gba:m-0 gba:space-y-2 gba:p-0">
            {gaps.map(g => (
              <li
                key={g.employeeId}
                className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:px-3 gba:py-2"
              >
                <span className="gba:min-w-[140px] gba:text-sm gba:font-medium">{g.employeeName}</span>
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <Badge variant="outline" className="gba:gap-1 gba:border-blue-500/40 gba:bg-blue-500/10">
                    <span className="gba:size-2 gba:rounded-full gba:bg-[#3b82f6]" aria-hidden />
                    Self {formatScore(g.selfAvg)}
                  </Badge>
                  <Badge variant="outline" className="gba:gap-1 gba:border-emerald-500/40 gba:bg-emerald-500/10">
                    <span className="gba:size-2 gba:rounded-full gba:bg-[#10b981]" aria-hidden />
                    Peer {formatScore(g.peerAvg)}
                  </Badge>
                  <Badge variant="outline" className="gba:gap-1 gba:border-amber-500/40 gba:bg-amber-500/10">
                    <span className="gba:size-2 gba:rounded-full gba:bg-[#f59e0b]" aria-hidden />
                    Manager {formatScore(g.managerAvg)}
                  </Badge>
                </div>
                <div
                  className={`gba:ml-auto gba:flex gba:items-center gba:gap-1 gba:text-sm gba:tabular-nums ${gapTextClass(g.gap)}`}
                >
                  {g.gap > 1 ? <AlertTriangle className="gba:h-4 gba:w-4 gba:shrink-0" aria-hidden /> : null}
                  <span>Gap {g.gap % 1 === 0 ? String(g.gap) : g.gap.toFixed(1)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  )
}
