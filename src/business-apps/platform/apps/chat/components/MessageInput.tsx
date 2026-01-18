import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { PaperPlaneTilt, Paperclip, At, X, File } from '@phosphor-icons/react'
import { useEntityMentions } from '../hooks/useEntityMentions'
import { EntityMentionPopover } from './EntityMentionPopover'
import type { EntityReference, MessageEntityReference } from '../types'
import type { ActiveExpert } from '../hooks/useConversationExperts'

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
  onFocusReady?: (focusFn: () => void) => void
  // Every Experts active in conversation
  activeExperts?: ActiveExpert[]
  t: (key: string, params?: Record<string, any>) => string
}

export const MessageInput: React.FC<MessageInputProps> = memo(
  ({
    onSend,
    onTypingStart,
    onTypingStop,
    disabled = false,
    placeholder,
    compact = false,
    accessToken = '',
    value: controlledValue,
    onChange,
    onRegisterMentionReady,
    onFocusReady,
    activeExperts = [],
    t
  }) => {
    const placeholderText = placeholder || t('chat-input-placeholder')
    const [uncontrolledValue, setUncontrolledValue] = useState('')
    const value = controlledValue !== undefined ? controlledValue : uncontrolledValue
    const [isTyping, setIsTyping] = useState(false)
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
    const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const hadFocusRef = useRef<boolean>(false)
    const shouldRestoreFocusRef = useRef<boolean>(false)
    const focusTimeoutsRef = useRef<NodeJS.Timeout[]>([])
    const lastProcessedPrependRef = useRef<string | null>(null)
    const isTypingRef = useRef<boolean>(false)

    const {
      entities,
      isLoading,
      mentionState,
      selectedEntities,
      handleTextChange,
      insertEntity,
      clearMentions,
      removeMention: removeMentionFromHook,
      closeMention,
      registerMentionEntity
    } = useEntityMentions(accessToken, activeExperts)

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
      if (contentEditableRef.current) {
        contentEditableRef.current.focus({ preventScroll: true })
        // Move cursor to end
        const range = document.createRange()
        const selection = window.getSelection()
        if (selection && contentEditableRef.current.lastChild) {
          range.selectNodeContents(contentEditableRef.current)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        } else if (selection) {
          range.setStart(contentEditableRef.current, contentEditableRef.current.childNodes.length)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      } else if (inputRef.current) {
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
          focusInput()
        })
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement> | React.KeyboardEvent<HTMLDivElement>) => {
      // Handle backspace to remove mentions when cursor is right after them
      if (e.key === 'Backspace' && selectedEntities.length > 0) {
        let cursorPosition = 0

        // Get cursor position in plain text (use value state as source of truth)
        if (contentEditableRef.current) {
          const selection = window.getSelection()
          if (selection?.rangeCount) {
            const range = selection.getRangeAt(0)

            // First, check if cursor is inside a mention badge
            let parentNode: Node | null = range.startContainer
            while (parentNode && parentNode !== contentEditableRef.current) {
              if (parentNode.nodeType === Node.ELEMENT_NODE) {
                const el = parentNode as Element
                if (el.classList?.contains('mention-badge')) {
                  // Cursor is inside the badge - delete the entire mention
                  const mentionId = el.getAttribute('data-mention-id')
                  const mentionStart = parseInt(el.getAttribute('data-mention-start') || '0', 10)
                  const mentionToRemove = selectedEntities.find(
                    m => m.id === mentionId && m.startIndex === mentionStart
                  )
                  if (mentionToRemove) {
                    e.preventDefault()
                    e.stopPropagation()
                    removeMention(mentionToRemove)
                    return
                  }
                }
              }
              parentNode = parentNode.parentNode
            }

            // Check if cursor is immediately after a mention badge element (most common case)
            const containerNode = range.startContainer
            if (containerNode.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
              // Cursor is at start of a text node - check if previous sibling is a mention badge
              const prevSibling = containerNode.previousSibling
              if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
                const el = prevSibling as Element
                if (el.classList?.contains('mention-badge')) {
                  // Find the mention that corresponds to this badge
                  const mentionId = el.getAttribute('data-mention-id')
                  const mentionStart = parseInt(el.getAttribute('data-mention-start') || '0', 10)
                  const mentionToRemove = selectedEntities.find(
                    m => m.id === mentionId && m.startIndex === mentionStart
                  )
                  if (mentionToRemove) {
                    e.preventDefault()
                    e.stopPropagation()
                    removeMention(mentionToRemove)
                    return
                  }
                }
              }
            }

            // Check if cursor is right after a mention badge in an element node
            if (containerNode.nodeType === Node.ELEMENT_NODE && range.startOffset > 0) {
              const el = containerNode as Element
              const childNodes = Array.from(el.childNodes)
              const prevNode = childNodes[range.startOffset - 1]
              if (prevNode && prevNode.nodeType === Node.ELEMENT_NODE) {
                const prevEl = prevNode as Element
                if (prevEl.classList?.contains('mention-badge')) {
                  const mentionId = prevEl.getAttribute('data-mention-id')
                  const mentionStart = parseInt(prevEl.getAttribute('data-mention-start') || '0', 10)
                  const mentionToRemove = selectedEntities.find(
                    m => m.id === mentionId && m.startIndex === mentionStart
                  )
                  if (mentionToRemove) {
                    e.preventDefault()
                    e.stopPropagation()
                    removeMention(mentionToRemove)
                    return
                  }
                }
              }
            }

            // Calculate cursor position by counting text before cursor, treating mention badges as their text length
            const walker = document.createTreeWalker(
              contentEditableRef.current,
              NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
              null
            )

            let position = 0
            let node
            while ((node = walker.nextNode())) {
              if (node === range.endContainer) {
                // We've reached the node containing the cursor
                if (node.nodeType === Node.TEXT_NODE) {
                  position += range.endOffset
                }
                break
              }

              if (node.nodeType === Node.TEXT_NODE) {
                position += node.textContent?.length || 0
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element
                if (el.classList?.contains('mention-badge')) {
                  // Mention badge represents "@name" in plain text - find its length
                  const mentionId = el.getAttribute('data-mention-id')
                  const mentionStart = parseInt(el.getAttribute('data-mention-start') || '0', 10)
                  const mention = selectedEntities.find(m => m.id === mentionId && m.startIndex === mentionStart)
                  if (mention) {
                    // Add the length of the mention text (@name)
                    position += mention.endIndex - mention.startIndex
                  }
                }
              }
            }
            cursorPosition = position
          } else {
            // Fallback: use current value length
            cursorPosition = value.length
          }
        } else if (inputRef.current) {
          cursorPosition = inputRef.current.selectionStart || 0
        }

        // Check if cursor is right after a mention (at mention.endIndex)
        // Also check if cursor is within the mention (user is deleting into it)
        const mentionToRemove = selectedEntities.find(
          m => cursorPosition === m.endIndex || (cursorPosition > m.startIndex && cursorPosition <= m.endIndex)
        )

        if (mentionToRemove) {
          e.preventDefault()
          e.stopPropagation()
          removeMention(mentionToRemove)
          return
        }
      }

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
      // Mark that we want to keep focus
      hadFocusRef.current = true
      shouldRestoreFocusRef.current = true

      const { newText, newCaretPosition } = insertEntity(entity, value)
      setValue(newText)
      handleTextChange(newText, newCaretPosition) // Update mention state
      setSelectedMentionIndex(0)

      // Focus input and set caret position
      setTimeout(() => {
        focusInput()
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCaretPosition, newCaretPosition)
        }
      }, 0)
      scheduleFocusRestoration()
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
        focusInput()
        if (inputRef.current) {
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

    // Expose focusInput to parent via callback
    useEffect(() => {
      if (onFocusReady) {
        onFocusReady(focusInput)
      }
    }, [onFocusReady, focusInput])

    // Helper to extract plain text from contentEditable, properly handling mention badges
    const getTextFromContentEditable = useCallback((element: HTMLElement): string => {
      // Clone to avoid modifying original
      const clone = element.cloneNode(true) as HTMLElement

      // Remove all remove buttons
      clone.querySelectorAll('.mention-remove-btn').forEach(btn => btn.remove())

      // For mention badges, replace with "@name" format
      clone.querySelectorAll('.mention-badge').forEach(badge => {
        const nameSpan = badge.querySelector('span:last-of-type') || badge.querySelector('span')
        const mentionName = nameSpan?.textContent?.trim() || ''
        const textNode = document.createTextNode(`@${mentionName} `)
        badge.parentNode?.replaceChild(textNode, badge)
      })

      // Get text content
      const text = clone.innerText || clone.textContent || ''

      // Clean up any extra spaces and return
      return text.replace(/\s+/g, ' ').trim()
    }, [])

    // Helper to render HTML with inline mention badges
    const renderContentWithMentionsHTML = useCallback((): string => {
      if (selectedEntities.length === 0) {
        return value.replace(/\n/g, '<br>')
      }

      // Sort mentions by start index
      const sortedMentions = [...selectedEntities].sort((a, b) => a.startIndex - b.startIndex)
      let html = ''
      let lastIndex = 0

      sortedMentions.forEach(mention => {
        // Add text before mention (escape HTML)
        if (mention.startIndex > lastIndex) {
          const textBefore = value.slice(lastIndex, mention.startIndex)
          html += textBefore.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
        }

        // Add mention badge as inline HTML
        const showAvatar = mention.type === 'employee' && mention.pictureThumbnail
        html += `<span contenteditable="false" class="mention-badge" data-mention-id="${mention.id}" data-mention-start="${mention.startIndex}" data-mention-end="${mention.endIndex}" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.375rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); margin: 0 0.125rem; vertical-align: middle; user-select: none; cursor: default;">`
        if (showAvatar) {
          html += `<img src="data:image/jpeg;base64,${mention.pictureThumbnail}" alt="${mention.name.replace(/"/g, '&quot;')}" style="width: 0.75rem; height: 0.75rem; border-radius: 9999px; object-fit: cover;" />`
        } else {
          // For icons, we'll use a simple text representation since we can't easily embed React components
          html += `<span style="font-size: 0.75rem;">@</span>`
        }
        html += `<span>${mention.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
        html += `<button type="button" class="mention-remove-btn" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 0.25rem; display: inline-flex; align-items: center; font-size: 1rem; line-height: 1;" data-mention-id="${mention.id}" data-mention-start="${mention.startIndex}">×</button>`
        html += `</span>`

        lastIndex = mention.endIndex
      })

      // Add remaining text
      if (lastIndex < value.length) {
        const textAfter = value.slice(lastIndex)
        html += textAfter.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
      }

      return html || value.replace(/\n/g, '<br>')
    }, [value, selectedEntities])

    // Handle contentEditable input
    const handleContentEditableInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        // Mark that we're actively typing to prevent sync effect interference
        isTypingRef.current = true

        const element = e.currentTarget
        const newText = getTextFromContentEditable(element)

        // Get cursor position before updating
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        let caretPosition = newText.length
        if (range && contentEditableRef.current) {
          const preCaretRange = range.cloneRange()
          preCaretRange.selectNodeContents(contentEditableRef.current)
          preCaretRange.setEnd(range.endContainer, range.endOffset)
          caretPosition = preCaretRange.toString().length
        }

        setValue(newText)
        handleTextChange(newText, caretPosition)

        // Only re-render HTML if mentions structure changed, not on every keystroke
        // This prevents cursor jumping issues

        // Clear the typing flag after a short delay to allow sync effect to run when typing stops
        setTimeout(() => {
          isTypingRef.current = false
        }, 100)

        // Handle typing indicators
        if (newText.length > 0 && !isTyping) {
          setIsTyping(true)
          onTypingStart()
          if (stopTypingTimerRef.current) {
            clearTimeout(stopTypingTimerRef.current)
          }
        }

        if (stopTypingTimerRef.current) {
          clearTimeout(stopTypingTimerRef.current)
        }

        stopTypingTimerRef.current = setTimeout(() => {
          if (isTyping) {
            setIsTyping(false)
            onTypingStop()
          }
        }, 2000)
      },
      [
        getTextFromContentEditable,
        setValue,
        handleTextChange,
        isTyping,
        onTypingStart,
        onTypingStop,
        selectedEntities,
        renderContentWithMentionsHTML
      ]
    )

    // Remove a mention entity
    const removeMention = useCallback(
      (mention: MessageEntityReference) => {
        // Ensure typing flag is cleared so sync effect can run
        isTypingRef.current = false

        // Calculate where cursor should be (in plain text coordinates)
        const cursorPos = mention.startIndex

        // Remove from selected entities in hook
        removeMentionFromHook(mention)

        // Remove the text from the input value
        const beforeMention = value.slice(0, mention.startIndex)
        const afterMention = value.slice(mention.endIndex)
        const newValue = beforeMention + afterMention

        // Update the text - handleTextChange will automatically adjust mention positions
        setValue(newValue)
        handleTextChange(newValue, cursorPos)

        // Wait for the sync effect to update the HTML, then restore cursor
        // Use longer timeout to ensure HTML has been updated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (contentEditableRef.current) {
              contentEditableRef.current.focus()

              // Find the correct position by counting characters
              const walker = document.createTreeWalker(contentEditableRef.current, NodeFilter.SHOW_TEXT, null)

              let currentPos = 0
              let targetNode: Node | null = null
              let targetOffset = 0
              let node

              while ((node = walker.nextNode())) {
                const textLength = node.textContent?.length || 0
                if (currentPos + textLength >= cursorPos) {
                  targetNode = node
                  targetOffset = cursorPos - currentPos
                  break
                }
                currentPos += textLength
              }

              if (targetNode) {
                const selection = window.getSelection()
                if (selection) {
                  const range = document.createRange()
                  range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0))
                  range.collapse(true)
                  selection.removeAllRanges()
                  selection.addRange(range)
                }
              }
            } else if (inputRef.current) {
              inputRef.current.focus()
              inputRef.current.setSelectionRange(cursorPos, cursorPos)
            }
          })
        })
      },
      [value, setValue, handleTextChange, removeMentionFromHook]
    )

    // Handle contentEditable click on remove button - use event delegation
    useEffect(() => {
      const container = contentEditableRef.current
      if (!container) return

      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        // Check if clicked element or its parent is the remove button
        const removeBtn = target.closest('.mention-remove-btn') as HTMLElement
        if (removeBtn && removeBtn.dataset.mentionId && removeBtn.dataset.mentionStart) {
          e.preventDefault()
          e.stopPropagation()
          const mentionId = removeBtn.dataset.mentionId
          const mentionStart = parseInt(removeBtn.dataset.mentionStart || '0', 10)
          const mention = selectedEntities.find(m => m.id === mentionId && m.startIndex === mentionStart)
          if (mention) {
            removeMention(mention)
          }
          return false
        }
      }

      container.addEventListener('click', handleClick, true) // Use capture phase
      return () => {
        container.removeEventListener('click', handleClick, true)
      }
    }, [selectedEntities, removeMention])

    // Initialize and sync contentEditable content when mentions are added/removed (not on every keystroke)
    useEffect(() => {
      // Skip if user is actively typing - prevents cursor jumping
      if (isTypingRef.current) return

      if (contentEditableRef.current && selectedEntities.length > 0) {
        const expectedHTML = renderContentWithMentionsHTML()

        // ONLY update innerHTML if it's structurally different (different HTML)
        // Don't update just because text changed - that's handled by contentEditable input
        if (contentEditableRef.current.innerHTML !== expectedHTML) {
          const selection = window.getSelection()
          const hadFocus = document.activeElement === contentEditableRef.current
          let cursorPosition = 0

          // Calculate cursor position properly, accounting for mention badges
          if (selection?.rangeCount && contentEditableRef.current) {
            const range = selection.getRangeAt(0)
            const walker = document.createTreeWalker(
              contentEditableRef.current,
              NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
              null
            )

            let position = 0
            let node
            let foundCursor = false

            while ((node = walker.nextNode()) && !foundCursor) {
              if (node === range.startContainer) {
                if (node.nodeType === Node.TEXT_NODE) {
                  position += range.startOffset
                }
                foundCursor = true
              } else if (node.nodeType === Node.TEXT_NODE) {
                position += node.textContent?.length || 0
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element
                if (el.classList?.contains('mention-badge')) {
                  const mentionId = el.getAttribute('data-mention-id')
                  const mentionStart = parseInt(el.getAttribute('data-mention-start') || '0', 10)
                  const mention = selectedEntities.find(m => m.id === mentionId && m.startIndex === mentionStart)
                  if (mention) {
                    position += mention.endIndex - mention.startIndex
                  }
                }
              }
            }

            cursorPosition = position
          }

          contentEditableRef.current.innerHTML = renderContentWithMentionsHTML()

          // Restore cursor position, accounting for mention badges
          if (hadFocus && selection) {
            requestAnimationFrame(() => {
              if (!contentEditableRef.current) return

              const range = document.createRange()
              const walker = document.createTreeWalker(
                contentEditableRef.current,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                null
              )
              let currentPos = 0
              let targetNode: Node | null = null
              let targetOffset = 0
              let node

              while ((node = walker.nextNode())) {
                if (node.nodeType === Node.TEXT_NODE) {
                  const textLength = node.textContent?.length || 0
                  if (currentPos + textLength >= cursorPosition) {
                    targetNode = node
                    targetOffset = cursorPosition - currentPos
                    break
                  }
                  currentPos += textLength
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  const el = node as Element
                  if (el.classList?.contains('mention-badge')) {
                    const mentionId = el.getAttribute('data-mention-id')
                    const mentionStart = parseInt(el.getAttribute('data-mention-start') || '0', 10)
                    const mention = selectedEntities.find(m => m.id === mentionId && m.startIndex === mentionStart)
                    const mentionLength = mention ? mention.endIndex - mention.startIndex : 0

                    if (currentPos + mentionLength >= cursorPosition) {
                      // Cursor should be after this badge
                      let nextNode: Node | null = el.nextSibling

                      // If next node is not a text node, create one
                      if (!nextNode || nextNode.nodeType !== Node.TEXT_NODE) {
                        const textNode = document.createTextNode('')
                        if (el.parentNode) {
                          el.parentNode.insertBefore(textNode, nextNode)
                        }
                        nextNode = textNode
                      }

                      targetNode = nextNode
                      targetOffset = 0
                      break
                    }
                    currentPos += mentionLength
                  }
                }
              }

              if (targetNode) {
                try {
                  range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0))
                  range.collapse(true)
                  selection.removeAllRanges()
                  selection.addRange(range)
                  contentEditableRef.current?.focus()
                } catch (e) {
                  console.warn('Could not restore cursor position:', e)
                }
              }
            })
          }
        }
      }
    }, [selectedEntities.length, renderContentWithMentionsHTML]) // Only re-run when mention count changes, not on every keystroke

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
      const activeElement = document.activeElement
      const isInputFocused = activeElement === inputRef.current
      if (hadFocusRef.current && !isInputFocused) {
        // Use requestAnimationFrame to ensure DOM is ready
        const rafId = requestAnimationFrame(() => {
          if (hadFocusRef.current) {
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
              title={t('chat-attach')}
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
              title={t('chat-mention')}
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

          {/* Text input - use contentEditable when there are mentions, regular Input otherwise */}
          <div className="gba:flex-1 gba:min-w-0">
            {selectedEntities.length > 0 ? (
              <div
                ref={contentEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentEditableInput}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                data-placeholder={placeholderText}
                className={`gba:w-full gba:bg-muted/50 gba:border-0 focus-visible:gba:ring-1 focus-visible:gba:ring-primary/50 gba:rounded-md gba:px-3 gba:py-2 gba:outline-none gba:min-h-[36px] ${
                  compact ? 'gba:h-8 gba:text-sm' : 'gba:h-9'
                } ${
                  !value && placeholderText
                    ? 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none'
                    : ''
                }`}
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
                data-testid="message-input-field"
              />
            ) : (
              <Input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholderText}
                disabled={disabled}
                className={`gba:w-full gba:bg-muted/50 gba:border-0 focus-visible:gba:ring-1 focus-visible:gba:ring-primary/50 ${
                  compact ? 'gba:h-8 gba:text-sm' : 'gba:h-9'
                }`}
                data-testid="message-input-field"
              />
            )}
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
