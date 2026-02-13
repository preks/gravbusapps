/**
 * ReactionsOverlay Component
 *
 * Displays floating reaction icons that animate upward.
 * Reactions are filtered by participant ID and auto-remove after 3 seconds.
 */

import React from 'react'
import { REACTIONS } from './ReactionsPicker'

export interface Reaction {
  id: string
  emoji: string
  participantId: string
  timestamp: number
}

export interface ReactionsOverlayProps {
  /** Array of active reactions to display */
  reactions: Reaction[]
  /** Participant ID to filter reactions for (shows only this participant's reactions) */
  participantId?: string
  /** Data test ID prefix */
  prefixDataTestId?: string
}

const reactionIdToOption = new Map(REACTIONS.map(r => [r.id, r]))

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({
  reactions,
  participantId,
  prefixDataTestId = 'rtk-group-call'
}) => {
  const filteredReactions = participantId ? reactions.filter(r => r.participantId === participantId) : reactions

  if (filteredReactions.length === 0) {
    return null
  }

  return (
    <>
      {filteredReactions.map(reaction => {
        const option = reactionIdToOption.get(reaction.emoji)
        return (
          <div
            key={reaction.id}
            className="gba:absolute gba:pointer-events-none gba:flex gba:items-center gba:justify-center gba:text-foreground"
            style={{
              left: '50%',
              bottom: '20%',
              transform: 'translateX(-50%)',
              animation: 'reaction-float-up 3s ease-out forwards'
            }}
            data-testid={`${prefixDataTestId}-reaction-${reaction.id}`}
          >
            {option ? (
              <option.Icon size={40} weight="fill" className="gba:shrink-0" />
            ) : (
              <span className="gba:text-4xl">{reaction.emoji}</span>
            )}
          </div>
        )
      })}
      <style>{`
        @keyframes reaction-float-up {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(0);
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-100px);
          }
        }
      `}</style>
    </>
  )
}
