import React, { useMemo } from 'react'
import { SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import type { BoardStatsResponse, BoardSummary } from '../../types'

interface BoardsHomeStatsProps {
  stats: BoardStatsResponse | null
  boards: BoardSummary[]
  isLoading?: boolean
  'data-testid'?: string
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function boardsGrowthTrend(boards: BoardSummary[]) {
  const now = Date.now()
  const thisWeek = boards.filter(b => now - new Date(b.createdAt).getTime() < WEEK_MS).length
  const lastWeek = boards.filter(b => {
    const age = now - new Date(b.createdAt).getTime()
    return age >= WEEK_MS && age < WEEK_MS * 2
  }).length

  if (lastWeek === 0 && thisWeek === 0) return { value: 'No change', positive: true, description: 'Stable this period' }
  if (lastWeek === 0) return { value: `+${thisWeek}`, positive: true, description: `${thisWeek} created this week` }

  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return {
    value: `${pct >= 0 ? '+' : ''}${pct}%`,
    positive: pct >= 0,
    description: `${thisWeek} vs ${lastWeek} last week`
  }
}

function rowsDensityTrend(totalRows: number, boardCount: number) {
  if (boardCount === 0) return { value: '--', positive: true, description: 'No boards yet' }
  const avg = Math.round(totalRows / boardCount)
  return { value: `~${avg.toLocaleString()}/board`, positive: true, description: `Across ${boardCount} boards` }
}

function overdueTrend(count: number) {
  if (count === 0) return { value: 'All clear', positive: true, description: 'No overdue items' }
  return { value: `${count} pending`, positive: false, description: 'Needs attention' }
}

function engagementTrend(active: number, total: number) {
  if (total === 0) return { value: '0%', positive: true, description: 'No boards yet' }
  const pct = Math.round((active / total) * 100)
  return { value: `${pct}%`, positive: pct >= 40, description: `${active} of ${total} boards active` }
}

function collaborationTrend(shared: number, total: number) {
  if (total === 0) return { value: '0%', positive: true, description: 'No boards yet' }
  const pct = Math.round((shared / total) * 100)
  return { value: `${pct}%`, positive: true, description: `${shared} of ${total} boards shared` }
}

export const BoardsHomeStats: React.FC<BoardsHomeStatsProps> = ({
  stats,
  boards,
  isLoading = false,
  'data-testid': testId = 'boards-home-stats'
}) => {
  const cards: KpiCardData[] = useMemo(() => {
    if (isLoading || !stats) {
      return [
        { id: 'boards', title: 'Total boards', value: 0 },
        { id: 'rows', title: 'Total rows', value: 0 },
        { id: 'overdue', title: 'Overdue items', value: 0 },
        { id: 'active', title: 'Active this week', value: 0 },
        { id: 'shared', title: 'Shared boards', value: 0 }
      ]
    }

    return [
      { id: 'boards', title: 'Total boards', value: stats.totalBoards, trend: boardsGrowthTrend(boards) },
      {
        id: 'rows',
        title: 'Total rows',
        value: stats.totalRows,
        trend: rowsDensityTrend(stats.totalRows, boards.length)
      },
      { id: 'overdue', title: 'Overdue items', value: stats.overdueItems, trend: overdueTrend(stats.overdueItems) },
      {
        id: 'active',
        title: 'Active this week',
        value: stats.activeThisWeek,
        trend: engagementTrend(stats.activeThisWeek, stats.totalBoards)
      },
      {
        id: 'shared',
        title: 'Shared boards',
        value: stats.sharedBoards,
        trend: collaborationTrend(stats.sharedBoards, stats.totalBoards)
      }
    ]
  }, [stats, boards, isLoading])

  return (
    <section data-testid={testId}>
      <SectionKpiCards cards={cards} className="gba:lg:grid-cols-5" />
    </section>
  )
}
