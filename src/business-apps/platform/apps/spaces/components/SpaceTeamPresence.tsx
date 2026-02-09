/**
 * SpaceTeamPresence - Shows team member online status
 *
 * Displays a compact view of which team members are currently online.
 * Listens for presence broadcasts from the chat app's WebSocket.
 */

import React from 'react'
import { Avatar, AvatarImage, AvatarFallback, Tooltip, TooltipTrigger, TooltipContent } from '@newwork/nw-design-system'
import { useSpacePresence } from '../hooks/useSpacePresence'
import type { SpaceMember } from '../types/space.types'

export interface SpaceTeamPresenceProps {
  /** Space members to show presence for */
  members: SpaceMember[]
  /** Maximum number of avatars to show before "+N" */
  maxAvatars?: number
  'data-testid'?: string
}

// Get initials for avatar fallback (same style as hero)
function getInitials(name?: string, fallback?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (fallback) {
    return fallback.substring(0, 2).toUpperCase()
  }
  return '?'
}

export const SpaceTeamPresence: React.FC<SpaceTeamPresenceProps> = ({
  members,
  maxAvatars = 7,
  'data-testid': testId = 'space-team-presence'
}) => {
  const { onlineCount, totalCount, getMemberPresence, hasPresenceData } = useSpacePresence(members)

  // Members to show (limited by maxAvatars)
  const visibleMembers = members.slice(0, maxAvatars)
  const hiddenCount = Math.max(0, members.length - maxAvatars)

  // Sort members: online first, then by name
  const sortedVisibleMembers = [...visibleMembers].sort((a, b) => {
    const aPresence = getMemberPresence(a.userId)
    const bPresence = getMemberPresence(b.userId)

    // Online members first
    if (aPresence.state === 'online' && bPresence.state !== 'online') return -1
    if (bPresence.state === 'online' && aPresence.state !== 'online') return 1

    // Then by name
    return (a.userName || '').localeCompare(b.userName || '')
  })

  const zIndexClasses = ['gba:z-50', 'gba:z-40', 'gba:z-30', 'gba:z-20', 'gba:z-10', 'gba:z-0', 'gba:z-0']

  return (
    <div className="gba:flex gba:items-center gba:gap-3" data-testid={testId}>
      {/* Online count text */}
      <div className="gba:flex gba:items-center gba:gap-1.5">
        <div
          className={`gba:w-2 gba:h-2 gba:rounded-full ${
            hasPresenceData && onlineCount > 0 ? 'gba:bg-success' : 'gba:bg-muted-foreground/50'
          }`}
        />
        <span className="gba:text-sm gba:text-muted-foreground">
          {hasPresenceData ? `${onlineCount} of ${totalCount} online` : `${totalCount} members`}
        </span>
      </div>

      {/* Member avatars */}
      <div className="gba:flex gba:-space-x-2">
        {sortedVisibleMembers.map((member, index) => {
          const presence = getMemberPresence(member.userId)
          const isOnline = hasPresenceData && presence.state === 'online'

          return (
            <Tooltip key={member.userId}>
              <TooltipTrigger asChild>
                <div className={`gba:relative ${zIndexClasses[index] || 'gba:z-0'}`}>
                  <Avatar
                    className={`gba:w-7 gba:h-7 gba:border-2 gba:border-background ${
                      isOnline ? 'gba:ring-2 gba:ring-success/50' : ''
                    }`}
                  >
                    {member.userAvatar ? (
                      <AvatarImage src={member.userAvatar} alt={member.userName || 'Team member'} />
                    ) : null}
                    <AvatarFallback className="gba:text-[10px] gba:font-medium gba:bg-primary/10 gba:text-primary">
                      {getInitials(member.userName, member.userId)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator dot - only show if we have presence data */}
                  {hasPresenceData && (
                    <span
                      className={`gba:absolute gba:-bottom-0.5 gba:-right-0.5 gba:w-2.5 gba:h-2.5 gba:rounded-full gba:border-2 gba:border-background ${
                        isOnline ? 'gba:bg-success' : 'gba:bg-muted-foreground/50'
                      }`}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="gba:font-medium">{member.userName || 'Team member'}</p>
                {hasPresenceData && (
                  <p className="gba:text-xs gba:text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</p>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}

        {/* Show +N if there are hidden members */}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="gba:w-7 gba:h-7 gba:rounded-full gba:bg-muted gba:border-2 gba:border-background gba:flex gba:items-center gba:justify-center">
                <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">+{hiddenCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{hiddenCount} more team members</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export default SpaceTeamPresence
