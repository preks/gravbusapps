import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback, Button } from '@newwork/nw-design-system'
import { EnvelopeSimpleIcon, ChatCircleIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useEmailAccounts } from '@/business-apps/platform/apps/email-apps/hooks/useEmailAccounts'
import { useEmailFolders } from '@/business-apps/platform/apps/email-apps/hooks/useEmailFolders'
import { useEmails } from '@/business-apps/platform/apps/email-apps/hooks/useEmails'
import { useEmailRealtime } from '@/business-apps/platform/apps/email-apps/hooks/useEmailRealtime'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { useConversations } from '@/business-apps/platform/apps/chat/hooks/useConversations'
import {
  ConversationType,
  type Conversation,
  type ConversationParticipant
} from '@/business-apps/platform/apps/chat/types'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import WorkplacePanel from './WorkplacePanel'
import { EveryOneMailDialog } from './EveryOneMailDialog'
import { EveryOneChatDialog } from './EveryOneChatDialog'
import { relativeFromNow, initialsFromName } from '../utils/timeFormat'
import type { WorkplacePanelBaseProps } from '../types'

const TEST_ID = 'digital-workplace-messages'

type MessagesTab = 'mail' | 'chats'

interface MessageRowProps {
  testId: string
  primary: string
  secondary: string
  meta: string
  avatarUrl?: string
  unread?: boolean
  onClick: () => void
}

const MessageRow: React.FC<MessageRowProps> = ({
  testId,
  primary,
  secondary,
  meta,
  avatarUrl,
  unread = true,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:p-3 gba:text-left gba:transition-colors gba:hover:bg-accent"
    data-testid={testId}
  >
    <Avatar className="gba:size-8 gba:shrink-0">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={primary} /> : null}
      <AvatarFallback className="gba:text-[10px] gba:font-medium">{initialsFromName(primary)}</AvatarFallback>
    </Avatar>
    <div className="gba:min-w-0 gba:flex-1">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
          {primary}
        </span>
        <span className="gba:shrink-0 gba:text-xs gba:text-muted-foreground">{meta}</span>
      </div>
      <p className="gba:mt-0.5 gba:truncate gba:text-xs gba:text-muted-foreground">{secondary}</p>
    </div>
    {unread ? <span className="gba:size-2 gba:shrink-0 gba:rounded-full gba:bg-primary" /> : null}
  </button>
)

/** The participant of a direct conversation that is not the current user. */
function getOtherParticipant(conversation: Conversation, currentUserId: string | null): ConversationParticipant | null {
  if (conversation.type !== ConversationType.DIRECT || !conversation.participants?.length) {
    return null
  }
  const others = conversation.participants.filter(p => p.userId !== currentUserId && p.user?.id !== currentUserId)
  return others[0] || null
}

/** Resolve the display name shown for a conversation, mirroring the chat app. */
function resolveChatPrimary(
  conversation: Conversation,
  currentUserId: string | null,
  groupLabel: string,
  directLabel: string
): string {
  if (conversation.name) return conversation.name
  const other = getOtherParticipant(conversation, currentUserId)
  if (other?.user) {
    const name = `${other.user.firstName ?? ''} ${other.user.lastName ?? ''}`.trim()
    return name || other.user.displayName || other.user.username || directLabel
  }
  return conversation.type === ConversationType.GROUP ? groupLabel : directLabel
}

/** Resolve the avatar shown for a conversation (other participant for direct chats). */
function resolveChatAvatar(conversation: Conversation, currentUserId: string | null): string | undefined {
  const other = getOtherParticipant(conversation, currentUserId)
  return other?.user?.avatarUrl || conversation.avatarUrl
}

/** Unread email + chat preview with deep-links into Mail and Chats. */
const MessagesPanel: React.FC<WorkplacePanelBaseProps> = ({ context, onMetric, className }) => {
  const { t } = useWorkplaceTranslation()
  const { accessToken } = context
  const [tab, setTab] = useState<MessagesTab>('mail')

  const { defaultAccount } = useEmailAccounts(accessToken)
  const { inboxFolder, totalUnread } = useEmailFolders(accessToken, defaultAccount?.id)
  const {
    messages,
    isLoading: emailsLoading,
    refreshMessages
  } = useEmails({
    accessToken,
    folderId: inboxFolder?.id,
    accountId: defaultAccount?.id,
    threadView: true
  })

  // Push new emails into the list instantly (polling in useEmails is the fallback).
  useEmailRealtime({
    accessToken,
    accountId: defaultAccount?.id,
    enabled: Boolean(accessToken && defaultAccount?.id),
    onNewEmail: () => refreshMessages(true)
  })

  const chatClient = useChatClient(accessToken)
  const {
    conversations,
    isLoading: chatsLoading,
    loadConversations
  } = useConversations({
    apiClient: chatClient,
    accessToken
  })

  // Conversations only load once; poll so unread chats appear without a refresh.
  useEffect(() => {
    if (!chatClient) return
    const intervalId = setInterval(() => {
      loadConversations()
    }, 20000)
    return () => clearInterval(intervalId)
  }, [chatClient, loadConversations])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    if (!chatClient) return
    let active = true
    chatClient
      .getCurrentUser<{ id?: string; user?: { id?: string } }>()
      .then(me => {
        if (active) setCurrentUserId(me?.id || me?.user?.id || null)
      })
      .catch(() => {
        /* sender name falls back to the direct-message label */
      })
    return () => {
      active = false
    }
  }, [chatClient])

  const unreadEmails = useMemo(() => messages.filter(message => !message.isRead), [messages])
  const unreadChats = useMemo(
    () => conversations.filter(conversation => (conversation.unreadCount || 0) > 0),
    [conversations]
  )

  useEffect(() => {
    onMetric('mailUnread', totalUnread || unreadEmails.length)
  }, [totalUnread, unreadEmails.length, onMetric])

  useEffect(() => {
    onMetric('chatsUnread', unreadChats.length)
  }, [unreadChats.length, onMetric])

  const [activeMailId, setActiveMailId] = useState<string | null>(null)
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)

  const handleMailChanged = useCallback(() => refreshMessages(true), [refreshMessages])
  const handleChatChanged = useCallback(() => loadConversations(), [loadConversations])

  const isMail = tab === 'mail'
  const isLoading = isMail ? emailsLoading && messages.length === 0 : chatsLoading && conversations.length === 0
  const isEmpty = isMail ? !emailsLoading && unreadEmails.length === 0 : !chatsLoading && unreadChats.length === 0

  return (
    <>
      <WorkplacePanel
        title={t('messages-title')}
        icon={EnvelopeSimpleIcon}
        count={isMail ? unreadEmails.length : unreadChats.length}
        onTitleClick={() =>
          navigateTo(buildPlatformUrl(Navigation.PLATFORM_TEAM_CHAT, { view: isMail ? 'mail' : 'chat' }))
        }
        titleActionLabel={t('messages-open')}
        className={className}
        testId={TEST_ID}
        loading={isLoading}
        errorTitle={t('error-title')}
        isEmpty={isEmpty}
        emptyTitle={isMail ? t('messages-empty-mail-title') : t('messages-empty-chats-title')}
        emptyDescription={isMail ? t('messages-empty-mail-desc') : t('messages-empty-chats-desc')}
        action={
          <div className="gba:flex gba:items-center gba:gap-1">
            <Button
              variant={isMail ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTab('mail')}
              data-testid={`${TEST_ID}-tab-mail`}
            >
              <EnvelopeSimpleIcon className="gba:size-4" />
              {t('messages-tab-mail')}
            </Button>
            <Button
              variant={isMail ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setTab('chats')}
              data-testid={`${TEST_ID}-tab-chats`}
            >
              <ChatCircleIcon className="gba:size-4" />
              {t('messages-tab-chats')}
            </Button>
          </div>
        }
      >
        <div className="gba:flex gba:flex-col gba:gap-2">
          {isMail
            ? unreadEmails.map(message => (
                <MessageRow
                  key={message.id}
                  testId={`${TEST_ID}-mail-${message.id}`}
                  primary={message.fromAddress?.name || message.fromAddress?.address || t('messages-unknown-sender')}
                  secondary={message.subject || t('messages-no-subject')}
                  meta={relativeFromNow(message.date)}
                  onClick={() => setActiveMailId(message.id)}
                />
              ))
            : unreadChats.map(conversation => (
                <MessageRow
                  key={conversation.id}
                  testId={`${TEST_ID}-chat-${conversation.id}`}
                  primary={resolveChatPrimary(conversation, currentUserId, t('messages-group'), t('messages-direct'))}
                  secondary={conversation.lastMessage?.content || ''}
                  meta={relativeFromNow(conversation.lastMessage?.createdAt)}
                  avatarUrl={resolveChatAvatar(conversation, currentUserId)}
                  onClick={() => setActiveChat(conversation)}
                />
              ))}
        </div>
      </WorkplacePanel>

      <EveryOneMailDialog
        open={activeMailId !== null}
        messageId={activeMailId}
        context={context}
        onClose={() => setActiveMailId(null)}
        onChanged={handleMailChanged}
      />

      <EveryOneChatDialog
        open={activeChat !== null}
        conversation={activeChat}
        title={
          activeChat ? resolveChatPrimary(activeChat, currentUserId, t('messages-group'), t('messages-direct')) : ''
        }
        avatarUrl={activeChat ? resolveChatAvatar(activeChat, currentUserId) : undefined}
        currentUserId={currentUserId}
        context={context}
        onClose={() => setActiveChat(null)}
        onChanged={handleChatChanged}
      />
    </>
  )
}

export default MessagesPanel
export { MessagesPanel }
