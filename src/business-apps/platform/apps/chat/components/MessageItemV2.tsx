import React, { useState, useMemo } from 'react'
import type { Message, ConversationParticipant } from '../types'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import { ArrowBendUpLeft } from '@phosphor-icons/react'
import { renderContentWithReferences } from './EntityReferenceBadge'
import { EveryAIMessageRenderer } from './EveryAIMessageRenderer'
import { ExpertResponseRenderer } from './ExpertResponseRenderer'
import { navigateTo } from '@/common/utils/navigationUtils'
import { MessageAttachments, type MessageAttachment } from './MessageAttachments'
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog'
import { isPreviewable } from './utils/attachmentUtils'

interface MessageItemV2Props {
  message: Message
  currentUserId: string | null
  isGroupChat: boolean
  showSender?: boolean
  onReplyToAI?: () => void
  accessToken?: string
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
  participants?: ConversationParticipant[]
  previewLabel?: string // Pre-translated label for attachments
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

export const MessageItemV2: React.FC<MessageItemV2Props> = React.memo(
  ({
    message,
    currentUserId,
    isGroupChat,
    showSender = true,
    onReplyToAI,
    accessToken,
    onSendMessage,
    participants,
    previewLabel = 'Open preview'
  }) => {
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

    // State for tracking if AI message has hidden cards (form outputs not visible to others)
    const [hasHiddenResultCards, setHasHiddenResultCards] = useState(false)

    // Attachments state and handlers
    const attachments: MessageAttachment[] = message.metadata?.attachments || []

    const [preview, setPreview] = useState<{ open: boolean; att: MessageAttachment | null }>({
      open: false,
      att: null
    })
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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

    // OPTIMIZATION: Memoize AI message checks
    const isAIMessageInitiatedByCurrentUser = useMemo(
      () => message.metadata?.initiatedBy === currentUserId,
      [message.metadata?.initiatedBy, currentUserId]
    )

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
        className={`gba:flex gba:gap-2 gba:px-4 gba:py-2 ${isOwnMessage ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
        data-testid={`message-item-${message.id}`}
      >
        {/* Avatar (only show for other users in group chats) */}
        {!isOwnMessage && isGroupChat && showSender && (
          <div
            className={`gba:flex-shrink-0 ${employeeId ? 'gba:cursor-pointer' : ''}`}
            onClick={() => {
              if (employeeId) {
                navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
              }
            }}
            title={employeeId ? 'View profile' : undefined}
          >
            <Avatar size="sm">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={sender?.displayName || sender?.username || 'User'} />}
              <AvatarFallback className="gba:text-xs">
                {getInitials(sender?.displayName || sender?.username || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Message content */}
        <div className={`gba:flex gba:flex-col gba:max-w-[70%] ${isOwnMessage ? 'gba:items-end' : 'gba:items-start'}`}>
          {/* Sender name (for group chats, other users only) - but not for AI/Expert responses */}
          {!isOwnMessage && isGroupChat && showSender && sender && !isAIResponse && !isExpertResponse && (
            <span className="gba:text-xs gba:text-muted-foreground gba:mb-1">
              {sender.displayName || sender.username || 'Unknown User'}
            </span>
          )}

          {/* Message bubble - AI and Expert responses get special rendering */}
          {isAIResponse && !isExpertResponse ? (
            <>
              {/* Show special messages for form outputs or hidden cards */}
              {hasFormOutputs && !isAIMessageInitiatedByCurrentUser ? (
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
              ) : hasHiddenResultCards ? (
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
              ) : (
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
                                <ArrowBendUpLeft className="gba:w-3.5 gba:h-3.5" />
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
                      <span className="gba:text-[10px]">{formatTime(message.createdAt)}</span>
                    </div>
                  }
                />
              )}
            </>
          ) : (
            <div
              className={`gba:rounded-lg gba:px-3 gba:py-2 gba:break-words ${
                isExpertResponse
                  ? 'gba:bg-gradient-to-br gba:from-muted/50 gba:to-accent/5 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border-2'
                  : isOwnMessage
                    ? 'gba:bg-primary gba:text-primary-foreground'
                    : 'gba:bg-muted gba:text-foreground'
              }`}
              style={
                isExpertResponse && message.metadata?.expertColor
                  ? { borderColor: message.metadata.expertColor }
                  : undefined
              }
            >
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

              {/* Timestamp and Status */}
              <div className="gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-1">
                <span
                  className={`gba:text-xs ${isOwnMessage ? 'gba:text-primary-foreground gba:opacity-70' : 'gba:text-muted-foreground'}`}
                >
                  {formatTime(message.createdAt)}
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

    // Check current user (determines "own message" styling)
    if (prevProps.currentUserId !== nextProps.currentUserId) return false

    // All data same? Skip re-render
    return true
  }
)

MessageItemV2.displayName = 'MessageItemV2'
