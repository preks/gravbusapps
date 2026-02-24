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
  t: (key: string) => string
}

export const MeetingMinutesReadyBlock: React.FC<MeetingMinutesReadyBlockProps> = ({
  message,
  formattedTime,
  navigateTo,
  t
}) => {
  const noteId = message.metadata?.noteId
  const sessionName = message.metadata?.sessionName
  const noteTitle = message.metadata?.noteTitle ?? sessionName
  const aiSummary = message.metadata?.aiSummary

  return (
    <div className="gba:flex gba:justify-center gba:py-2" data-testid={`message-minutes-ready-${message.id}`}>
      <div className="gba:flex gba:flex-col gba:items-stretch gba:gap-3 gba:bg-muted/40 gba:border gba:border-border gba:px-4 gba:py-3 gba:rounded-lg gba:max-w-md gba:w-full">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-foreground">{noteTitle}</span>
        </div>
        {!aiSummary ? (
          <p className="gba:text-xs gba:text-muted-foreground gba:text-left">
            {t('chat-meeting-minutes-created-shared')}
          </p>
        ) : null}
        {aiSummary ? (
          <div className="gba:w-full gba:rounded-md gba:bg-muted/50 gba:px-3 gba:py-2 gba:text-xs gba:border gba:border-border">
            <p className="gba:font-medium gba:text-foreground gba:mb-1">{t('chat-meeting-minutes-ai-summary')}</p>
            <p className="gba:text-muted-foreground gba:whitespace-pre-wrap">{aiSummary}</p>
          </div>
        ) : null}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (noteId) navigateTo(`/platform/notes?noteId=${noteId}&view=editor`)
            }}
            data-testid={`meeting-minutes-view-btn-${message.id}`}
          >
            {t('chat-meeting-minutes-open')}
          </Button>
          <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>
        </div>
      </div>
    </div>
  )
}

MeetingMinutesReadyBlock.displayName = 'MeetingMinutesReadyBlock'
