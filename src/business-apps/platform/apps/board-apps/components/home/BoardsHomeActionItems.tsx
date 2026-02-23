import React, { useState } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { AlertTriangle, Clock, CalendarClock, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import type { MyWorkResponse, MyWorkItem } from '../../types'

interface BoardsHomeActionItemsProps {
  myWork: MyWorkResponse | null
  isLoading?: boolean
  onNavigateToItem: (boardId: string, sheetId: string, rowId: string) => void
  'data-testid'?: string
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

const STATUS_VARIANT_MAP: Record<string, 'destructive' | 'warning' | 'success' | 'info' | 'offline' | 'default'> = {
  destructive: 'destructive',
  warning: 'warning',
  success: 'success',
  info: 'info',
  muted: 'offline',
  primary: 'default'
}

function ItemCard({
  item,
  accent,
  onNavigate,
  testId
}: {
  item: MyWorkItem
  accent: string
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
}) {
  const badgeVariant = item.statusColor ? STATUS_VARIANT_MAP[item.statusColor] || 'default' : 'default'

  return (
    <button
      className={`gba:w-full gba:text-left gba:rounded-lg gba:bg-background gba:p-3 gba:border-l-2 ${accent} gba:hover:bg-muted/50 gba:transition-colors`}
      onClick={() => onNavigate(item.boardId, item.sheetId, item.rowId)}
      data-testid={testId}
    >
      <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mb-0.5">
        {item.boardName} &middot; {item.sheetName}
      </p>
      <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{item.title}</p>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1.5">
        {item.status && (
          <Badge variant={badgeVariant} className="gba:text-xs">
            {item.status}
          </Badge>
        )}
        {item.deadline && (
          <span className="gba:text-xs gba:text-muted-foreground">{formatDeadline(item.deadline)}</span>
        )}
      </div>
    </button>
  )
}

function ItemColumn({
  title,
  icon,
  items,
  accent,
  badgeVariant,
  onNavigate,
  testId
}: {
  title: string
  icon: React.ReactNode
  items: MyWorkItem[]
  accent: string
  badgeVariant: 'destructive' | 'warning' | 'info'
  onNavigate: (boardId: string, sheetId: string, rowId: string) => void
  testId: string
}) {
  return (
    <div data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        {icon}
        <span className="gba:text-sm gba:font-medium gba:text-foreground">{title}</span>
        {items.length > 0 && (
          <Badge variant={badgeVariant} className="gba:text-xs">
            {items.length}
          </Badge>
        )}
      </div>
      {items.length === 0 ? (
        <p className="gba:text-xs gba:text-muted-foreground gba:py-4 gba:text-center">None</p>
      ) : (
        <div className="gba:space-y-2">
          {items.slice(0, 5).map(item => (
            <ItemCard
              key={item.rowId}
              item={item}
              accent={accent}
              onNavigate={onNavigate}
              testId={`${testId}-item-${item.rowId}`}
            />
          ))}
          {items.length > 5 && (
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:pt-1">+{items.length - 5} more</p>
          )}
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
  const [expanded, setExpanded] = useState(true)
  const totalItems =
    (myWork?.overdue.length ?? 0) +
    (myWork?.dueToday.length ?? 0) +
    (myWork?.dueThisWeek.length ?? 0) +
    (myWork?.blocked.length ?? 0)

  if (isLoading) {
    return (
      <section className="gba:rounded-xl gba:bg-card gba:p-6" data-testid={testId}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <div className="gba:h-4 gba:w-4 gba:bg-muted/50 gba:rounded gba:animate-pulse" />
          <div className="gba:h-4 gba:w-32 gba:bg-muted/50 gba:rounded gba:animate-pulse" />
        </div>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="gba:space-y-2">
              <div className="gba:h-3 gba:w-20 gba:bg-muted/50 gba:rounded gba:animate-pulse" />
              <div className="gba:h-16 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse" />
              <div className="gba:h-16 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (totalItems === 0 && myWork) {
    return (
      <section className="gba:rounded-xl gba:bg-card gba:p-6" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:py-4">
          <CheckCircle2 className="gba:w-8 gba:h-8 gba:text-success gba:mb-2" />
          <p className="gba:text-sm gba:font-medium gba:text-foreground">All caught up!</p>
          <p className="gba:text-xs gba:text-muted-foreground">No items need your attention right now.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="gba:rounded-xl gba:bg-card gba:p-6" data-testid={testId}>
      <Button
        variant="ghost"
        size="sm"
        className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-0 gba:mb-3"
        onClick={() => setExpanded(e => !e)}
        data-testid={`${testId}-toggle`}
      >
        <span className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
            Action required
          </span>
          {totalItems > 0 && (
            <Badge variant="destructive" className="gba:text-xs">
              {totalItems}
            </Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="gba:w-4 gba:h-4" /> : <ChevronDown className="gba:w-4 gba:h-4" />}
      </Button>

      {expanded && (
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
          <ItemColumn
            title="Overdue"
            icon={<AlertTriangle className="gba:w-4 gba:h-4 gba:text-destructive" />}
            items={myWork?.overdue ?? []}
            accent="gba:border-destructive"
            badgeVariant="destructive"
            onNavigate={onNavigateToItem}
            testId={`${testId}-overdue`}
          />
          <ItemColumn
            title="Due today"
            icon={<Clock className="gba:w-4 gba:h-4 gba:text-warning" />}
            items={myWork?.dueToday ?? []}
            accent="gba:border-warning"
            badgeVariant="warning"
            onNavigate={onNavigateToItem}
            testId={`${testId}-today`}
          />
          <ItemColumn
            title="This week"
            icon={<CalendarClock className="gba:w-4 gba:h-4 gba:text-info" />}
            items={myWork?.dueThisWeek ?? []}
            accent="gba:border-info"
            badgeVariant="info"
            onNavigate={onNavigateToItem}
            testId={`${testId}-week`}
          />
        </div>
      )}

      {expanded && (myWork?.blocked.length ?? 0) > 0 && (
        <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <ShieldAlert className="gba:w-4 gba:h-4 gba:text-destructive-secondary" />
            <span className="gba:text-sm gba:font-medium gba:text-foreground">Blocked</span>
            <Badge variant="destructive" className="gba:text-xs">
              {myWork!.blocked.length}
            </Badge>
          </div>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-2">
            {myWork!.blocked.slice(0, 3).map(item => (
              <ItemCard
                key={item.rowId}
                item={item}
                accent="gba:border-destructive-secondary"
                onNavigate={onNavigateToItem}
                testId={`${testId}-blocked-${item.rowId}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
