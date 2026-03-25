/**
 * SpaceCard - Space preview card
 *
 * Decorative card style from nw-design-system. Used in Every Office spaces slider.
 */

import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { Users, Globe, Lock, ArrowRight, FolderOpen, Trash2 } from 'lucide-react'
import type { Space } from '../types/space.types'

export interface SpaceCardProps {
  space: Space
  onClick?: () => void
  isOwner?: boolean
  'data-testid'?: string
}

export const SpaceCard: React.FC<SpaceCardProps> = ({
  space,
  onClick,
  isOwner = false,
  onRequestDelete,
  'data-testid': testId = 'space-card'
}) => {
  const contentCounts = space.settings?.contentCounts || { documents: 0, spreadsheets: 0, notes: 0, total: 0 }
  const memberCount = space.members?.length || 0

  return (
    <Card
      onClick={onClick}
      className="gba:group gba:relative gba:flex gba:h-full gba:w-full gba:flex-col gba:overflow-hidden gba:bg-card-decorative gba:border-0 gba:cursor-pointer gba:transition-all gba:duration-300 gba:hover:scale-[1.02]"
      data-testid={testId}
    >
      <CardContent className="gba:relative gba:flex gba:flex-1 gba:flex-col gba:justify-between gba:p-5">
        {/* Header: icon + title + badge */}
        <div className="gba:mb-4">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div className="gba:h-11 gba:w-11 gba:rounded-xl gba:bg-decorative-foreground/15 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:group-hover:gba:bg-decorative-foreground/20 gba:transition-colors">
              <FolderOpen className="gba:h-5 gba:w-5 gba:text-decorative-foreground" />
            </div>
            <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
              {isOwner && onRequestDelete && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onRequestDelete()
                  }}
                  className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-destructive-foreground/80 hover:gba:bg-destructive/15 hover:gba:text-destructive-foreground gba:transition-colors"
                  data-testid={`${testId}-delete-trigger`}
                  aria-label="Delete space"
                >
                  <Trash2 className="gba:w-4 gba:h-4" />
                </button>
              )}
              <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:h-5 gba:rounded-full gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground gba:text-[11px] gba:font-medium">
                {space.isPublic ? (
                  <>
                    <Globe className="gba:w-3 gba:h-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="gba:w-3 gba:h-3" />
                    Private
                  </>
                )}
              </span>
            </div>
          </div>

          <h3 className="gba:mt-3 gba:text-base gba:font-semibold gba:text-decorative-foreground gba:line-clamp-2 group-hover:gba:text-decorative-foreground/90 gba:transition-colors">
            {space.name}
          </h3>
          {space.description && (
            <p className="gba:mt-1 gba:text-sm gba:text-decorative-foreground/70 gba:line-clamp-2">
              {space.description}
            </p>
          )}
        </div>

        {/* Stats + Open */}
        <div className="gba:flex gba:items-center gba:justify-between gba:pt-3 gba:border-t gba:border-decorative-foreground/10">
          <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm gba:text-decorative-foreground/70">
            <div className="gba:flex gba:items-center gba:gap-1.5">
              <Users className="gba:w-4 gba:h-4" />
              <span>{memberCount}</span>
            </div>
            <span className="gba:text-decorative-foreground/30">|</span>
            <span>
              {contentCounts.total} item{contentCounts.total !== 1 ? 's' : ''}
            </span>
            {isOwner && (
              <>
                <span className="gba:text-decorative-foreground/30">|</span>
                <span className="gba:inline-flex gba:items-center gba:rounded gba:bg-decorative-foreground/15 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-decorative-foreground/90">
                  Owner
                </span>
              </>
            )}
          </div>
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:font-medium gba:text-decorative-foreground group-hover:gba:text-decorative-foreground/90 gba:transition-colors">
            <span>Open</span>
            <ArrowRight className="gba:h-4 gba:w-4 gba:transition-transform group-hover:gba:translate-x-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SpaceCard
