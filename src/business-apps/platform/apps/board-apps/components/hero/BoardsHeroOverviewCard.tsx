import React, { useMemo } from 'react'
import { Badge, Skeleton } from '@newwork/nw-design-system'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { BoardStatsResponse, BoardSummary } from '../../types'

interface BoardsHeroOverviewCardProps {
  stats: BoardStatsResponse | null
  boards: BoardSummary[]
  isLoading?: boolean
  'data-testid'?: string
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function computeGrowth(boards: BoardSummary[]) {
  const now = Date.now()
  const thisWeek = boards.filter(b => now - new Date(b.createdAt).getTime() < WEEK_MS).length
  const lastWeek = boards.filter(b => {
    const age = now - new Date(b.createdAt).getTime()
    return age >= WEEK_MS && age < WEEK_MS * 2
  }).length
  if (lastWeek === 0 && thisWeek === 0) return { label: 'Stable', pct: 0, positive: true }
  if (lastWeek === 0) return { label: `+${thisWeek} new`, pct: 100, positive: true }
  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return { label: `${pct >= 0 ? '+' : ''}${pct}% WoW`, pct, positive: pct >= 0 }
}

function buildSparkline(boards: BoardSummary[]) {
  const now = Date.now()
  const weeks = 12
  return Array.from({ length: weeks }, (_, i) => {
    const cutoff = now - (weeks - 1 - i) * WEEK_MS
    return { v: boards.filter(b => new Date(b.createdAt).getTime() <= cutoff).length }
  })
}

export const BoardsHeroOverviewCard: React.FC<BoardsHeroOverviewCardProps> = ({
  stats,
  boards,
  isLoading,
  'data-testid': testId = 'boards-hero-overview'
}) => {
  const growth = useMemo(() => computeGrowth(boards), [boards])
  const sparkline = useMemo(() => buildSparkline(boards), [boards])
  const totalRows = stats?.totalRows ?? 0

  const kpiPairs: Array<[KpiDatum, KpiDatum]> = [
    [
      { label: 'Total Rows', value: totalRows >= 1000 ? `${(totalRows / 1000).toFixed(1)}K` : String(totalRows) },
      { label: 'Active This Week', value: String(stats?.activeThisWeek ?? 0) }
    ],
    [
      { label: 'Shared Boards', value: String(stats?.sharedBoards ?? 0) },
      { label: 'Overdue Items', value: String(stats?.overdueItems ?? 0) }
    ],
    [
      { label: 'Draft', value: String(stats?.boardsByStatus?.draft ?? 0) },
      { label: 'Promoted', value: String(stats?.boardsByStatus?.promoted ?? 0) }
    ]
  ]

  if (isLoading && !stats) {
    return (
      <div
        className="gba:rounded-xl gba:bg-card-decorative gba:border gba:border-white/10 gba:p-5 gba:space-y-4 gba:h-full"
        data-testid={testId}
      >
        <Skeleton className="gba:h-4 gba:w-28 gba:bg-white/15" />
        <Skeleton className="gba:h-10 gba:w-16 gba:bg-white/15" />
        <Skeleton className="gba:h-12 gba:w-full gba:bg-white/10" />
        <div className="gba:space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="gba:grid gba:grid-cols-2 gba:gap-4">
              <Skeleton className="gba:h-8 gba:bg-white/10" />
              <Skeleton className="gba:h-8 gba:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:rounded-xl gba:bg-card-decorative gba:border gba:border-white/10 gba:p-5 gba:h-full"
      data-testid={testId}
    >
      <h3 className="gba:text-sm gba:font-semibold gba:text-white gba:mb-4">Board Overview</h3>

      {/* Primary metric row */}
      <div className="gba:mb-1">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
          <span className="gba:text-xs gba:text-white/50">Total Boards</span>
          <Badge variant="outline" size="xs" className="gba:bg-white/10 gba:text-white/60 gba:border-white/15">
            All time
          </Badge>
        </div>
        <p className="gba:text-4xl gba:font-bold gba:text-white gba:tracking-tight">{stats?.totalBoards ?? 0}</p>
        <span className="gba:inline-flex gba:items-center gba:mt-1.5 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-semibold gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground">
          {growth.positive ? '↑' : '↓'} {growth.label}
        </span>
      </div>

      {/* Sparkline */}
      <div className="gba:h-12 gba:my-3 gba:-mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkline}>
            <Line type="monotone" dataKey="v" stroke="var(--desk-badge-golden)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* KPI grid */}
      <div className="gba:space-y-3 gba:pt-2 gba:border-t gba:border-white/10">
        {kpiPairs.map(([left, right], i) => (
          <div key={i} className="gba:grid gba:grid-cols-2 gba:gap-x-6">
            <KpiCell label={left.label} value={left.value} testId={`${testId}-kpi-${i}-l`} />
            <KpiCell label={right.label} value={right.value} testId={`${testId}-kpi-${i}-r`} />
          </div>
        ))}
      </div>

      <p className="gba:text-xs gba:text-white/40 gba:mt-4 gba:italic">
        {(stats?.overdueItems ?? 0) === 0
          ? 'All boards performing on track'
          : `${stats!.overdueItems} items need attention`}
      </p>
    </div>
  )
}

type KpiDatum = { label: string; value: string }

function KpiCell({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div data-testid={testId}>
      <p className="gba:text-[10px] gba:text-white/40 gba:leading-none gba:mb-0.5">{label}</p>
      <p className="gba:text-sm gba:font-semibold gba:text-white">{value}</p>
    </div>
  )
}

export default BoardsHeroOverviewCard
