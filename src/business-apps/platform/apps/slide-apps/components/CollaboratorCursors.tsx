/**
 * CollaboratorCursors Component
 *
 * Displays real-time cursor positions and selections of collaborators on the slide canvas.
 */

import React, { useEffect, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import type { DocumentParticipant } from '../../shared/services/CollaborationClient'

export interface CollaboratorState {
  user: {
    id: string
    userId: string
    name: string
    color: string
    avatar?: string
  }
  cursor?: {
    x: number
    y: number
    slideIndex: number
  }
  selection?: {
    slideIndex: number
    elementId: string
  }
}

export interface CollaboratorCursorsProps {
  awareness: Awareness
  currentSlideIndex: number
  canvasScale: number
  currentUserId: string
  participants?: DocumentParticipant[]
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
 * CollaboratorCursors Component
 */
export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  awareness,
  currentSlideIndex,
  canvasScale,
  currentUserId,
  participants = [],
  'data-testid': testId = 'collaborator-cursors'
}) => {
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorState>>(new Map())

  const participantByUserId = new Map(participants.map(p => [p.userId, p]))

  const normalizeAvatarUrl = (value?: string): string | undefined => {
    if (!value) return undefined
    if (value.startsWith('data:')) return value
    // Assume raw base64 thumbnail
    return `data:image/png;base64,${value}`
  }

  useEffect(() => {
    const updateCollaborators = () => {
      const states = awareness.getStates()
      const newCollaborators = new Map<number, CollaboratorState>()

      states.forEach((state, clientId) => {
        // Skip current user
        if (state.user?.userId === currentUserId) return

        const userId = state.user?.userId || ''
        const p = userId ? participantByUserId.get(userId) : undefined

        const resolvedUser = {
          id: userId || state.user?.id || '',
          userId: userId || state.user?.id || '',
          name: p?.userName || state.user?.name || userId || 'User',
          color: p?.userColor || state.user?.color || '#4ECDC4',
          avatar: normalizeAvatarUrl(p?.avatarUrl) || normalizeAvatarUrl(state.user?.avatar)
        }

        const collaboratorState: CollaboratorState = {
          user: resolvedUser,
          cursor: state.cursor,
          selection: state.selection
        }

        newCollaborators.set(clientId, collaboratorState)
      })

      setCollaborators(newCollaborators)
    }

    awareness.on('change', updateCollaborators)
    updateCollaborators()

    return () => {
      awareness.off('change', updateCollaborators)
    }
  }, [awareness, currentUserId])

  return (
    <div data-testid={testId} className="gba:pointer-events-none gba:absolute gba:inset-0">
      {Array.from(collaborators.values()).map((collab, idx) => {
        const { user, cursor } = collab

        // Only show cursor if on current slide
        if (!cursor || cursor.slideIndex !== currentSlideIndex) return null

        const scaledX = cursor.x * canvasScale
        const scaledY = cursor.y * canvasScale

        return (
          <div
            key={`${user.userId}-${idx}`}
            className="gba:absolute gba:pointer-events-none gba:transition-all gba:duration-150 gba:ease-out"
            style={{
              left: `${scaledX}px`,
              top: `${scaledY}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 1000
            }}
          >
            {/* Cursor dot */}
            <div
              className="gba:w-3 gba:h-3 gba:rounded-full gba:border-2 gba:border-white gba:shadow-lg"
              style={{ backgroundColor: user.color }}
            />

            {/* User label */}
            <div
              className="gba:absolute gba:left-3 gba:top-0 gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:shadow-lg gba:whitespace-nowrap gba:text-xs gba:font-medium gba:text-white"
              style={{ backgroundColor: user.color }}
            >
              <Avatar className="gba:w-4 gba:h-4">
                {user.avatar && <AvatarImage src={user.avatar} />}
                <AvatarFallback className="gba:text-[8px]">{getInitials(user.name || 'User')}</AvatarFallback>
              </Avatar>
              <span>{user.name || 'User'}</span>
            </div>
          </div>
        )
      })}

      {/* Selection highlights */}
      {Array.from(collaborators.values()).map((collab, idx) => {
        const { user, selection } = collab

        // Only show selection if on current slide
        if (!selection || selection.slideIndex !== currentSlideIndex) return null

        return (
          <div
            key={`selection-${user.userId}-${idx}`}
            className="gba:absolute gba:pointer-events-none"
            style={{
              border: `2px solid ${user.color}`,
              backgroundColor: `${user.color}20`,
              opacity: 0.6,
              zIndex: 999
            }}
            data-testid={`${testId}-selection-${user.userId}`}
          >
            <div
              className="gba:absolute gba:-top-5 gba:left-0 gba:px-2 gba:py-0.5 gba:rounded gba:text-[10px] gba:font-medium gba:text-white gba:shadow"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CollaboratorCursors
