import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { PaperPlaneTilt, Paperclip, At, X, File } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEntityMentions } from '../hooks/useEntityMentions'
import { EntityMentionPopover } from './EntityMentionPopover'
import type { EntityReference, MessageEntityReference } from '../types'

// Persist focus state across unmounts caused by parent re-renders
let lastHadFocus = false

interface Attachment {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document'
}

interface MessageInputProps {
  onSend: (content: string, entityReferences?: MessageEntityReference[], attachments?: Attachment[]) => void
  onTypingStart: () => void
  onTypingStop: () => void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
  accessToken?: string
  // controlled value from parent
  value?: string
  onChange?: (v: string) => void
  // Callback to get registerMentionEntity function for external use
  onRegisterMentionReady?: (
    registerFn: (entity: EntityReference, text: string, startIndex: number) => MessageEntityReference
  ) => void
}

export const MessageInput: React.FC<MessageInputProps> = memo(
  ({
    onSend,
    onTypingStart,
    onTypingStop,
    disabled = false,
    placeholder = getTranslationFromI18nKeyAndLabel('chat.input.placeholder', 'Type a message...'),
    compact = false,
    accessToken = '',
    value: controlledValue,
    onChange,
    onRegisterMentionReady
  }) => {
    const [uncontrolledValue, setUncontrolledValue] = useState('')
    const value = controlledValue !== undefined ? controlledValue : uncontrolledValue
    const [isTyping, setIsTyping] = useState(false)
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
    const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const hadFocusRef = useRef<boolean>(false)
    const shouldRestoreFocusRef = useRef<boolean>(false)
    const focusTimeoutsRef = useRef<NodeJS.Timeout[]>([])
    const lastProcessedPrependRef = useRef<string | null>(null)

    const {
      entities,
      isLoading,
      mentionState,
      selectedEntities,
      handleTextChange,
      insertEntity,
      clearMentions,
      closeMention,
      registerMentionEntity
    } = useEntityMentions(accessToken)

    // Helper to update value (works for both controlled and uncontrolled)
    const setValue = useCallback(
      (newValue: string) => {
        if (controlledValue !== undefined) {
          onChange?.(newValue)
        } else {
          setUncontrolledValue(newValue)
        }
      },
      [controlledValue, onChange]
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      const caretPosition = e.target.selectionStart || newValue.length

      if (controlledValue !== undefined) {
        onChange?.(newValue)
      } else {
        setUncontrolledValue(newValue)
      }
      handleTextChange(newValue, caretPosition)

      // Handle typing indicators
      if (newValue.length > 0 && !isTyping) {
        setIsTyping(true)
        onTypingStart()

        // Clear any existing stop timer
        if (stopTypingTimerRef.current) {
          clearTimeout(stopTypingTimerRef.current)
        }
      }

      // Reset stop typing timer
      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current)
      }

      stopTypingTimerRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false)
          onTypingStop()
        }
      }, 2000)
    }

    const focusInput = useCallback(() => {
      if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true })
        const cursorPosition = inputRef.current.value.length
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
      }
    }, [])

    const scheduleFocusRestoration = useCallback(() => {
      // Clear any pending focus attempts
      focusTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
      focusTimeoutsRef.current = []

      const focusDelays = [0, 16, 40, 80, 150, 250, 400]
      focusDelays.forEach(delay => {
        const timeoutId = setTimeout(() => {
          if (hadFocusRef.current || shouldRestoreFocusRef.current) {
            focusInput()
          }
        }, delay)
        focusTimeoutsRef.current.push(timeoutId)
      })
    }, [focusInput])

    const handleSend = () => {
      if ((value.trim() || attachments.length > 0) && !disabled) {
        // Mark that we want to keep focus
        hadFocusRef.current = true
        shouldRestoreFocusRef.current = true

        // Ensure @Every is registered as a mention if text starts with it
        let entitiesToSend = selectedEntities
        const trimmedValue = value.trim()
        if (trimmedValue.startsWith('@Every ')) {
          const hasEveryMention = selectedEntities.some(
            e => e.type === 'ai_assistant' && e.id === 'every-ai-assistant' && e.startIndex === 0
          )
          if (!hasEveryMention) {
            const EVERY_AI_ENTITY: EntityReference = {
              id: 'every-ai-assistant',
              type: 'ai_assistant',
              name: 'Every',
              subtitle: 'AI Assistant • Ask me anything'
            }
            const registeredEntity = registerMentionEntity(EVERY_AI_ENTITY, trimmedValue, 0)
            entitiesToSend = [...selectedEntities, registeredEntity]
          }
        }

        onSend(
          trimmedValue,
          entitiesToSend.length > 0 ? entitiesToSend : undefined,
          attachments.length > 0 ? attachments : undefined
        )
        if (controlledValue !== undefined) {
          onChange?.('')
        } else {
          setUncontrolledValue('')
        }
        setAttachments([])
        setIsTyping(false)
        onTypingStop()
        clearMentions()

        // Clear timers
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current)
        }
        if (stopTypingTimerRef.current) {
          clearTimeout(stopTypingTimerRef.current)
        }

        scheduleFocusRestoration()
        // Extra focus attempt after send to combat platform steals
        requestAnimationFrame(() => {
          inputRef.current?.focus()
        })
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // If mention popover is open, handle navigation
      if (mentionState?.isActive && entities.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          e.stopPropagation()
          setSelectedMentionIndex(prev => Math.min(prev + 1, entities.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          e.stopPropagation()
          setSelectedMentionIndex(prev => Math.max(prev - 1, 0))
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          handleEntitySelect(entities[selectedMentionIndex])
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          closeMention()
          return
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          handleEntitySelect(entities[selectedMentionIndex])
          return
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        handleSend()
      }
    }

    const handleEntitySelect = (entity: EntityReference) => {
      const { newText, newCaretPosition } = insertEntity(entity, value)
      setValue(newText)
      handleTextChange(newText, newCaretPosition) // Update mention state
      setSelectedMentionIndex(0)

      // Focus input and set caret position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(newCaretPosition, newCaretPosition)
        }
      }, 0)
    }

    // Handle @ button click - insert @ and trigger mention
    const handleAtClick = () => {
      const currentPos = inputRef.current?.selectionStart || value.length
      const beforeCursor = value.slice(0, currentPos)
      const afterCursor = value.slice(currentPos)

      // Add @ at cursor position (with space before if needed)
      const needsSpace = beforeCursor.length > 0 && !beforeCursor.endsWith(' ')
      const newValue = beforeCursor + (needsSpace ? ' @' : '@') + afterCursor
      const newCaretPosition = currentPos + (needsSpace ? 2 : 1)

      setValue(newValue)
      handleTextChange(newValue, newCaretPosition)

      // Focus and set cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(newCaretPosition, newCaretPosition)
        }
      }, 0)
    }

    // Handle attach button click
    const handleAttachClick = () => {
      fileInputRef.current?.click()
    }

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      const newAttachments: Attachment[] = files.map(file => {
        const isImage = file.type.startsWith('image/')
        const attachment: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          type: isImage ? 'image' : 'document'
        }

        // Create preview for images
        if (isImage) {
          attachment.preview = URL.createObjectURL(file)
        }

        return attachment
      })

      setAttachments(prev => [...prev, ...newAttachments])

      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Focus back on input
      inputRef.current?.focus()
    }

    // Remove attachment
    const removeAttachment = (attachmentId: string) => {
      setAttachments(prev => {
        const attachment = prev.find(a => a.id === attachmentId)
        if (attachment?.preview) {
          URL.revokeObjectURL(attachment.preview)
        }
        return prev.filter(a => a.id !== attachmentId)
      })
    }

    // Debug mount/unmount to detect remounts that could wipe state
    useEffect(() => {
      console.debug('[MessageInput] mount')
      return () => {
        console.debug('[MessageInput] unmount')
      }
    }, [])

    // Reset selected index when entities change
    useEffect(() => {
      setSelectedMentionIndex(0)
    }, [entities])

    // (Deprecated) prepend handling removed; now controlled in parent to avoid loops
    useEffect(() => {
      lastProcessedPrependRef.current = null
    }, [])

    // Expose registerMentionEntity to parent via callback
    useEffect(() => {
      if (onRegisterMentionReady) {
        onRegisterMentionReady(registerMentionEntity)
      }
    }, [onRegisterMentionReady, registerMentionEntity])

    // Track focus state and restore it after re-renders
    const handleFocus = useCallback(() => {
      hadFocusRef.current = true
      lastHadFocus = true
    }, [])

    const handleBlur = useCallback(
      (e: React.FocusEvent) => {
        const relatedTarget = e.relatedTarget as HTMLElement | null
        const container = e.currentTarget.closest('[data-testid="message-input"]')

        if (!relatedTarget) {
          // Focus left to body (platform steals it) - immediately plan to restore
          shouldRestoreFocusRef.current = true
          lastHadFocus = true // Keep module-level flag set
          scheduleFocusRestoration()
          return
        }

        if (!container?.contains(relatedTarget)) {
          // Only clear if focus truly left our component tree
          hadFocusRef.current = false
          // Don't clear lastHadFocus here - keep it set if we want to restore
        }
      },
      [scheduleFocusRestoration]
    )

    // Restore focus after re-renders if we had focus - run on every render
    useLayoutEffect(() => {
      // Restore focus if this input had focus before unmount
      if ((shouldRestoreFocusRef.current || lastHadFocus) && inputRef.current) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (inputRef.current && (shouldRestoreFocusRef.current || lastHadFocus)) {
            focusInput()
            shouldRestoreFocusRef.current = false
          }
        })
      }
    }) // No dependencies - run on every render to catch remounts

    useEffect(() => {
      if (hadFocusRef.current && inputRef.current && document.activeElement !== inputRef.current) {
        // Use requestAnimationFrame to ensure DOM is ready
        const rafId = requestAnimationFrame(() => {
          if (hadFocusRef.current && inputRef.current && document.activeElement !== inputRef.current) {
            focusInput()
          }
        })
        return () => cancelAnimationFrame(rafId)
      }
      return undefined
    }, [focusInput])

    const handleToolbarMouseDown = useCallback(
      (event: React.MouseEvent) => {
        event.preventDefault()
        hadFocusRef.current = true
        shouldRestoreFocusRef.current = true
        scheduleFocusRestoration()
      },
      [scheduleFocusRestoration]
    )

    // Cleanup timers and object URLs on unmount
    useEffect(() => {
      return () => {
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current)
        }
        if (stopTypingTimerRef.current) {
          clearTimeout(stopTypingTimerRef.current)
        }
        // Clear pending focus attempts
        focusTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
        // Cleanup attachment previews
        attachments.forEach(a => {
          if (a.preview) URL.revokeObjectURL(a.preview)
        })
      }
    }, [])

    const hasContent = value.trim() || attachments.length > 0

    return (
      <div
        className="gba:flex gba:flex-col gba:border-t gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:flex-shrink-0"
        data-testid="message-input"
      >
        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="gba:flex gba:gap-2 gba:p-2 gba:pb-0 gba:flex-wrap">
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className="gba:relative gba:group gba:rounded-lg gba:border gba:border-border gba:overflow-hidden gba:bg-muted/30"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.file.name}
                    className="gba:w-16 gba:h-16 gba:object-cover"
                  />
                ) : (
                  <div className="gba:w-16 gba:h-16 gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-1">
                    <File className="gba:w-6 gba:h-6 gba:text-muted-foreground" />
                    <span className="gba:text-[8px] gba:text-muted-foreground gba:truncate gba:max-w-full gba:px-1">
                      {attachment.file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="gba:absolute gba:top-0.5 gba:right-0.5 gba:w-4 gba:h-4 gba:rounded-full gba:bg-background/80 gba:flex gba:items-center gba:justify-center gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
                  data-testid={`remove-attachment-${attachment.id}`}
                >
                  <X className="gba:w-3 gba:h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div
          className={`gba:relative gba:flex gba:items-center ${compact ? 'gba:gap-1 gba:p-2' : 'gba:gap-1.5 gba:p-3'}`}
        >
          {/* Entity Mention Popover */}
          {mentionState?.isActive && (
            <EntityMentionPopover
              entities={entities}
              isLoading={isLoading}
              onSelect={handleEntitySelect}
              onClose={closeMention}
              selectedIndex={selectedMentionIndex}
              onSelectedIndexChange={setSelectedMentionIndex}
            />
          )}

          {/* Toolbar buttons */}
          <div className="gba:flex gba:items-center gba:gap-0.5">
            {/* Attach button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAttachClick}
              onMouseDown={handleToolbarMouseDown}
              disabled={disabled}
              className={`gba:flex-shrink-0 gba:text-muted-foreground gba:hover:text-foreground ${
                compact ? 'gba:h-7 gba:w-7' : 'gba:h-8 gba:w-8'
              }`}
              title={getTranslationFromI18nKeyAndLabel('chat.attach', 'Attach file')}
              data-testid="message-attach-button"
            >
              <Paperclip className={compact ? 'gba:w-4 gba:h-4' : 'gba:w-4.5 gba:h-4.5'} />
            </Button>

            {/* @ Mention button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAtClick}
              onMouseDown={handleToolbarMouseDown}
              disabled={disabled}
              className={`gba:flex-shrink-0 gba:text-muted-foreground gba:hover:text-foreground ${
                compact ? 'gba:h-7 gba:w-7' : 'gba:h-8 gba:w-8'
              }`}
              title={getTranslationFromI18nKeyAndLabel('chat.mention', 'Mention entity')}
              data-testid="message-mention-button"
            >
              <At className={compact ? 'gba:w-4 gba:h-4' : 'gba:w-4.5 gba:h-4.5'} />
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            onChange={handleFileChange}
            className="gba:hidden"
            data-testid="message-file-input"
          />

          {/* Text input */}
          <div className="gba:flex-1 gba:min-w-0">
            <Input
              ref={inputRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled}
              className={`gba:w-full gba:bg-muted/50 gba:border-0 focus-visible:gba:ring-1 focus-visible:gba:ring-primary/50 ${
                compact ? 'gba:h-8 gba:text-sm' : 'gba:h-9'
              }`}
              data-testid="message-input-field"
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!hasContent || disabled}
            size="icon"
            onMouseDown={handleToolbarMouseDown}
            className={`gba:flex-shrink-0 gba:rounded-full gba:transition-all ${
              compact ? 'gba:h-8 gba:w-8' : 'gba:h-9 gba:w-9'
            } ${
              hasContent && !disabled
                ? 'gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90'
                : 'gba:bg-muted gba:text-muted-foreground'
            }`}
            data-testid="message-send-button"
          >
            <PaperPlaneTilt className={compact ? 'gba:w-3.5 gba:h-3.5' : 'gba:w-4 gba:h-4'} />
          </Button>
        </div>
      </div>
    )
  }
)

MessageInput.displayName = 'MessageInput'
