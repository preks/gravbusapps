/**
 * GlobalSearchDialog - searches across ALL boards from the hub.
 * Results grouped by board with beautiful rendering.
 * Click opens the board and highlights the matching row.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Spinner } from '@newwork/nw-design-system'
import { Search, X, Sparkles, LayoutGrid } from 'lucide-react'
import { useBoardSearch, type SearchResult } from '../../hooks/useBoardSearch'
import { SearchResultItem } from './SearchResultItem'

export interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  boards: Array<{ id: string; name: string }>
  onSelectResult: (result: SearchResult) => void
  'data-testid'?: string
}

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  boards,
  onSelectResult,
  'data-testid': testId = 'global-search-dialog'
}) => {
  const [query, setQuery] = useState('')
  const [includeSemantic, setIncludeSemantic] = useState(true)
  const [activeIndex, setActiveIndex] = useState(-1)
  const { results, isSearching, error, searchAllBoards, clear } = useBoardSearch(accessToken)
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
      void searchAllBoards(boards, q, { semantic: includeSemantic })
    }, 350)
    return () => clearTimeout(t)
  }, [open, query, boards, includeSemantic, searchAllBoards, clear])

  const visibleResults = useMemo(() => results.slice(0, 60), [results])
  const grouped = useMemo(() => {
    const groups: Array<{ boardId: string; boardName: string; items: SearchResult[] }> = []
    const map = new Map<string, SearchResult[]>()
    for (const r of visibleResults) {
      const key = r.boardId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    for (const [boardId, items] of map) {
      groups.push({ boardId, boardName: items[0]?.boardName || boardId, items })
    }
    return groups
  }, [visibleResults])

  useEffect(() => {
    setActiveIndex(-1)
  }, [visibleResults])

  const handlePick = useCallback(
    (r: SearchResult) => {
      onSelectResult(r)
      onOpenChange(false)
    },
    [onSelectResult, onOpenChange]
  )

  const flatResults = visibleResults

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => Math.min(prev + 1, flatResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && activeIndex >= 0 && flatResults[activeIndex]) {
        e.preventDefault()
        handlePick(flatResults[activeIndex])
      }
    },
    [activeIndex, flatResults, handlePick]
  )

  let flatIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-xl gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        <DialogHeader className="gba:sr-only">
          <DialogTitle>Search all boards</DialogTitle>
        </DialogHeader>

        <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2.5 gba:border-b" onKeyDown={handleKeyDown}>
          <Search className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search across all boards..."
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

        <div ref={listRef} className="gba:max-h-96 gba:overflow-auto" data-testid={`${testId}-results`}>
          {isSearching && visibleResults.length === 0 ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
              <Spinner size="sm" />
              <span className="gba:ml-2">
                Searching {boards.length} board{boards.length !== 1 ? 's' : ''}...
              </span>
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
              <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-3">
                <Search className="gba:w-5 gba:h-5 gba:text-primary/60" />
              </div>
              <p className="gba:text-sm gba:text-muted-foreground">Search across all your boards</p>
              <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-1">
                Find rows, values, and content anywhere
              </p>
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="gba:px-4 gba:py-10 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">No results found across your boards</p>
              <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-1">
                Try different keywords or enable AI search
              </p>
            </div>
          ) : (
            <div>
              {grouped.map(group => (
                <div key={group.boardId}>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:bg-muted/30 gba:border-b gba:border-t gba:sticky gba:top-0 gba:z-10">
                    <LayoutGrid className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{group.boardName}</span>
                    <span className="gba:text-[10px] gba:text-muted-foreground/50">{group.items.length}</span>
                  </div>
                  <div className="gba:divide-y gba:divide-border">
                    {group.items.map(r => {
                      flatIndex++
                      const thisIdx = flatIndex
                      return (
                        <div
                          key={`${r.sheetId}-${r.rowId}-${r.source}`}
                          className={thisIdx === activeIndex ? 'gba:bg-accent/50' : ''}
                        >
                          <SearchResultItem
                            result={r}
                            query={query}
                            showBoardName={false}
                            onClick={() => handlePick(r)}
                            data-testid={`${testId}-result-${r.rowId}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {visibleResults.length > 0 && (
          <div className="gba:px-3 gba:py-1.5 gba:border-t gba:flex gba:items-center gba:justify-between gba:text-[10px] gba:text-muted-foreground/60">
            <span>
              {visibleResults.length} result{visibleResults.length !== 1 ? 's' : ''} across {grouped.length} board
              {grouped.length !== 1 ? 's' : ''}
            </span>
            <span>Arrow keys to navigate, Enter to select</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
