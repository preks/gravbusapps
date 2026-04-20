import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Skeleton, useTranslation } from '@newwork/nw-design-system'
import { Sparkles, TrendingUp, Users, BarChart3, FileCheck, Layers } from 'lucide-react'
import type { BoardStatsResponse, BoardSummary } from '../../types'
import translations from '../../_i18n'

interface BoardsHeroInsightCardsProps {
  stats: BoardStatsResponse | null
  myWork?: unknown
  boards: BoardSummary[]
  isLoading?: boolean
  onNavigateToItem?: (boardId: string, sheetId: string, rowId: string) => void
  'data-testid'?: string
}

/**
 * Right-column card on the hero — full-height statistics & forecast.
 * Shows a comprehensive breakdown of board data and 30-day projections.
 */
export const BoardsHeroInsightCards: React.FC<BoardsHeroInsightCardsProps> = ({
  stats,
  boards,
  isLoading,
  'data-testid': testId = 'boards-hero-insights'
}) => {
  const { t } = useTranslation(translations)
  const forecast = useMemo(() => computeForecast(t, stats, boards), [stats, boards, t])
  const breakdown = useMemo(() => computeBreakdown(t, stats, boards), [stats, boards, t])

  if (isLoading && !stats) {
    return (
      <Card className="gba:flex-1" data-testid={`${testId}-forecast`}>
        <CardContent className="gba:p-5 gba:space-y-3">
          <Skeleton className="gba:h-4 gba:w-40" />
          <div className="gba:grid gba:grid-cols-2 gba:gap-2.5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="gba:h-12 gba:rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:h-full gba:overflow-hidden gba:flex gba:flex-col" data-testid={`${testId}-forecast`}>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-sm gba:font-semibold">{t('hero-insights-title')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0 gba:flex-1 gba:flex gba:flex-col">
        {/* 30-day forecast metrics */}
        <p className="gba:text-[10px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
          {t('hero-insights-next-30-days')}
        </p>
        <div className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-2">
          {forecast.grid.map(m => (
            <MetricCell key={m.label} icon={m.icon} label={m.label} value={m.value} testId={`${testId}-m-${m.label}`} />
          ))}
        </div>

        {/* Divider */}
        <div className="gba:border-t gba:border-border/50 gba:my-3" />

        {/* Board breakdown */}
        <p className="gba:text-[10px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
          {t('hero-insights-board-breakdown')}
        </p>
        <div className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-2">
          {breakdown.map(m => (
            <MetricCell key={m.label} icon={m.icon} label={m.label} value={m.value} testId={`${testId}-b-${m.label}`} />
          ))}
        </div>

        {/* AI insight */}
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-auto gba:pt-3">
          <Sparkles className="gba:w-3 gba:h-3 gba:text-desk-badge-golden gba:shrink-0" />
          <span className="gba:text-xs gba:text-desk-badge-golden">{forecast.insight}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Helpers ── */

interface MetricItem {
  label: string
  value: string
  icon: React.ReactNode
}

function computeForecast(
  t: (key: string, args?: Record<string, unknown>) => string,
  stats: BoardStatsResponse | null,
  boards: BoardSummary[]
): { grid: MetricItem[]; insight: string } {
  const total = stats?.totalBoards ?? 0
  const active = stats?.activeThisWeek ?? 0
  const rows = stats?.totalRows ?? 0
  const shared = stats?.sharedBoards ?? 0

  const weeklyGrowth = boards.filter(b => Date.now() - new Date(b.createdAt).getTime() < 7 * 86400_000).length
  const estNewBoards = Math.max(1, weeklyGrowth * 4)
  const estNewRows = rows > 0 ? `+${Math.round((rows * 0.15) / 1000)}K` : '+0'
  const collaborationRate = total > 0 ? `${Math.round((shared / total) * 100)}%` : '0%'

  return {
    grid: [
      {
        label: t('hero-forecast-est-new-boards'),
        value: String(estNewBoards),
        icon: <TrendingUp className="gba:w-3 gba:h-3" />
      },
      { label: t('hero-forecast-expected-rows'), value: estNewRows, icon: <BarChart3 className="gba:w-3 gba:h-3" /> },
      { label: t('hero-forecast-active-boards'), value: String(active), icon: <Layers className="gba:w-3 gba:h-3" /> },
      { label: t('hero-forecast-collaboration'), value: collaborationRate, icon: <Users className="gba:w-3 gba:h-3" /> }
    ],
    insight: active >= total * 0.4 ? t('hero-insight-strong-engagement') : t('hero-insight-growth-on-track')
  }
}

function computeBreakdown(
  t: (key: string, args?: Record<string, unknown>) => string,
  stats: BoardStatsResponse | null,
  boards: BoardSummary[]
): MetricItem[] {
  const draft = stats?.boardsByStatus?.draft ?? 0
  const promoted = stats?.boardsByStatus?.promoted ?? 0
  const total = stats?.totalBoards ?? boards.length
  const totalRows = stats?.totalRows ?? 0
  const avgRows = total > 0 ? Math.round(totalRows / total) : 0
  const formattedRows = totalRows >= 1000 ? `${(totalRows / 1000).toFixed(1)}K` : String(totalRows)

  return [
    { label: t('hero-breakdown-total-rows'), value: formattedRows, icon: <BarChart3 className="gba:w-3 gba:h-3" /> },
    {
      label: t('hero-breakdown-avg-rows-per-board'),
      value: avgRows.toLocaleString(),
      icon: <Layers className="gba:w-3 gba:h-3" />
    },
    { label: t('hero-draft'), value: String(draft), icon: <FileCheck className="gba:w-3 gba:h-3" /> },
    { label: t('hero-promoted'), value: String(promoted), icon: <TrendingUp className="gba:w-3 gba:h-3" /> }
  ]
}

function MetricCell({
  icon,
  label,
  value,
  testId
}: {
  icon: React.ReactNode
  label: string
  value: string
  testId: string
}) {
  return (
    <div
      className="gba:rounded-lg gba:bg-muted/50 gba:px-3 gba:py-2 gba:flex gba:items-start gba:gap-2"
      data-testid={testId}
    >
      <span className="gba:text-muted-foreground/50 gba:mt-0.5">{icon}</span>
      <div>
        <p className="gba:text-[10px] gba:text-muted-foreground gba:leading-none gba:mb-0.5">{label}</p>
        <p className="gba:text-sm gba:font-semibold gba:text-foreground">{value}</p>
      </div>
    </div>
  )
}

export default BoardsHeroInsightCards
