/**
 * SpaceCard - Space preview card
 *
 * Clean, minimal card design following NEWWORK design system
 * No borders, no shadows, flat design
 */

import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { Users, Globe, Lock } from 'lucide-react'
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
  'data-testid': testId = 'space-card'
}) => {
  const contentCounts = space.settings?.contentCounts || { documents: 0, spreadsheets: 0, notes: 0, total: 0 }
  const memberCount = space.members?.length || 0

  // Get first letter for monogram
  const monogram = space.name.charAt(0).toUpperCase()

  return (
    <div
      onClick={onClick}
      className="gba:group gba:cursor-pointer gba:rounded-lg gba:bg-card gba:overflow-hidden gba:transition-colors hover:gba:bg-accent/50"
      data-testid={testId}
    >
      {/* Header with monogram */}
      {/* eslint-disable newwork-local/no-hardcoded-colors */}
      <div
        className="gba:relative gba:h-24 gba:flex gba:items-center gba:justify-center"
        style={{
          backgroundColor: '#001271',
          backgroundImage: `
            radial-gradient(ellipse at top right,
              rgba(0, 118, 208, 0.6) 0%,
              rgba(0, 39, 135, 0.4) 50%,
              transparent 100%
            )`
        }}
      >
        {/* eslint-enable newwork-local/no-hardcoded-colors */}
        {/* Monogram */}
        <span className="gba:text-4xl gba:font-semibold gba:text-white/30">{monogram}</span>

        {/* Visibility Badge */}
        <div className="gba:absolute gba:top-3 gba:right-3">
          <Badge variant="secondary" className="gba:bg-white/10 gba:text-white/80 gba:border-white/20 gba:gap-1">
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
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="gba:p-4">
        {/* Title & Description */}
        <div className="gba:mb-3">
          <h3 className="gba:text-base gba:font-medium gba:text-foreground gba:mb-1 gba:line-clamp-1">{space.name}</h3>
          {space.description && (
            <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">{space.description}</p>
          )}
        </div>

        {/* Stats Row */}
        <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <Users className="gba:w-4 gba:h-4" />
            <span>{memberCount}</span>
          </div>
          <span className="gba:text-border">|</span>
          <span>
            {contentCounts.total} item{contentCounts.total !== 1 ? 's' : ''}
          </span>
          {isOwner && (
            <>
              <span className="gba:text-border">|</span>
              <span>Owner</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpaceCard
