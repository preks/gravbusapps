import React, { useEffect, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import type { DocumentParticipant } from '../../shared/services/CollaborationClient'

interface CollaboratorState {
  user: {
    id: string
    userId: string
    name: string
    color: string
    avatar?: string
  }
  cursor?: { x: number; y: number }
}

interface ViewportState {
  scrollX: number
  scrollY: number
  zoom: number
}

interface WhiteboardCollaboratorCursorsProps {
  awareness: Awareness
  currentUserId: string
  participants?: DocumentParticipant[]
  viewport: ViewportState
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

export const WhiteboardCollaboratorCursors: React.FC<WhiteboardCollaboratorCursorsProps> = ({
  awareness,
  currentUserId,
  participants = [],
  viewport,
  'data-testid': testId = 'wb-collaborator-cursors'
}) => {
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorState>>(new Map())

  const participantByUserId = new Map(participants.map(p => [p.userId, p]))

  useEffect(() => {
    const updateCollaborators = () => {
      const states = awareness.getStates()
      const next = new Map<number, CollaboratorState>()

      states.forEach((state, clientId) => {
        if (state.user?.userId === currentUserId) return

        const userId = state.user?.userId || ''
        const p = userId ? participantByUserId.get(userId) : undefined

        next.set(clientId, {
          user: {
            id: userId || state.user?.id || '',
            userId: userId || state.user?.id || '',
            name: p?.userName || state.user?.name || 'User',
            color: p?.userColor || state.user?.color || '#4ECDC4',
            avatar: p?.avatarUrl || state.user?.avatar
          },
          cursor: state.cursor
        })
      })

      setCollaborators(next)
    }

    awareness.on('change', updateCollaborators)
    updateCollaborators()
    return () => {
      awareness.off('change', updateCollaborators)
    }
  }, [awareness, currentUserId, participants])

  return (
    <div data-testid={testId} className="gba:pointer-events-none gba:absolute gba:inset-0 gba:z-50">
      {Array.from(collaborators.entries()).map(([clientId, collab]) => {
        const { user, cursor } = collab
        if (!cursor) return null

        const vx = (cursor.x + viewport.scrollX) * viewport.zoom
        const vy = (cursor.y + viewport.scrollY) * viewport.zoom

        return (
          <div
            key={`${user.userId}-${clientId}`}
            className="gba:absolute gba:pointer-events-none gba:transition-all gba:duration-100 gba:ease-out"
            style={{
              left: `${vx}px`,
              top: `${vy}px`,
              zIndex: 9999
            }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M0 0L16 12L8 12L4 20L0 0Z" fill={user.color} stroke="var(--background)" strokeWidth="1" />
            </svg>
            <div
              className="gba:absolute gba:left-4 gba:top-3 gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-md gba:whitespace-nowrap gba:text-xs gba:font-medium gba:text-white"
              style={{ backgroundColor: user.color }}
            >
              <Avatar className="gba:w-4 gba:h-4">
                {user.avatar && <AvatarImage src={user.avatar} />}
                <AvatarFallback className="gba:text-[8px]">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span>{user.name}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
