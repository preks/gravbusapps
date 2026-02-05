/**
 * ActiveCollaborators Component
 *
 * Shows avatars of users currently viewing/editing the slide.
 * Displays in the toolbar with a count badge.
 */

import React from 'react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { Users } from 'lucide-react'
import type { SlideParticipant } from '../../shared/services/CollaborationClient'

export interface ActiveCollaboratorsProps {
  participants: SlideParticipant[]
  currentUserId: string
  maxVisible?: number
  'data-testid'?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * ActiveCollaborators Component
 */
export const ActiveCollaborators: React.FC<ActiveCollaboratorsProps> = ({
  participants,
  currentUserId,
  maxVisible = 3,
  'data-testid': testId = 'active-collaborators'
}) => {
  // Filter out current user
  const others = participants.filter(p => p.userId !== currentUserId)

  if (others.length === 0) return null

  const visible = others.slice(0, maxVisible)
  const hiddenCount = others.length - visible.length

  return (
    <TooltipProvider>
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
        <Users className="gba:w-4 gba:h-4 gba:text-muted-foreground" />

        <div className="gba:flex gba:items-center gba:-space-x-2">
          {visible.map(participant => (
            <Tooltip key={participant.userId}>
              <TooltipTrigger asChild>
                <div
                  className="gba:relative"
                  style={{
                    borderColor: participant.userColor || '#4ECDC4',
                    borderWidth: '2px',
                    borderRadius: '50%'
                  }}
                >
                  <Avatar className="gba:w-8 gba:h-8">
                    {participant.userAvatar && <AvatarImage src={participant.userAvatar} />}
                    <AvatarFallback
                      className="gba:text-[10px] gba:font-medium"
                      style={{
                        backgroundColor: `${participant.userColor}20`,
                        color: participant.userColor
                      }}
                    >
                      {getInitials(participant.userName || 'User')}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="gba:font-medium">{participant.userName}</p>
                <p className="gba:text-xs gba:text-muted-foreground">Viewing now</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:border-2 gba:border-background gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-medium gba:text-muted-foreground">
                  +{hiddenCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  +{hiddenCount} more {hiddenCount === 1 ? 'person' : 'people'} viewing
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default ActiveCollaborators
