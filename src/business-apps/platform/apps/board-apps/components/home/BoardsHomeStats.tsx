import React, { useMemo } from 'react'
import { SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import { LayoutGrid, Rows3, AlertTriangle, Activity, Users } from 'lucide-react'
import type { BoardStatsResponse } from '../../types'

interface BoardsHomeStatsProps {
  stats: BoardStatsResponse | null
  isLoading?: boolean
  'data-testid'?: string
}

export const BoardsHomeStats: React.FC<BoardsHomeStatsProps> = ({
  stats,
  isLoading = false,
  'data-testid': testId = 'boards-home-stats'
}) => {
  const cards: KpiCardData[] = useMemo(() => {
    if (isLoading) {
      return [
        { id: 'boards', title: 'Total boards', value: 0 },
        { id: 'rows', title: 'Total rows', value: 0 },
        { id: 'overdue', title: 'Overdue items', value: 0 },
        { id: 'active', title: 'Active this week', value: 0 },
        { id: 'shared', title: 'Shared boards', value: 0 }
      ]
    }

    return [
      {
        id: 'boards',
        title: 'Total boards',
        value: stats?.totalBoards ?? 0,
        icon: <LayoutGrid className="gba:size-4" />
      },
      {
        id: 'rows',
        title: 'Total rows',
        value: stats?.totalRows ?? 0,
        icon: <Rows3 className="gba:size-4" />
      },
      {
        id: 'overdue',
        title: 'Overdue items',
        value: stats?.overdueItems ?? 0,
        icon: <AlertTriangle className="gba:size-4" />,
        trend:
          stats?.overdueItems && stats.overdueItems > 0
            ? { value: 'Needs attention', badgeVariant: 'destructive' as const, hideBadge: true }
            : undefined
      },
      {
        id: 'active',
        title: 'Active this week',
        value: stats?.activeThisWeek ?? 0,
        icon: <Activity className="gba:size-4" />
      },
      {
        id: 'shared',
        title: 'Shared boards',
        value: stats?.sharedBoards ?? 0,
        icon: <Users className="gba:size-4" />
      }
    ]
  }, [stats, isLoading])

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        Your workspace
      </h3>
      <SectionKpiCards cards={cards} className="gba:lg:grid-cols-5" />
    </section>
  )
}
