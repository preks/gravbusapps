/**
 * CommentEditor Component
 *
 * Text input for creating and editing comments.
 */

import React, { useState } from 'react'
import { Button, Textarea, useTranslation } from '@newwork/nw-design-system'
import { Send } from 'lucide-react'
import sharedTranslations from '../_i18n'

export interface CommentEditorMessages {
  cancel?: string
  send?: string
  sending?: string
  sendHint?: string
}

export interface CommentEditorProps {
  initialValue?: string
  onSubmit: (content: string) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  placeholder?: string
  messages?: CommentEditorMessages
  'data-testid'?: string
}

/**
 * Simple comment editor with textarea
 */
export const CommentEditor: React.FC<CommentEditorProps> = ({
  initialValue = '',
  onSubmit,
  onCancel,
  isSubmitting = false,
  placeholder,
  messages: messagesProp,
  'data-testid': testId = 'comment-editor'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const defaultCommentEditorMessages = {
    cancel: t('comment-editor-cancel'),
    send: t('comment-editor-send'),
    sending: t('comment-editor-sending'),
    sendHint: t('comment-editor-send-hint')
  }
  const messages = { ...defaultCommentEditorMessages, ...messagesProp }
  const resolvedPlaceholder = placeholder ?? t('comment-editor-placeholder-default')
  const [content, setContent] = useState(initialValue)

  const handleSubmit = async () => {
    if (content.trim()) {
      await onSubmit(content.trim())
      setContent('')
    }
  }

  const handleCancel = () => {
    setContent(initialValue)
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={resolvedPlaceholder}
        rows={3}
        disabled={isSubmitting}
        className="gba:resize-none gba:text-sm gba:border-border/50 focus-visible:gba:ring-primary/20"
        data-testid={`${testId}-textarea`}
      />
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <p className="gba:text-xs gba:text-muted-foreground gba:flex-1">{messages.sendHint}</p>
        <div className="gba:flex gba:gap-1.5">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
              data-testid={`${testId}-cancel`}
              className="gba:h-8"
            >
              {messages.cancel}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            data-testid={`${testId}-submit`}
            className="gba:h-8 gba:px-3"
          >
            <Send className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
            {isSubmitting ? messages.sending : messages.send}
          </Button>
        </div>
      </div>
    </div>
  )
}
