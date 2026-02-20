import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  PhoneIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  PhoneSlashIcon,
  XIcon
} from '@phosphor-icons/react'
import { CalendarIcon, UsersIcon } from 'lucide-react'
import { useChatTranslation } from '../../contexts/TranslationContext'
import { useEmployeeAvatars } from '../../hooks/useEmployeeAvatars'
import type { ChatApiClient } from '../../services/chatApiClient'
import type { CallHistoryFilter, CallHistoryTypeFilter, CallHistoryEntry } from './CallHistoryTypes'
import type { PresenceData } from '../../hooks/usePresence'
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
  /** When true show back arrow (mobile/compact); when false show close X (larger screens). Same as ConversationHeader. */
  showBackButton?: boolean
  /** When this value changes, list is refetched with current filters preserved. */
  refreshTrigger?: number
  /** Map of userId -> presence for showing status on direct-call avatars. */
  presenceMap?: ReadonlyMap<string, PresenceData>
}

export const CallHistory: React.FC<CallHistoryProps> = ({
  apiClient,
  accessToken,
  currentUserId,
  onBack,
  onOpenConversation,
  showBackButton = true,
  refreshTrigger = 0,
  presenceMap
}) => {
  const t = useChatTranslation()
  const { fetchAvatars } = useEmployeeAvatars(accessToken)
  const [filter, setFilter] = useState<CallHistoryFilter>('all')
  const [callTypeFilter, setCallTypeFilter] = useState<CallHistoryTypeFilter>('all')
  const [entries, setEntries] = useState<CallHistoryEntry[]>([])
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilterLabels, setShowFilterLabels] = useState(true)
  const filterContainerRef = useRef<HTMLDivElement>(null)
  const rulerWithLabelsRef = useRef<HTMLDivElement>(null)
  const rulerWithoutLabelsRef = useRef<HTMLDivElement>(null)
  const widthWithLabelsRef = useRef<number>(0)
  const widthWithoutLabelsRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setHasMore(false)
    apiClient
      .getCallHistory({ status: filter, callType: callTypeFilter, limit: LIMIT, offset: 0 })
      .then(data => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : []
          setEntries(list)
          setHasMore(list.length >= LIMIT)
        }
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

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const offset = entries.length
    apiClient
      .getCallHistory({ status: filter, callType: callTypeFilter, limit: LIMIT, offset })
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setEntries(prev => [...prev, ...list])
        setHasMore(list.length >= LIMIT)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }

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

  const statusFilters: { value: CallHistoryFilter; label: string; icon: React.ReactNode }[] = [
    {
      value: 'missed',
      label: getStatusFilterLabel('missed', t),
      icon: <PhoneSlashIcon className="gba:size-4" weight="regular" />
    },
    {
      value: 'incoming',
      label: getStatusFilterLabel('incoming', t),
      icon: <PhoneIncomingIcon className="gba:size-4" weight="regular" />
    },
    {
      value: 'outgoing',
      label: getStatusFilterLabel('outgoing', t),
      icon: <PhoneOutgoingIcon className="gba:size-4" weight="regular" />
    }
  ]
  const typeFilters: { value: CallHistoryTypeFilter; label: string; icon: React.ReactNode }[] = [
    {
      value: 'direct',
      label: getTypeFilterLabel('direct', t),
      icon: <PhoneIcon className="gba:size-4" weight="regular" />
    },
    { value: 'group', label: getTypeFilterLabel('group', t), icon: <UsersIcon className="gba:size-4" /> },
    { value: 'meeting', label: getTypeFilterLabel('meeting', t), icon: <CalendarIcon className="gba:size-4" /> }
  ]

  const BUFFER_PX = 16

  useLayoutEffect(() => {
    if (showBackButton) {
      setShowFilterLabels(false)
      return
    }
    const container = filterContainerRef.current
    const withLabels = rulerWithLabelsRef.current
    const withoutLabels = rulerWithoutLabelsRef.current
    if (!container || !withLabels || !withoutLabels) return

    const update = () => {
      const available = container.clientWidth
      const withW = withLabels.getBoundingClientRect().width
      const withoutW = withoutLabels.getBoundingClientRect().width
      widthWithLabelsRef.current = withW
      widthWithoutLabelsRef.current = withoutW
      setShowFilterLabels(available >= withW + BUFFER_PX)
    }

    const raf = requestAnimationFrame(() => {
      update()
    })
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update)
    })
    ro.observe(container)
    const onResize = () => requestAnimationFrame(update)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [showBackButton])

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:min-w-0 gba:bg-background gba:relative"
      data-testid="chat-callHistory"
    >
      <header
        className="gba:flex gba:items-center gba:border-b gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:flex-shrink-0 gba:gap-3 gba:px-4 gba:py-3 gba:min-w-0 gba:overflow-x-auto"
        data-testid="chat-callHistory-header"
      >
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t('chat-callHistoryBack')}
            data-testid="chat-callHistory-back"
            className="gba:h-8 gba:w-8 gba:flex-shrink-0"
          >
            <ArrowLeftIcon className="gba:w-4 gba:h-4" />
          </Button>
        )}
        <div className="gba:min-w-0 gba:flex-[3]">
          <h2 className="gba:font-semibold gba:truncate gba:text-foreground gba:text-base">{t('chat-callHistory')}</h2>
        </div>
        <div
          ref={filterContainerRef}
          className="gba:flex-[7] gba:flex gba:items-center gba:justify-end gba:gap-2 gba:min-w-0 gba:overflow-x-auto"
        >
          {/* Hidden rulers to measure filter width with/without labels (only when not mobile/compact) */}
          {!showBackButton && (
            <div
              ref={rulerWithLabelsRef}
              className="gba:absolute gba:left-0 gba:top-0 gba:invisible gba:pointer-events-none gba:flex gba:items-center gba:gap-2 gba:whitespace-nowrap"
              aria-hidden
            >
              <div className="gba:inline-flex gba:rounded-lg gba:bg-muted/60 gba:p-0.5 gba:gap-px">
                {statusFilters.map(({ label, icon }) => (
                  <span
                    key={label}
                    className="gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:p-2 gba:text-sm"
                  >
                    {icon}
                    <span>{label}</span>
                  </span>
                ))}
              </div>
              <span className="gba:w-px gba:h-4 gba:bg-border gba:flex-shrink-0" />
              <div className="gba:inline-flex gba:rounded-lg gba:bg-muted/60 gba:p-0.5 gba:gap-px">
                {typeFilters.map(({ label, icon }) => (
                  <span
                    key={label}
                    className="gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:p-2 gba:text-sm"
                  >
                    {icon}
                    <span>{label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {!showBackButton && (
            <div
              ref={rulerWithoutLabelsRef}
              className="gba:absolute gba:left-0 gba:top-0 gba:invisible gba:pointer-events-none gba:flex gba:items-center gba:gap-2 gba:whitespace-nowrap"
              aria-hidden
            >
              <div className="gba:inline-flex gba:rounded-lg gba:bg-muted/60 gba:p-0.5 gba:gap-px">
                {statusFilters.map(({ label, icon }) => (
                  <span key={label} className="gba:flex gba:items-center gba:justify-center gba:rounded-md gba:p-2">
                    {icon}
                  </span>
                ))}
              </div>
              <span className="gba:w-px gba:h-4 gba:bg-border gba:flex-shrink-0" />
              <div className="gba:inline-flex gba:rounded-lg gba:bg-muted/60 gba:p-0.5 gba:gap-px">
                {typeFilters.map(({ label, icon }) => (
                  <span key={label} className="gba:flex gba:items-center gba:justify-center gba:rounded-md gba:p-2">
                    {icon}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div
            className="gba:inline-flex gba:rounded-lg gba:bg-muted/60 gba:p-0.5 gba:gap-px"
            role="tablist"
            aria-label={t('chat-callHistory')}
          >
            {statusFilters.map(({ value: f, label, icon }) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                aria-label={label}
                title={label}
                onClick={() => setFilter(filter === f ? 'all' : f)}
                data-testid={`chat-callHistory-filter-${f}`}
                className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:p-2 gba:transition-colors gba:transition-shadow ${
                  showFilterLabels ? 'gba:gap-1.5' : ''
                } ${
                  filter === f
                    ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
                    : 'gba:text-muted-foreground hover:gba:text-foreground'
                }`}
              >
                {icon}
                {showFilterLabels && <span className="gba:text-sm gba:whitespace-nowrap">{label}</span>}
              </button>
            ))}
          </div>
          <span className="gba:w-px gba:h-4 gba:bg-border gba:flex-shrink-0" aria-hidden />
          <div
            className="gba:inline-flex gba:rounded-lg gba:bg-muted/60 gba:p-0.5 gba:gap-px"
            role="tablist"
            aria-label={t('chat-callHistoryFilterType')}
          >
            {typeFilters.map(({ value: f, label, icon }) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={callTypeFilter === f}
                aria-label={label}
                title={label}
                onClick={() => setCallTypeFilter(callTypeFilter === f ? 'all' : f)}
                data-testid={`chat-callHistory-typeFilter-${f}`}
                className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:p-2 gba:transition-colors gba:transition-shadow ${
                  showFilterLabels ? 'gba:gap-1.5' : ''
                } ${
                  callTypeFilter === f
                    ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
                    : 'gba:text-muted-foreground hover:gba:text-foreground'
                }`}
              >
                {icon}
                {showFilterLabels && <span className="gba:text-sm gba:whitespace-nowrap">{label}</span>}
              </button>
            ))}
          </div>
        </div>
        {!showBackButton && (
          <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="chat-callHistory-close"
              title={t('chat-closeConversation')}
              aria-label={t('chat-closeConversation')}
            >
              <XIcon className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        )}
      </header>

      <div className="gba:flex-1 gba:min-w-0 gba:overflow-auto gba:min-h-0">
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
          <div className="gba:flex gba:flex-col gba:pb-4 gba:pt-0">
            {entries.map(entry =>
              entry.type === 'joined' ? (
                <CallHistoryItemJoined
                  key={`joined-${entry.item.id}`}
                  item={entry.item}
                  currentUserId={currentUserId}
                  avatarMap={avatarMap}
                  otherUserPresence={
                    presenceMap && entry.item.hostId !== currentUserId
                      ? (presenceMap.get(entry.item.hostId ?? '') ?? presenceMap.get(entry.item.host?.id ?? ''))
                      : undefined
                  }
                  onOpenConversation={onOpenConversation}
                  t={t}
                />
              ) : (
                <CallHistoryItemOutcome
                  key={`outcome-${entry.item.id}`}
                  item={entry.item}
                  avatarMap={avatarMap}
                  otherUserPresence={
                    presenceMap && entry.item.inviterId
                      ? presenceMap.get(entry.item.inviterId)
                      : presenceMap && entry.item.inviter?.id
                        ? presenceMap.get(entry.item.inviter.id)
                        : undefined
                  }
                  onOpenConversation={onOpenConversation}
                  t={t}
                />
              )
            )}
            {hasMore && (
              <div className="gba:flex gba:justify-center gba:pt-2 gba:pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-testid="chat-callHistory-loadMore"
                  className="gba:min-w-24"
                >
                  {loadingMore ? <Spinner className="gba:size-4" /> : t('chat-callHistoryLoadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
