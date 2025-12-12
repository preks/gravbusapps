import React, { useMemo, useState } from 'react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Button
} from '@newwork/nw-design-system'
import { ArrowBendUpLeft } from '@phosphor-icons/react'
import type { Message, ConversationParticipant } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatTime, formatFullTimestamp, getStatusIcon } from './utils/messageUtils'
import { isPreviewable } from './utils/attachmentUtils'
import { renderContentWithReferences } from './EntityReferenceBadge'
import { EveryAIMessageRenderer } from './EveryAIMessageRenderer'
import { ExpertResponseRenderer } from './ExpertResponseRenderer'
import { MessageAttachments, type MessageAttachment } from './MessageAttachments'
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog'

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

interface MessageItemProps {
  message: Message
  currentUserId: string | null
  isGroupChat: boolean
  accessToken?: string
  participants?: ConversationParticipant[]
  onReplyToAI?: () => void
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
}

const MessageItemComponent: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  isGroupChat,
  accessToken,
  participants,
  onReplyToAI,
  onSendMessage
}) => {
  const isAIResponse = message.metadata?.isAIResponse === true
  const isExpertResponse = message.metadata?.isEveryExpertResponse === true
  // AI/Expert responses should never be styled as "own message" even if sent by current user
  const isOwnMessage = message.senderId === currentUserId && !isAIResponse && !isExpertResponse
  const sender = message.sender

  // Track if AI renderer has hidden cards (for form results)
  const [hasHiddenResultCards, setHasHiddenResultCards] = useState(false)

  // Check if AI message was initiated by current user
  // IMPORTANT: We need to check if senderId matches, but the backend might be changing it!
  // The metadata.originalQuestion might give us a clue, or we need a dedicated field
  const isAIMessageInitiatedByCurrentUser = isAIResponse && message.senderId === currentUserId

  // Check if message has form outputs (outputs with forms/inputs)
  // Forms can appear as:
  // 1. flow_proposal type (FlowBot forms)
  // 2. answer type with displayData containing form/dynamicForm/input
  const hasFormOutputs =
    isAIResponse &&
    message.metadata?.outputs?.some((output: any) => {
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

  // Check if message is a form cancellation JSON (should be hidden from UI)
  const isFormCancellationMessage = useMemo(() => {
    try {
      const parsed = JSON.parse(message.content)
      return parsed?.action === 'form_cancel'
    } catch {
      return false
    }
  }, [message.content])

  // Hide form cancellation messages from UI (they're only for form state tracking)
  if (isFormCancellationMessage) {
    return null
  }

  // Look up avatar and employeeId from conversation participants if not in sender
  const participantData = useMemo(() => {
    if (!participants) return null
    const participant = participants.find(p => p.userId === message.senderId)
    return participant?.user
  }, [participants, message.senderId])

  // Use sender data first, then fall back to participant data for avatar and employeeId
  const avatarUrl = sender?.avatarUrl || participantData?.avatarUrl
  const employeeId = sender?.employeeId || participantData?.employeeId
  const attachments: MessageAttachment[] = useMemo(() => message.metadata?.attachments || [], [message.metadata])

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

  // Deleted message
  if (message.isDeleted) {
    return (
      <div className="gba:flex gba:justify-center gba:py-1.5" data-testid={`message-${message.id}`}>
        <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:bg-muted/50 gba:px-3 gba:py-1 gba:rounded-full">
          {getTranslationFromI18nKeyAndLabel('chat.message.deleted', 'Message deleted')}
        </span>
      </div>
    )
  }

  const statusText = getStatusIcon(message.status)

  return (
    <>
      <div
        className={`gba:flex gba:gap-2 gba:mb-1 ${isOwnMessage ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
        data-testid={`message-${message.id}`}
      >
        {/* Avatar for AI responses - shown in all chat types */}
        {isAIResponse && !isExpertResponse && (
          <div className="gba:w-7 gba:h-7 gba:flex-shrink-0 gba:mt-0.5 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center">
            <span className="gba:text-[10px] gba:text-primary-foreground gba:font-bold">AI</span>
          </div>
        )}

        {/* Avatar for Expert responses - custom color and avatar */}
        {isExpertResponse && (
          <div
            className="gba:w-7 gba:h-7 gba:flex-shrink-0 gba:mt-0.5 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-bold gba:text-[10px]"
            style={{ backgroundColor: message.metadata?.expertColor || '#1890ff' }}
          >
            {message.metadata?.expertAvatar || message.metadata?.expertName?.charAt(0).toUpperCase() || 'E'}
          </div>
        )}

        {/* Avatar for other users in group chat */}
        {!isOwnMessage && !isAIResponse && isGroupChat && (
          <Avatar
            className={`gba:w-7 gba:h-7 gba:flex-shrink-0 gba:mt-0.5 ${employeeId ? 'gba:cursor-pointer hover:gba:ring-2 hover:gba:ring-primary gba:transition-all' : ''}`}
            onClick={() => {
              if (employeeId) {
                navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
              }
            }}
            title={employeeId ? 'View profile' : undefined}
          >
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={sender?.firstName || participantData?.firstName || 'User'} />
            )}
            <AvatarFallback className="gba:text-xs">
              {getInitials(
                sender?.displayName ||
                  participantData?.displayName ||
                  `${sender?.firstName || participantData?.firstName || ''} ${sender?.lastName || participantData?.lastName || ''}`.trim() ||
                  sender?.username ||
                  participantData?.username ||
                  getTranslationFromI18nKeyAndLabel('chat.user', 'User')
              )}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Message bubble */}
        <div
          className={`gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm ${
            isExpertResponse
              ? 'gba:bg-gradient-to-br gba:from-muted/50 gba:to-accent/5 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border-2'
              : isAIResponse
                ? 'gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-primary/20'
                : isOwnMessage
                  ? 'gba:bg-primary gba:text-primary-foreground gba:rounded-2xl gba:rounded-br-md'
                  : 'gba:bg-card gba:text-card-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-border/50'
          }`}
          style={
            isExpertResponse && message.metadata?.expertColor
              ? { borderColor: message.metadata.expertColor }
              : undefined
          }
        >
          {/* Sender name for Expert responses */}
          {isExpertResponse && (
            <div className="gba:text-[11px] gba:font-semibold gba:mb-0.5 gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <span className="gba:text-xs">🎓</span>
                <span style={{ color: message.metadata?.expertColor || '#1890ff' }}>
                  {message.metadata?.expertName || 'Expert'}
                </span>
                <div
                  className="gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:text-[9px] gba:px-1.5 gba:py-0.5 gba:font-medium"
                  style={{
                    backgroundColor: message.metadata?.expertColor ? `${message.metadata.expertColor}20` : '#f0f0f0',
                    color: message.metadata?.expertColor || '#666'
                  }}
                >
                  Expert
                </div>
              </div>
            </div>
          )}

          {/* Sender name for generic AI responses */}
          {isAIResponse && !isExpertResponse && (
            <div className="gba:text-[11px] gba:font-semibold gba:mb-0.5 gba:text-primary gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-1">
                <span className="gba:text-xs">✨</span>
                {getTranslationFromI18nKeyAndLabel('chat.everyAI', 'Every AI')}
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
                        className="gba:h-5 gba:w-5 gba:text-primary/70 gba:hover:text-primary gba:hover:bg-primary/10"
                        data-testid={`reply-to-ai-${message.id}`}
                      >
                        <ArrowBendUpLeft className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:text-xs">
                        {getTranslationFromI18nKeyAndLabel('chat.replyToEvery', 'Reply to Every')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}

          {/* Sender name in group chat */}
          {!isOwnMessage && !isAIResponse && isGroupChat && (sender || participantData) && (
            <div
              className={`gba:text-[11px] gba:font-medium gba:mb-0.5 gba:text-primary ${employeeId ? 'gba:cursor-pointer hover:gba:underline' : ''}`}
              onClick={() => {
                if (employeeId) {
                  navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
                }
              }}
            >
              {sender?.firstName || participantData?.firstName} {sender?.lastName || participantData?.lastName}
            </div>
          )}

          {/* Attachments */}
          <MessageAttachments attachments={attachments} isOwnMessage={isOwnMessage} onPreview={openPreview} />

          {/* Text content */}
          {message.content && (
            <div className="gba:break-words gba:text-sm gba:leading-relaxed">
              {isExpertResponse ? (
                <ExpertResponseRenderer
                  content={message.content}
                  expertColor={message.metadata?.expertColor}
                  citations={message.metadata?.citations}
                  confidence={message.metadata?.confidence}
                />
              ) : isAIResponse ? (
                // Show full AI response with forms only to the person who initiated it
                // Others see a simplified message when forms are present (applies to all chat types)
                hasFormOutputs && !isAIMessageInitiatedByCurrentUser ? (
                  <div className="gba:text-sm gba:italic gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                    <span>✨</span>
                    <span>
                      {isGroupChat
                        ? `${sender?.firstName || 'Someone'} is interacting with ${message.metadata?.aiAssistant || 'Every AI'}`
                        : `${message.metadata?.aiAssistant || 'Every AI'} is preparing a form for the other user`}
                    </span>
                  </div>
                ) : hasHiddenResultCards ? (
                  // Show message when form result cards are hidden
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
                ) : (
                  // Always use EveryAI renderer for consistent UI
                  // It handles both rich outputs and plain text automatically
                  <EveryAIMessageRenderer
                    message={message}
                    accessToken={accessToken || ''}
                    onSendMessage={onSendMessage}
                    isInitiatedByCurrentUser={isAIMessageInitiatedByCurrentUser}
                    onHasHiddenCards={setHasHiddenResultCards}
                  />
                )
              ) : (
                renderContentWithReferences(message.content, message.metadata, isOwnMessage)
              )}
            </div>
          )}

          {/* Timestamp and status */}
          <div
            className={`gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-1 ${
              isOwnMessage ? 'gba:opacity-70' : 'gba:text-muted-foreground'
            }`}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="gba:text-[10px]">{formatTime(message.createdAt)}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="gba:text-xs">{formatFullTimestamp(message.createdAt)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isOwnMessage && statusText && (
              <span className={`gba:text-[10px] ${isOwnMessage ? 'gba:opacity-70' : 'gba:text-muted-foreground'}`}>
                {statusText}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preview dialog */}
      <AttachmentPreviewDialog
        open={preview.open}
        attachment={preview.att}
        objectUrl={previewUrl || undefined}
        onClose={closePreview}
      />
    </>
  )
}

// Memoize to prevent unnecessary re-renders when parent re-renders
export const MessageItem = React.memo(MessageItemComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.isDeleted === nextProps.message.isDeleted &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isGroupChat === nextProps.isGroupChat &&
    prevProps.accessToken === nextProps.accessToken &&
    JSON.stringify(prevProps.message.metadata) === JSON.stringify(nextProps.message.metadata)
  )
})
