import React, { useMemo, useState } from 'react'
import { Card } from '@newwork/nw-design-system'
import {
  AlertTriangle,
  Clock,
  CalendarClock,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Circle
} from 'lucide-react'
import type { MyWorkResponse, MyWorkItem } from '../../types'

interface BoardsHomeActionItemsProps {
  myWork: MyWorkResponse | null
  isLoading?: boolean
  onNavigateToItem: (boardId: string, sheetId: string, rowId: string) => void
  'data-testid'?: string
}

const STATUS_DOT_COLOR: Record<string, string> = {
  destructive: 'gba:text-destructive',
  warning: 'gba:text-warning',
  success: 'gba:text-success',
  info: 'gba:text-info',
  muted: 'gba:text-muted-foreground',
  primary: 'gba:text-primary'
}

function formatDeadline(deadline?: string): string {
  if (!deadline) return ''
  const today = new Date()
  const d = new Date(deadline + 'T00:00:00')
  const diffDays = Math.round((d.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  return `In ${diffDays}d`
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
  testId
}: {
  item: MyWorkItem
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
}) {
  const dotColor = item.statusColor
    ? STATUS_DOT_COLOR[item.statusColor] || 'gba:text-muted-foreground'
    : 'gba:text-muted-foreground'
  const deadlineText = formatDeadline(item.deadline)
  const overdue = isOverdue(item.deadline)

  return (
    <button
      className="gba:w-full gba:text-left gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-md gba:hover:bg-accent/50 gba:transition-colors gba:group"
      onClick={() => onNavigate(item.boardId, item.sheetId, item.rowId)}
      data-testid={testId}
    >
      <Circle className={`gba:w-2 gba:h-2 gba:flex-shrink-0 gba:fill-current ${dotColor}`} />

      <span className="gba:text-sm gba:text-foreground gba:truncate gba:flex-1 gba:min-w-0">{item.title}</span>

      <div className="gba:flex gba:items-center gba:gap-3 gba:flex-shrink-0">
        {item.status && <span className={`gba:text-xs ${dotColor}`}>{item.status}</span>}
        <span className="gba:text-xs gba:text-muted-foreground gba:hidden gba:sm:inline gba:truncate gba:max-w-32">
          {item.boardName}
        </span>
        {deadlineText && (
          <span
            className={`gba:text-xs gba:tabular-nums gba:whitespace-nowrap ${overdue ? 'gba:text-destructive' : 'gba:text-muted-foreground'}`}
          >
            {deadlineText}
          </span>
        )}
        <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity" />
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
  testId
}: {
  section: UrgencySection
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? section.items : section.items.slice(0, MAX_VISIBLE)
  const hasMore = section.items.length > MAX_VISIBLE

  return (
    <div data-testid={`${testId}-${section.key}`}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2">
        {section.icon}
        <span className={`gba:text-xs gba:font-medium ${section.colorClass}`}>{section.title}</span>
        <span className="gba:text-xs gba:text-muted-foreground">{section.items.length}</span>
      </div>

      <div>
        {visible.map(item => (
          <TaskRow
            key={item.rowId}
            item={item}
            onNavigate={onNavigate}
            testId={`${testId}-${section.key}-${item.rowId}`}
          />
        ))}
      </div>

      {hasMore && (
        <div className="gba:px-3 gba:py-1">
          <button
            className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
            onClick={() => setShowAll(s => !s)}
            data-testid={`${testId}-${section.key}-toggle`}
          >
            {showAll ? 'Show less' : `${section.items.length - MAX_VISIBLE} more…`}
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
  const sections = useMemo<UrgencySection[]>(() => {
    if (!myWork) return []
    const all: UrgencySection[] = []

    if (myWork.overdue.length > 0) {
      all.push({
        key: 'overdue',
        title: 'Overdue',
        icon: <AlertTriangle className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />,
        items: myWork.overdue,
        colorClass: 'gba:text-destructive'
      })
    }
    if (myWork.dueToday.length > 0) {
      all.push({
        key: 'today',
        title: 'Due today',
        icon: <Clock className="gba:w-3.5 gba:h-3.5 gba:text-warning" />,
        items: myWork.dueToday,
        colorClass: 'gba:text-warning'
      })
    }
    if (myWork.dueThisWeek.length > 0) {
      all.push({
        key: 'week',
        title: 'This week',
        icon: <CalendarClock className="gba:w-3.5 gba:h-3.5 gba:text-info" />,
        items: myWork.dueThisWeek,
        colorClass: 'gba:text-info'
      })
    }
    if (myWork.upcoming.length > 0) {
      all.push({
        key: 'upcoming',
        title: 'Upcoming',
        icon: <Circle className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />,
        items: myWork.upcoming,
        colorClass: 'gba:text-muted-foreground'
      })
    }
    if (myWork.blocked.length > 0) {
      all.push({
        key: 'blocked',
        title: 'Blocked',
        icon: <ShieldAlert className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />,
        items: myWork.blocked,
        colorClass: 'gba:text-destructive'
      })
    }
    return all
  }, [myWork])

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  if (isLoading) {
    return (
      <Card className="gba:overflow-hidden" data-testid={testId}>
        <div className="gba:px-4 gba:py-3 gba:space-y-3">
          <div className="gba:h-4 gba:w-24 gba:bg-muted gba:rounded gba:animate-pulse" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2">
              <div className="gba:h-2 gba:w-2 gba:bg-muted gba:rounded-full gba:animate-pulse" />
              <div className="gba:flex-1 gba:h-3.5 gba:bg-muted gba:rounded gba:animate-pulse" />
              <div className="gba:h-3 gba:w-16 gba:bg-muted gba:rounded gba:animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (totalItems === 0 && myWork) {
    return (
      <Card className="gba:overflow-hidden" data-testid={testId}>
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-6">
          <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-success gba:flex-shrink-0" />
          <div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground">All caught up</p>
            <p className="gba:text-xs gba:text-muted-foreground">No tasks need your attention right now.</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="gba:overflow-hidden" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:pt-3 gba:pb-1">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">My Tasks</h2>
        <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">{totalItems}</span>
      </div>

      <div className="gba:pb-1">
        {sections.map((section, i) => (
          <React.Fragment key={section.key}>
            {i > 0 && <div className="gba:mx-3 gba:border-t gba:border-border" />}
            <SectionBlock section={section} onNavigate={onNavigateToItem} testId={testId} />
          </React.Fragment>
        ))}
      </div>

      {(myWork?.recentlyCompleted.length ?? 0) > 0 && (
        <CompletedSection items={myWork!.recentlyCompleted} onNavigate={onNavigateToItem} testId={testId} />
      )}
    </Card>
  )
}

function CompletedSection({
  items,
  onNavigate,
  testId
}: {
  items: MyWorkItem[]
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="gba:border-t gba:border-border" data-testid={`${testId}-completed`}>
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:text-left gba:hover:bg-accent/30 gba:transition-colors"
        onClick={() => setExpanded(e => !e)}
        data-testid={`${testId}-completed-toggle`}
      >
        <CheckCircle2 className="gba:w-3.5 gba:h-3.5 gba:text-success" />
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:flex-1">Completed</span>
        <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">{items.length}</span>
        <ChevronDown
          className={`gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:transition-transform ${expanded ? 'gba:rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="gba:pb-1">
          {items.slice(0, 5).map(item => (
            <TaskRow
              key={item.rowId}
              item={item}
              onNavigate={onNavigate}
              testId={`${testId}-completed-${item.rowId}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
