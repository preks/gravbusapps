import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Spinner } from '@newwork/nw-design-system'
import { Search, LayoutGrid, ArrowUp, ArrowDown, CornerDownLeft, Command } from 'lucide-react'
import { useBoardSearch, type SearchResult } from '../../hooks/useBoardSearch'
import { SearchResultItem } from './SearchResultItem'
import { GlobalSearchSidebar, type SearchSection } from './GlobalSearchSidebar'
import { GlobalSearchBrowseContent } from './GlobalSearchBrowseContent'
import type { BoardSummary } from '../../types'

export interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  boards: BoardSummary[]
  onSelectResult: (result: SearchResult) => void
  onOpenBoard?: (id: string) => void
  onCreateBoard?: () => void
  onCreateAI?: () => void
  'data-testid'?: string
}

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  boards,
  onSelectResult,
  onOpenBoard,
  onCreateBoard,
  onCreateAI,
  'data-testid': testId = 'global-search-dialog'
}) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [section, setSection] = useState<SearchSection>('trending')
  const { results, isSearching, error, searchAllBoards, clear } = useBoardSearch(accessToken)
  const listRef = useRef<HTMLDivElement>(null)

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(-1)
      setSection('trending')
      clear()
      return
    }
    const raf = requestAnimationFrame(() => {
      const el = contentRef.current
      if (!el) return
      const parent = el.parentElement
      const overlay =
        parent?.querySelector<HTMLElement>('[data-slot="dialog-overlay"]') ??
        (el.previousElementSibling as HTMLElement | null)
      if (overlay instanceof HTMLElement) {
        overlay.style.backdropFilter = 'blur(8px)'
        overlay.style.setProperty('-webkit-backdrop-filter', 'blur(8px)')
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [open, clear])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      clear()
      return
    }
    const t = setTimeout(() => {
      void searchAllBoards(
        boards.map(b => ({ id: b.id, name: b.name })),
        q
      )
    }, 350)
    return () => clearTimeout(t)
  }, [open, query, boards, searchAllBoards, clear])

  const visibleResults = useMemo(() => results.slice(0, 60), [results])

  const grouped = useMemo(() => {
    const groups: Array<{ boardId: string; boardName: string; items: SearchResult[] }> = []
    const map = new Map<string, SearchResult[]>()
    for (const r of visibleResults) {
      if (!map.has(r.boardId)) map.set(r.boardId, [])
      map.get(r.boardId)!.push(r)
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

  const handleBoardOpen = useCallback(
    (id: string) => {
      onOpenBoard?.(id)
      onOpenChange(false)
    },
    [onOpenBoard, onOpenChange]
  )

  const handleCreate = useCallback(() => {
    onCreateBoard?.()
    onOpenChange(false)
  }, [onCreateBoard, onOpenChange])

  const handleCreateAI = useCallback(() => {
    onCreateAI?.()
    onOpenChange(false)
  }, [onCreateAI, onOpenChange])

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
  let flatIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className="gba:max-w-3xl gba:p-0 gba:gap-0 gba:overflow-hidden gba:rounded-xl"
        data-testid={testId}
      >
        <DialogHeader className="gba:sr-only">
          <DialogTitle>Search all boards</DialogTitle>
        </DialogHeader>

        {/* ── Search bar ── */}
        <div
          className="gba:flex gba:items-center gba:gap-3 gba:pl-4 gba:pr-12 gba:py-3 gba:border-b"
          onKeyDown={handleKeyDown}
        >
          <Search className="gba:w-5 gba:h-5 gba:text-muted-foreground/60 gba:flex-shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Boards, Rows, Views or Keywords..."
            className="gba:border-0 gba:shadow-none gba:h-9 gba:text-base gba:px-1 focus-visible:gba:ring-0"
            autoFocus
            data-testid={`${testId}-input`}
          />
          {isSearching && <Spinner size="sm" className="gba:flex-shrink-0" />}
        </div>

        {/* ── Body: sidebar + content ── */}
        <div className="gba:flex gba:min-h-0" data-testid={`${testId}-body`}>
          {!hasQuery && (
            <GlobalSearchSidebar
              activeSection={section}
              onSectionChange={setSection}
              boardCount={boards.length}
              data-testid={`${testId}-sidebar`}
            />
          )}

          <div
            ref={listRef}
            className="gba:flex-1 gba:max-h-[420px] gba:overflow-auto"
            data-testid={`${testId}-results`}
          >
            {!hasQuery ? (
              <GlobalSearchBrowseContent
                section={section}
                boards={boards}
                onOpenBoard={handleBoardOpen}
                onCreateBoard={handleCreate}
                onCreateAI={handleCreateAI}
                data-testid={`${testId}-browse`}
              />
            ) : error ? (
              <div
                className="gba:px-4 gba:py-8 gba:text-sm gba:text-destructive gba:text-center"
                data-testid={`${testId}-error`}
              >
                {error}
              </div>
            ) : isSearching && visibleResults.length === 0 ? (
              <SearchingState boardCount={boards.length} />
            ) : visibleResults.length === 0 ? (
              <NoResults query={query} />
            ) : (
              <div>
                {grouped.map(group => (
                  <div key={group.boardId}>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:bg-muted/40 gba:border-b gba:sticky gba:top-0 gba:z-10">
                      <LayoutGrid className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/60" />
                      <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                        {group.boardName}
                      </span>
                      <span className="gba:text-[10px] gba:text-muted-foreground/40 gba:ml-auto">
                        {group.items.length} result{group.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {group.items.map(r => {
                      flatIndex++
                      const thisIdx = flatIndex
                      return (
                        <div
                          key={`${r.sheetId}-${r.rowId}-${r.source}`}
                          data-result-idx={thisIdx}
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="gba:px-4 gba:py-2 gba:border-t gba:flex gba:items-center gba:justify-between gba:bg-muted/20">
          {hasQuery && visibleResults.length > 0 ? (
            <span className="gba:text-xs gba:text-muted-foreground/60">
              {visibleResults.length} result{visibleResults.length !== 1 ? 's' : ''} across {grouped.length} board
              {grouped.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground/50">
              <Command className="gba:w-3 gba:h-3" />
              <span>K to open anytime</span>
            </div>
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

function SearchingState({ boardCount }: { boardCount: number }) {
  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-14 gba:gap-3">
      <Spinner size="sm" />
      <p className="gba:text-sm gba:text-muted-foreground">
        Searching {boardCount} board{boardCount !== 1 ? 's' : ''}...
      </p>
    </div>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="gba:px-6 gba:py-14 gba:text-center">
      <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/60 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
        <Search className="gba:w-6 gba:h-6 gba:text-muted-foreground/40" />
      </div>
      <p className="gba:text-sm gba:font-medium gba:text-foreground/80">No results for &ldquo;{query.trim()}&rdquo;</p>
      <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-1.5 gba:max-w-xs gba:mx-auto">
        Try different keywords or check spelling
      </p>
    </div>
  )
}
