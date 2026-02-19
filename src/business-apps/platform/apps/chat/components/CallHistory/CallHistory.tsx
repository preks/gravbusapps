import React, { useState, useEffect } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { useChatTranslation } from '../../contexts/TranslationContext'
import { useEmployeeAvatars } from '../../hooks/useEmployeeAvatars'
import type { ChatApiClient } from '../../services/chatApiClient'
import type { CallHistoryFilter, CallHistoryTypeFilter, CallHistoryEntry } from './CallHistoryTypes'
import { CallHistoryItemJoined, CallHistoryItemOutcome } from './CallHistoryItem'

const LIMIT = 50

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
        <div className="gba:flex gba:flex-col gba:gap-2 gba:px-3 gba:py-3 gba:sm:flex-row gba:sm:items-center gba:sm:gap-3 gba:sm:py-3">
          <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
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
            <h2 className="gba:font-semibold gba:text-foreground gba:text-base gba:truncate gba:min-w-0">
              {t('chat-callHistory')}
            </h2>
          </div>
          <nav
            className="gba:flex gba:items-center gba:gap-1 gba:flex-nowrap gba:overflow-x-auto gba:min-w-0 gba:sm:flex-1 gba:sm:justify-end"
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
                {f === 'all'
                  ? t('chat-callHistoryAll')
                  : f === 'missed'
                    ? t('chat-callHistoryMissed')
                    : f === 'declined'
                      ? t('chat-callHistoryDeclined')
                      : f === 'incoming'
                        ? t('chat-callHistoryIncoming')
                        : t('chat-callHistoryOutgoing')}
              </button>
            ))}
          </nav>
        </div>

        <div
          className="gba:flex gba:items-center gba:gap-1 gba:flex-nowrap gba:overflow-x-auto gba:px-3 gba:py-2 gba:border-t gba:border-border gba:sm:border-t-0"
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
              {f === 'all'
                ? t('chat-callHistoryAllTypes')
                : f === 'direct'
                  ? t('chat-callHistoryTypeDirect')
                  : f === 'group'
                    ? t('chat-callHistoryTypeGroup')
                    : t('chat-callHistoryTypeMeeting')}
            </button>
          ))}
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
          <div className="gba:flex gba:flex-col">
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
