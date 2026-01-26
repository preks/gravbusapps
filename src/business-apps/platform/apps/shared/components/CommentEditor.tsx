/**
 * CommentEditor Component
 *
 * Text input for creating and editing comments.
 */

import React, { useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Send } from 'lucide-react'

export interface CommentEditorProps {
  initialValue?: string
  onSubmit: (content: string) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  placeholder?: string
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
  placeholder = 'Write a comment...',
  'data-testid': testId = 'comment-editor'
}) => {
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
        placeholder={placeholder}
        rows={3}
        disabled={isSubmitting}
        className="gba:resize-none gba:text-sm gba:border-border/50 focus-visible:gba:ring-primary/20"
        data-testid={`${testId}-textarea`}
      />
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <p className="gba:text-xs gba:text-muted-foreground gba:flex-1">⌘+Enter to send</p>
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
              Cancel
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
            {isSubmitting ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
