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
  t: (key: string, opts?: Record<string, unknown>) => string
}

export const MeetingMinutesReadyBlock: React.FC<MeetingMinutesReadyBlockProps> = ({
  message,
  formattedTime,
  navigateTo,
  t
}) => {
  const noteId = message.metadata?.noteId
  const sessionName = message.metadata?.sessionName
  const startedAtRaw =
    message.metadata?.startedAt ??
    message.metadata?.sessionStartedAt ??
    message.metadata?.meetingStartedAt ??
    message.metadata?.callStartedAt
  const startedAtText = (() => {
    if (!startedAtRaw) return null
    const dt = new Date(String(startedAtRaw))
    if (Number.isNaN(dt.getTime())) return null
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dt)
  })()

  return (
    <div className="gba:flex gba:justify-center gba:py-2" data-testid={`message-minutes-ready-${message.id}`}>
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:bg-muted gba:border gba:border-border gba:px-4 gba:py-3 gba:rounded-lg gba:max-w-md">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-foreground">Meeting Minutes Ready: {sessionName}</span>
        </div>
        {startedAtText && (
          <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
            {t('chat-meeting-started-at', { startedAt: startedAtText })}
          </p>
        )}
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
          AI-generated meeting minutes have been created and shared with all participants
        </p>
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            if (noteId) navigateTo(`/platform/every-office/notes?noteId=${noteId}&view=editor`)
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
