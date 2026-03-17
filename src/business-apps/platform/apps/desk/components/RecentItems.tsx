import React from 'react'
import { Card, CardContent, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { FileText, FileSpreadsheet, StickyNote, Presentation, ArrowRight, Inbox, FileType } from 'lucide-react'
import type { ContentItem } from '../hooks/useDeskData'
import { DESK_TYPE_COLOR_MAP } from '../constants/deskColors'
import deskTranslations from '../_i18n'

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

interface RecentItemsProps {
  items: ContentItem[]
  isLoading: boolean
  searchQuery: string
  onItemClick: (item: ContentItem) => void
  onCreateDocument: () => void
  onCreateSpreadsheet: () => void
  onCreateNote: () => void
  'data-testid'?: string
}

const getTypeConfig = (t: TranslateFn) =>
  ({
    document: { icon: FileText, label: t('type-document') },
    spreadsheet: { icon: FileSpreadsheet, label: t('type-spreadsheet') },
    note: { icon: StickyNote, label: t('type-note') },
    slide: { icon: Presentation, label: t('type-presentation') }
  }) as const

/**
 * Format relative time using translations
 */
function formatRelativeTime(dateString: string, t: TranslateFn): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString()
}

/**
 * Highlight text matching the search query
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="gba:bg-primary/20 gba:text-primary gba:rounded gba:px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

/**
 * RecentItems - Premium recent items list with animations
 */
export const RecentItems: React.FC<RecentItemsProps> = ({
  items,
  isLoading,
  searchQuery,
  onItemClick,
  onCreateDocument,
  onCreateSpreadsheet,
  onCreateNote,
  'data-testid': testId = 'desk-recent'
}) => {
  const { t } = useTranslation(deskTranslations)
  const typeConfig = getTypeConfig(t)
  const isSearchMode = Boolean(searchQuery.trim())

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}
    >
      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        {/* Section header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div>
            <h2 className="desk-section-title gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:mb-2">
              {isSearchMode ? (
                <>
                  {t('results-for-prefix')} <span className="gba:text-primary">&quot;{searchQuery}&quot;</span>
                </>
              ) : (
                t('pick-up-where')
              )}
            </h2>
          </div>
          {isSearchMode && items.length > 0 && (
            <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground gba:text-sm gba:font-medium">
              {t('search-results-count', { count: items.length })}
            </span>
          )}
        </div>

        {/* Content */}
        {(() => {
          if (isLoading) {
            return (
              <div className="gba:flex gba:justify-center gba:py-16">
                <Spinner size="lg" />
              </div>
            )
          }

          if (items.length === 0) {
            return (
              <Card className="gba:bg-muted/30 gba:border-dashed">
                <CardContent className="gba:py-12">
                  <div className="gba:text-center">
                    <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                      <Inbox className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                    </div>
                    <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">
                      {searchQuery ? t('empty-search-title') : t('empty-default-title')}
                    </h3>
                    <p className="gba:text-muted-foreground gba:mb-6">
                      {searchQuery ? t('empty-search-description') : t('empty-default-description')}
                    </p>
                    {!searchQuery && (
                      <div className="gba:flex gba:justify-center gba:gap-3">
                        <Button variant="outline" size="sm" onClick={onCreateDocument} className="gba:gap-2">
                          <FileText className="gba:w-4 gba:h-4" />
                          {t('type-document')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={onCreateSpreadsheet} className="gba:gap-2">
                          <FileSpreadsheet className="gba:w-4 gba:h-4" />
                          {t('type-spreadsheet')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={onCreateNote} className="gba:gap-2">
                          <StickyNote className="gba:w-4 gba:h-4" />
                          {t('type-note')}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          }

          return (
            <div className="gba:flex gba:flex-col gba:gap-0 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:overflow-hidden">
              {items.map((item, index) => {
                const config = typeConfig[item.type]
                const isPdfDoc = item.type === 'document' && item.isPdf
                const Icon = isPdfDoc ? FileType : config.icon
                const typeColor = isPdfDoc ? undefined : DESK_TYPE_COLOR_MAP[item.type]

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    className="gba:group gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:text-left gba:transition-colors gba:duration-150 hover:gba:bg-muted/50 gba:border-b gba:border-border last:gba:border-b-0 hover:gba:border-muted-foreground/20"
                    onClick={() => onItemClick(item)}
                    style={{ animation: `fadeInUp 0.3s ease-out ${0.03 * index}s both` }}
                    data-testid={`${testId}-item-${item.id}`}
                  >
                    <div
                      className={`gba:w-8 gba:h-8 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${isPdfDoc ? 'gba:bg-destructive/10' : ''}`}
                      style={
                        isPdfDoc
                          ? undefined
                          : {
                              backgroundColor: `color-mix(in srgb, ${typeColor} 12%, transparent)`
                            }
                      }
                    >
                      <Icon
                        className={`gba:w-4 gba:h-4 ${isPdfDoc ? 'gba:text-destructive' : ''}`}
                        style={isPdfDoc ? undefined : { color: typeColor }}
                      />
                    </div>

                    <div className="gba:flex-1 gba:min-w-0">
                      <h4 className="gba:font-medium gba:text-foreground gba:truncate gba:text-sm gba:leading-tight">
                        <HighlightedText text={item.title || t('untitled')} query={searchQuery} />
                      </h4>
                      <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-0.5">
                        <span className="gba:text-[11px] gba:text-muted-foreground">{config.label}</span>
                        <span className="gba:text-muted-foreground/60">·</span>
                        <span className="gba:text-[11px] gba:text-muted-foreground">
                          {formatRelativeTime(item.updatedAt, t)}
                        </span>
                        {item.isShared && (
                          <>
                            <span className="gba:text-muted-foreground/60">·</span>
                            <span className="gba:inline-flex gba:items-center gba:px-1.5 gba:py-0 gba:rounded-full gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground gba:text-[10px] gba:font-medium">
                              {t('shared')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )
        })()}
      </div>
    </section>
  )
}

export default RecentItems
