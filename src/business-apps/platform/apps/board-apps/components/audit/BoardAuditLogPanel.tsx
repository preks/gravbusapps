import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { X, Activity, Filter } from 'lucide-react'
import type { BoardAuditLogEntry, BoardAuditAction, BoardSheet, BoardRow } from '../../types'
import { getPrimaryColumn } from '../../types'
import { BoardApiService } from '../../services/BoardApiService'
import { useAuditActorLookup } from '../../hooks/useAuditActorLookup'
import { AuditEntry, getActionMeta, type AuditRowContext } from '../row-page/RowAuditLog'
import translations from '../../_i18n'

export interface BoardAuditLogPanelProps {
  boardId: string
  boardName: string
  sheets: BoardSheet[]
  rows: BoardRow[]
  accessToken?: string
  open: boolean
  onClose: () => void
  onRowClick?: (sheetId: string, rowId: string) => void
  'data-testid'?: string
}

export const BoardAuditLogPanel: React.FC<BoardAuditLogPanelProps> = ({
  boardId,
  boardName,
  sheets,
  rows,
  accessToken,
  open,
  onClose,
  onRowClick,
  'data-testid': testId = 'board-audit-log-panel'
}) => {
  const { t } = useTranslation(translations)
  const actionMeta = getActionMeta(t)
  const actionFilterGroups: { label: string; actions: BoardAuditAction[] }[] = [
    {
      label: t('audit-filter-board'),
      actions: ['board.created', 'board.updated', 'board.deleted', 'board.shared', 'board.duplicated']
    },
    {
      label: t('audit-filter-sheet'),
      actions: ['sheet.updated']
    },
    {
      label: t('audit-filter-rows'),
      actions: ['row.created', 'row.updated', 'row.deleted', 'row.reordered', 'rows.imported']
    }
  ]
  const [entries, setEntries] = useState<BoardAuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterAction, setFilterAction] = useState<string | undefined>()
  const [showFilters, setShowFilters] = useState(false)

  const actorMap = useAuditActorLookup(entries, accessToken)

  const sheetNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sheets) map.set(s.id, s.name)
    return map
  }, [sheets])

  const rowLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const sheet of sheets) {
      const primaryCol = getPrimaryColumn(sheet.columns)
      if (!primaryCol) continue
      for (const row of rows) {
        if (map.has(row.id)) continue
        const val = row.data[primaryCol.name]
        if (val !== undefined && val !== null && val !== '') {
          map.set(row.id, String(val))
        }
      }
    }
    return map
  }, [sheets, rows])

  const buildRowContext = useCallback(
    (entry: BoardAuditLogEntry): AuditRowContext | undefined => {
      if (!entry.rowId) return undefined
      const sheetName = entry.sheetId ? sheetNameMap.get(entry.sheetId) : undefined
      const rowLabel = rowLabelMap.get(entry.rowId)
      return {
        rowLabel,
        sheetName: sheets.length > 1 ? sheetName : undefined,
        onRowClick:
          onRowClick && entry.sheetId && entry.rowId ? () => onRowClick(entry.sheetId!, entry.rowId!) : undefined
      }
    },
    [sheetNameMap, rowLabelMap, sheets.length, onRowClick]
  )

  const load = useCallback(
    async (p: number, action?: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await BoardApiService.getBoardAuditLog(boardId, {
          page: p,
          limit: 50,
          action
        })
        setEntries(p === 1 ? res.items : prev => [...prev, ...res.items])
        setTotalPages(res.totalPages)
        setPage(p)
      } catch {
        setError(t('audit-load-failed'))
      } finally {
        setIsLoading(false)
      }
    },
    [boardId, t]
  )

  useEffect(() => {
    if (open) {
      setEntries([])
      setPage(1)
      void load(1, filterAction)
    }
  }, [open, load, filterAction])

  const handleFilterChange = useCallback((action?: string) => {
    setFilterAction(action)
    setEntries([])
    setPage(1)
  }, [])

  const portalRef = useRef<HTMLDivElement | null>(null)
  if (!portalRef.current) {
    const el = document.createElement('div')
    el.id = 'board-audit-log-portal'
    document.body.appendChild(el)
    portalRef.current = el
  }
  useEffect(() => {
    return () => {
      portalRef.current?.remove()
      portalRef.current = null
    }
  }, [])

  const activeFilterLabel = useMemo(() => {
    if (!filterAction) return null
    return actionMeta[filterAction]?.label ?? filterAction
  }, [actionMeta, filterAction])

  if (!open) return null

  return createPortal(
    <>
      <style>{`
        @keyframes boardAuditSlideIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes boardAuditFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483640,
          backgroundColor: 'var(--nw-color-background)',
          opacity: 0.18,
          animation: 'boardAuditFadeIn 250ms ease-out'
        }}
        onClick={onClose}
        data-testid={`${testId}-backdrop`}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(520px, 100vw)',
          zIndex: 2147483641,
          animation: 'boardAuditSlideIn 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)'
        }}
        className="gba:bg-card gba:border-l"
        data-testid={testId}
      >
        <header className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border/40 gba:shrink-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <Activity className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <div className="gba:min-w-0">
              <h2 className="gba:text-sm gba:font-semibold gba:truncate">{t('board-activity-title')}</h2>
              <p className="gba:text-[11px] gba:text-muted-foreground gba:truncate">{boardName}</p>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <Button
              variant={showFilters ? 'secondary' : 'ghost'}
              size="icon"
              className="gba:h-7 gba:w-7"
              onClick={() => setShowFilters(v => !v)}
              data-testid={`${testId}-toggle-filters`}
            >
              <Filter className="gba:w-3.5 gba:h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="gba:h-7 gba:w-7"
              data-testid={`${testId}-close`}
            >
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </header>

        {showFilters && (
          <div className="gba:px-4 gba:py-2 gba:border-b gba:border-border/30 gba:bg-muted/20 gba:shrink-0">
            <div className="gba:flex gba:flex-wrap gba:gap-1">
              <button
                onClick={() => handleFilterChange(undefined)}
                className={[
                  'gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium gba:transition-colors gba:border',
                  !filterAction
                    ? 'gba:bg-foreground gba:text-background gba:border-foreground'
                    : 'gba:bg-transparent gba:text-muted-foreground gba:border-border/50 gba:hover:text-foreground'
                ].join(' ')}
                data-testid={`${testId}-filter-all`}
              >
                All
              </button>
              {actionFilterGroups.map(group => (
                <div key={group.label} className="gba:flex gba:items-center gba:gap-0.5">
                  <span className="gba:text-[10px] gba:text-muted-foreground/50 gba:mx-1">{group.label}:</span>
                  {group.actions.map(action => {
                    const meta = actionMeta[action]
                    if (!meta) return null
                    return (
                      <button
                        key={action}
                        onClick={() => handleFilterChange(filterAction === action ? undefined : action)}
                        className={[
                          'gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:transition-colors gba:border',
                          filterAction === action
                            ? 'gba:bg-foreground gba:text-background gba:border-foreground'
                            : 'gba:bg-transparent gba:text-muted-foreground gba:border-border/50 gba:hover:text-foreground'
                        ].join(' ')}
                        data-testid={`${testId}-filter-${action}`}
                      >
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            {activeFilterLabel && (
              <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">Showing: {activeFilterLabel} events</p>
            )}
          </div>
        )}

        <div className="gba:flex-1 gba:overflow-y-auto">
          {isLoading && entries.length === 0 ? (
            <div className="gba:flex gba:justify-center gba:py-16" data-testid={`${testId}-loading`}>
              <Spinner />
            </div>
          ) : error ? (
            <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-10">{error}</div>
          ) : entries.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16">
              <Activity className="gba:w-8 gba:h-8 gba:text-muted-foreground/30 gba:mb-3" />
              <p className="gba:text-sm gba:text-muted-foreground">{t('board-no-activity')}</p>
            </div>
          ) : (
            <div className="gba:px-4 gba:py-3">
              <ul>
                {entries.map(e => (
                  <AuditEntry
                    key={e.id}
                    entry={e}
                    actorInfo={actorMap.get(e.actorUserId)}
                    rowContext={buildRowContext(e)}
                  />
                ))}
              </ul>

              {page < totalPages && (
                <button
                  onClick={() => void load(page + 1, filterAction)}
                  disabled={isLoading}
                  className="gba:mt-3 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:w-full gba:text-center gba:py-1.5 gba:border gba:border-border/40 gba:rounded-md"
                  data-testid={`${testId}-load-more`}
                >
                  {isLoading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="gba:border-t gba:px-4 gba:py-1.5 gba:flex gba:items-center gba:justify-between gba:shrink-0 gba:bg-muted/5">
          <span className="gba:text-[11px] gba:text-muted-foreground/40">
            {entries.length > 0 ? `${entries.length}${page < totalPages ? '+' : ''} events` : ''}
          </span>
        </footer>
      </div>
    </>,
    portalRef.current
  )
}
