import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import { PhoneIncomingIcon, PhoneOutgoingIcon, PhoneSlashIcon } from '@phosphor-icons/react'
import { CalendarIcon, UsersIcon } from 'lucide-react'
import type { UserPresence } from '../../hooks/usePresence'
import { UserStatusIndicator } from '../UserStatusIndicator'
import type { CallSessionItem, CallInviteOutcomeItem } from './CallHistoryTypes'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

function formatCallDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString()
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function getHostDisplayName(host?: CallSessionItem['host']): string {
  if (!host) return ''
  const name = host.displayName || [host.firstName, host.lastName].filter(Boolean).join(' ').trim()
  return name || 'Someone'
}

function getInviterDisplayName(inviter?: CallInviteOutcomeItem['inviter']): string {
  if (!inviter) return ''
  const name = inviter.displayName || [inviter.firstName, inviter.lastName].filter(Boolean).join(' ').trim()
  return name || 'Someone'
}

type TFunction = (key: string, params?: Record<string, unknown>) => string

function isDirectCall(callType: string): boolean {
  const normalized = callType.toLowerCase()
  return normalized !== 'group' && normalized !== 'scheduled_meeting' && normalized !== 'meeting'
}

function isMeetingCall(callType: string): boolean {
  const normalized = callType.toLowerCase()
  return normalized === 'scheduled_meeting' || normalized === 'meeting'
}

function getOutcomeLabel(outcome: CallInviteOutcomeItem['outcome'], t: TFunction): string {
  switch (outcome) {
    case 'missed':
    case 'not_answered':
      return t('chat-callHistoryMissed')
    case 'declined':
      return t('chat-callHistoryDeclined')
    default:
      return t('chat-callHistoryMissed')
  }
}

export interface CallHistoryItemJoinedProps {
  item: CallSessionItem
  currentUserId: string
  avatarMap?: Map<string, string>
  /** Presence for the other user (host when incoming); used for status on avatar. */
  otherUserPresence?: UserPresence
  onOpenConversation: (conversationId: string) => void
  t: (key: string, params?: Record<string, unknown>) => string
}

export function CallHistoryItemJoined({
  item,
  currentUserId,
  avatarMap = new Map(),
  otherUserPresence,
  onOpenConversation,
  t
}: Readonly<CallHistoryItemJoinedProps>) {
  const callName =
    item.sessionName ||
    item.conversation?.name ||
    item.meeting?.meetingName ||
    item.meeting?.title ||
    t('chat-callHistoryGroupCall')
  const callType = (item.callType ?? 'direct').toLowerCase()
  const direct = isDirectCall(callType)
  const meeting = isMeetingCall(callType)
  const hostName = getHostDisplayName(item.host)
  const hostId = item.hostId ?? item.host?.id
  const hostFromApi = item.host as { avatarUrl?: string; avatar_url?: string } | undefined
  const hostAvatarUrl =
    hostFromApi?.avatarUrl ?? hostFromApi?.avatar_url ?? (hostId ? avatarMap.get(hostId) : undefined)
  const isOutgoing = item.hostId ? currentUserId === item.hostId : false
  const directionLabel = isOutgoing ? t('chat-callHistoryOutgoing') : t('chat-callHistoryIncoming')
  const duration =
    item.actualDurationSeconds != null && item.actualDurationSeconds >= 0
      ? formatDuration(item.actualDurationSeconds)
      : null
  const conversationId = item.conversationId ?? item.conversation?.id
  const rightLabel = formatCallDate(item.startedAt)
  const displayTitle = direct ? hostName || callName : callName

  return (
    <button
      type="button"
      onClick={() => conversationId && onOpenConversation(conversationId)}
      className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:px-3 gba:py-2 gba:border-b gba:border-border gba:text-left hover:gba:bg-accent/50 gba:transition-colors"
      data-testid="chat-callHistory-item-joined"
    >
      {direct ? (
        <div className="gba:relative gba:flex-shrink-0">
          <Avatar className="gba:h-10 gba:w-10 gba:ring-2 gba:ring-background">
            {hostAvatarUrl && <AvatarImage src={hostAvatarUrl} alt={hostName} />}
            <AvatarFallback className="gba:text-sm gba:font-medium">{getInitials(hostName || callName)}</AvatarFallback>
          </Avatar>
          {otherUserPresence?.userStatus ? (
            <UserStatusIndicator
              status={otherUserPresence.userStatus}
              size="sm"
              className="gba:absolute gba:bottom-0 gba:right-0"
            />
          ) : otherUserPresence ? (
            <span
              className={`gba:absolute gba:bottom-0 gba:right-0 gba:block gba:h-3 gba:w-3 gba:rounded-full gba:border-2 gba:border-background ${
                otherUserPresence.state === 'online' ? 'gba:bg-success' : 'gba:bg-muted-foreground'
              }`}
              title={otherUserPresence.state === 'online' ? t('chat-statusOnline') : t('chat-statusOffline')}
            />
          ) : null}
        </div>
      ) : (
        <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground">
          {meeting ? <CalendarIcon className="gba:size-5" /> : <UsersIcon className="gba:size-5" />}
        </div>
      )}
      <div className="gba:min-w-0 gba:flex-1 gba:flex gba:flex-col gba:gap-px gba:overflow-hidden">
        <div className="gba:font-medium gba:text-foreground gba:text-sm gba:truncate">{displayTitle}</div>
        <div className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground gba:text-xs gba:truncate">
          {isOutgoing ? (
            <PhoneOutgoingIcon className="gba:size-4 gba:flex-shrink-0" weight="regular" />
          ) : (
            <PhoneIncomingIcon className="gba:size-4 gba:flex-shrink-0" weight="regular" />
          )}
          <span>{directionLabel}</span>
          {!direct && hostName && !isOutgoing && (
            <>
              <span>·</span>
              <span>{t('chat-callHistoryWhoInvited', { name: hostName })}</span>
            </>
          )}
          {duration && (
            <>
              <span>·</span>
              <span>{duration}</span>
            </>
          )}
        </div>
      </div>
      <span className="gba:text-muted-foreground gba:text-xs gba:flex-shrink-0 gba:whitespace-nowrap gba:pt-px">
        {rightLabel}
      </span>
    </button>
  )
}

export interface CallHistoryItemOutcomeProps {
  item: CallInviteOutcomeItem
  avatarMap?: Map<string, string>
  /** Presence for the inviter (other user); used for status on avatar. */
  otherUserPresence?: UserPresence
  onOpenConversation: (conversationId: string) => void
  t: (key: string, params?: Record<string, unknown>) => string
}

export function CallHistoryItemOutcome({
  item,
  avatarMap = new Map(),
  otherUserPresence,
  onOpenConversation,
  t
}: Readonly<CallHistoryItemOutcomeProps>) {
  const inviterName = getInviterDisplayName(item.inviter)
  const callName = item.conversation?.name || inviterName || t('chat-callHistoryGroupCall')
  const callType = (item.callType ?? 'direct').toLowerCase()
  const direct = isDirectCall(callType)
  const meeting = isMeetingCall(callType)
  const inviterId = item.inviterId ?? item.inviter?.id
  const inviterFromApi = item.inviter as { avatarUrl?: string; avatar_url?: string } | undefined
  const inviterAvatarUrl =
    inviterFromApi?.avatarUrl ?? inviterFromApi?.avatar_url ?? (inviterId ? avatarMap.get(inviterId) : undefined)
  const rightLabel = formatCallDate(item.callEndedAt ?? item.invitedAt)
  const displayTitle = direct ? inviterName || callName : callName

  const outcomeLabel = getOutcomeLabel(item.outcome, t)
  const isMissedOrNotAnswered = item.outcome === 'missed' || item.outcome === 'not_answered'

  return (
    <button
      type="button"
      onClick={() => onOpenConversation(item.conversationId)}
      className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:px-3 gba:py-2 gba:border-b gba:border-border gba:text-left hover:gba:bg-accent/50 gba:transition-colors"
      data-testid="chat-callHistory-item-outcome"
    >
      {direct ? (
        <div className="gba:relative gba:flex-shrink-0">
          <Avatar className="gba:h-10 gba:w-10 gba:ring-2 gba:ring-background">
            {inviterAvatarUrl && <AvatarImage src={inviterAvatarUrl} alt={inviterName} />}
            <AvatarFallback className="gba:text-sm gba:font-medium">
              {getInitials(inviterName || callName)}
            </AvatarFallback>
          </Avatar>
          {otherUserPresence?.userStatus ? (
            <UserStatusIndicator
              status={otherUserPresence.userStatus}
              size="sm"
              className="gba:absolute gba:bottom-0 gba:right-0"
            />
          ) : otherUserPresence ? (
            <span
              className={`gba:absolute gba:bottom-0 gba:right-0 gba:block gba:h-3 gba:w-3 gba:rounded-full gba:border-2 gba:border-background ${
                otherUserPresence.state === 'online' ? 'gba:bg-success' : 'gba:bg-muted-foreground'
              }`}
              title={otherUserPresence.state === 'online' ? t('chat-statusOnline') : t('chat-statusOffline')}
            />
          ) : null}
        </div>
      ) : (
        <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground">
          {meeting ? <CalendarIcon className="gba:size-5" /> : <UsersIcon className="gba:size-5" />}
        </div>
      )}
      <div className="gba:min-w-0 gba:flex-1 gba:flex gba:flex-col gba:gap-px gba:overflow-hidden">
        <div className="gba:font-medium gba:text-foreground gba:text-sm gba:truncate">{displayTitle}</div>
        <div
          className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:truncate ${
            isMissedOrNotAnswered ? 'gba:text-destructive' : 'gba:text-muted-foreground'
          }`}
        >
          <PhoneSlashIcon className="gba:size-4 gba:flex-shrink-0" weight="regular" />
          <span>{outcomeLabel}</span>
          {!direct && inviterName && (
            <>
              <span>·</span>
              <span>{t('chat-callHistoryWhoInvited', { name: inviterName })}</span>
            </>
          )}
        </div>
      </div>
      <span className="gba:text-muted-foreground gba:text-xs gba:flex-shrink-0 gba:whitespace-nowrap gba:pt-px">
        {rightLabel}
      </span>
    </button>
  )
}
