import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
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

function getCallHistoryTitleKey(callType: string): string {
  const normalized = callType.toLowerCase()
  if (normalized === 'scheduled_meeting' || normalized === 'meeting') return 'chat-callHistoryMeetingName'
  if (normalized === 'group') return 'chat-callHistoryGroupCallName'
  return 'chat-callHistoryCallName'
}

function getOutcomeLabel(outcome: CallInviteOutcomeItem['outcome'], t: TFunction): string {
  switch (outcome) {
    case 'missed':
      return t('chat-callHistoryMissed')
    case 'declined':
      return t('chat-callHistoryDeclined')
    case 'not_answered':
      return t('chat-callHistoryNotAnswered')
    default:
      return t('chat-callHistoryNotAnswered')
  }
}

export interface CallHistoryItemJoinedProps {
  item: CallSessionItem
  currentUserId: string
  avatarMap?: Map<string, string>
  onOpenConversation: (conversationId: string) => void
  t: (key: string, params?: Record<string, unknown>) => string
}

export function CallHistoryItemJoined({
  item,
  currentUserId,
  avatarMap = new Map(),
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
  const titleKey = getCallHistoryTitleKey(callType)
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

  return (
    <button
      type="button"
      onClick={() => conversationId && onOpenConversation(conversationId)}
      className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:px-3 gba:py-3 gba:border-b gba:border-border gba:text-left hover:gba:bg-accent/50 gba:transition-colors"
      data-testid="chat-callHistory-item-joined"
    >
      <Avatar className="gba:h-10 gba:w-10 gba:flex-shrink-0">
        {hostAvatarUrl && <AvatarImage src={hostAvatarUrl} alt={hostName} />}
        <AvatarFallback className="gba:text-sm gba:font-medium">{getInitials(hostName || callName)}</AvatarFallback>
      </Avatar>
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:font-medium gba:text-foreground gba:truncate">{t(titleKey, { name: callName })}</div>
        <div className="gba:text-muted-foreground gba:text-sm gba:mt-0.5">
          {directionLabel}
          {hostName && !isOutgoing && <> · {t('chat-callHistoryWhoInvited', { name: hostName })}</>}
          {duration && <> · {duration}</>}
        </div>
      </div>
      <span className="gba:text-muted-foreground gba:text-sm gba:flex-shrink-0 gba:whitespace-nowrap">
        {rightLabel}
      </span>
    </button>
  )
}

export interface CallHistoryItemOutcomeProps {
  item: CallInviteOutcomeItem
  avatarMap?: Map<string, string>
  onOpenConversation: (conversationId: string) => void
  t: (key: string, params?: Record<string, unknown>) => string
}

export function CallHistoryItemOutcome({
  item,
  avatarMap = new Map(),
  onOpenConversation,
  t
}: Readonly<CallHistoryItemOutcomeProps>) {
  const inviterName = getInviterDisplayName(item.inviter)
  const callName = item.conversation?.name || inviterName || t('chat-callHistoryGroupCall')
  const callType = (item.callType ?? 'direct').toLowerCase()
  const titleKey = getCallHistoryTitleKey(callType)
  const inviterId = item.inviterId ?? item.inviter?.id
  const inviterFromApi = item.inviter as { avatarUrl?: string; avatar_url?: string } | undefined
  const inviterAvatarUrl =
    inviterFromApi?.avatarUrl ?? inviterFromApi?.avatar_url ?? (inviterId ? avatarMap.get(inviterId) : undefined)
  const rightLabel = formatCallDate(item.callEndedAt ?? item.invitedAt)

  const outcomeLabel = getOutcomeLabel(item.outcome, t)
  const isMissedOrNotAnswered = item.outcome === 'missed' || item.outcome === 'not_answered'

  return (
    <button
      type="button"
      onClick={() => onOpenConversation(item.conversationId)}
      className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:px-3 gba:py-3 gba:border-b gba:border-border gba:text-left hover:gba:bg-accent/50 gba:transition-colors"
      data-testid="chat-callHistory-item-outcome"
    >
      <Avatar className="gba:h-10 gba:w-10 gba:flex-shrink-0">
        {inviterAvatarUrl && <AvatarImage src={inviterAvatarUrl} alt={inviterName} />}
        <AvatarFallback className="gba:text-sm gba:font-medium">{getInitials(inviterName || callName)}</AvatarFallback>
      </Avatar>
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:font-medium gba:text-foreground gba:truncate">{t(titleKey, { name: callName })}</div>
        <div
          className={`gba:text-sm gba:mt-0.5 gba:truncate ${
            isMissedOrNotAnswered ? 'gba:text-destructive' : 'gba:text-muted-foreground'
          }`}
        >
          {t('chat-callHistoryIncoming')} · {outcomeLabel}
          {inviterName && <> · {t('chat-callHistoryWhoInvited', { name: inviterName })}</>}
        </div>
      </div>
      <span className="gba:text-muted-foreground gba:text-sm gba:flex-shrink-0 gba:whitespace-nowrap">
        {rightLabel}
      </span>
    </button>
  )
}
