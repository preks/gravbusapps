/**
 * Transcript-ready system message with meeting minutes creation.
 */

import React from 'react'
import { Button, Spinner, Alert, AlertDescription } from '@newwork/nw-design-system'
import type { Message } from '../types'

export interface TranscriptReadyBlockProps {
  message: Message
  formattedTime: string
  createMeetingMinutes: (sessionId: string) => void
  isCreating: boolean
  error: string | null
  t: (key: string, opts?: { sessionName?: string }) => string
}

export const TranscriptReadyBlock: React.FC<TranscriptReadyBlockProps> = ({
  message,
  formattedTime,
  createMeetingMinutes,
  isCreating,
  error,
  t
}) => {
  const sessionName = message.metadata?.sessionName
  const sessionId = message.metadata?.sessionId
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
          {t('chat-transcript-create-minutes-description')}
        </p>

        <div className="gba:flex gba:flex-col gba:gap-2 gba:w-full">
          {effectiveStatus === 'ready' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (sessionId) createMeetingMinutes(sessionId)
              }}
              disabled={isCreating || !sessionId}
              data-testid={`transcript-create-minutes-btn-${message.id}`}
            >
              {isCreating ? (
                <>
                  <Spinner className="gba:mr-2 gba:h-4 gba:w-4" />
                  {t('chat-transcript-generating-minutes')}
                </>
              ) : (
                t('chat-transcript-create-minutes-button')
              )}
            </Button>
          )}

          {effectiveStatus === 'PROCESSING' && !isCreating && (
            <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-2">
              <Spinner className="gba:inline gba:mr-2 gba:h-4 gba:w-4" />
              {t('chat-transcript-generating-minutes-status')}
            </div>
          )}

          {effectiveStatus === 'FAILED' && (
            <>
              <Alert variant="destructive" data-testid={`transcript-error-${message.id}`}>
                <AlertDescription className="gba:text-xs">
                  {t('chat-transcript-failed-create-minutes')}
                </AlertDescription>
              </Alert>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (sessionId) createMeetingMinutes(sessionId)
                }}
                disabled={isCreating || !sessionId}
                data-testid={`transcript-retry-btn-${message.id}`}
              >
                {t('chat-transcript-retry')}
              </Button>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="gba:text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  )
}

TranscriptReadyBlock.displayName = 'TranscriptReadyBlock'
