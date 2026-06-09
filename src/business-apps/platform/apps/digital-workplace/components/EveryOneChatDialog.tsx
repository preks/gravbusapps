import React, { useCallback, useEffect, useRef } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Dialog,
  DialogContent,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { useChatWebSocketClient } from '@/common/network/chat/useChatWebSocketClient'
import { MessageList } from '@/business-apps/platform/apps/chat/components/MessageList'
import { MessageInput } from '@/business-apps/platform/apps/chat/components/MessageInput'
import { useMessages } from '@/business-apps/platform/apps/chat/hooks/useMessages'
import chatTranslations from '@/business-apps/platform/apps/chat/_i18n'
import type { Conversation, MessageEntityReference } from '@/business-apps/platform/apps/chat/types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { initialsFromName } from '../utils/timeFormat'

const TEST_ID = 'digital-workplace-chat-dialog'

export interface EveryOneChatDialogProps {
  open: boolean
  conversation: Conversation | null
  title: string
  avatarUrl?: string
  currentUserId: string | null
  context: BusinessAppContextProps
  onClose: () => void
  /** Fired after the conversation is opened/read so the panel can refresh unread state. */
  onChanged: () => void
}

/**
 * Reads and replies within a single conversation inline, reusing the chat app's
 * `MessageList` + `MessageInput` and `useMessages` hook. Joins the conversation
 * room and marks it read on open, and streams incoming messages over the shared
 * chat websocket — so the user can answer without leaving the Digital Workplace.
 */
const EveryOneChatDialog: React.FC<EveryOneChatDialogProps> = ({
  open,
  conversation,
  title,
  avatarUrl,
  currentUserId,
  context,
  onClose,
  onChanged
}) => {
  const { t } = useTranslation(chatTranslations)
  const accessToken = context.accessToken
  const apiClient = useChatClient(accessToken)
  const wsClient = useChatWebSocketClient(accessToken)
  const conversationId = conversation?.id ?? null

  const { messages, isLoading, hasMore, loadMore, addMessage } = useMessages({
    apiClient,
    conversationId: open ? conversationId : null,
    currentUserId,
    conversation,
    enabled: open && Boolean(conversation)
  })

  // Keep the latest onChanged without making it an effect dependency, so the
  // join/mark-read effect runs once per open instead of looping when the parent
  // re-creates the callback after a conversations refresh.
  const onChangedRef = useRef(onChanged)
  useEffect(() => {
    onChangedRef.current = onChanged
  }, [onChanged])

  // Join the room + mark read when the dialog opens; leave on close.
  useEffect(() => {
    if (!open || !conversationId || !wsClient) return
    const lastTs = conversation?.lastMessage?.createdAt ? new Date(conversation.lastMessage.createdAt).getTime() : 0
    wsClient.joinConversation(conversationId, lastTs)
    wsClient.markConversationAsRead(conversationId)
    apiClient?.markConversationRead(conversationId).catch(() => undefined)
    onChangedRef.current()
    return () => {
      wsClient.leaveConversation(conversationId)
    }
  }, [open, conversationId, wsClient, apiClient, conversation?.lastMessage?.createdAt])

  // Stream incoming messages for this conversation while open.
  useEffect(() => {
    if (!open || !conversationId || !wsClient) return
    const handleNewMessage = (message: { conversationId?: string }) => {
      if (message.conversationId === conversationId) addMessage(message)
    }
    wsClient.on('new_message', handleNewMessage)
    return () => {
      wsClient.off('new_message', handleNewMessage)
    }
  }, [open, conversationId, wsClient, addMessage])

  const handleSend = useCallback(
    async (
      content: string,
      entityReferences?: MessageEntityReference[],
      attachments?: unknown[],
      parentId?: string,
      quotedMessageId?: string
    ) => {
      const trimmed = content.trim()
      if (!conversationId || !trimmed || !currentUserId) return
      const metadata: Record<string, unknown> = {}
      if (entityReferences?.length) metadata.entityReferences = entityReferences
      if (attachments?.length) metadata.attachments = attachments
      const meta = Object.keys(metadata).length > 0 ? metadata : undefined

      if (wsClient?.isConnected()) {
        wsClient.sendMessage(conversationId, trimmed, currentUserId, parentId, meta, quotedMessageId)
        return
      }
      const sent = await apiClient?.sendMessage(conversationId, trimmed, currentUserId, parentId, meta, quotedMessageId)
      if (sent) addMessage(sent)
    },
    [conversationId, currentUserId, wsClient, apiClient, addMessage]
  )

  const handleTypingStart = useCallback(() => {
    if (conversationId && wsClient) wsClient.sendTypingStart(conversationId)
  }, [conversationId, wsClient])

  const handleTypingStop = useCallback(() => {
    if (conversationId && wsClient) wsClient.sendTypingStop(conversationId)
  }, [conversationId, wsClient])

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent
        className="gba:flex gba:h-[85vh] gba:max-h-[85vh] gba:w-full gba:max-w-2xl gba:flex-col gba:overflow-hidden gba:p-0"
        data-testid={`${TEST_ID}-content`}
      >
        <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:border-b gba:border-border/60 gba:px-4 gba:py-3 gba:text-base">
          <Avatar className="gba:size-7 gba:shrink-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} /> : null}
            <AvatarFallback className="gba:text-[10px] gba:font-medium">{initialsFromName(title)}</AvatarFallback>
          </Avatar>
          <span className="gba:min-w-0 gba:flex-1 gba:truncate">{title}</span>
        </DialogTitle>

        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          {conversation ? (
            <>
              <MessageList
                messages={messages}
                currentUserId={currentUserId}
                conversationType={conversation.type}
                conversationId={conversation.id}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                accessToken={accessToken}
                participants={conversation.participants}
                apiClient={apiClient}
                compact
              />
              <MessageInput
                onSend={(content, entityReferences, attachments, parentId, quotedMessageId) =>
                  void handleSend(content, entityReferences, attachments, parentId, quotedMessageId)
                }
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                accessToken={accessToken}
                compact
                t={t}
              />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EveryOneChatDialog
export { EveryOneChatDialog }
