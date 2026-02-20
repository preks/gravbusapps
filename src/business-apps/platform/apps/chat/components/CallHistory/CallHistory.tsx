import React, { useState, useEffect } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { useChatTranslation } from '../../contexts/TranslationContext'
import { useEmployeeAvatars } from '../../hooks/useEmployeeAvatars'
import type { ChatApiClient } from '../../services/chatApiClient'
import type { CallHistoryFilter, CallHistoryTypeFilter, CallHistoryEntry } from './CallHistoryTypes'
import { CallHistoryItemJoined, CallHistoryItemOutcome } from './CallHistoryItem'

const LIMIT = 50

type TFunction = (key: string, params?: Record<string, unknown>) => string

function getStatusFilterLabel(f: CallHistoryFilter, t: TFunction): string {
  switch (f) {
    case 'all':
      return t('chat-callHistoryAll')
    case 'missed':
      return t('chat-callHistoryMissed')
    case 'declined':
      return t('chat-callHistoryDeclined')
    case 'incoming':
      return t('chat-callHistoryIncoming')
    case 'outgoing':
      return t('chat-callHistoryOutgoing')
    default:
      return t('chat-callHistoryAll')
  }
}

function getTypeFilterLabel(f: CallHistoryTypeFilter, t: TFunction): string {
  switch (f) {
    case 'all':
      return t('chat-callHistoryAllTypes')
    case 'direct':
      return t('chat-callHistoryTypeDirect')
    case 'group':
      return t('chat-callHistoryTypeGroup')
    case 'meeting':
      return t('chat-callHistoryTypeMeeting')
    default:
      return t('chat-callHistoryAllTypes')
  }
}

interface CallHistoryProps {
  apiClient: ChatApiClient
  accessToken: string
  currentUserId: string
  onBack: () => void
  onOpenConversation: (conversationId: string) => void
  /** When this value changes, list is refetched with current filters preserved. */
  refreshTrigger?: number
}

export const CallHistory: React.FC<CallHistoryProps> = ({
  apiClient,
  accessToken,
  currentUserId,
  onBack,
  onOpenConversation,
  refreshTrigger = 0
}) => {
  const t = useChatTranslation()
  const { fetchAvatars } = useEmployeeAvatars(accessToken)
  const [filter, setFilter] = useState<CallHistoryFilter>('all')
  const [callTypeFilter, setCallTypeFilter] = useState<CallHistoryTypeFilter>('all')
  const [entries, setEntries] = useState<CallHistoryEntry[]>([])
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient
      .getCallHistory({ status: filter, callType: callTypeFilter, limit: LIMIT })
      .then(data => {
        if (!cancelled) setEntries(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setError(t('chat-serviceUnavailable'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiClient, filter, callTypeFilter, refreshTrigger, t])

  useEffect(() => {
    const userIds = new Set<string>()
    entries.forEach(entry => {
      if (entry.type === 'joined') {
        const id = entry.item.hostId ?? entry.item.host?.id
        if (id) userIds.add(id)
      } else {
        const id = entry.item.inviterId ?? entry.item.inviter?.id
        if (id) userIds.add(id)
      }
    })
    if (userIds.size === 0) return
    fetchAvatars(Array.from(userIds)).then(map => setAvatarMap(map))
  }, [entries, fetchAvatars])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="chat-callHistory">
      <header className="gba:shrink-0 gba:border-b gba:border-border">
        <div className="gba:flex gba:flex-col gba:gap-y-2 gba:px-3 gba:py-3 gba:sm:flex-row gba:sm:flex-wrap gba:sm:items-center gba:sm:gap-x-3">
          <div className="gba:flex gba:items-center gba:gap-3 gba:shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label={t('chat-callHistoryBack')}
              data-testid="chat-callHistory-back"
              className="gba:flex-shrink-0"
            >
              <CaretLeftIcon className="gba:size-5" />
            </Button>
            <h2 className="gba:font-semibold gba:text-foreground gba:text-base">{t('chat-callHistory')}</h2>
          </div>

          <nav
            className="gba:flex gba:items-center gba:gap-1 gba:flex-nowrap gba:overflow-x-auto gba:min-w-0 gba:border-t gba:border-border gba:pt-2 gba:sm:flex-1 gba:sm:border-t-0 gba:sm:pt-0"
            aria-label={t('chat-callHistory')}
          >
            {(['all', 'missed', 'declined', 'incoming', 'outgoing'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                data-testid={`chat-callHistory-filter-${f}`}
                className={`gba:px-3 gba:py-1.5 gba:text-sm gba:rounded-md gba:flex-shrink-0 gba:transition-colors ${
                  filter === f
                    ? 'gba:bg-primary gba:text-primary-foreground'
                    : 'gba:text-muted-foreground hover:gba:bg-accent hover:gba:text-accent-foreground'
                }`}
              >
                {getStatusFilterLabel(f, t)}
              </button>
            ))}
          </nav>

          <div
            className="gba:flex gba:items-center gba:gap-1 gba:flex-nowrap gba:overflow-x-auto gba:w-full gba:pt-2 gba:pb-0 gba:sm:pb-0 gba:border-t gba:border-border gba:sm:pt-2 gba:sm:pb-0"
            aria-label={t('chat-callHistoryAllTypes')}
          >
            {(['all', 'direct', 'group', 'meeting'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setCallTypeFilter(f)}
                data-testid={`chat-callHistory-typeFilter-${f}`}
                className={`gba:px-3 gba:py-1.5 gba:text-sm gba:rounded-md gba:flex-shrink-0 gba:transition-colors ${
                  callTypeFilter === f
                    ? 'gba:bg-primary gba:text-primary-foreground'
                    : 'gba:text-muted-foreground hover:gba:bg-accent hover:gba:text-accent-foreground'
                }`}
              >
                {getTypeFilterLabel(f, t)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="gba:flex-1 gba:overflow-auto gba:min-h-0">
        {loading && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner className="gba:size-8" data-testid="chat-callHistory-loading" />
          </div>
        )}
        {!loading && error && (
          <div className="gba:px-4 gba:py-4 gba:text-destructive gba:text-sm" data-testid="chat-callHistory-error">
            {error}
          </div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div
            className="gba:px-4 gba:py-8 gba:text-muted-foreground gba:text-center gba:text-sm"
            data-testid="chat-callHistory-empty"
          >
            {t('chat-callHistoryNoCallsFiltered')}
          </div>
        )}
        {!loading && !error && entries.length > 0 && (
          <div className="gba:flex gba:flex-col gba:pb-4">
            {entries.map(entry =>
              entry.type === 'joined' ? (
                <CallHistoryItemJoined
                  key={`joined-${entry.item.id}`}
                  item={entry.item}
                  currentUserId={currentUserId}
                  avatarMap={avatarMap}
                  onOpenConversation={onOpenConversation}
                  t={t}
                />
              ) : (
                <CallHistoryItemOutcome
                  key={`outcome-${entry.item.id}`}
                  item={entry.item}
                  avatarMap={avatarMap}
                  onOpenConversation={onOpenConversation}
                  t={t}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
