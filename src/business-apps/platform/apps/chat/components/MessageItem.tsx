import React, { useMemo, useState } from 'react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import type { Message } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatTime, formatFullTimestamp, getStatusIcon } from './utils/messageUtils'
import { isPreviewable } from './utils/attachmentUtils'
import { renderContentWithReferences } from './EntityReferenceBadge'
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
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, currentUserId, isGroupChat, accessToken }) => {
  const isOwnMessage = message.senderId === currentUserId
  const sender = message.sender
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
        {/* Avatar for other users in group chat */}
        {!isOwnMessage && isGroupChat && (
          <Avatar
            className={`gba:w-7 gba:h-7 gba:flex-shrink-0 gba:mt-0.5 ${sender?.employeeId ? 'gba:cursor-pointer hover:gba:ring-2 hover:gba:ring-primary gba:transition-all' : ''}`}
            onClick={() => {
              if (sender?.employeeId) {
                navigateTo(`/platform/employee-record?employeeId=${sender.employeeId}`)
              }
            }}
            title={sender?.employeeId ? 'View profile' : undefined}
          >
            {sender?.avatarUrl && <AvatarImage src={sender.avatarUrl} alt={sender?.firstName || 'User'} />}
            <AvatarFallback className="gba:text-xs">
              {getInitials(
                sender?.displayName ||
                  `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim() ||
                  sender?.username ||
                  getTranslationFromI18nKeyAndLabel('chat.user', 'User')
              )}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Message bubble */}
        <div
          className={`gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm ${
            isOwnMessage
              ? 'gba:bg-primary gba:text-primary-foreground gba:rounded-2xl gba:rounded-br-md'
              : 'gba:bg-card gba:text-card-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-border/50'
          }`}
        >
          {/* Sender name in group chat */}
          {!isOwnMessage && isGroupChat && sender && (
            <div
              className={`gba:text-[11px] gba:font-medium gba:mb-0.5 gba:text-primary ${sender.employeeId ? 'gba:cursor-pointer hover:gba:underline' : ''}`}
              onClick={() => {
                if (sender.employeeId) {
                  navigateTo(`/platform/employee-record?employeeId=${sender.employeeId}`)
                }
              }}
            >
              {sender.firstName} {sender.lastName}
            </div>
          )}

          {/* Attachments */}
          <MessageAttachments attachments={attachments} isOwnMessage={isOwnMessage} onPreview={openPreview} />

          {/* Text content */}
          {message.content && (
            <div className="gba:break-words gba:text-sm gba:leading-relaxed">
              {renderContentWithReferences(message.content, message.metadata, isOwnMessage)}
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
