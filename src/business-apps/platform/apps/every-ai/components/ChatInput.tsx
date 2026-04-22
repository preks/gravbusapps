import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Button, Textarea, Popover, PopoverContent, PopoverTrigger, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import {
  PlusIcon,
  PaperclipIcon,
  GlobeIcon,
  PaperPlaneTiltIcon,
  CameraIcon,
  AtIcon,
  UserCircleIcon,
  LightningIcon
} from '@phosphor-icons/react'
import { useFileUploadManager, MaxNumberOfFilesError, MaxTotalSizeError } from '../hooks/useFileUploadManager'
import { VoiceModeButton } from './voice/VoiceModeButton'
import { useEntityMentions, type EntityReference } from '@/common/hooks/useEntityMentions'
import { EntityMentionPopover } from '@/common/components/entity-mentions'
import { DocumentApiService } from '@/business-apps/core/office/apps/documents/services/DocumentApiService'

// Detect if running on a mobile device with camera capabilities
function useIsMobileWithCamera(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    // Check user agent for mobile
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    const isMobileUA = mobileRegex.test(navigator.userAgent)
    // Check for media devices (camera API)
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    return (hasTouch || isMobileUA) && hasMediaDevices
  }, [])
}

type Suggestion = string | { heading?: string; message?: string }

function getUploadErrorKey(err: unknown): string {
  if (err instanceof MaxNumberOfFilesError) {
    return 'chat-upload-error-max-files'
  }
  if (err instanceof MaxTotalSizeError) {
    return 'chat-upload-error-max-size'
  }
  return 'chat-upload-error-failed'
}

function shouldSendMessage(params: { disabled?: boolean; value: string; fileCount: number }): {
  canSend: boolean
  trimmed: string
} {
  if (params.disabled) return { canSend: false, trimmed: '' }
  const trimmed = params.value.trim()
  if (!trimmed && params.fileCount === 0) return { canSend: false, trimmed }
  return { canSend: true, trimmed }
}

interface MentionPayload {
  id: string
  type: string
  display: string
}

interface ChatInputProps {
  onSend: (text: string, files: File[], isThinking: boolean, isSearching: boolean, mentions?: MentionPayload[]) => void
  onClear: () => void
  disabled?: boolean
  className?: string
  suggestions?: Suggestion[]
  isPrechatLoading?: boolean
  placeholder?: string
  // Voice mode props
  isSpeechMode?: boolean
  isListening?: boolean
  isSpeaking?: boolean
  isVoiceLoading?: boolean
  voiceVolume?: number
  onToggleVoiceMode?: () => void
  onStopSpeaking?: () => void
  /**
   * Optional callback fired as soon as the user attaches files.
   * Used for "upload early" behaviour where files are pre-uploaded before pressing Send.
   */
  onFilesAttached?: (files: File[]) => void
  // Cancel restoration props
  cancelledMessageText?: string | null
  onClearCancelledMessage?: () => void
  // Access token for entity mentions
  accessToken?: string
  /** When true, applies translucent dark mode styling for dark backgrounds */
  darkMode?: boolean
  /** When true, show fewer suggestions (e.g. in sidebar) so they fit in one row */
  compactSuggestions?: boolean
  /** Callback to open the user preferences modal */
  onOpenPreferences?: () => void
  /** Whether page-context skills are active */
  pageSkillsEnabled?: boolean
  /** Callback to toggle page-context skills on/off */
  onTogglePageSkills?: (enabled: boolean) => void
  /** Skill names currently resolved from the page context */
  activePageSkills?: string[]
}

interface StandardMenuOptionProps {
  onClick: () => void
  darkMode: boolean
  goldRgb: string
  disabled?: boolean
  label: React.ReactNode
  icon: React.ReactNode
  badge?: React.ReactNode
}

function StandardMenuOption({
  onClick,
  darkMode,
  goldRgb,
  disabled,
  label,
  icon,
  badge
}: StandardMenuOptionProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`gba:group/option gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-xl gba:px-3 gba:py-2.5 gba:text-left gba:text-sm gba:transition-all gba:duration-200 ${darkMode ? 'gba:text-white/90 hover:gba:bg-white/10' : 'gba:text-foreground'}`}
      onMouseEnter={e => {
        if (!darkMode) (e.currentTarget as HTMLButtonElement).style.background = `rgba(${goldRgb}, 0.08)`
      }}
      onMouseLeave={e => {
        if (!darkMode) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
      disabled={disabled}
    >
      <div
        className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
        style={{ background: darkMode ? 'rgba(96, 165, 250, 0.2)' : `rgba(${goldRgb}, 0.12)` }}
      >
        {icon}
      </div>
      <span className="gba:font-medium">{label}</span>
      {badge}
    </button>
  )
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onClear,
  disabled,
  className,
  suggestions,
  isPrechatLoading = false,
  placeholder,
  // Voice mode props with defaults
  isSpeechMode = false,
  isListening = false,
  isSpeaking = false,
  isVoiceLoading = false,
  voiceVolume = 0,
  onToggleVoiceMode,
  onStopSpeaking,
  onFilesAttached,
  cancelledMessageText,
  onClearCancelledMessage,
  accessToken = '',
  darkMode = false,
  compactSuggestions = false,
  onOpenPreferences,
  pageSkillsEnabled = false,
  onTogglePageSkills,
  activePageSkills = []
}) => {
  const { t } = useTranslation(translations)
  const effectivePlaceholder = placeholder ?? t('chat-input-placeholder')

  const [value, setValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const { files, uploadFile, removeFile, clearFiles } = useFileUploadManager()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)
  const isTypingInContentEditableRef = useRef(false)
  const isMobileWithCamera = useIsMobileWithCamera()

  // Document search for @mentions
  const searchDocuments = useCallback(
    async (query: string): Promise<EntityReference[]> => {
      if (!accessToken) return []
      DocumentApiService.setAccessToken(accessToken)
      const response = await DocumentApiService.listDocuments({
        search: query || undefined,
        limit: 5,
        includeShared: true
      })
      const docs = response.items ?? []
      const lowerQuery = query.toLowerCase()
      return docs
        .filter(doc => !query || (doc.title || '').toLowerCase().includes(lowerQuery))
        .map(doc => ({
          id: doc.id,
          type: 'document' as const,
          name: doc.title || 'Untitled Document',
          subtitle: `Document${doc.status ? ` • ${doc.status}` : ''}`
        }))
    },
    [accessToken]
  )

  // Entity mentions hook
  const {
    entities,
    isLoading: isMentionsLoading,
    mentionState,
    selectedEntities,
    handleTextChange,
    insertEntity,
    clearMentions,
    closeMention,
    removeMention
  } = useEntityMentions(accessToken, { insertionMode: 'markdown_link', searchDocuments })

  const handleSend = useCallback(() => {
    const { canSend, trimmed } = shouldSendMessage({ disabled, value, fileCount: files.length })
    if (!canSend) return
    const mentionPayloads: MentionPayload[] = selectedEntities.map(e => ({
      id: e.id,
      type: e.type,
      display: e.name
    }))
    onSend(
      trimmed,
      files.map(f => f.file),
      false,
      isSearching,
      mentionPayloads.length > 0 ? mentionPayloads : undefined
    )
    setValue('')
    clearFiles()
    setIsSearching(false)
    clearMentions()
  }, [value, files, onSend, clearFiles, disabled, isSearching, clearMentions, selectedEntities])

  const pickFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return
      const attachedFiles: File[] = []
      Array.from(list).forEach(file => {
        try {
          uploadFile(file)
          attachedFiles.push(file)
        } catch (err) {
          alert(t(getUploadErrorKey(err)))
        }
      })
      // Notify parent that new files were attached so they can be pre-uploaded if desired.
      if (attachedFiles.length > 0) {
        onFilesAttached?.(attachedFiles)
      }
    },
    [uploadFile, onFilesAttached]
  )

  const focusTextarea = useCallback(() => {
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [])

  // Handle text change and detect mentions
  const handleValueChange = useCallback(
    (newValue: string) => {
      setValue(newValue)
      const caretPosition = textareaRef.current?.selectionStart || newValue.length
      handleTextChange(newValue, caretPosition)
    },
    [handleTextChange]
  )

  const renderContentWithMentionsHTML = useCallback((): string => {
    if (selectedEntities.length === 0) {
      return value.replace(/\n/g, '<br>')
    }

    const sortedMentions = [...selectedEntities].sort((a, b) => a.startIndex - b.startIndex)
    let html = ''
    let lastIndex = 0

    for (const mention of sortedMentions) {
      if (mention.startIndex > lastIndex) {
        const textBefore = value.slice(lastIndex, mention.startIndex)
        html += textBefore.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
      }

      const mentionMarkdown = value.slice(mention.startIndex, mention.endIndex)
      const escapedMarkdown = mentionMarkdown
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      const escapedMentionName = mention.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      html += `<span contenteditable="false" class="mention-badge gba:inline-flex gba:align-middle gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-primary/25 gba:bg-primary/10 gba:px-1.5 gba:py-0 gba:leading-none" style="color: #007BA7; font-family: inherit; font-size: inherit; font-weight: inherit;" data-mention-id="${mention.id}" data-mention-start="${mention.startIndex}" data-mention-end="${mention.endIndex}" data-mention-markdown="${escapedMarkdown}">${escapedMentionName}</span>`
      lastIndex = mention.endIndex
    }

    if (lastIndex < value.length) {
      const textAfter = value.slice(lastIndex)
      html += textAfter.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    }

    return html || value.replace(/\n/g, '<br>')
  }, [value, selectedEntities])

  const getTextFromContentEditable = useCallback((element: HTMLElement): string => {
    const clone = element.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.mention-badge').forEach(badge => {
      const markdown = badge.getAttribute('data-mention-markdown') || ''
      const textNode = document.createTextNode(markdown)
      badge.parentNode?.replaceChild(textNode, badge)
    })
    return (clone.innerText || clone.textContent || '').replace(/\u00a0/g, ' ')
  }, [])

  const getContentEditableCaretPosition = useCallback((): number => {
    if (!contentEditableRef.current) return value.length
    const selection = globalThis.getSelection()
    if (!selection?.rangeCount) return value.length

    const range = selection.getRangeAt(0)
    const walker = document.createTreeWalker(
      contentEditableRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    )

    let position = 0
    let node: Node | null
    while ((node = walker.nextNode())) {
      if (node === range.startContainer) {
        if (node.nodeType === Node.TEXT_NODE) {
          position += range.startOffset
        }
        break
      }

      if (node.nodeType === Node.TEXT_NODE) {
        position += node.textContent?.length || 0
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        if (el.classList.contains('mention-badge')) {
          const markdown = el.getAttribute('data-mention-markdown') || ''
          position += markdown.length
        }
      }
    }

    return position
  }, [value.length])

  const removeMentionFromInput = useCallback(
    (mentionId: string, mentionStart: number) => {
      const mention = selectedEntities.find(m => m.id === mentionId && m.startIndex === mentionStart)
      if (!mention) return false

      const newValue = `${value.slice(0, mention.startIndex)}${value.slice(mention.endIndex)}`
      setValue(newValue)
      removeMention(mention)
      handleTextChange(newValue, mention.startIndex)
      return true
    },
    [selectedEntities, value, removeMention, handleTextChange]
  )

  const handleContentEditableInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      isTypingInContentEditableRef.current = true
      const newValue = getTextFromContentEditable(e.currentTarget)
      const caretPosition = getContentEditableCaretPosition()
      setValue(newValue)
      handleTextChange(newValue, Math.min(caretPosition, newValue.length))
      setTimeout(() => {
        isTypingInContentEditableRef.current = false
      }, 60)
    },
    [getTextFromContentEditable, getContentEditableCaretPosition, handleTextChange]
  )

  // Handle entity selection from mention popover
  const handleEntitySelect = useCallback(
    (entity: EntityReference) => {
      const { newText, newCaretPosition } = insertEntity(entity, value)
      setValue(newText)
      handleTextChange(newText, newCaretPosition)
      setSelectedMentionIndex(0)

      // Focus and set cursor position
      setTimeout(() => {
        if (contentEditableRef.current) {
          contentEditableRef.current.focus()
          const selection = globalThis.getSelection()
          if (selection) {
            const range = document.createRange()
            range.selectNodeContents(contentEditableRef.current)
            range.collapse(false)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        } else if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCaretPosition, newCaretPosition)
        }
      }, 0)
    },
    [insertEntity, value, handleTextChange]
  )

  // Handle @ button click - insert @ and trigger mention
  const handleAtClick = useCallback(() => {
    const currentPos =
      selectedEntities.length > 0
        ? getContentEditableCaretPosition()
        : (textareaRef.current?.selectionStart ?? value.length)
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
      if (selectedEntities.length > 0 && contentEditableRef.current) {
        contentEditableRef.current.focus()
      } else if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCaretPosition, newCaretPosition)
      }
    }, 0)
  }, [value, handleTextChange, selectedEntities.length, getContentEditableCaretPosition])

  // Check if voice mode is supported (has the callback)
  const voiceModeSupported = !!onToggleVoiceMode

  // Reset selected index when entities change
  useEffect(() => {
    setSelectedMentionIndex(0)
  }, [entities])

  // Handle keyboard navigation for mentions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
      if (e.key === 'Backspace' && selectedEntities.length > 0 && contentEditableRef.current) {
        const selection = globalThis.getSelection()
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null
        if (range) {
          const container = range.startContainer
          if (container.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
            const prevSibling = container.previousSibling
            if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
              const badge = prevSibling as Element
              if (badge.classList.contains('mention-badge')) {
                const mentionId = badge.getAttribute('data-mention-id') || ''
                const mentionStart = Number(badge.getAttribute('data-mention-start') || 0)
                if (removeMentionFromInput(mentionId, mentionStart)) {
                  e.preventDefault()
                  e.stopPropagation()
                  return
                }
              }
            }
          }
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
        if (e.key === 'Enter' && !e.shiftKey) {
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

      // Normal Enter to send (if mention popover is not open)
      if (e.key === 'Enter' && !e.shiftKey && !mentionState?.isActive) {
        e.preventDefault()
        handleSend()
      }
    },
    [
      mentionState,
      entities,
      selectedMentionIndex,
      handleEntitySelect,
      closeMention,
      handleSend,
      selectedEntities.length,
      removeMentionFromInput
    ]
  )

  // Restore cancelled message to input when cancelledMessageText changes
  useEffect(() => {
    if (cancelledMessageText) {
      setValue(cancelledMessageText)
      onClearCancelledMessage?.()
      // Focus the textarea after restoring the message
      setTimeout(() => {
        textareaRef.current?.focus()
        // Move cursor to end of text
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length
          textareaRef.current.selectionEnd = textareaRef.current.value.length
        }
      }, 0)
    }
  }, [cancelledMessageText, onClearCancelledMessage])

  useEffect(() => {
    if (!contentEditableRef.current || selectedEntities.length === 0 || isTypingInContentEditableRef.current) {
      return
    }
    const html = renderContentWithMentionsHTML()
    if (contentEditableRef.current.innerHTML !== html) {
      contentEditableRef.current.innerHTML = html
    }
  }, [renderContentWithMentionsHTML, selectedEntities.length])

  // Blue color theme for animations (matching the EveryAI hero)
  const goldRgb = '59, 130, 246' // Royal blue
  const goldSecondary = 'rgb(96, 165, 250)' // Light blue

  return (
    <>
      <style>{`
        .golden-button {
          background: linear-gradient(135deg, rgb(${goldRgb}) 0%, var(--nw-ai-secondary) 50%, rgb(${goldRgb}) 100%);
          background-size: 200% 200%;
          animation: golden-border-flow 3s ease infinite;
        }
        @keyframes golden-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(${goldRgb}, 0.15), 0 0 0 1px rgba(${goldRgb}, 0.1); }
          50% { box-shadow: 0 4px 30px rgba(${goldRgb}, 0.25), 0 0 0 1px rgba(${goldRgb}, 0.2); }
        }
        @keyframes golden-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes suggestion-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .input-container-premium {
          background: transparent;
        }
        .input-container-premium:focus-within {
          animation: golden-glow 2s ease-in-out infinite;
        }
        .golden-button {
          background: linear-gradient(135deg, rgb(${goldRgb}) 0%, var(--nw-ai-secondary) 50%, rgb(${goldRgb}) 100%);
          background-size: 200% 200%;
          animation: golden-border-flow 3s ease infinite;
        }
        .golden-button:hover {
          background: linear-gradient(135deg, rgb(${goldRgb}) 0%, var(--nw-ai-secondary) 50%, rgb(${goldRgb}) 100%);
          filter: brightness(1.1);
        }
        @keyframes chat-input-pulse-glow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(${goldRgb}, 0.35), 0 0 16px rgba(${goldRgb}, 0.2); }
          50% { box-shadow: 0 0 0 2px rgba(${goldRgb}, 0.6), 0 0 24px rgba(${goldRgb}, 0.35); }
        }
        .chat-input-pulse {
          animation: chat-input-pulse-glow 2.5s ease-in-out infinite;
        }
      `}</style>
      <div
        className="chat-input-pulse gba:relative gba:rounded-2xl gba:p-[2px] gba:min-w-0"
        data-testid="chat-input-outer"
      >
        {/* Subtle circling lighter-blue ring - uses rgba for conic-gradient animation effect */}
        <div
          className="gba:absolute gba:inset-0 gba:rounded-2xl gba:overflow-hidden gba:pointer-events-none"
          style={{
            // eslint-disable-next-line newwork-local/no-hardcoded-colors
            background: `conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(147, 197, 253, 0.5) 330deg, rgba(191, 219, 254, 0.6) 360deg)`,
            animation: 'chat-input-circle-rotate 5s linear infinite',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent calc(100% - 2px), black 100%)',
            maskImage: 'radial-gradient(circle at center, transparent calc(100% - 2px), black 100%)'
          }}
        />
        <div
          className={`gba:relative gba:rounded-2xl gba:flex gba:flex-col gba:gap-3 gba:pt-2 gba:px-2 ${disabled ? 'gba:opacity-50 gba:pointer-events-none' : ''} ${className || ''}`}
          data-testid="chat-input"
        >
          {/* Suggestions - in compact mode (sidebar) show fewer so they fit in one row */}
          {(isPrechatLoading || (suggestions && suggestions.length > 0)) && (
            <div
              className="gba:flex gba:w-full gba:max-w-full gba:min-w-0 gba:flex-nowrap gba:items-center gba:justify-start gba:gap-1.5 gba:overflow-hidden gba:-mb-1"
              data-testid="chat-input-suggestions"
            >
              {isPrechatLoading ? (
                <span className={`gba:text-xs ${darkMode ? 'gba:text-white/50' : 'gba:text-muted-foreground'}`}>
                  Loading suggestions…
                </span>
              ) : (
                (compactSuggestions ? suggestions?.slice(0, 3) : suggestions)?.map((s, idx) => {
                  const label = typeof s === 'string' ? s : s.heading || s.message || ''
                  const text = typeof s === 'string' ? s : s.message || s.heading || ''

                  if (!label || !text) return null

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`gba:flex-shrink gba:min-w-0 gba:max-w-full gba:h-6 gba:rounded-full gba:px-2.5 gba:text-[11px] gba:font-medium gba:transition-all gba:duration-200 gba:truncate ${
                        darkMode
                          ? 'gba:bg-white/10 gba:text-white/70 gba:border gba:border-white/15 hover:gba:bg-white/15 hover:gba:text-white'
                          : 'gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-secondary/80'
                      }`}
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSend(
                          text,
                          files.map(f => f.file),
                          false,
                          isSearching
                        )
                        clearFiles()
                        setIsSearching(false)
                        clearMentions()
                      }}
                      data-testid={`suggestion-${idx}`}
                    >
                      {label}
                    </button>
                  )
                })
              )}
            </div>
          )}

          {/* Page Skills toggle pill */}
          {activePageSkills.length > 0 && onTogglePageSkills && (
            <div className="gba:flex gba:items-center gba:gap-1.5">
              <button
                type="button"
                className={`gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:h-7 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                  pageSkillsEnabled
                    ? darkMode
                      ? 'gba:px-2.5 gba:bg-white/20 gba:text-white gba:border gba:border-white/25'
                      : 'gba:px-2.5 gba:bg-primary/15 gba:text-primary'
                    : darkMode
                      ? 'gba:w-7 gba:bg-white/10 gba:text-white/50 hover:gba:bg-white/20'
                      : 'gba:w-7 gba:bg-muted gba:text-muted-foreground hover:gba:bg-accent'
                }`}
                onClick={() => onTogglePageSkills(!pageSkillsEnabled)}
                title={
                  pageSkillsEnabled
                    ? `Page Skills active: ${activePageSkills.join(', ')}. Click to use general assistant.`
                    : 'Enable page-context skills for faster, focused replies'
                }
                data-testid="page-skills-toggle"
              >
                <LightningIcon
                  className="gba:h-3.5 gba:w-3.5 gba:flex-shrink-0"
                  weight={pageSkillsEnabled ? 'fill' : 'regular'}
                />
                {pageSkillsEnabled && <span>Page Skills</span>}
              </button>
            </div>
          )}

          {/* Premium File Chips with golden styling */}
          {files.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="uploaded-files">
              {files.map(f => (
                <div
                  key={f.id}
                  className="gba:group/file gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:bg-card/95 gba:px-3 gba:py-2 gba:text-xs gba:transition-all gba:duration-300"
                  style={{
                    boxShadow: `0 2px 8px rgba(${goldRgb}, 0.12), 0 0 0 1px rgba(${goldRgb}, 0.2)`
                  }}
                >
                  <div
                    className="gba:flex-shrink-0 gba:h-5 gba:w-5 gba:rounded-md gba:flex gba:items-center gba:justify-center"
                    style={{ background: `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})` }}
                  >
                    <svg className="gba:h-3 gba:w-3" fill="none" stroke="var(--nw-ai-foreground)" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="gba:truncate gba:max-w-48 gba:font-medium gba:text-foreground" title={f.file.name}>
                    {f.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    aria-label="Remove file"
                    className="gba:ml-1 gba:flex-shrink-0 gba:h-5 gba:w-5 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:text-muted-foreground hover:gba:bg-destructive/10 hover:gba:text-destructive gba:transition-all"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="gba:h-3.5 gba:w-3.5"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Container - Ultra-modern floating glass design */}
          <div className="gba:relative gba:group">
            {/* Main input container with glass morphism */}
            <div
              className="input-container-premium gba:relative gba:rounded-2xl gba:p-3 gba:transition-all gba:duration-500"
              style={{
                boxShadow: darkMode ? 'none' : `0 4px 24px rgba(${goldRgb}, 0.06), 0 0 0 1px rgba(${goldRgb}, 0.08)`,
                background: 'transparent'
              }}
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                {/* Left side: More actions menu - sleek circular button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:relative gba:h-10 gba:w-10 gba:rounded-full gba:transition-all gba:duration-300 gba:flex-shrink-0 gba:border-0"
                      style={{
                        background:
                          isSearching || files.length > 0
                            ? `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`
                            : pageSkillsEnabled
                              ? darkMode
                                ? 'hsl(var(--primary) / 0.25)'
                                : 'hsl(var(--primary) / 0.12)'
                              : darkMode
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,0,0,0.04)',
                        color:
                          isSearching || files.length > 0
                            ? 'white'
                            : pageSkillsEnabled
                              ? 'hsl(var(--primary))'
                              : darkMode
                                ? 'rgba(255,255,255,0.7)'
                                : '#666',
                        boxShadow:
                          isSearching || files.length > 0
                            ? `0 2px 12px rgba(${goldRgb}, 0.3)`
                            : pageSkillsEnabled
                              ? '0 0 0 2px hsl(var(--primary) / 0.35)'
                              : 'none'
                      }}
                      aria-label="More options"
                      title={pageSkillsEnabled ? `Page Skills active: ${activePageSkills.join(', ')}` : 'More options'}
                      disabled={disabled}
                    >
                      {pageSkillsEnabled ? (
                        <LightningIcon className="gba:h-5 gba:w-5" weight="fill" />
                      ) : (
                        <PlusIcon className="gba:h-5 gba:w-5" weight="bold" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={`gba:w-60 gba:rounded-xl gba:border-0 gba:p-2.5 ${darkMode ? '' : 'gba:bg-card/98'}`}
                    style={{
                      backdropFilter: 'blur(20px)',
                      boxShadow: darkMode
                        ? '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(147, 197, 253, 0.2)'
                        : `0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(${goldRgb}, 0.1)`,
                      background: darkMode ? 'rgba(15, 23, 42, 0.95)' : undefined
                    }}
                    side="top"
                    align="start"
                    sideOffset={12}
                  >
                    <div className="gba:flex gba:flex-col gba:gap-1">
                      {/* Attach File */}
                      <StandardMenuOption
                        onClick={() => fileInputRef.current?.click()}
                        darkMode={darkMode}
                        goldRgb={goldRgb}
                        disabled={disabled}
                        icon={
                          <PaperclipIcon
                            className="gba:h-4 gba:w-4"
                            style={{ color: darkMode ? 'rgb(147, 197, 253)' : `rgb(${goldRgb})` }}
                            weight="bold"
                          />
                        }
                        label={t('chat-menu-attach-file')}
                        badge={
                          files.length > 0 ? (
                            <span
                              className="gba:ml-auto gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-semibold"
                              style={{
                                background: darkMode
                                  ? 'rgba(96, 165, 250, 0.3)'
                                  : `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`,
                                color: darkMode ? 'white' : 'var(--nw-ai-foreground)'
                              }}
                            >
                              {files.length}
                            </span>
                          ) : null
                        }
                      />

                      {/* Take Photo - only on mobile with camera */}
                      {isMobileWithCamera && (
                        <StandardMenuOption
                          onClick={() => cameraInputRef.current?.click()}
                          darkMode={darkMode}
                          goldRgb={goldRgb}
                          disabled={disabled}
                          icon={
                            <CameraIcon
                              className="gba:h-4 gba:w-4"
                              style={{ color: darkMode ? 'rgb(147, 197, 253)' : `rgb(${goldRgb})` }}
                              weight="bold"
                            />
                          }
                          label={t('chat-menu-take-photo')}
                        />
                      )}

                      {/* Mention Entity */}
                      <button
                        onClick={() => {
                          handleAtClick()
                        }}
                        className={`gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:transition-all gba:duration-200 gba:w-full gba:text-left ${darkMode && selectedEntities.length === 0 ? 'gba:text-white/90 hover:gba:bg-white/10' : ''}`}
                        style={{
                          background: selectedEntities.length > 0 ? `rgba(${goldRgb}, 0.08)` : 'transparent',
                          color:
                            selectedEntities.length > 0
                              ? `rgb(${goldRgb})`
                              : darkMode
                                ? undefined
                                : 'var(--nw-foreground)'
                        }}
                        onMouseEnter={e => {
                          if (selectedEntities.length === 0 && !darkMode) {
                            ;(e.currentTarget as HTMLButtonElement).style.background = `rgba(${goldRgb}, 0.08)`
                          }
                        }}
                        onMouseLeave={e => {
                          if (selectedEntities.length === 0 && !darkMode) {
                            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                          }
                        }}
                        disabled={disabled}
                      >
                        <div
                          className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
                          style={{ background: darkMode ? 'rgba(96, 165, 250, 0.2)' : `rgba(${goldRgb}, 0.12)` }}
                        >
                          <AtIcon
                            className="gba:h-4 gba:w-4"
                            style={{ color: darkMode ? 'rgb(147, 197, 253)' : `rgb(${goldRgb})` }}
                            weight="bold"
                          />
                        </div>
                        <span className="gba:font-medium">{t('chat-menu-mention-entity')}</span>
                        {selectedEntities.length > 0 && (
                          <span
                            className="gba:ml-auto gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-semibold"
                            style={{
                              background: darkMode
                                ? 'rgba(96, 165, 250, 0.3)'
                                : `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`,
                              color: darkMode ? 'white' : 'var(--nw-ai-foreground)'
                            }}
                          >
                            {selectedEntities.length}
                          </span>
                        )}
                      </button>

                      {/* Web Search Toggle */}
                      <button
                        onClick={() => setIsSearching(!isSearching)}
                        className={`gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:transition-all gba:duration-200 gba:w-full gba:text-left ${darkMode && !isSearching ? 'gba:text-white/90 hover:gba:bg-white/10' : ''}`}
                        style={{
                          background: isSearching ? 'var(--nw-success)1A' : 'transparent',
                          color: isSearching ? 'var(--nw-success)' : darkMode ? undefined : 'var(--nw-foreground)'
                        }}
                        disabled={disabled}
                      >
                        <div
                          className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
                          style={{
                            background: isSearching
                              ? 'rgb(34, 197, 94)'
                              : darkMode
                                ? 'rgba(96, 165, 250, 0.2)'
                                : `rgba(${goldRgb}, 0.12)`
                          }}
                        >
                          <GlobeIcon
                            className="gba:h-4 gba:w-4"
                            style={{
                              color: isSearching
                                ? 'var(--nw-success-foreground)'
                                : darkMode
                                  ? 'rgb(147, 197, 253)'
                                  : `rgb(${goldRgb})`
                            }}
                            weight={isSearching ? 'fill' : 'bold'}
                          />
                        </div>
                        <span className="gba:font-medium">{t('chat-menu-web-search')}</span>
                        {isSearching && (
                          <span className="gba:ml-auto gba:text-xs gba:bg-success gba:text-success-foreground gba:px-2 gba:py-1 gba:rounded-full gba:font-semibold">
                            {t('chat-menu-web-search-on')}
                          </span>
                        )}
                      </button>

                      {/* Page Skills Toggle */}
                      {activePageSkills.length > 0 && onTogglePageSkills && (
                        <button
                          onClick={() => onTogglePageSkills(!pageSkillsEnabled)}
                          className={`gba:group/option gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-xl gba:text-sm gba:transition-all gba:duration-200 gba:w-full gba:text-left ${darkMode && !pageSkillsEnabled ? 'gba:text-white/90 hover:gba:bg-white/10' : ''}`}
                          style={{
                            background: pageSkillsEnabled ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                            color: pageSkillsEnabled
                              ? 'hsl(var(--primary))'
                              : darkMode
                                ? undefined
                                : 'var(--nw-foreground)'
                          }}
                          onMouseEnter={e => {
                            if (!pageSkillsEnabled && !darkMode) {
                              ;(e.currentTarget as HTMLButtonElement).style.background = `rgba(${goldRgb}, 0.08)`
                            }
                          }}
                          onMouseLeave={e => {
                            if (!pageSkillsEnabled && !darkMode) {
                              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                            }
                          }}
                          disabled={disabled}
                          data-testid="page-skills-toggle"
                        >
                          <div
                            className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-all"
                            style={{
                              background: pageSkillsEnabled
                                ? 'hsl(var(--primary) / 0.2)'
                                : darkMode
                                  ? 'rgba(96, 165, 250, 0.2)'
                                  : `rgba(${goldRgb}, 0.12)`
                            }}
                          >
                            <LightningIcon
                              className="gba:h-4 gba:w-4"
                              style={{
                                color: pageSkillsEnabled
                                  ? 'hsl(var(--primary))'
                                  : darkMode
                                    ? 'rgb(147, 197, 253)'
                                    : `rgb(${goldRgb})`
                              }}
                              weight={pageSkillsEnabled ? 'fill' : 'bold'}
                            />
                          </div>
                          <span className="gba:font-medium">Page Skills</span>
                          {pageSkillsEnabled && (
                            <span
                              className="gba:ml-auto gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-semibold"
                              style={{
                                background: 'hsl(var(--primary) / 0.2)',
                                color: 'hsl(var(--primary))'
                              }}
                            >
                              ON
                            </span>
                          )}
                        </button>
                      )}

                      {/* My Preferences */}
                      <StandardMenuOption
                        onClick={() => {
                          onOpenPreferences?.()
                        }}
                        darkMode={darkMode}
                        goldRgb={goldRgb}
                        disabled={disabled}
                        icon={
                          <UserCircleIcon
                            className="gba:h-4 gba:w-4"
                            style={{ color: darkMode ? 'rgb(147, 197, 253)' : `rgb(${goldRgb})` }}
                            weight="bold"
                          />
                        }
                        label={t('chat-menu-my-preferences')}
                      />

                      {/* Divider */}
                      <div
                        className="gba:h-px gba:my-1.5"
                        style={{
                          background: darkMode
                            ? 'linear-gradient(to right, transparent, rgba(147, 197, 253, 0.3), transparent)'
                            : `linear-gradient(to right, transparent, rgba(${goldRgb}, 0.2), transparent)`
                        }}
                      />

                      {/* New Chat */}
                      <StandardMenuOption
                        onClick={() => {
                          setValue('')
                          clearFiles()
                          clearMentions()
                          onClear()
                          focusTextarea()
                        }}
                        darkMode={darkMode}
                        goldRgb={goldRgb}
                        disabled={disabled}
                        icon={
                          <PlusIcon
                            className="gba:h-4 gba:w-4"
                            style={{ color: darkMode ? 'rgb(147, 197, 253)' : `rgb(${goldRgb})` }}
                            weight="bold"
                          />
                        }
                        label={t('chat-menu-new-chat')}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Entity Mention Popover */}
                {mentionState?.isActive && (
                  <EntityMentionPopover
                    entities={entities}
                    isLoading={isMentionsLoading}
                    onSelect={handleEntitySelect}
                    onClose={closeMention}
                    selectedIndex={selectedMentionIndex}
                    onSelectedIndexChange={setSelectedMentionIndex}
                  />
                )}

                {/* Input with inline mention chips when mentions exist */}
                {selectedEntities.length > 0 ? (
                  <div
                    ref={contentEditableRef}
                    contentEditable={!disabled}
                    suppressContentEditableWarning
                    onInput={handleContentEditableInput}
                    onKeyDown={handleKeyDown}
                    data-placeholder={effectivePlaceholder}
                    className={`gba:flex-1 gba:min-w-0 gba:min-h-10 gba:max-h-32 gba:overflow-y-auto gba:!bg-transparent focus-visible:gba:!bg-transparent gba:border-none gba:px-1 gba:py-2 gba:text-base gba:leading-relaxed focus-visible:gba:outline-none ${darkMode ? 'gba:text-white before:gba:text-white/50' : 'gba:text-foreground before:gba:text-muted-foreground'} ${!value ? 'before:content-[attr(data-placeholder)] before:pointer-events-none' : ''}`}
                    role="textbox"
                    aria-multiline="true"
                    data-testid="chat-input-contenteditable"
                  />
                ) : (
                  <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={e => handleValueChange(e.target.value)}
                    placeholder={effectivePlaceholder}
                    className={`gba:flex-1 gba:min-w-0 gba:min-h-10 gba:max-h-32 gba:resize-none gba:!bg-transparent focus-visible:gba:!bg-transparent gba:border-none gba:px-1 gba:py-2 gba:text-base gba:leading-relaxed focus-visible:gba:ring-0 ${darkMode ? 'gba:text-white gba:placeholder-white/50' : 'gba:text-foreground'}`}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                  />
                )}

                {/* Right side: Voice + Send - vertical premium stack */}
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:flex-shrink-0">
                  {/* Voice Mode Button */}
                  {voiceModeSupported && (
                    <VoiceModeButton
                      isActive={isSpeechMode}
                      isListening={isListening}
                      isSpeaking={isSpeaking}
                      isLoading={isVoiceLoading}
                      volume={voiceVolume}
                      onToggle={onToggleVoiceMode}
                      onStopSpeaking={onStopSpeaking}
                      disabled={disabled}
                      size="sm"
                    />
                  )}

                  {/* Send Button - Premium design */}
                  <Button
                    variant="default"
                    size="sm"
                    className="gba:h-10 gba:w-10 gba:rounded-full gba:border-0 gba:transition-all gba:duration-300"
                    onClick={handleSend}
                    aria-label="Send"
                    title="Send message"
                    disabled={disabled || (!value.trim() && files.length === 0)}
                    style={{
                      background:
                        !disabled && (value.trim() || files.length > 0)
                          ? darkMode
                            ? 'linear-gradient(135deg, rgb(59, 130, 246), rgb(96, 165, 250))'
                            : `linear-gradient(135deg, rgb(${goldRgb}), ${goldSecondary})`
                          : darkMode
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.06)',
                      color:
                        !disabled && (value.trim() || files.length > 0)
                          ? 'white'
                          : darkMode
                            ? 'rgba(255,255,255,0.5)'
                            : 'var(--nw-muted-foreground)',
                      boxShadow:
                        !disabled && (value.trim() || files.length > 0)
                          ? darkMode
                            ? '0 4px 16px rgba(59, 130, 246, 0.4)'
                            : `0 4px 16px rgba(${goldRgb}, 0.4)`
                          : 'none',
                      transform: !disabled && (value.trim() || files.length > 0) ? 'scale(1)' : 'scale(0.95)'
                    }}
                  >
                    <PaperPlaneTiltIcon className="gba:h-5 gba:w-5" weight="fill" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="gba:hidden"
            onChange={e => {
              const list = e.target.files
              if (list && list.length) pickFiles(list)
              if (e.target) e.target.value = ''
            }}
          />
          {/* Camera input for mobile devices */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="gba:hidden"
            onChange={e => {
              const list = e.target.files
              if (list && list.length) pickFiles(list)
              if (e.target) e.target.value = ''
            }}
          />
        </div>
      </div>
    </>
  )
}

export default ChatInput
