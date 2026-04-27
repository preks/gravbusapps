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
  const defaultEditorMessages: Required<CommentEditorMessages> = {
    cancel: t('comment-editor-cancel'),
    send: t('comment-editor-send'),
    sending: t('comment-editor-sending'),
    sendHint: t('comment-editor-send-hint')
  }
  const m = { ...defaultEditorMessages, ...messagesProp }
  const effectivePlaceholder = placeholder || t('comment-editor-placeholder-default')
  const [content, setContent] = useState(initialValue)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!content.trim()) return
    if (isSubmitting) return
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch {
      // Keep content so user can retry; parent should show error feedback
    }
  }

  const handleCancel = () => {
    setContent(initialValue)
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSubmit()
    }
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      handleCancel()
    }
  }

  const canSubmit = !!content.trim() && !isSubmitting

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        void handleSubmit(e)
      }}
      className="gba:flex gba:flex-col gba:gap-2"
      data-testid={testId}
    >
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={effectivePlaceholder}
        rows={2}
        disabled={isSubmitting}
        className="gba:resize-none gba:text-sm gba:border-border/50 focus-visible:gba:ring-primary/20 gba:min-h-[56px] gba:max-h-28 gba:overflow-y-auto"
        data-testid={`${testId}-textarea`}
      />
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:w-full">
        <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0">{m.sendHint}</span>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
              data-testid={`${testId}-cancel`}
            >
              {m.cancel}
            </Button>
          )}
          <Button type="submit" variant="default" size="sm" disabled={!canSubmit} data-testid={`${testId}-submit`}>
            <Send className="gba:h-3.5 gba:w-3.5" aria-hidden />
            {isSubmitting ? m.sending : m.send}
          </Button>
        </div>
      </div>
    </form>
  )
}
