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
import type { DocumentParticipant } from '../services/CollaborationClient'

export interface PresenceIndicatorProps {
  participants: DocumentParticipant[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * PresenceIndicator Component
 *
 * Displays avatars of active collaborators with their colors
 *
 * @example
 * ```tsx
 * <PresenceIndicator
 *   participants={participants}
 *   maxVisible={3}
 *   size="md"
 *   showLabel={true}
 * />
 * ```
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  participants,
  maxVisible = 3,
  size = 'md',
  showLabel = false,
  className = ''
}) => {
  const visibleParticipants = participants.slice(0, maxVisible)
  const remainingCount = Math.max(0, participants.length - maxVisible)

  const sizeClasses = {
    sm: 'gba:w-6 gba:h-6',
    md: 'gba:w-8 gba:h-8',
    lg: 'gba:w-10 gba:h-10'
  }

  const textSizeClasses = {
    sm: 'gba:text-[8px]',
    md: 'gba:text-xs',
    lg: 'gba:text-sm'
  }

  if (participants.length === 0) {
    return null
  }

  return (
    <div className={`gba:flex gba:items-center gba:gap-2 ${className}`}>
      {showLabel && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-muted-foreground">
          <Users className="gba:w-4 gba:h-4" />
          <span>{participants.length} active</span>
        </div>
      )}

      <div className="gba:flex gba:items-center gba:-space-x-2">
        {visibleParticipants.map(participant => (
          <TooltipProvider key={participant.socketId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="gba:inline-block">
                  <Avatar
                    className={`${sizeClasses[size]} gba:border-2 gba:border-background gba:cursor-pointer gba:transition-transform hover:gba:scale-110 hover:gba:z-10`}
                    style={{ borderColor: participant.userColor }}
                  >
                    {participant.avatarUrl && (
                      <AvatarImage
                        src={participant.avatarUrl}
                        alt={participant.userName}
                        className="gba:object-cover"
                      />
                    )}
                    <AvatarFallback className={`${textSizeClasses[size]} gba:bg-muted gba:text-muted-foreground`}>
                      {getInitials(participant.userName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:font-medium">{participant.userName}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    Active {getRelativeTime(participant.lastActiveAt)}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="gba:inline-block">
                  <Avatar
                    className={`${sizeClasses[size]} gba:border-2 gba:border-background gba:cursor-pointer gba:bg-muted`}
                  >
                    <AvatarFallback className={`${textSizeClasses[size]} gba:text-muted-foreground`}>
                      +{remainingCount}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="gba:flex gba:flex-col gba:gap-1">
                  {participants.slice(maxVisible).map(p => (
                    <span key={p.socketId} className="gba:text-sm">
                      {p.userName}
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}

/**
 * Get relative time string (e.g., "just now", "2 minutes ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes === 1) return '1 minute ago'
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`

  return date.toLocaleDateString()
}

export default PresenceIndicator
