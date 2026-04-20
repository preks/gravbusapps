import React, { useMemo, useState } from 'react'
import { Card, Badge, useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle, Clock, CalendarClock, ShieldAlert, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react'
import type { MyWorkResponse, MyWorkItem } from '../../types'
import translations from '../../_i18n'

interface BoardsHomeActionItemsProps {
  myWork: MyWorkResponse | null
  isLoading?: boolean
  onNavigateToItem: (boardId: string, sheetId: string, rowId: string) => void
  'data-testid'?: string
}

const DOT_BG: Record<string, string> = {
  destructive: 'gba:bg-desk-badge-golden',
  warning: 'gba:bg-desk-badge-golden/70',
  success: 'gba:bg-muted-foreground/50',
  info: 'gba:bg-muted-foreground/30',
  muted: 'gba:bg-muted-foreground/20',
  primary: 'gba:bg-desk-badge-golden'
}

function formatDeadline(t: (key: string, args?: Record<string, unknown>) => string, deadline?: string): string {
  if (!deadline) return ''
  const today = new Date()
  const d = new Date(deadline + 'T00:00:00')
  const diffDays = Math.round((d.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return t('home-deadline-today')
  if (diffDays === 1) return t('home-deadline-tomorrow')
  if (diffDays === -1) return t('home-deadline-yesterday')
  if (diffDays < 0) return t('home-deadline-overdue', { count: Math.abs(diffDays) })
  return t('home-deadline-in-days', { count: diffDays })
}

function isOverdue(deadline?: string): boolean {
  if (!deadline) return false
  const d = new Date(deadline + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

function TaskRow({
  item,
  onNavigate,
  testId,
  t
}: {
  item: MyWorkItem
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
  t: (key: string, args?: Record<string, unknown>) => string
}) {
  const dotBg = DOT_BG[item.statusColor || 'muted'] || 'gba:bg-muted-foreground/40'
  const deadlineText = formatDeadline(t, item.deadline)
  const overdue = isOverdue(item.deadline)

  return (
    <button
      className="gba:w-full gba:text-left gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:rounded-lg gba:hover:bg-accent gba:transition-colors gba:group"
      onClick={() => onNavigate(item.boardId, item.sheetId, item.rowId)}
      data-testid={testId}
    >
      <span className={`gba:w-1.5 gba:h-1.5 gba:rounded-full gba:flex-shrink-0 ${dotBg}`} />
      <span className="gba:text-sm gba:text-foreground gba:truncate gba:flex-1 gba:min-w-0">{item.title}</span>

      <div className="gba:flex gba:items-center gba:gap-2.5 gba:flex-shrink-0">
        <span className="gba:text-xs gba:text-muted-foreground gba:hidden gba:sm:inline gba:truncate gba:max-w-28">
          {item.boardName}
        </span>
        {deadlineText && (
          <span
            className={`gba:text-xs gba:tabular-nums gba:whitespace-nowrap ${overdue ? 'gba:text-desk-badge-golden gba:font-medium' : 'gba:text-muted-foreground'}`}
          >
            {deadlineText}
          </span>
        )}
        <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/60 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity" />
      </div>
    </button>
  )
}

interface UrgencySection {
  key: string
  title: string
  icon: React.ReactNode
  items: MyWorkItem[]
  colorClass: string
}

const MAX_VISIBLE = 10

function SectionBlock({
  section,
  onNavigate,
  testId,
  t
}: {
  section: UrgencySection
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
  t: (key: string, args?: Record<string, unknown>) => string
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? section.items : section.items.slice(0, MAX_VISIBLE)
  const hasMore = section.items.length > MAX_VISIBLE

  return (
    <div data-testid={`${testId}-${section.key}`}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-2.5 gba:bg-muted/50">
        {section.icon}
        <span className={`gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider ${section.colorClass}`}>
          {section.title}
        </span>
        <Badge
          variant="outline"
          className="gba:text-xs gba:tabular-nums gba:ml-auto gba:h-5 gba:px-1.5 gba:border-border gba:text-muted-foreground"
        >
          {section.items.length}
        </Badge>
      </div>

      <div className="gba:px-1">
        {visible.map(item => (
          <TaskRow
            key={item.rowId}
            item={item}
            onNavigate={onNavigate}
            testId={`${testId}-${section.key}-${item.rowId}`}
            t={t}
          />
        ))}
      </div>

      {hasMore && (
        <div className="gba:px-5 gba:py-1.5">
          <button
            className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:font-medium"
            onClick={() => setShowAll(s => !s)}
            data-testid={`${testId}-${section.key}-toggle`}
          >
            {showAll ? t('home-show-less') : t('home-show-more', { count: section.items.length - MAX_VISIBLE })}
          </button>
        </div>
      )}
    </div>
  )
}

export const BoardsHomeActionItems: React.FC<BoardsHomeActionItemsProps> = ({
  myWork,
  isLoading,
  onNavigateToItem,
  'data-testid': testId = 'boards-home-actions'
}) => {
  const { t } = useTranslation(translations)
  const sections = useMemo<UrgencySection[]>(() => {
    if (!myWork) return []
    const all: UrgencySection[] = []

    if (myWork.overdue.length > 0) {
      all.push({
        key: 'overdue',
        title: t('home-section-overdue'),
        icon: <AlertTriangle className="gba:w-3.5 gba:h-3.5 gba:text-desk-badge-golden" />,
        items: myWork.overdue,
        colorClass: 'gba:text-desk-badge-golden'
      })
    }
    if (myWork.dueToday.length > 0) {
      all.push({
        key: 'today',
        title: t('home-section-due-today'),
        icon: <Clock className="gba:w-3.5 gba:h-3.5 gba:text-desk-badge-golden/70" />,
        items: myWork.dueToday,
        colorClass: 'gba:text-desk-badge-golden/70'
      })
    }
    if (myWork.dueThisWeek.length > 0) {
      all.push({
        key: 'week',
        title: t('home-section-this-week'),
        icon: <CalendarClock className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />,
        items: myWork.dueThisWeek,
        colorClass: 'gba:text-muted-foreground'
      })
    }
    if (myWork.upcoming.length > 0) {
      all.push({
        key: 'upcoming',
        title: t('home-section-upcoming'),
        icon: <CalendarClock className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/70" />,
        items: myWork.upcoming,
        colorClass: 'gba:text-muted-foreground/70'
      })
    }
    if (myWork.blocked.length > 0) {
      all.push({
        key: 'blocked',
        title: t('home-section-blocked'),
        icon: <ShieldAlert className="gba:w-3.5 gba:h-3.5 gba:text-desk-badge-golden" />,
        items: myWork.blocked,
        colorClass: 'gba:text-desk-badge-golden'
      })
    }
    return all
  }, [myWork, t])

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  if (isLoading) {
    return (
      <Card className="gba:overflow-hidden" data-testid={testId}>
        <div className="gba:px-5 gba:py-4">
          <div className="gba:h-5 gba:w-28 gba:bg-muted gba:rounded gba:animate-pulse" />
        </div>
        <div className="gba:p-2 gba:space-y-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5">
              <div className="gba:h-1.5 gba:w-1.5 gba:bg-muted gba:rounded-full gba:animate-pulse" />
              <div className="gba:flex-1 gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
              <div className="gba:h-3.5 gba:w-14 gba:bg-muted gba:rounded gba:animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (totalItems === 0 && myWork) {
    return (
      <Card className="gba:overflow-hidden" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:text-center gba:px-5 gba:py-10">
          <CheckCircle2 className="gba:w-8 gba:h-8 gba:text-muted-foreground gba:mb-3" />
          <p className="gba:text-sm gba:font-semibold gba:text-foreground">{t('home-all-caught-up')}</p>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('home-no-action-items')}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="gba:overflow-hidden" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-4">
        <div className="gba:flex gba:items-center gba:gap-2.5">
          <h2 className="gba:text-base gba:font-semibold gba:text-foreground">{t('home-my-tasks')}</h2>
          <Badge variant="secondary" className="gba:text-xs gba:tabular-nums">
            {totalItems}
          </Badge>
        </div>
        <div className="gba:flex gba:items-center gba:gap-1.5">
          {(myWork?.overdue.length ?? 0) > 0 && (
            <Badge className="gba:text-xs gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground gba:border-0">
              {t('home-overdue', { count: myWork!.overdue.length })}
            </Badge>
          )}
          {(myWork?.dueToday.length ?? 0) > 0 && (
            <Badge className="gba:text-xs gba:bg-desk-badge-golden/60 gba:text-desk-badge-golden-foreground gba:border-0">
              {t('home-today', { count: myWork!.dueToday.length })}
            </Badge>
          )}
        </div>
      </div>

      <div className="gba:divide-y gba:divide-border">
        {sections.map(section => (
          <SectionBlock key={section.key} section={section} onNavigate={onNavigateToItem} testId={testId} t={t} />
        ))}
      </div>

      {(myWork?.recentlyCompleted.length ?? 0) > 0 && (
        <CompletedSection items={myWork!.recentlyCompleted} onNavigate={onNavigateToItem} testId={testId} t={t} />
      )}
    </Card>
  )
}

function CompletedSection({
  items,
  onNavigate,
  testId,
  t
}: {
  items: MyWorkItem[]
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
  t: (key: string, args?: Record<string, unknown>) => string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="gba:border-t gba:border-border" data-testid={`${testId}-completed`}>
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-3 gba:text-left gba:bg-muted/50 gba:hover:bg-muted gba:transition-colors"
        onClick={() => setExpanded(e => !e)}
        data-testid={`${testId}-completed-toggle`}
      >
        <CheckCircle2 className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
        <span className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground gba:flex-1">
          {t('home-completed')}
        </span>
        <Badge
          variant="outline"
          className="gba:text-xs gba:tabular-nums gba:h-5 gba:px-1.5 gba:border-border gba:text-muted-foreground"
        >
          {items.length}
        </Badge>
        <ChevronDown
          className={`gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:transition-transform ${expanded ? 'gba:rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="gba:px-1 gba:pb-2">
          {items.slice(0, 5).map(item => (
            <TaskRow
              key={item.rowId}
              item={item}
              onNavigate={onNavigate}
              testId={`${testId}-completed-${item.rowId}`}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}
