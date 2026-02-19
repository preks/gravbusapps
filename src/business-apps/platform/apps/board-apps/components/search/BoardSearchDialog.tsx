/**
 * BoardSearchDialog - in-board search with beautiful, column-aware results.
 * Clicking a result triggers navigation to the correct page + row highlight in the table.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Spinner } from '@newwork/nw-design-system'
import { Search, X, Sparkles } from 'lucide-react'
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
  const [includeSemantic, setIncludeSemantic] = useState(true)
  const [activeIndex, setActiveIndex] = useState(-1)
  const { results, isSearching, error, search, clear } = useBoardSearch(accessToken)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setIncludeSemantic(true)
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
      void search(boardId, q, { sheetId, semantic: includeSemantic })
    }, 250)
    return () => clearTimeout(t)
  }, [open, query, boardId, sheetId, includeSemantic, search, clear])

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
      const el = listRef.current.children[activeIndex] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        <DialogHeader className="gba:sr-only">
          <DialogTitle>Search this board</DialogTitle>
        </DialogHeader>

        <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2.5 gba:border-b" onKeyDown={handleKeyDown}>
          <Search className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search rows in this board..."
            className="gba:border-0 gba:shadow-none gba:h-8 gba:text-sm gba:px-0 focus-visible:gba:ring-0"
            autoFocus
            data-testid={`${testId}-input`}
          />
          <Button
            variant={includeSemantic ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setIncludeSemantic(v => !v)}
            className="gba:h-7 gba:px-2 gba:gap-1 gba:text-xs gba:flex-shrink-0"
            data-testid={`${testId}-semantic-toggle`}
          >
            <Sparkles className="gba:w-3 gba:h-3" />
            AI
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="gba:h-7 gba:w-7 gba:flex-shrink-0"
            data-testid={`${testId}-close`}
          >
            <X className="gba:w-3.5 gba:h-3.5" />
          </Button>
        </div>

        <div ref={listRef} className="gba:max-h-80 gba:overflow-auto" data-testid={`${testId}-results`}>
          {isSearching && visibleResults.length === 0 ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
              <Spinner size="sm" />
              <span className="gba:ml-2">Searching...</span>
            </div>
          ) : error ? (
            <div
              className="gba:px-4 gba:py-6 gba:text-sm gba:text-destructive gba:text-center"
              data-testid={`${testId}-error`}
            >
              {error}
            </div>
          ) : query.trim().length < 2 ? (
            <div className="gba:px-4 gba:py-10 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">Type to search across all rows</p>
              <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-1">Toggle AI for semantic search</p>
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="gba:px-4 gba:py-10 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">No results found</p>
              <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-1">
                Try different keywords or enable AI search
              </p>
            </div>
          ) : (
            <div className="gba:divide-y gba:divide-border">
              {visibleResults.map((r, idx) => (
                <div
                  key={`${r.sheetId}-${r.rowId}-${r.source}`}
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
              ))}
            </div>
          )}
        </div>

        {visibleResults.length > 0 && (
          <div className="gba:px-3 gba:py-1.5 gba:border-t gba:flex gba:items-center gba:justify-between gba:text-[10px] gba:text-muted-foreground/60">
            <span>
              {visibleResults.length} result{visibleResults.length !== 1 ? 's' : ''}
            </span>
            <span>Arrow keys to navigate, Enter to select</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
