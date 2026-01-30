/**
 * SpacePinned - Pinned/featured content section
 *
 * Displays owner-curated important content items
 */

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Table2, StickyNote, Pin, ExternalLink } from 'lucide-react'
import type { SpaceContentItem } from '../types/space.types'

export interface SpacePinnedProps {
  items: SpaceContentItem[]
  onItemClick?: (item: SpaceContentItem) => void
  'data-testid'?: string
}

const contentTypeConfig: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  document: { icon: FileText, color: 'gba:text-blue-600', bg: 'gba:bg-blue-500/20', label: 'Document' },
  spreadsheet: { icon: Table2, color: 'gba:text-emerald-600', bg: 'gba:bg-emerald-500/20', label: 'Spreadsheet' },
  note: { icon: StickyNote, color: 'gba:text-amber-600', bg: 'gba:bg-amber-500/20', label: 'Note' }
}

export const SpacePinned: React.FC<SpacePinnedProps> = ({
  items,
  onItemClick,
  'data-testid': testId = 'space-pinned'
}) => {
  if (items.length === 0) {
    return (
      <div className="gba:text-center gba:py-12" data-testid={testId}>
        <div className="gba:w-14 gba:h-14 gba:mx-auto gba:mb-4 gba:rounded-2xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center">
          <Pin className="gba:w-7 gba:h-7 gba:text-muted-foreground" />
        </div>
        <p className="gba:text-muted-foreground">No pinned content</p>
        <p className="gba:text-sm gba:text-muted-foreground/70">Pin important items to feature them here</p>
      </div>
    )
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4" data-testid={testId}>
      {items.map((item, index) => {
        const config = contentTypeConfig[item.type] || contentTypeConfig.document
        const Icon = config.icon

        return (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className="gba:group gba:relative gba:overflow-hidden gba:rounded-xl gba:border gba:border-border/50 gba:bg-card/50 gba:p-4 gba:cursor-pointer gba:transition-all gba:duration-300 hover:gba:border-border hover:gba:bg-card hover:gba:shadow-lg"
            style={{ animationDelay: `${index * 50}ms` }}
            data-testid={`${testId}-item-${item.id}`}
          >
            {/* Pin indicator */}
            <div className="gba:absolute gba:top-3 gba:right-3">
              <Pin className="gba:w-3.5 gba:h-3.5 gba:text-primary gba:fill-primary" />
            </div>

            <div className="gba:flex gba:items-start gba:gap-4">
              {/* Icon */}
              <div
                className={`gba:w-12 gba:h-12 gba:rounded-xl ${config.bg} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:transition-transform gba:duration-300 group-hover:gba:scale-110`}
              >
                <Icon className={`gba:w-6 gba:h-6 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <h4 className="gba:font-medium gba:text-foreground gba:truncate group-hover:gba:text-primary gba:transition-colors">
                    {item.title}
                  </h4>
                  <ExternalLink className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:flex-shrink-0" />
                </div>

                {item.description && (
                  <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2 gba:mt-1">{item.description}</p>
                )}

                <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2 gba:text-xs gba:text-muted-foreground">
                  <span className={`gba:px-2 gba:py-0.5 gba:rounded-md ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                  <span>Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SpacePinned
