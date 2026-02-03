/**
 * InlineCommentPopover Component
 *
 * Floating comment input that appears near selected text, like Google Docs.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Button, Card, Textarea } from '@newwork/nw-design-system'
import { Send, X } from 'lucide-react'

export interface InlineCommentPopoverProps {
  isOpen: boolean
  position: { top: number; left: number } | null
  onSubmit: (content: string) => void
  onClose: () => void
  'data-testid'?: string
}

/**
 * Floating comment input (Google Docs style)
 */
export const InlineCommentPopover: React.FC<InlineCommentPopoverProps> = ({
  isOpen,
  position,
  onSubmit,
  onClose,
  'data-testid': testId = 'inline-comment-popover'
}) => {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim())
      setContent('')
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
              <span className="gba:text-sm gba:font-semibold">Add Comment</span>
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
      </Card>
    </div>
  )
}
