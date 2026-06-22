import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useConversationReference } from './hooks/commsReferenceHooks'
import {
  dataStr,
  getField,
  getNum,
  getStr,
  personName,
  plainTextPreview,
  type ReferenceCardProps
} from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

const CHAT_GLYPH = tileGlyph(
  'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z'
)

interface ParticipantView {
  firstName: string
  lastName: string
  avatar?: string
}

function toParticipant(raw: unknown): ParticipantView | undefined {
  const user = getField(raw, 'user') ?? raw
  const name = personName(user)
  const first = getStr(user, 'firstName') ?? (name ? name.split(' ')[0] : undefined)
  const last = getStr(user, 'lastName') ?? (name ? name.split(' ').slice(1).join(' ') : undefined)
  const avatar = getStr(user, 'avatarUrl') ?? getStr(user, 'pictureThumbnail') ?? getStr(user, 'avatar')
  if (!first && !last && !avatar) return undefined
  return { firstName: first ?? '', lastName: last ?? '', avatar }
}

/**
 * Chat conversation card: leads with a participant avatar stack and the
 * last-message snippet, with an unread badge when there are unread messages.
 */
export const ChatConversationReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { participantSummary, unreadStatus, t } = useReferenceCardI18n()
  const { data: conversation, loading } = useConversationReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-chat-conversation"
      />
    )
  }

  const title =
    getStr(conversation, 'name') ??
    reference.label ??
    dataStr(reference.data, 'title') ??
    t('renderer-ref-type-conversation')
  const unread = getNum(conversation, 'unreadCount')
  const lastMessage = plainTextPreview(getStr(getField(conversation, 'lastMessage'), 'content'), 120)

  const participantsRaw = getField(conversation, 'participants')
  const participants = (Array.isArray(participantsRaw) ? participantsRaw : [])
    .map(toParticipant)
    .filter((p): p is ParticipantView => !!p)
  const visible = participants.slice(0, 4)
  const extra = participants.length - visible.length

  const footer = visible.length ? (
    <div className="gba:flex gba:items-center gba:gap-2">
      <div className="gba:flex gba:items-center gba:-space-x-2">
        {visible.map((participant, idx) => (
          <span key={idx} className="gba:rounded-full gba:ring-2 gba:ring-white">
            <AvatarWithInitials
              firstName={participant.firstName}
              lastName={participant.lastName}
              pictureThumbnail={participant.avatar}
              size={24}
            />
          </span>
        ))}
      </div>
      <span className="gba:text-xs gba:text-muted-foreground">{participantSummary(participants.length, extra)}</span>
    </div>
  ) : undefined

  return (
    <EntityCard
      title={title}
      subtitle={t('renderer-ref-type-conversation')}
      status={unread && unread > 0 ? unreadStatus(unread) : undefined}
      statusVariant={unread && unread > 0 ? 'warning' : 'default'}
      description={lastMessage}
      icon={<IconTile glyph={CHAT_GLYPH} accent="sky" />}
      footer={footer}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-chat-conversation"
    />
  )
}

export default ChatConversationReferenceCard
