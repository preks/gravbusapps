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
      <DialogContent className="gba:max-w-2xl gba:p-0 gba:gap-0" data-testid={testId}>
        <DialogHeader className="gba:p-4 gba:pb-0">
          <DialogTitle className="gba:sr-only">{t('search-title')}</DialogTitle>
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('search-placeholder')}
              className="gba:pl-10 gba:pr-4 gba:h-12 gba:text-base gba:border-0 gba:ring-0 gba:focus-visible:ring-0"
              data-testid={`${testId}-input`}
            />
            {isSearching && (
              <Loader2 className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground gba:animate-spin" />
            )}
          </div>
        </DialogHeader>

        {query.trim().length >= 2 && (
          <div
            className="gba:border-t gba:border-border/50 gba:max-h-[400px] gba:overflow-y-auto gba:p-2"
            data-testid={`${testId}-results`}
          >
            {results.length === 0 && !isSearching && (
              <div className="gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
                {t('search-no-results')}
              </div>
            )}
            {results.map((result, idx) => {
              const Icon = TYPE_ICONS[result.type] ?? File
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    onSelectResult(result)
                    onOpenChange(false)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`gba:w-full gba:flex gba:items-start gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-lg gba:text-left gba:transition-colors ${
                    isSelected ? 'gba:bg-accent' : 'gba:hover:bg-accent/50'
                  }`}
                  data-testid={`${testId}-result-${result.id}`}
                >
                  <Icon className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:mt-0.5 gba:flex-shrink-0" />
                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{result.name}</p>
                    {result.snippet && (
                      <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mt-0.5">
                        {result.snippet}
                      </p>
                    )}
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                      <span className="gba:text-xs gba:text-muted-foreground">{getItemLabel(result.type as any)}</span>
                      {result.matchType === 'semantic' && (
                        <span className="gba:text-xs gba:text-info gba:font-medium">AI match</span>
                      )}
                    </div>
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
