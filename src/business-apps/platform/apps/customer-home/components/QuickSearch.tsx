import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Button, Input, useTranslation } from '@newwork/nw-design-system'
import {
  MagnifyingGlass,
  Plus,
  FileText,
  Table,
  NotePencil,
  Presentation,
  PencilLine,
  X,
  ArrowRight,
  Clock
} from '@phosphor-icons/react'
import type { ContentItem } from '@/business-apps/platform/apps/desk/hooks/useDeskData'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from '../_i18n'

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

interface QuickSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  searchResults: ContentItem[]
  onItemClick: (item: ContentItem) => void
  isLoading: boolean
  'data-testid'?: string
}

const TYPE_CONFIG = {
  document: { icon: FileText, color: 'gba:text-sky-600', bg: 'gba:bg-sky-500/10' },
  spreadsheet: { icon: Table, color: 'gba:text-teal-600', bg: 'gba:bg-teal-500/10' },
  note: { icon: NotePencil, color: 'gba:text-amber-600', bg: 'gba:bg-amber-500/10' },
  slide: { icon: Presentation, color: 'gba:text-info', bg: 'gba:bg-info/10' },
  whiteboard: { icon: PencilLine, color: 'gba:text-accent-foreground', bg: 'gba:bg-accent/10' }
} as const

function formatRelativeTime(dateString: string, t: TranslateFn): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return new Date(dateString).toLocaleDateString()
}

const createAction = (path: string, params?: Record<string, string>) => () =>
  navigateTo(buildPlatformUrl(path, { from: 'customer-home', ...params }))

export const QuickSearch: React.FC<QuickSearchProps> = ({
  searchQuery,
  onSearchChange,
  searchResults,
  onItemClick,
  isLoading,
  'data-testid': testId = 'customer-home-search'
}) => {
  const { t } = useTranslation(translations)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const showResults = isFocused && searchQuery.trim().length > 0
  const limitedResults = useMemo(() => searchResults.slice(0, 8), [searchResults])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (!showResults) {
        if (e.key === 'Escape' && searchQuery) {
          onSearchChange('')
          inputRef.current?.blur()
        }
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, limitedResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && limitedResults[selectedIndex]) {
        e.preventDefault()
        onItemClick(limitedResults[selectedIndex])
        onSearchChange('')
        inputRef.current?.blur()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onSearchChange('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, onSearchChange, showResults, limitedResults, selectedIndex, onItemClick])

  const handleClear = useCallback(() => {
    onSearchChange('')
    inputRef.current?.focus()
  }, [onSearchChange])

  const handleItemClick = useCallback(
    (item: ContentItem) => {
      onItemClick(item)
      onSearchChange('')
    },
    [onItemClick, onSearchChange]
  )

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative gba:z-50"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-transparent gba:via-background gba:to-background gba:-z-10" />

      <div className="gba:relative gba:max-w-3xl gba:mx-auto">
        <div
          className={`gba:relative gba:border gba:transition-all gba:duration-200 gba:shadow-lg gba:bg-card ${
            showResults ? 'gba:rounded-t-2xl gba:rounded-b-none' : 'gba:rounded-2xl'
          } ${isFocused ? 'gba:border-border/50 gba:shadow-xl' : 'gba:border-border/30'}`}
        >
          <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
            <div className="gba:flex-1 gba:relative">
              <MagnifyingGlass
                className={`gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:transition-colors ${
                  searchQuery ? 'gba:text-primary' : 'gba:text-muted-foreground'
                }`}
                weight="bold"
              />
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                placeholder={t('search-placeholder')}
                className="gba:pl-10 gba:pr-12 gba:border-0 gba:bg-transparent gba:text-base focus:gba:ring-0"
                data-testid={`${testId}-input`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:p-1.5 gba:rounded-full gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted/80 gba:transition-all"
                  data-testid={`${testId}-clear`}
                >
                  <X className="gba:w-4 gba:h-4" weight="bold" />
                </button>
              )}
            </div>

            <div className="gba:w-px gba:h-8 gba:bg-border" />

            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-sky-600 hover:gba:bg-sky-500/10"
                onClick={createAction('/platform/every-office/documents', { action: 'new' })}
                data-testid={`${testId}-create-doc`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" weight="bold" />
                <FileText className="gba:w-4 gba:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-teal-600 hover:gba:bg-teal-500/10"
                onClick={createAction('/platform/every-office/spreadsheets', { action: 'upload' })}
                data-testid={`${testId}-create-sheet`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" weight="bold" />
                <Table className="gba:w-4 gba:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-amber-600 hover:gba:bg-amber-500/10"
                onClick={createAction('/platform/every-office/notes', { action: 'new' })}
                data-testid={`${testId}-create-note`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" weight="bold" />
                <NotePencil className="gba:w-4 gba:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-info hover:gba:bg-info/10"
                onClick={createAction('/platform/every-office/slides', { action: 'new' })}
                data-testid={`${testId}-create-slide`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" weight="bold" />
                <Presentation className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </div>
        </div>

        {showResults && (
          <div className="gba:absolute gba:left-0 gba:right-0 gba:top-full gba:rounded-b-2xl gba:overflow-hidden gba:border gba:border-t-0 gba:border-border/30 gba:shadow-xl gba:bg-card">
            {isLoading ? (
              <div className="gba:px-4 gba:py-8 gba:text-center">
                <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-muted-foreground">
                  <div className="gba:w-4 gba:h-4 gba:border-2 gba:border-border gba:border-t-primary gba:rounded-full gba:animate-spin" />
                  <span className="gba:text-sm">{t('search-searching')}</span>
                </div>
              </div>
            ) : limitedResults.length === 0 ? (
              <div className="gba:px-4 gba:py-8 gba:text-center">
                <MagnifyingGlass className="gba:w-6 gba:h-6 gba:text-muted-foreground/40 gba:mx-auto gba:mb-2" />
                <p className="gba:text-sm gba:text-muted-foreground">
                  {t('search-no-results', { query: searchQuery })}
                </p>
              </div>
            ) : (
              <>
                <div className="gba:max-h-72 gba:overflow-y-auto gba:overscroll-contain">
                  {limitedResults.map((item, index) => {
                    const config = TYPE_CONFIG[item.type]
                    const Icon = config.icon
                    const isSelected = index === selectedIndex

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`gba:px-4 gba:py-2.5 gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:transition-all gba:duration-150 ${isSelected ? 'gba:bg-primary/10' : 'gba:bg-transparent hover:gba:bg-muted/50'}`}
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        data-testid={`${testId}-result-${item.id}`}
                      >
                        <div
                          className={`gba:w-9 gba:h-9 gba:rounded-lg ${config.bg} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0`}
                        >
                          <Icon className={`gba:w-4 gba:h-4 ${config.color}`} weight="duotone" />
                        </div>
                        <div className="gba:flex-1 gba:min-w-0">
                          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {item.title || t('untitled')}
                          </h4>
                          <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-0.5">
                            <Clock className="gba:w-3 gba:h-3 gba:text-muted-foreground/50" />
                            <span className="gba:text-xs gba:text-muted-foreground">
                              {formatRelativeTime(item.updatedAt, t)}
                            </span>
                            {item.isShared && (
                              <>
                                <span className="gba:text-muted-foreground/30">·</span>
                                <span className="gba:text-xs gba:text-muted-foreground">{t('shared')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight
                          className={`gba:w-4 gba:h-4 gba:transition-all ${isSelected ? 'gba:text-primary gba:translate-x-0.5' : 'gba:text-muted-foreground/30'}`}
                          weight="bold"
                        />
                      </div>
                    )
                  })}
                </div>

                <div className="gba:px-4 gba:py-2.5 gba:border-t gba:border-border/20 gba:flex gba:items-center gba:justify-between gba:bg-muted/30">
                  <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground/70">
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <kbd className="gba:px-1 gba:py-0.5 gba:rounded gba:bg-background gba:text-[10px] gba:border gba:border-border/50">
                        ↑↓
                      </kbd>
                      {t('search-navigate')}
                    </span>
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-background gba:text-[10px] gba:border gba:border-border/50">
                        ↵
                      </kbd>
                      {t('search-open')}
                    </span>
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-background gba:text-[10px] gba:border gba:border-border/50">
                        esc
                      </kbd>
                      {t('search-close')}
                    </span>
                  </div>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {t('search-results-count', { count: searchResults.length })}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {!showResults && (
          <p className="gba:text-center gba:text-xs gba:text-muted-foreground gba:mt-3">
            {t('search-hint').split('⌘K')[0]}
            <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono gba:text-[10px]">⌘K</kbd>
            {t('search-hint').split('⌘K')[1]}
          </p>
        )}
      </div>
    </section>
  )
}

export default QuickSearch
