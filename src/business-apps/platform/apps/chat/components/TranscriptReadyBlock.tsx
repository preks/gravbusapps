/**
 * Transcript-ready system message. Meeting minutes are created automatically by the backend.
 */

import React from 'react'
import { Spinner } from '@newwork/nw-design-system'
import type { Message } from '../types'

export interface TranscriptReadyBlockProps {
  message: Message
  formattedTime: string
  t: (key: string, opts?: { sessionName?: string }) => string
}

export const TranscriptReadyBlock: React.FC<TranscriptReadyBlockProps> = ({ message, formattedTime, t }) => {
  const sessionName = message.metadata?.sessionName
  const transcriptionStatus = message.metadata?.transcriptionStatus
  const effectiveStatus = transcriptionStatus ?? 'ready'

  return (
    <div className="gba:flex gba:justify-center gba:py-2" data-testid={`message-transcript-${message.id}`}>
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:bg-success-secondary/20 gba:border gba:border-success gba:px-4 gba:py-3 gba:rounded-lg gba:max-w-md">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-lg">📝</span>
          <span className="gba:text-sm gba:font-medium gba:text-foreground">
            {t('chat-transcript-ready', { sessionName })}
          </span>
        </div>
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
          {effectiveStatus === 'ready' && t('chat-transcript-minutes-automatic')}
          {effectiveStatus === 'PROCESSING' && t('chat-transcript-generating-minutes-status')}
          {effectiveStatus === 'FAILED' && t('chat-transcript-failed-create-minutes')}
          {!['ready', 'PROCESSING', 'FAILED'].includes(effectiveStatus) &&
            t('chat-transcript-create-minutes-description')}
        </p>

        {effectiveStatus === 'PROCESSING' && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
            <Spinner className="gba:h-4 gba:w-4" />
          </div>
        )}

        <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  )
}

TranscriptReadyBlock.displayName = 'TranscriptReadyBlock'
