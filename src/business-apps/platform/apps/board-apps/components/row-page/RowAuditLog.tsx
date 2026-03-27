import React, { useEffect, useState, useCallback } from 'react'
import { Avatar, AvatarImage, AvatarFallback, Spinner } from '@newwork/nw-design-system'
import { Plus, Pencil, Trash2, ArrowUpDown, Download, LayoutGrid, Settings, Share2, Copy } from 'lucide-react'
import type { BoardAuditLogEntry, BoardAuditChange } from '../../types'
import { BoardApiService } from '../../services/BoardApiService'
import { useAuditActorLookup, type ActorInfo } from '../../hooks/useAuditActorLookup'
import { formatDistanceToNow } from 'date-fns'

interface RowAuditLogProps {
  boardId: string
  sheetId: string
  rowId: string
  accessToken?: string
  'data-testid'?: string
}

export const ACTION_META: Record<
  string,
  { label: string; Icon: React.FC<{ className?: string }>; colorClass: string }
> = {
  'row.created': { label: 'Created', Icon: Plus, colorClass: 'gba:text-emerald-500' },
  'row.updated': { label: 'Updated', Icon: Pencil, colorClass: 'gba:text-blue-500' },
  'row.deleted': { label: 'Deleted', Icon: Trash2, colorClass: 'gba:text-destructive' },
  'row.reordered': { label: 'Reordered', Icon: ArrowUpDown, colorClass: 'gba:text-muted-foreground' },
  'rows.imported': { label: 'Imported', Icon: Download, colorClass: 'gba:text-purple-500' },
  'sheet.updated': { label: 'Sheet updated', Icon: LayoutGrid, colorClass: 'gba:text-muted-foreground' },
  'board.created': { label: 'Board created', Icon: Plus, colorClass: 'gba:text-emerald-500' },
  'board.updated': { label: 'Board updated', Icon: Settings, colorClass: 'gba:text-muted-foreground' },
  'board.deleted': { label: 'Board deleted', Icon: Trash2, colorClass: 'gba:text-destructive' },
  'board.shared': { label: 'Shared', Icon: Share2, colorClass: 'gba:text-blue-500' },
  'board.duplicated': { label: 'Duplicated', Icon: Copy, colorClass: 'gba:text-muted-foreground' }
}

export function formatAuditValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

export function ChangeList({ changes }: { changes: BoardAuditChange[] }) {
  return (
    <ul className="gba:mt-1.5 gba:space-y-1">
      {changes.map((c, i) => (
        <li key={`${c.field}-${i}`} className="gba:flex gba:items-start gba:gap-1.5 gba:text-xs">
          <span
            className="gba:font-medium gba:text-foreground/70 gba:shrink-0 gba:min-w-[80px] gba:truncate"
            title={c.field}
          >
            {c.field}
          </span>
          <span
            className="gba:text-muted-foreground gba:line-through gba:truncate gba:max-w-[120px]"
            title={formatAuditValue(c.oldValue)}
          >
            {formatAuditValue(c.oldValue)}
          </span>
          <span className="gba:text-muted-foreground gba:shrink-0">→</span>
          <span className="gba:text-foreground/80 gba:truncate gba:max-w-[120px]" title={formatAuditValue(c.newValue)}>
            {formatAuditValue(c.newValue)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export interface AuditRowContext {
  rowLabel?: string
  sheetName?: string
  onRowClick?: () => void
}

export function AuditEntry({
  entry,
  actorInfo,
  rowContext
}: {
  entry: BoardAuditLogEntry
  actorInfo?: ActorInfo
  rowContext?: AuditRowContext
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = ACTION_META[entry.action] ?? {
    label: entry.action,
    Icon: Settings,
    colorClass: 'gba:text-muted-foreground'
  }
  const { Icon, colorClass } = meta
  const hasChanges = entry.changes && entry.changes.length > 0
  const actorName = actorInfo?.displayName ?? entry.actorName ?? entry.actorUserId.slice(0, 8)
  const timeAgo = formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })

  const isRowAction = entry.action.startsWith('row.') || entry.action === 'rows.imported'
  const showRowContext = isRowAction && rowContext && (rowContext.rowLabel || entry.rowId)
  const rowDisplayLabel = rowContext?.rowLabel || (entry.rowId ? `Row ${entry.rowId.slice(0, 8)}…` : null)

  const metaDescription = entry.metadata?.description as string | undefined
  const metaImportCount = entry.metadata?.count as number | undefined
  const metaImportMode = entry.metadata?.mode as string | undefined

  const contextLine = (() => {
    if (entry.action === 'rows.imported' && metaImportCount) {
      return `${metaImportCount} rows (${metaImportMode || 'append'})`
    }
    if (metaDescription) return metaDescription
    return null
  })()

  return (
    <li className="gba:flex gba:gap-3 gba:py-2.5 gba:border-b gba:border-border/30 last:gba:border-0">
      <div className="gba:mt-0.5 gba:shrink-0">
        <Avatar className="gba:h-6 gba:w-6">
          {actorInfo?.avatar && <AvatarImage src={actorInfo.avatar} alt={actorName} />}
          <AvatarFallback className="gba:text-[10px] gba:font-medium">{getInitials(actorName)}</AvatarFallback>
        </Avatar>
      </div>

      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
          <span className="gba:text-xs gba:font-medium gba:text-foreground/80">{actorName}</span>
          <div className={`gba:flex gba:items-center gba:gap-0.5 ${colorClass}`}>
            <Icon className="gba:w-3 gba:h-3" />
            <span className="gba:text-xs">{meta.label.toLowerCase()}</span>
          </div>
          <span className="gba:text-[11px] gba:text-muted-foreground/50 gba:ml-auto gba:shrink-0">{timeAgo}</span>
        </div>

        {contextLine && (
          <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-0.5 gba:leading-snug">{contextLine}</p>
        )}

        {showRowContext && (
          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-0.5">
            {rowContext?.sheetName && (
              <span className="gba:text-[11px] gba:text-muted-foreground/60">{rowContext.sheetName} ›</span>
            )}
            {rowContext?.onRowClick ? (
              <button
                onClick={rowContext.onRowClick}
                className="gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline gba:truncate gba:max-w-[260px]"
                title={rowDisplayLabel ?? undefined}
                data-testid="audit-row-link"
              >
                {rowDisplayLabel}
              </button>
            ) : (
              <span
                className="gba:text-[11px] gba:font-medium gba:text-foreground/60 gba:truncate gba:max-w-[260px]"
                title={rowDisplayLabel ?? undefined}
              >
                {rowDisplayLabel}
              </span>
            )}
          </div>
        )}

        {hasChanges && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:mt-0.5 gba:transition-colors"
            data-testid="audit-toggle-changes"
          >
            {expanded
              ? 'Hide changes'
              : `${entry.changes!.length} field${entry.changes!.length !== 1 ? 's' : ''} changed`}
          </button>
        )}

        {hasChanges && expanded && <ChangeList changes={entry.changes!} />}
      </div>
    </li>
  )
}

export const RowAuditLog: React.FC<RowAuditLogProps> = ({
  boardId,
  sheetId,
  rowId,
  accessToken,
  'data-testid': testId = 'row-audit-log'
}) => {
  const [entries, setEntries] = useState<BoardAuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const actorMap = useAuditActorLookup(entries, accessToken)

  const load = useCallback(
    async (p: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await BoardApiService.getRowAuditLog(boardId, sheetId, rowId, p, 50)
        setEntries(p === 1 ? res.items : prev => [...prev, ...res.items])
        setTotalPages(res.totalPages)
        setPage(p)
      } catch {
        setError('Could not load activity.')
      } finally {
        setIsLoading(false)
      }
    },
    [boardId, sheetId, rowId]
  )

  useEffect(() => {
    void load(1)
  }, [load])

  if (isLoading && entries.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12" data-testid={testId}>
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-10" data-testid={testId}>
        {error}
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-10" data-testid={testId}>
        No activity yet.
      </div>
    )
  }

  return (
    <div className="gba:px-6 gba:py-4" data-testid={testId}>
      <ul>
        {entries.map(e => (
          <AuditEntry key={e.id} entry={e} actorInfo={actorMap.get(e.actorUserId)} />
        ))}
      </ul>

      {page < totalPages && (
        <button
          onClick={() => void load(page + 1)}
          disabled={isLoading}
          className="gba:mt-3 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:w-full gba:text-center gba:py-1.5 gba:border gba:border-border/40 gba:rounded-md"
          data-testid={`${testId}-load-more`}
        >
          {isLoading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
