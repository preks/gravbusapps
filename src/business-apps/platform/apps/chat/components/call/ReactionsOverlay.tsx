/**
 * ReactionsOverlay Component
 *
 * Displays floating emoji reactions that animate upward
 * Reactions are filtered by participant ID and auto-remove after 3 seconds
 */

import React from 'react'

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

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({
  reactions,
  participantId,
  prefixDataTestId = 'rtk-group-call'
}) => {
  // Filter reactions for this participant if ID provided
  const filteredReactions = participantId ? reactions.filter(r => r.participantId === participantId) : reactions

  if (filteredReactions.length === 0) {
    return null
  }

  return (
    <>
      {filteredReactions.map(reaction => (
        <div
          key={reaction.id}
          className="gba:absolute gba:text-4xl gba:pointer-events-none"
          style={{
            left: '50%',
            bottom: '20%',
            transform: 'translateX(-50%)',
            animation: 'reaction-float-up 3s ease-out forwards'
          }}
          data-testid={`${prefixDataTestId}-reaction-${reaction.id}`}
        >
          {reaction.emoji}
        </div>
      ))}
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
