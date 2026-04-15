import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Skeleton, useTranslation } from '@newwork/nw-design-system'
import { SlidersHorizontal } from 'lucide-react'
import type { BoardSummary } from '../../types'
import translations from '../../_i18n'

interface BoardsHeroActivityCardProps {
  boards: BoardSummary[]
  isLoading?: boolean
  onOpenBoard?: (id: string) => void
  'data-testid'?: string
}

type DotColor = 'golden' | 'light' | 'muted'

const DOT_STYLES: Record<DotColor, string> = {
  golden: 'gba:bg-desk-badge-golden',
  light: 'gba:bg-muted-foreground/60',
  muted: 'gba:bg-muted-foreground/30'
}

function dotForBoard(board: BoardSummary): DotColor {
  const ageMs = Date.now() - new Date(board.updatedAt).getTime()
  if (ageMs < 3600_000) return 'golden'
  if (board.isShared || board.rowCount > 100) return 'light'
  return 'muted'
}

function formatRelative(t: (key: string, args?: Record<string, unknown>) => string, dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return t('hero-activity-just-now')
  if (mins < 60) return t('hero-activity-minutes-ago', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('hero-activity-hours-ago', { count: hrs })
  const days = Math.floor(hrs / 24)
  if (days === 1) return t('hero-activity-yesterday')
  if (days < 7) return t('hero-activity-days-ago', { count: days })
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(dateString))
}

/**
 * Activity timeline on the hero — real data from boards sorted by updatedAt.
 * Matches the "What's New / What Changed" card from the IRM+ Hub screenshot.
 */
export const BoardsHeroActivityCard: React.FC<BoardsHeroActivityCardProps> = ({
  boards,
  isLoading,
  onOpenBoard,
  'data-testid': testId = 'boards-hero-activity'
}) => {
  const { t } = useTranslation(translations)
  const recentBoards = useMemo(
    () => [...boards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [boards]
  )

  return (
    <Card className="gba:h-full gba:overflow-hidden" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-sm gba:font-semibold">{t('hero-activity-title')}</CardTitle>
          <button
            className="gba:w-7 gba:h-7 gba:flex gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-accent gba:transition-colors"
            data-testid={`${testId}-filter`}
          >
            <SlidersHorizontal className="gba:w-3.5 gba:h-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="gba:pt-0">
        {isLoading && boards.length === 0 ? (
          <div className="gba:space-y-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="gba:flex gba:gap-3">
                <Skeleton className="gba:w-2.5 gba:h-2.5 gba:rounded-full gba:mt-1.5 gba:shrink-0" />
                <div className="gba:flex-1 gba:space-y-1">
                  <Skeleton className="gba:h-4 gba:w-3/4" />
                  <Skeleton className="gba:h-3 gba:w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recentBoards.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground gba:py-4">{t('hero-activity-empty')}</p>
        ) : (
          <div className="gba:space-y-0">
            {recentBoards.map((board, i) => {
              const dot = dotForBoard(board)
              return (
                <button
                  key={board.id}
                  className="gba:w-full gba:text-left gba:flex gba:gap-3 gba:py-2 gba:group gba:hover:bg-accent/30 gba:rounded-md gba:px-1 gba:transition-colors"
                  onClick={() => onOpenBoard?.(board.id)}
                  data-testid={`${testId}-item-${i}`}
                >
                  {/* Dot + vertical connector */}
                  <div className="gba:flex gba:flex-col gba:items-center gba:pt-1.5">
                    <div className={`gba:w-2.5 gba:h-2.5 gba:rounded-full gba:shrink-0 ${DOT_STYLES[dot]}`} />
                    {i < recentBoards.length - 1 && <div className="gba:w-px gba:flex-1 gba:bg-border gba:mt-1.5" />}
                  </div>
                  <div className="gba:min-w-0 gba:pb-1 gba:flex-1">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:leading-snug gba:truncate">
                      {board.name}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:leading-relaxed">
                      {board.rowCount > 0 ? `${t('hero-activity-rows', { count: board.rowCount })} · ` : ''}
                      {t('hero-activity-sheets', { count: board.sheetCount })} · {formatRelative(t, board.updatedAt)}
                      {board.isShared ? ` · ${t('hero-activity-shared')}` : ''}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BoardsHeroActivityCard
