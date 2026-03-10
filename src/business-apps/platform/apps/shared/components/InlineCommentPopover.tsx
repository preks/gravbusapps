/**
 * InlineCommentPopover Component
 *
 * Floating comment input that appears near selected text, like Google Docs.
 */

import React, { useState, useEffect, useRef } from 'react'
import { AiButton, Button, Card, Textarea, useTranslation } from '@newwork/nw-design-system'
import { Send, Wand2, X } from 'lucide-react'
import sharedTranslations from '../_i18n'

export interface InlineCommentPopoverMessages {
  addComment?: string
  placeholder?: string
  comment?: string
}

export interface InlineCommentPopoverProps {
  isOpen: boolean
  position: { top: number; left: number } | null
  onSubmit: (content: string) => void
  onEditWithAI?: () => void
  onClose: () => void
  messages?: InlineCommentPopoverMessages
  'data-testid'?: string
}

/**
 * Floating comment input (Google Docs style)
 */
export const InlineCommentPopover: React.FC<InlineCommentPopoverProps> = ({
  isOpen,
  position,
  onSubmit,
  onEditWithAI,
  onClose,
  messages: messagesProp,
  'data-testid': testId = 'inline-comment-popover'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const defaultMessages: Required<InlineCommentPopoverMessages> = {
    addComment: t('inline-comment-add'),
    placeholder: t('inline-comment-placeholder'),
    comment: t('inline-comment-button')
  }
  const messages = { ...defaultMessages, ...messagesProp }
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'actions' | 'comment'>('actions')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && mode === 'comment' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, mode])

  useEffect(() => {
    if (isOpen) {
      setMode(onEditWithAI ? 'actions' : 'comment')
      setContent('')
    }
  }, [isOpen, onEditWithAI])

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim())
      setContent('')
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== 'comment') {
      if (e.key === 'Escape') {
        e.preventDefault()
        setContent('')
        onClose()
      }
      return
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setContent('')
      onClose()
    }
  }

  if (!isOpen || !position) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
      data-testid={testId}
    >
      <Card className="gba:w-80 gba:p-4 gba:border-warning/50 gba:bg-background gba:shadow-2xl">
        <div className="gba:space-y-3">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:w-6 gba:h-6 gba:rounded-md gba:bg-warning/15 gba:flex gba:items-center gba:justify-center">
                <Send className="gba:h-3.5 gba:w-3.5 gba:text-warning" />
              </div>
              <span className="gba:text-sm gba:font-semibold">
                {mode === 'actions' ? 'Selection Actions' : messages.addComment}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setContent('')
                onClose()
              }}
              className="gba:h-6 gba:w-6 gba:p-0 gba:rounded-full hover:gba:bg-muted"
              data-testid={`${testId}-cancel`}
            >
              <X className="gba:h-3.5 gba:w-3.5" />
            </Button>
          </div>

          {mode === 'actions' ? (
            <div className="gba:grid gba:grid-cols-1 gba:gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode('comment')}
                data-testid={`${testId}-action-comment`}
              >
                Add comment
              </Button>
              {onEditWithAI && (
                <AiButton
                  size="sm"
                  showIcon
                  icon={<Wand2 className="gba:w-4 gba:h-4" />}
                  iconPosition="before"
                  onClick={onEditWithAI}
                  data-testid={`${testId}-action-ai`}
                >
                  AI Edit
                </AiButton>
              )}
            </div>
          ) : (
            <>
              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a comment..."
                rows={3}
                className="gba:text-sm gba:resize-none gba:border-border/50 focus-visible:gba:ring-warning/30"
                data-testid={`${testId}-textarea`}
              />

              {/* Footer */}
              <div className="gba:flex gba:items-center gba:justify-between gba:pt-1">
                <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                  <kbd className="gba:px-1.5 gba:py-0.5 gba:text-xs gba:rounded gba:bg-muted gba:border gba:border-border">
                    ⌘
                  </kbd>
                  <span>+</span>
                  <kbd className="gba:px-1.5 gba:py-0.5 gba:text-xs gba:rounded gba:bg-muted gba:border gba:border-border">
                    Enter
                  </kbd>
                </p>
                <div className="gba:flex gba:items-center gba:gap-2">
                  {onEditWithAI && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode('actions')}
                      data-testid={`${testId}-back`}
                      className="gba:h-8 gba:px-2"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    data-testid={`${testId}-submit`}
                    className="gba:h-8 gba:px-3 gba:gap-1.5"
                  >
                    <Send className="gba:h-3.5 gba:w-3.5" />
                    <span>Comment</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
