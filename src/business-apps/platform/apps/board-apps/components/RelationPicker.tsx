/**
 * RelationPicker - inline combobox for linking rows from another board.
 * Renders the dropdown in a portal so it isn't clipped by table cell overflow.
 */

import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '@newwork/nw-design-system'
import { X, Check } from 'lucide-react'
import type { BoardRow, BoardColumn, RelationConfig } from '../types'
import { BoardApiService } from '../services/BoardApiService'

export interface RelationItemStatus {
  value: string
  label: string
  colorToken: string
}

export interface RelationPickerProps {
  config: RelationConfig
  selectedIds: string[]
  onChange: (ids: string[], labels: string[], statuses: Array<RelationItemStatus | null>) => void
  onPeek?: (targetBoardId: string, targetRowId: string) => void
  'data-testid'?: string
}

export const RelationPicker: React.FC<RelationPickerProps> = ({
  config,
  selectedIds,
  onChange,
  'data-testid': testId = 'relation-picker'
}) => {
  const [search, setSearch] = useState('')
  const [allRows, setAllRows] = useState<BoardRow[]>([])
  const [filtered, setFiltered] = useState<BoardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hlIdx, setHlIdx] = useState(-1)
  const [local, setLocal] = useState<string[]>(selectedIds)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRef = useRef(false)
  const localRef = useRef(local)
  localRef.current = local

  const [statusCol, setStatusCol] = useState<BoardColumn | null>(null)

  const displayColumn = config.displayColumn || 'name'
  const primaryFallbacks = ['name', 'title', 'displayName', 'label', 'subject']

  const getRowLabel = useCallback(
    (row: Pick<BoardRow, 'id' | 'data'>): string => {
      if (row.data[displayColumn]) return String(row.data[displayColumn])
      for (const key of primaryFallbacks) {
        if (key !== displayColumn && row.data[key]) return String(row.data[key])
      }
      const firstText = Object.values(row.data).find(v => typeof v === 'string' && v.length > 0)
      return firstText ? String(firstText) : row.id.slice(0, 8)
    },
    [displayColumn]
  )

  const getRowStatus = useCallback(
    (row: Pick<BoardRow, 'id' | 'data'>): RelationItemStatus | null => {
      if (!statusCol) return null
      const val = row.data[statusCol.name]
      if (!val) return null
      const opt = statusCol.selectOptions?.find(o => o.value === String(val))
      return opt
        ? { value: opt.value, label: opt.label, colorToken: opt.colorToken || 'muted' }
        : { value: String(val), label: String(val), colorToken: 'muted' }
    },
    [statusCol]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const fetchRows = BoardApiService.getRows(config.targetAppId, config.targetSheetId, { limit: 200 })
    const fetchSheet = BoardApiService.getSheet(config.targetAppId, config.targetSheetId)
    Promise.all([fetchRows, fetchSheet])
      .then(([rowsRes, sheet]) => {
        if (cancelled) return
        setAllRows(rowsRes.items)
        setFiltered(rowsRes.items)
        if (sheet) {
          const sc = sheet.columns.find(c => c.type === 'status') || sheet.columns.find(c => c.type === 'priority')
          if (sc) setStatusCol(sc)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllRows([])
          setFiltered([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [config.targetAppId, config.targetSheetId])

  useEffect(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      setFiltered(allRows)
      return
    }
    setFiltered(
      allRows.filter(r => {
        const label = getRowLabel(r).toLowerCase()
        const dataStr = JSON.stringify(r.data).toLowerCase()
        return label.includes(term) || dataStr.includes(term)
      })
    )
  }, [search, allRows, getRowLabel])

  useEffect(() => {
    setHlIdx(-1)
  }, [filtered.length, search])

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      if (blurRef.current) clearTimeout(blurRef.current)
    }
  }, [])

  const isMulti = config.cardinality !== 'one-to-one'

  const toggle = useCallback(
    (row: BoardRow) => {
      setLocal(prev => {
        if (prev.includes(row.id)) return prev.filter(id => id !== row.id)
        return isMulti ? [...prev, row.id] : [row.id]
      })
    },
    [isMulti]
  )

  const save = useCallback(() => {
    if (savedRef.current) return
    savedRef.current = true
    if (blurRef.current) {
      clearTimeout(blurRef.current)
      blurRef.current = null
    }
    const ids = localRef.current
    const labels = ids.map(id => {
      const row = allRows.find(r => r.id === id)
      return row ? getRowLabel(row) : id.slice(0, 8)
    })
    const statuses = ids.map(id => {
      const row = allRows.find(r => r.id === id)
      return row ? getRowStatus(row) : null
    })
    onChange(ids, labels, statuses)
  }, [onChange, allRows, getRowLabel, getRowStatus])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHlIdx(p => (filtered.length === 0 ? -1 : p + 1 >= filtered.length ? 0 : p + 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHlIdx(p => (filtered.length === 0 ? -1 : p <= 0 ? filtered.length - 1 : p - 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (hlIdx >= 0 && hlIdx < filtered.length) {
          toggle(filtered[hlIdx])
        } else {
          save()
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        save()
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        save()
      }
    },
    [hlIdx, filtered, toggle, save]
  )

  const handleBlur = useCallback(() => {
    blurRef.current = setTimeout(() => save(), 150)
  }, [save])

  const handleItemClick = useCallback(
    (row: BoardRow) => {
      if (blurRef.current) clearTimeout(blurRef.current)
      toggle(row)
      inputRef.current?.focus()
    },
    [toggle]
  )

  const handleRemove = useCallback((id: string) => {
    if (blurRef.current) clearTimeout(blurRef.current)
    setLocal(prev => prev.filter(i => i !== id))
    inputRef.current?.focus()
  }, [])

  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 260) })
  }, [local, search])

  const selectedRows = local.map(id => {
    const found = allRows.find(r => r.id === id)
    return found || ({ id, data: {} } as Pick<BoardRow, 'id' | 'data'>)
  })

  return (
    <div ref={containerRef} data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:min-h-6 gba:py-0.5">
        {selectedRows.map(row => (
          <Badge key={row.id} variant="secondary" className="gba:text-[10px] gba:gap-0.5 gba:pr-0.5 gba:py-0">
            {getRowLabel(row)}
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleRemove(row.id)}
              className="gba:p-0 gba:border-0 gba:bg-transparent gba:cursor-pointer gba:rounded gba:hover:bg-muted"
            >
              <X className="gba:w-2.5 gba:h-2.5" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={local.length === 0 ? 'Search rows to link...' : 'Add...'}
          className="gba:flex-1 gba:min-w-16 gba:h-5 gba:text-xs gba:bg-transparent gba:outline-none gba:border-0 gba:p-0"
          data-testid={`${testId}-search`}
        />
      </div>
      {dropPos &&
        createPortal(
          <div
            className="gba:fixed gba:z-[9999] gba:rounded-md gba:border gba:border-border gba:bg-popover gba:shadow-md gba:overflow-hidden"
            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
          >
            {loading && <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-3">Loading...</p>}
            {!loading && filtered.length === 0 && (
              <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-3">
                {search ? 'No matching rows' : 'No rows in target board'}
              </p>
            )}
            {!loading && filtered.length > 0 && (
              <div className="gba:overflow-y-auto gba:max-h-48">
                {filtered.map((row, i) => {
                  const isLinked = local.includes(row.id)
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleItemClick(row)}
                      className={`gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:text-xs gba:cursor-pointer gba:border-0 gba:flex gba:items-center gba:justify-between gba:gap-2 ${
                        i === hlIdx
                          ? 'gba:bg-accent gba:text-accent-foreground'
                          : 'gba:bg-transparent gba:hover:bg-muted'
                      }`}
                      data-testid={`${testId}-result-${row.id}`}
                    >
                      <span className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
                        <span className="gba:truncate">{getRowLabel(row)}</span>
                        {(() => {
                          const st = getRowStatus(row)
                          if (!st) return null
                          const TC: Record<string, string> = {
                            primary: 'gba:bg-primary/15 gba:text-primary',
                            success: 'gba:bg-success-secondary gba:text-success-secondary-foreground',
                            info: 'gba:bg-info-secondary gba:text-info-secondary-foreground',
                            warning: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground',
                            destructive: 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground',
                            muted: 'gba:bg-muted gba:text-muted-foreground'
                          }
                          return (
                            <span
                              className={`gba:inline-block gba:px-1 gba:py-0 gba:rounded gba:text-[10px] gba:font-medium gba:shrink-0 ${TC[st.colorToken] || TC.muted}`}
                            >
                              {st.label}
                            </span>
                          )
                        })()}
                      </span>
                      {isLinked && <Check className="gba:w-3 gba:h-3 gba:shrink-0 gba:text-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="gba:px-2 gba:py-1 gba:border-t gba:border-border gba:text-[10px] gba:text-muted-foreground">
              {local.length} linked · Enter to save · ↑↓ to navigate
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
