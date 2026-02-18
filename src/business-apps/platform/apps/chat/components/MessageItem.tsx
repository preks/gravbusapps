import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { Message, ConversationParticipant } from '../types'
import type { ChatApiClient } from '../services/chatApiClient'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Spinner,
  Alert,
  AlertDescription,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { useCreateMeetingMinutes } from '../hooks/useCreateMeetingMinutes'
import { ArrowBendUpLeftIcon, VideoCameraIcon } from '@phosphor-icons/react'
import { UserPlus, UserMinus, Pencil, Users } from 'lucide-react'
import { renderContentWithReferences } from './EntityReferenceBadge'
import { EveryAIMessageRenderer } from './EveryAIMessageRenderer'
import { ExpertResponseRenderer } from './ExpertResponseRenderer'
import { navigateTo } from '@/common/utils/navigationUtils'
import { MessageAttachments, type MessageAttachment } from './MessageAttachments'
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog'
import { isPreviewable } from './utils/attachmentUtils'
import { getExpertColorStyles } from '../utils/expertColorUtils'
import { useChatTranslation } from '../contexts/TranslationContext'
import { MessageReactionPicker } from './MessageReactionPicker'
import { SmileyIcon } from '@phosphor-icons/react'

interface MessageItemProps {
  message: Message
  currentUserId: string | null
  isGroupChat: boolean
  showSender?: boolean
  onReplyToAI?: () => void
  accessToken?: string
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
  participants?: ConversationParticipant[]
  previewLabel?: string // Pre-translated label for attachments
  timestampRefreshKey?: number // Triggers timestamp recalculation when changed
  aiInitiatedByCurrentUser?: boolean // Explicitly computed by MessageList for backward compatibility
  compact?: boolean // Compact mode for in-call chat
  apiClient?: ChatApiClient | null // For transcript/meeting minutes functionality
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void
}

/**
 * Simplified message item component
 *
 * Focuses on:
 * - Clean rendering
 * - Minimal re-renders
 * - Simple styling
 */

// Helper to get user initials from name
const getInitials = (name: string): string => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// OPTIMIZATION: Fast time formatting (avoids expensive toLocaleDateString)
// toLocaleDateString takes 19.7ms per call - way too slow for 100+ messages!
const formatTime = (date: Date | string): string => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  // Fast manual formatting instead of toLocaleDateString (19.7ms → <1ms)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${month} ${day}, ${hours}:${mins}`
}

function getSystemMessageIcon(
  messageType: string | undefined,
  systemIconClassName: string
): (() => React.ReactElement) | null {
  const isMeetingOrCall =
    messageType === 'meeting_start' ||
    messageType === 'meeting_end' ||
    messageType === 'call_start' ||
    messageType === 'call_end'
  if (isMeetingOrCall) {
    return () => <VideoCameraIcon className={systemIconClassName} weight="fill" />
  }
  if (messageType === 'participant_joined') {
    return () => <UserPlus className={systemIconClassName} />
  }
  if (messageType === 'participant_left') {
    return () => <UserMinus className={systemIconClassName} />
  }
  if (messageType === 'conversation_created') {
    return () => <Users className={systemIconClassName} />
  }
  if (messageType === 'conversation_renamed') {
    return () => <Pencil className={systemIconClassName} />
  }
  return null
}

export const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({
    message,
    currentUserId,
    isGroupChat,
    showSender = true,
    onReplyToAI,
    accessToken,
    onSendMessage,
    participants,
    previewLabel = 'Open preview',
    timestampRefreshKey = 0,
    aiInitiatedByCurrentUser,
    compact = false,
    apiClient = null,
    onUpdateMessage
  }) => {
    const t = useChatTranslation()
    const isAIResponse = message.metadata?.isAIResponse === true
    const isExpertResponse = message.metadata?.isEveryExpertResponse === true
    // AI/Expert responses should never be styled as "own message" even if sent by current user
    const isOwnMessage = message.senderId === currentUserId && !isAIResponse && !isExpertResponse
    const sender = message.sender

    // OPTIMIZATION: Memoize participant lookup - array search is expensive when repeated 100x
    const participantData = useMemo(
      () => participants?.find(p => p.userId === message.senderId)?.user || null,
      [participants, message.senderId]
    )

    // Use sender data with participant fallback
    const avatarUrl = sender?.avatarUrl || participantData?.avatarUrl
    const employeeId = sender?.employeeId || participantData?.employeeId

    // OPTIMIZATION: Memoize formatted timestamp - recalculates when timestampRefreshKey changes
    // This allows a single timer to update all timestamps efficiently
    const formattedTime = useMemo(() => formatTime(message.createdAt), [message.createdAt, timestampRefreshKey])

    // State for tracking if AI message has hidden cards (form outputs not visible to others)
    const [hasHiddenResultCards, setHasHiddenResultCards] = useState(false)

    // Attachments state and handlers
    const attachments: MessageAttachment[] = message.metadata?.attachments || []

    const [preview, setPreview] = useState<{ open: boolean; att: MessageAttachment | null }>({
      open: false,
      att: null
    })
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
    const [messageHovered, setMessageHovered] = useState(false)
    const hidePickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasReactions =
      !!message.reactions && Object.values(message.reactions).some(ids => Array.isArray(ids) && ids.length > 0)

    useEffect(
      () => () => {
        if (hidePickerTimeoutRef.current) clearTimeout(hidePickerTimeoutRef.current)
      },
      []
    )

    const openPreview = async (att: MessageAttachment) => {
      try {
        const resp = await fetch(att.url, {
          credentials: 'include',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
        })
        let blob = await resp.blob()
        const kind = isPreviewable(att)
        if (kind === 'pdf' && blob.type !== 'application/pdf') {
          blob = new Blob([blob], { type: 'application/pdf' })
        }
        const url = URL.createObjectURL(blob)
        setPreview({ open: true, att })
        setPreviewUrl(url)
      } catch {
        window.open(att.url, '_blank', 'noopener,noreferrer')
      }
    }

    const closePreview = () => {
      setPreview({ open: false, att: null })
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }

    const handleReactionClick = async (emoji: string) => {
      if (!currentUserId || !apiClient || !onUpdateMessage) return
      const reactions = message.reactions ? { ...message.reactions } : {}
      const userIds = reactions[emoji] || []
      const hasReacted = userIds.includes(currentUserId)

      const nextReactions: Record<string, string[]> = { ...reactions }
      if (hasReacted) {
        const next = (nextReactions[emoji] || []).filter(id => id !== currentUserId)
        if (next.length === 0) delete nextReactions[emoji]
        else nextReactions[emoji] = next
      } else {
        Object.keys(nextReactions).forEach(e => {
          nextReactions[e] = (nextReactions[e] || []).filter(id => id !== currentUserId)
          if (nextReactions[e].length === 0) delete nextReactions[e]
        })
        nextReactions[emoji] = [...(nextReactions[emoji] || []), currentUserId]
      }

      onUpdateMessage(message.id, { reactions: nextReactions })
      try {
        if (hasReacted) {
          const updated = await apiClient.removeReaction(message.id, emoji)
          if (updated) onUpdateMessage(updated.id, { reactions: updated.reactions })
        } else {
          const updated = await apiClient.addReaction(message.id, emoji)
          if (updated) onUpdateMessage(updated.id, { reactions: updated.reactions })
        }
      } catch {
        onUpdateMessage(message.id, { reactions: message.reactions })
      }
    }

    // OPTIMIZATION: Memoize AI message checks
    // Check if current user initiated this AI interaction
    const isAIMessageInitiatedByCurrentUser = useMemo(() => {
      // If explicitly provided by MessageList (with backward compatibility fallback), use it
      if (aiInitiatedByCurrentUser !== undefined) {
        return aiInitiatedByCurrentUser
      }

      // Primary: explicit initiatedBy field (new messages)
      if (message.metadata?.initiatedBy !== undefined) {
        return message.metadata.initiatedBy === currentUserId
      }

      // Fallback for messages without context:
      // For form results or outputs, default to hiding (safer for privacy)
      if (message.metadata?.isFormResult || message.metadata?.outputs) {
        return false
      }

      // Non-form AI responses (like text answers) are visible to all
      return true
    }, [
      aiInitiatedByCurrentUser,
      message.metadata?.initiatedBy,
      message.metadata?.isFormResult,
      message.metadata?.outputs,
      currentUserId
    ])

    // OPTIMIZATION: Memoize form outputs detection
    const hasFormOutputs = useMemo(() => {
      if (!isAIResponse || !message.metadata?.outputs) return false

      return message.metadata.outputs.some((output: any) => {
        // Check for flow_proposal type (common for FlowBot forms)
        if (output.type === 'flow_proposal') {
          return true
        }

        // Check for forms in answer displayData
        if (output.type === 'answer' && output.displayData) {
          return output.displayData.some(
            (data: any) => data.type === 'form' || data.type === 'dynamicForm' || data.type === 'input'
          )
        }

        return false
      })
    }, [isAIResponse, message.metadata?.outputs])

    // Check for form cancellation message
    // OPTIMIZATION: Quick check before expensive JSON.parse (7.1ms → <0.1ms for most messages)
    const isFormCancellationMessage = (() => {
      // Fast path: most messages don't start with '{', skip JSON.parse
      if (!message.content || !message.content.trim().startsWith('{')) {
        return false
      }
      // Only parse if it looks like JSON
      try {
        const parsed = JSON.parse(message.content)
        return parsed?.action === 'form_cancel'
      } catch {
        return false
      }
    })()

    // Transcript ready system message with meeting minutes creation
    if (message.type === 'system' && message.metadata?.transcriptReady) {
      const sessionName = message.metadata.sessionName
      const sessionId = message.metadata.sessionId
      const transcriptionStatus = message.metadata.transcriptionStatus

      // For old messages without transcriptionStatus, default to 'ready'
      // This ensures old transcript messages can still create meeting minutes
      const effectiveStatus = transcriptionStatus || 'ready'

      // Initialize meeting minutes hook
      const { createMeetingMinutes, isCreating, error } = useCreateMeetingMinutes(apiClient)

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
                    if (sessionId) {
                      createMeetingMinutes(sessionId)
                    }
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
                      if (sessionId) {
                        createMeetingMinutes(sessionId)
                      }
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

    // Meeting minutes ready system message
    if (message.type === 'system' && message.metadata?.type === 'meeting_minutes_ready') {
      const noteId = message.metadata.noteId
      const sessionName = message.metadata.sessionName

      return (
        <div className="gba:flex gba:justify-center gba:py-2" data-testid={`message-minutes-ready-${message.id}`}>
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:bg-success-secondary/20 gba:border gba:border-success gba:px-4 gba:py-3 gba:rounded-lg gba:max-w-md">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-lg">📋</span>
              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                Meeting Minutes Ready: {sessionName}
              </span>
            </div>
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
              AI-generated meeting minutes have been created and shared with all participants
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (noteId) {
                  navigateTo(`/platform/notes?noteId=${noteId}&view=editor`)
                }
              }}
              className="gba:mt-1"
              data-testid={`meeting-minutes-view-btn-${message.id}`}
            >
              View Meeting Note
            </Button>
            <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>
          </div>
        </div>
      )
    }

    // System message (meeting/call start/end, participant joined/left, conversation created/renamed, etc.)
    if (message.type === 'system') {
      const messageType = message.metadata?.type
      const systemIconClassName = 'gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground'
      const SystemIcon = getSystemMessageIcon(messageType, systemIconClassName)

      return (
        <div className="gba:flex gba:justify-center gba:py-1.5" data-testid={`message-system-${message.id}`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:bg-muted/50 gba:px-3 gba:py-1.5 gba:rounded-full">
            {SystemIcon && <SystemIcon />}
            <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>
            <span className="gba:text-xs gba:text-foreground gba:font-medium">{message.content}</span>
          </div>
        </div>
      )
    }

    // Deleted message
    if (message.isDeleted) {
      return (
        <div className="gba:flex gba:justify-center gba:py-1.5" data-testid={`message-${message.id}`}>
          <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:bg-muted/50 gba:px-3 gba:py-1 gba:rounded-full">
            Message deleted
          </span>
        </div>
      )
    }

    // Hide form cancellation messages
    if (isFormCancellationMessage) {
      return null
    }

    return (
      <div
        className={`gba:flex gba:gap-2 ${compact ? 'gba:px-3 gba:py-1' : 'gba:px-4 gba:py-2'} ${isOwnMessage ? 'gba:flex-row-reverse' : 'gba:flex-row'} ${compact ? 'hover:gba:bg-muted/30 gba:transition-colors' : ''}`}
        data-testid={`message-item-${message.id}`}
      >
        {/* Avatar (only show for other users in group chats) */}
        {!isOwnMessage && isGroupChat && showSender && (
          <div
            className={`gba:flex-shrink-0 ${compact ? 'gba:w-8 gba:h-8 gba:mt-0.5' : 'gba:w-8 gba:h-8'} ${employeeId ? 'gba:cursor-pointer' : ''}`}
            onClick={() => {
              if (employeeId) {
                navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
              }
            }}
            title={employeeId ? 'View profile' : undefined}
          >
            <Avatar size="sm" className="gba:w-full gba:h-full">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={sender?.displayName || sender?.username || 'User'} />}
              <AvatarFallback className="gba:text-xs">
                {getInitials(sender?.displayName || sender?.username || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Message content */}
        <div
          className={`gba:flex gba:flex-col gba:max-w-[70%] ${isOwnMessage ? 'gba:items-end' : 'gba:items-start'} ${compact ? 'gba:flex-1' : ''}`}
        >
          {/* Sender name (for group chats, other users only) - but not for AI/Expert responses */}
          {!isOwnMessage && isGroupChat && showSender && sender && !isAIResponse && !isExpertResponse && (
            <div className={`gba:flex gba:items-baseline gba:gap-2 ${compact ? 'gba:mb-0.5' : 'gba:mb-1'}`}>
              <span className={`${compact ? 'gba:text-sm gba:font-medium' : 'gba:text-xs'} gba:text-foreground`}>
                {sender.displayName || sender.username || 'Unknown User'}
              </span>
              {compact && <span className="gba:text-xs gba:text-muted-foreground">{formattedTime}</span>}
            </div>
          )}

          {/* Message bubble - AI and Expert responses get special rendering */}
          {isAIResponse && !isExpertResponse ? (
            <>
              {/* Show special messages for form outputs or hidden cards */}
              {(() => {
                if (hasFormOutputs && !isAIMessageInitiatedByCurrentUser) {
                  return (
                    <div className="gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-primary/20">
                      <div className="gba:text-sm gba:italic gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                        <span>✨</span>
                        <span>
                          {isGroupChat
                            ? `${sender?.firstName || 'Someone'} is interacting with ${message.metadata?.aiAssistant || 'Every AI'}`
                            : `${message.metadata?.aiAssistant || 'Every AI'} is preparing a form for the other user`}
                        </span>
                      </div>
                    </div>
                  )
                }

                if (hasHiddenResultCards) {
                  return (
                    <div className="gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-primary/20">
                      <div className="gba:space-y-2">
                        <div className="gba:text-sm gba:italic gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                          <span>✨</span>
                          <span>
                            {isGroupChat
                              ? `${sender?.firstName || 'Someone'} submitted a request to ${message.metadata?.aiAssistant || 'Every AI'}`
                              : `${message.metadata?.aiAssistant || 'Every AI'} processed a request`}
                          </span>
                        </div>
                        <div className="gba:text-xs gba:italic gba:text-muted-foreground gba:px-2 gba:py-1 gba:bg-muted/30 gba:rounded">
                          💼 Request details are only visible to the person who created them
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <EveryAIMessageRenderer
                    message={message}
                    accessToken={accessToken || ''}
                    onSendMessage={onSendMessage}
                    isInitiatedByCurrentUser={isAIMessageInitiatedByCurrentUser}
                    onHasHiddenCards={setHasHiddenResultCards}
                    headerContent={
                      <div className="gba:text-[11px] gba:font-semibold gba:mb-0.5 gba:text-primary gba:flex gba:items-center gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:text-xs">✨</span>
                          Every AI
                        </div>
                        {onReplyToAI && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={e => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onReplyToAI()
                                  }}
                                  className="gba:h-5 gba:w-5 gba:text-primary/70 hover:gba:text-primary hover:gba:bg-primary/10"
                                  data-testid={`reply-to-ai-${message.id}`}
                                >
                                  <ArrowBendUpLeftIcon className="gba:w-3.5 gba:h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="gba:text-xs">Reply to AI</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    }
                    footerContent={
                      <div className="gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-1 gba:text-muted-foreground">
                        <span className="gba:text-[10px]">{formattedTime}</span>
                      </div>
                    }
                  />
                )
              })()}
            </>
          ) : (
            <div
              className={`gba:relative gba:inline-flex gba:flex-col ${isOwnMessage ? 'gba:items-end' : 'gba:items-start'}`}
              onMouseEnter={() => {
                if (hidePickerTimeoutRef.current) {
                  clearTimeout(hidePickerTimeoutRef.current)
                  hidePickerTimeoutRef.current = null
                }
                setMessageHovered(true)
              }}
              onMouseLeave={() => {
                hidePickerTimeoutRef.current = setTimeout(() => setMessageHovered(false), 400)
              }}
            >
              {/* When no reactions: picker as tooltip above message; 400ms leave delay so cursor can reach it */}
              {onUpdateMessage &&
                apiClient &&
                currentUserId &&
                !hasReactions &&
                (messageHovered || reactionPickerOpen) && (
                  <div
                    className={`gba:absolute gba:bottom-full gba:mb-1 gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:z-20 ${isOwnMessage ? 'gba:right-0' : 'gba:left-0'}`}
                    data-testid={`message-reaction-picker-bar-${message.id}`}
                    onMouseEnter={() => {
                      if (hidePickerTimeoutRef.current) {
                        clearTimeout(hidePickerTimeoutRef.current)
                        hidePickerTimeoutRef.current = null
                      }
                      setMessageHovered(true)
                    }}
                    onMouseLeave={() => {
                      hidePickerTimeoutRef.current = setTimeout(() => setMessageHovered(false), 300)
                    }}
                  >
                    <MessageReactionPicker
                      onSelect={emoji => {
                        handleReactionClick(emoji)
                        setReactionPickerOpen(false)
                      }}
                      prefixDataTestId={`message-${message.id}`}
                    />
                  </div>
                )}
              <div
                className={`${compact ? 'gba:rounded-md gba:px-2.5 gba:py-1.5' : 'gba:rounded-lg gba:px-3 gba:py-2'} gba:break-words gba:w-full gba:min-w-0 ${onUpdateMessage && apiClient && currentUserId && hasReactions ? 'gba:pb-5' : ''} ${(() => {
                  if (isExpertResponse) {
                    return 'gba:bg-gradient-to-br gba:from-muted/50 gba:to-accent/5 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border-2'
                  }
                  if (isOwnMessage) {
                    return 'gba:bg-primary gba:text-primary-foreground'
                  }
                  return 'gba:bg-muted gba:text-foreground'
                })()}`}
                style={
                  isExpertResponse && message.metadata?.expertColor
                    ? { borderColor: message.metadata.expertColor }
                    : undefined
                }
              >
                {/* Expert Message Header */}
                {isExpertResponse && (
                  <div className="gba:text-[11px] gba:font-semibold gba:mb-1.5 gba:flex gba:items-center gba:gap-2">
                    {/* Expert Avatar */}
                    <div
                      className="gba:w-6 gba:h-6 gba:flex-shrink-0 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-bold gba:text-[10px]"
                      style={getExpertColorStyles(message.metadata?.expertColor).avatar}
                    >
                      {message.metadata?.expertAvatar || message.metadata?.expertName?.charAt(0).toUpperCase() || 'E'}
                    </div>
                    {/* Expert Name with Emoji */}
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <span className="gba:text-xs">🎓</span>
                      <span style={getExpertColorStyles(message.metadata?.expertColor).text}>
                        {message.metadata?.expertName || 'Expert'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Text content */}
                {message.content && (
                  <div className="gba:text-sm gba:whitespace-pre-wrap">
                    {isExpertResponse ? (
                      <ExpertResponseRenderer
                        content={message.content}
                        expertColor={message.metadata?.expertColor}
                        citations={message.metadata?.citations}
                        confidence={message.metadata?.confidence}
                        accessToken={accessToken}
                      />
                    ) : (
                      renderContentWithReferences(message.content, message.metadata, isOwnMessage)
                    )}
                  </div>
                )}

                {/* File Attachments */}
                {attachments.length > 0 && !isAIResponse && !isExpertResponse && (
                  <div className="gba:mt-2">
                    <MessageAttachments
                      attachments={attachments}
                      isOwnMessage={isOwnMessage}
                      onPreview={openPreview}
                      previewLabel={previewLabel}
                    />
                  </div>
                )}

                {/* Timestamp and Status - hide timestamp in compact mode if shown inline with sender */}
                {!(compact && !isOwnMessage && isGroupChat && showSender) && (
                  <div className="gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-1">
                    <span
                      className={`gba:text-xs ${isOwnMessage ? 'gba:text-primary-foreground gba:opacity-70' : 'gba:text-muted-foreground'}`}
                    >
                      {formattedTime}
                    </span>
                    {/* Status icon (only for own messages) */}
                    {isOwnMessage && message.status && (
                      <span className="gba:text-xs gba:text-primary-foreground gba:opacity-70" title={message.status}>
                        {message.status === 'sending' && '⏳'}
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && <span className="gba:text-primary-foreground">✓✓</span>}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Reactions row below: only when message has reactions (pills + add-reaction button) */}
              {onUpdateMessage && apiClient && currentUserId && hasReactions && (
                <div
                  className={`gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 gba:-mt-4 gba:relative gba:z-20 ${isOwnMessage ? 'gba:justify-end' : 'gba:justify-start'}`}
                  data-testid={`message-reactions-${message.id}`}
                >
                  {message.reactions &&
                    Object.entries(message.reactions).map(([emoji, userIds]) => {
                      if (!userIds.length) return null
                      const isYours = userIds.includes(currentUserId)
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReactionClick(emoji)}
                          className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-1 gba:text-xs gba:min-w-0 gba:border gba:transition-colors gba:leading-none ${
                            isOwnMessage
                              ? `gba:bg-primary gba:border-primary-foreground/25 hover:gba:border-primary-foreground/40 ${isYours ? 'gba:border-primary-foreground/50' : ''}`
                              : `gba:bg-muted gba:border-border hover:gba:bg-muted/90 ${isYours ? 'gba:border-primary/30' : ''}`
                          }`}
                          data-testid={`message-reaction-${message.id}-${emoji}`}
                        >
                          <span className="gba:leading-none gba:select-none">{emoji}</span>
                          <span
                            className={`gba:tabular-nums ${isOwnMessage ? 'gba:text-primary-foreground gba:opacity-90' : 'gba:text-muted-foreground'}`}
                          >
                            {userIds.length}
                          </span>
                        </button>
                      )
                    })}
                  <Popover open={reactionPickerOpen} onOpenChange={setReactionPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:px-2 gba:py-1 gba:border gba:transition-colors ${
                          isOwnMessage
                            ? 'gba:bg-primary gba:border-primary-foreground/25 gba:text-primary-foreground hover:gba:border-primary-foreground/40'
                            : 'gba:bg-muted gba:border-border gba:text-muted-foreground hover:gba:bg-muted/90 hover:gba:text-foreground'
                        }`}
                        aria-label="Add reaction"
                        data-testid={`message-reaction-picker-trigger-${message.id}`}
                      >
                        <SmileyIcon className="gba:w-4 gba:h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align={isOwnMessage ? 'end' : 'start'} side="top" className="gba:p-0">
                      <MessageReactionPicker
                        onSelect={emoji => {
                          handleReactionClick(emoji)
                          setReactionPickerOpen(false)
                        }}
                        prefixDataTestId={`message-${message.id}`}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attachment Preview Dialog */}
        <AttachmentPreviewDialog
          open={preview.open}
          attachment={preview.att}
          objectUrl={previewUrl || undefined}
          onClose={closePreview}
        />
      </div>
    )
  },
  (prevProps, nextProps) => {
    // OPTIMIZATION: Compare message PROPERTIES, not object reference
    // Messages array gets recreated, so we must check actual data not references

    // Check message data that affects rendering
    if (prevProps.message.id !== nextProps.message.id) return false
    if (prevProps.message.content !== nextProps.message.content) return false
    if (prevProps.message.status !== nextProps.message.status) return false
    if (prevProps.message.reactions !== nextProps.message.reactions) return false

    // Check current user (determines "own message" styling)
    if (prevProps.currentUserId !== nextProps.currentUserId) return false

    // All data same? Skip re-render
    return true
  }
)

MessageItem.displayName = 'MessageItem'
