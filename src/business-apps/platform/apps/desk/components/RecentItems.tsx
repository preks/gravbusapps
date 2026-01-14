import React from 'react'
import { Card, CardContent, Badge, Button, Spinner } from '@newwork/nw-design-system'
import { FileText, FileSpreadsheet, StickyNote, Clock, ArrowRight, Inbox } from 'lucide-react'
import type { ContentItem } from '../hooks/useDeskData'

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

const typeConfig = {
  document: {
    icon: FileText,
    color: 'gba:text-sky-600',
    bg: 'gba:bg-sky-500/10',
    borderHover: 'hover:gba:border-sky-500/30',
    label: 'Document'
  },
  spreadsheet: {
    icon: FileSpreadsheet,
    color: 'gba:text-teal-600',
    bg: 'gba:bg-teal-500/10',
    borderHover: 'hover:gba:border-teal-500/30',
    label: 'Spreadsheet'
  },
  note: {
    icon: StickyNote,
    color: 'gba:text-amber-600',
    bg: 'gba:bg-amber-500/10',
    borderHover: 'hover:gba:border-amber-500/30',
    label: 'Note'
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
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
            <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:mb-2">
              <Clock className="gba:h-4 gba:w-4" />
              <span className="gba:text-sm gba:font-medium gba:uppercase gba:tracking-wider">Recent</span>
            </div>
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
              {searchQuery ? `Search results` : 'Pick up where you left off'}
            </h2>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="gba:flex gba:justify-center gba:py-16">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <Card className="gba:bg-muted/30 gba:border-dashed">
            <CardContent className="gba:py-12">
              <div className="gba:text-center">
                <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                  <Inbox className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                </div>
                <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">
                  {searchQuery ? 'No items match your search' : 'No recent items yet'}
                </h3>
                <p className="gba:text-muted-foreground gba:mb-6">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create your first document, spreadsheet, or note to get started'}
                </p>
                {!searchQuery && (
                  <div className="gba:flex gba:justify-center gba:gap-3">
                    <Button variant="outline" size="sm" onClick={onCreateDocument} className="gba:gap-2">
                      <FileText className="gba:w-4 gba:h-4" />
                      Document
                    </Button>
                    <Button variant="outline" size="sm" onClick={onCreateSpreadsheet} className="gba:gap-2">
                      <FileSpreadsheet className="gba:w-4 gba:h-4" />
                      Spreadsheet
                    </Button>
                    <Button variant="outline" size="sm" onClick={onCreateNote} className="gba:gap-2">
                      <StickyNote className="gba:w-4 gba:h-4" />
                      Note
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
            {items.map((item, index) => {
              const config = typeConfig[item.type]
              const Icon = config.icon

              return (
                <Card
                  key={`${item.type}-${item.id}`}
                  className={`gba:group gba:cursor-pointer gba:transition-all gba:duration-200 ${config.borderHover} hover:gba:shadow-md`}
                  onClick={() => onItemClick(item)}
                  style={{ animation: `fadeInUp 0.3s ease-out ${0.05 * index}s both` }}
                  data-testid={`${testId}-item-${item.id}`}
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      {/* Icon */}
                      <div className={`gba:w-10 gba:h-10 gba:rounded-lg ${config.bg} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0`}>
                        <Icon className={`gba:w-5 gba:h-5 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                          <h4 className="gba:font-medium gba:text-card-foreground gba:truncate gba:leading-tight">
                            {item.title || 'Untitled'}
                          </h4>
                          <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:flex-shrink-0" />
                        </div>

                        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1.5">
                          <span className="gba:text-xs gba:text-muted-foreground">{config.label}</span>
                          <span className="gba:text-muted-foreground">·</span>
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {formatRelativeTime(item.updatedAt)}
                          </span>
                          {item.isShared && (
                            <>
                              <span className="gba:text-muted-foreground">·</span>
                              <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                Shared
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default RecentItems
