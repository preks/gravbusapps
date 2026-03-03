import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Spinner } from '@newwork/nw-design-system'
import { Search, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react'
import { useBoardSearch, type SearchResult } from '../../hooks/useBoardSearch'
import type { BoardColumn } from '../../types'
import { SearchResultItem } from './SearchResultItem'

export interface BoardSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  boardId: string
  sheetId?: string
  columns?: BoardColumn[]
  onSelectResult?: (result: SearchResult) => void
  'data-testid'?: string
}

export const BoardSearchDialog: React.FC<BoardSearchDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  boardId,
  sheetId,
  columns,
  onSelectResult,
  'data-testid': testId = 'board-search-dialog'
}) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const { results, isSearching, error, search, clear } = useBoardSearch(accessToken)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(-1)
      clear()
    }
  }, [open, clear])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      clear()
      return
    }
    const t = setTimeout(() => {
      void search(boardId, q, { sheetId })
    }, 250)
    return () => clearTimeout(t)
  }, [open, query, boardId, sheetId, search, clear])

  const visibleResults = useMemo(() => results.slice(0, 50), [results])

  useEffect(() => {
    setActiveIndex(-1)
  }, [visibleResults])

  const handlePick = useCallback(
    (r: SearchResult) => {
      onSelectResult?.(r)
      onOpenChange(false)
    },
    [onSelectResult, onOpenChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => Math.min(prev + 1, visibleResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && activeIndex >= 0 && visibleResults[activeIndex]) {
        e.preventDefault()
        handlePick(visibleResults[activeIndex])
      }
    },
    [activeIndex, visibleResults, handlePick]
  )

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-result-idx]')
      const el = items[activeIndex] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const hasQuery = query.trim().length >= 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-xl gba:p-0 gba:gap-0 gba:overflow-hidden gba:rounded-xl" data-testid={testId}>
        <DialogHeader className="gba:sr-only">
          <DialogTitle>Search this board</DialogTitle>
        </DialogHeader>

        <div
          className="gba:flex gba:items-center gba:gap-3 gba:pl-4 gba:pr-12 gba:py-3 gba:border-b"
          onKeyDown={handleKeyDown}
        >
          <Search className="gba:w-5 gba:h-5 gba:text-muted-foreground/60 gba:flex-shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search rows in this board..."
            className="gba:border-0 gba:shadow-none gba:h-9 gba:text-base gba:px-1 focus-visible:gba:ring-0"
            autoFocus
            data-testid={`${testId}-input`}
          />
          {isSearching && <Spinner size="sm" className="gba:flex-shrink-0" />}
        </div>

        <div ref={listRef} className="gba:max-h-[380px] gba:overflow-auto" data-testid={`${testId}-results`}>
          {!hasQuery ? (
            <div className="gba:px-6 gba:py-12 gba:text-center">
              <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                <Search className="gba:w-6 gba:h-6 gba:text-primary/50" />
              </div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground/80">Search this board</p>
              <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-1.5">
                Find any row by name, value, or content
              </p>
            </div>
          ) : error ? (
            <div
              className="gba:px-4 gba:py-8 gba:text-sm gba:text-destructive gba:text-center"
              data-testid={`${testId}-error`}
            >
              {error}
            </div>
          ) : isSearching && visibleResults.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-3">
              <Spinner size="sm" />
              <p className="gba:text-sm gba:text-muted-foreground">Searching...</p>
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="gba:px-6 gba:py-12 gba:text-center">
              <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/60 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                <Search className="gba:w-6 gba:h-6 gba:text-muted-foreground/40" />
              </div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground/80">No results for "{query.trim()}"</p>
              <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-1.5">
                Try different keywords or check spelling
              </p>
            </div>
          ) : (
            visibleResults.map((r, idx) => (
              <div
                key={`${r.sheetId}-${r.rowId}-${r.source}`}
                data-result-idx={idx}
                className={idx === activeIndex ? 'gba:bg-accent/50' : ''}
              >
                <SearchResultItem
                  result={r}
                  query={query}
                  columns={columns}
                  onClick={() => handlePick(r)}
                  data-testid={`${testId}-result-${r.rowId}`}
                />
              </div>
            ))
          )}
        </div>

        <div className="gba:px-4 gba:py-2 gba:border-t gba:flex gba:items-center gba:justify-between gba:bg-muted/20">
          {visibleResults.length > 0 ? (
            <span className="gba:text-xs gba:text-muted-foreground/60">
              {visibleResults.length} result{visibleResults.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span />
          )}
          <div className="gba:flex gba:items-center gba:gap-3 gba:text-[11px] gba:text-muted-foreground/50">
            <span className="gba:inline-flex gba:items-center gba:gap-1">
              <ArrowUp className="gba:w-3 gba:h-3" />
              <ArrowDown className="gba:w-3 gba:h-3" />
              navigate
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1">
              <CornerDownLeft className="gba:w-3 gba:h-3" />
              select
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1">esc close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
