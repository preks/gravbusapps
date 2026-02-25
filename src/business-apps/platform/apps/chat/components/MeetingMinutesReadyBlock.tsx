/**
 * Meeting minutes ready system message with view-note action.
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import type { Message } from '../types'

export interface MeetingMinutesReadyBlockProps {
  message: Message
  formattedTime: string
  navigateTo: (path: string) => void
}

export const MeetingMinutesReadyBlock: React.FC<MeetingMinutesReadyBlockProps> = ({
  message,
  formattedTime,
  navigateTo
}) => {
  const noteId = message.metadata?.noteId
  const sessionName = message.metadata?.sessionName

  return (
    <div className="gba:flex gba:justify-center gba:py-2" data-testid={`message-minutes-ready-${message.id}`}>
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:bg-success-secondary/20 gba:border gba:border-success gba:px-4 gba:py-3 gba:rounded-lg gba:max-w-md">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-lg">📋</span>
          <span className="gba:text-sm gba:font-medium gba:text-foreground">Meeting Minutes Ready: {sessionName}</span>
        </div>
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
          AI-generated meeting minutes have been created and shared with all participants
        </p>
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            if (noteId) navigateTo(`/platform/notes?noteId=${noteId}&view=editor`)
          }}
          className="gba:mt-1"
          data-testid={`meeting-minutes-view-btn-${message.id}`}
        >
          View Meeting Note
        </Button>
        <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  )
}

MeetingMinutesReadyBlock.displayName = 'MeetingMinutesReadyBlock'
