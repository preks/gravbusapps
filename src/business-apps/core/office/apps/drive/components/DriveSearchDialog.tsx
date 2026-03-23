import React, { useCallback, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@newwork/nw-design-system'
import { Search, FileText, StickyNote, Table2, Presentation, File, Loader2 } from 'lucide-react'
import type { DriveSearchResult } from '../types/drive.types'
import { getItemLabel } from '../types/drive.types'

export interface DriveSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQueryChange: (q: string) => void
  results: DriveSearchResult[]
  isSearching: boolean
  onSelectResult: (result: DriveSearchResult) => void
  t: (key: string) => string
  'data-testid'?: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  note: StickyNote,
  spreadsheet_app: Table2,
  slide: Presentation,
  drive_file: File
}

export const DriveSearchDialog: React.FC<DriveSearchDialogProps> = ({
  open,
  onOpenChange,
  query,
  onQueryChange,
  results,
  isSearching,
  onSelectResult,
  t,
  'data-testid': testId = 'drive-search'
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  useEffect(() => {
    if (open) {
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        onSelectResult(results[selectedIndex])
        onOpenChange(false)
      }
    },
    [results, selectedIndex, onSelectResult, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-2xl gba:p-0 gba:gap-0 gba:overflow-hidden"
        showCloseButton={false}
        data-testid={testId}
      >
        <DialogHeader className="gba:px-5 gba:pt-5 gba:pb-3">
          <DialogTitle className="gba:sr-only">{t('search-title')}</DialogTitle>
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/60" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('search-placeholder')}
              className="gba:pl-11 gba:pr-4 gba:h-12 gba:text-base gba:rounded-xl gba:bg-muted/40 gba:border-border/50 gba:focus-visible:ring-1 gba:focus-visible:ring-primary/30"
              data-testid={`${testId}-input`}
            />
            {isSearching && (
              <Loader2 className="gba:absolute gba:right-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-primary gba:animate-spin" />
            )}
          </div>
        </DialogHeader>

        {query.trim().length >= 2 && (
          <div
            className="gba:border-t gba:border-border/40 gba:max-h-[420px] gba:overflow-y-auto gba:px-3 gba:py-2"
            data-testid={`${testId}-results`}
          >
            {results.length === 0 && !isSearching && (
              <div className="gba:py-12 gba:text-center">
                <Search className="gba:w-8 gba:h-8 gba:text-muted-foreground/30 gba:mx-auto gba:mb-3" />
                <p className="gba:text-sm gba:text-muted-foreground">{t('search-no-results')}</p>
              </div>
            )}
            {results.map((result, idx) => {
              const Icon = TYPE_ICONS[result.type] ?? File
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  ref={el => {
                    if (el) itemRefs.current.set(idx, el)
                    else itemRefs.current.delete(idx)
                  }}
                  onClick={() => {
                    onSelectResult(result)
                    onOpenChange(false)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-lg gba:text-left gba:transition-all gba:duration-150 ${
                    isSelected ? 'gba:bg-accent gba:shadow-sm' : 'hover:gba:bg-accent/50'
                  }`}
                  data-testid={`${testId}-result-${result.id}`}
                >
                  <div
                    className={`gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:flex-shrink-0 gba:transition-colors ${
                      isSelected ? 'gba:bg-primary/10' : 'gba:bg-muted/60'
                    }`}
                  >
                    <Icon
                      className={`gba:w-4 gba:h-4 ${isSelected ? 'gba:text-primary' : 'gba:text-muted-foreground'}`}
                    />
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{result.name}</p>
                    {result.snippet && (
                      <p className="gba:text-xs gba:text-muted-foreground/70 gba:line-clamp-1 gba:mt-0.5">
                        {result.snippet}
                      </p>
                    )}
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-shrink-0">
                    <span className="gba:text-[11px] gba:text-muted-foreground/60 gba:px-2 gba:py-0.5 gba:rounded-md gba:bg-muted/50 gba:font-medium">
                      {getItemLabel(result.type as any)}
                    </span>
                    {result.matchType === 'semantic' && (
                      <span className="gba:text-[11px] gba:text-primary gba:font-medium gba:px-2 gba:py-0.5 gba:rounded-md gba:bg-primary/10">
                        AI
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
