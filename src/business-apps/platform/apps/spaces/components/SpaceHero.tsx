/**
 * SpaceHero - Hero section for Space detail page
 *
 * Clean, professional enterprise design following NEWWORK design system
 */

import React from 'react'
import { Button, Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { ArrowLeft, Settings, Share2, Globe, Lock, Plus } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import type { Space, SpaceMember } from '../types/space.types'

export interface EnrichedSpaceMember extends SpaceMember {
  userName?: string
  userAvatar?: string
}

export interface OwnerInfo {
  userId: string
  name: string
  avatar?: string
}

export interface SpaceHeroProps {
  space: Space
  members?: EnrichedSpaceMember[]
  ownerInfo?: OwnerInfo
  /** Owner and space admin: show settings (delete in dialog remains owner-only) */
  canOpenSpaceSettings?: boolean
  canEdit?: boolean
  onBack?: () => void
  onSettings?: () => void
  onShare?: () => void
  onAddContent?: () => void
  'data-testid'?: string
}

// Get initials for avatar fallback
const getInitials = (name?: string, fallback?: string) => {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return fallback?.slice(0, 2).toUpperCase() || '??'
}

export const SpaceHero: React.FC<SpaceHeroProps> = ({
  space,
  members = [],
  ownerInfo,
  canOpenSpaceSettings = false,
  canEdit = false,
  onBack,
  onSettings,
  onShare,
  onAddContent,
  'data-testid': testId = 'space-hero'
}) => {
  const displayMembers = members.slice(0, 4)
  const extraMembers = members.length - 4

  return (
    <div data-testid={testId}>
      <div className="gba:relative gba:overflow-hidden">
        <PremiumHeroBackground data-testid={`${testId}-background`} />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />
        <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-8">
          {/* Top Navigation */}
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-12">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="spaces-hero-ghost-btn gba:gap-2 gba:text-white/80 gba:rounded-lg gba:transition-colors"
              data-testid={`${testId}-back-button`}
            >
              <ArrowLeft className="gba:w-4 gba:h-4" />
              Back
            </Button>

            <div className="gba:flex gba:gap-2">
              {canOpenSpaceSettings && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSettings}
                  className="spaces-hero-ghost-btn gba:text-white/80 gba:rounded-lg gba:transition-colors"
                  data-testid={`${testId}-settings-button`}
                >
                  <Settings className="gba:w-4 gba:h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                className="spaces-hero-ghost-btn gba:gap-2 gba:text-white/80 gba:rounded-lg gba:transition-colors"
                data-testid={`${testId}-share-button`}
              >
                <Share2 className="gba:w-4 gba:h-4" />
                Share
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={onAddContent}
                  className="spaces-hero-cta-btn gba:gap-2 gba:rounded-lg gba:bg-white gba:text-primary gba:transition-colors gba:font-medium"
                  data-testid={`${testId}-add-content-button`}
                >
                  <Plus className="gba:w-4 gba:h-4" />
                  Add Content
                </Button>
              )}
            </div>
          </div>

          {/* Space Info */}
          <div className="gba:pb-4">
            {/* Visibility Badge */}
            <div className="gba:mb-4">
              <Badge variant="secondary" className="gba:bg-white/10 gba:text-white/80 gba:border-white/20 gba:gap-1.5">
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

            {/* Space Name */}
            <h1 className="gba:font-funnel-display gba:text-4xl gba:sm:text-5xl gba:font-semibold gba:text-white gba:tracking-tight gba:mb-3">
              {space.name}
            </h1>

            {/* Description */}
            {space.description && (
              <p className="gba:text-lg gba:text-white/70 gba:max-w-2xl gba:mb-8">{space.description}</p>
            )}

            {/* Owner & Members */}
            <div className="gba:flex gba:items-center gba:gap-6">
              {/* Owner */}
              {ownerInfo && (
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Avatar className="gba:w-10 gba:h-10 gba:ring-2 gba:ring-white/20">
                    {ownerInfo.avatar ? <AvatarImage src={ownerInfo.avatar} alt={ownerInfo.name} /> : null}
                    <AvatarFallback className="gba:bg-white/20 gba:text-white gba:text-sm gba:font-medium">
                      {getInitials(ownerInfo.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="gba:text-sm gba:font-medium gba:text-white">{ownerInfo.name}</p>
                    <p className="gba:text-xs gba:text-white/60">Owner</p>
                  </div>
                </div>
              )}

              {/* Separator */}
              {ownerInfo && members.length > 0 && <div className="gba:h-10 gba:w-px gba:bg-white/20" />}

              {/* Members */}
              {members.length > 0 && (
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:flex gba:-space-x-2">
                    {displayMembers.map((member, i) => (
                      <Avatar
                        key={member.id}
                        className="gba:w-9 gba:h-9 gba:ring-2 gba:ring-[#001271]"
                        style={{ zIndex: 10 - i }}
                      >
                        {member.userAvatar ? (
                          <AvatarImage src={member.userAvatar} alt={member.userName || 'Member'} />
                        ) : null}
                        <AvatarFallback className="gba:bg-white/15 gba:text-white gba:text-xs gba:font-medium">
                          {getInitials(member.userName, member.userId)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {extraMembers > 0 && (
                      <div
                        className="gba:w-9 gba:h-9 gba:rounded-full gba:bg-white/10 gba:ring-2 gba:ring-[#001271] gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium gba:text-white/80"
                        style={{ zIndex: 1 }}
                      >
                        +{extraMembers}
                      </div>
                    )}
                  </div>
                  <span className="gba:text-sm gba:text-white/60">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpaceHero
