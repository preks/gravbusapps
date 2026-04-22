import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger,
  TabSwitchContent,
  TabSwitchBadge,
  Button,
  useTranslation,
  toast
} from '@newwork/nw-design-system'
import { MessageSquare, Calendar as CalendarIcon, Sparkles, Bell, LayoutDashboard } from 'lucide-react'
import { ArrowsOut } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Chat } from './Chat'
import { Calendar } from './calendar/Calendar'
import { EveryAI } from '../every-ai/EveryAI'
import { RemindersPanel } from './components/RemindersPanel'
import { EveryOneDashboard } from './components/dashboard'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useDevReportScreenKey } from '@/common/dev-report/DevReportScreenKeyContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import translations from './_i18n'
import { GlobalCallContainer } from './components/GlobalCallContainer'
import { GlobalPreCallSetupDialog } from './components/GlobalPreCallSetupDialog'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { useChatWebSocketClient } from '@/common/network/chat/useChatWebSocketClient'
import { useEmailAccounts } from '../email-apps/hooks/useEmailAccounts'
import { useExternalCalendarEvents } from '../email-apps/hooks/useExternalCalendarEvents'
import type { CalendarEvent, CalendarEventSource, ExternalCalendarSource } from './calendar/types'
import { InvitationStatus, MeetingStatus } from './calendar/types'
import type { EmailAccount, ExternalCalendarEvent } from '../email-apps/types'

type TabValue = 'dashboard' | 'everyai' | 'chat' | 'calendar' | 'reminders'
type ResolvedTabValue = TabValue | null
type CallParticipant = { id: string; odId: string; odName: string; avatarUrl?: string }
type CalendarAccount = EmailAccount & { provider: ExternalCalendarSource['provider']; status: 'active' }
type MeetingParticipantLike = {
  status: InvitationStatus
  userId: string
  user?: {
    displayName?: string
    firstName?: string
    lastName?: string
    email?: string
    avatarUrl?: string
  }
}

const parseTabValue = (value: string | null): TabValue | null => {
  if (
    value === 'dashboard' ||
    value === 'everyai' ||
    value === 'chat' ||
    value === 'calendar' ||
    value === 'reminders'
  ) {
    return value
  }

  return null
}

interface ChatWithCalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  defaultTab?: TabValue
}

// `renderMode` can be supplied via `additionalData.renderMode` by the platform
// shell to force a specific layout regardless of the current URL. This lets
// the shell mount an independent sidepanel instance of ChatWithCalendar even
// while the same component is rendered as the fullscreen page (e.g. a user
// has the chat sidepanel open while navigating to /platform/chat). Without
// this hint both mounts would resolve `isInSidepanel` from `window.location`
// and end up in the same layout, mirroring each other's URL state.
type RenderMode = 'sidepanel' | 'fullscreen'

// Presence info type (same as in Chat.tsx)
interface PresenceInfo {
  state: 'online' | 'offline'
  lastSeen?: string
}

const ChatWithCalendarInner: React.FC<ChatWithCalendarProps> = ({
  accessToken,
  userInfo,
  additionalData,
  prefixDataTestId = 'chat-calendar',
  defaultTab = 'dashboard',
  ...props
}) => {
  const renderMode: RenderMode | undefined =
    additionalData?.renderMode === 'sidepanel' || additionalData?.renderMode === 'fullscreen'
      ? additionalData.renderMode
      : undefined
  const { t } = useTranslation(translations)
  const [overdueRemindersCount, setOverdueRemindersCount] = useState<number>(0)
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceInfo>>(new Map())
  const [activeCalls, setActiveCalls] = useState<Record<string, any>>({})
  const isTeamChatEnabled = useFeature<boolean>(Feature.Core.ChatTeam.Key)
  const isChatAIEnabled = useFeature<boolean>(Feature.Core.ChatAI.Key)

  const calendarApiClient = useChatClient(accessToken)
  const chatSocket = useChatWebSocketClient(accessToken)

  // External calendar events from email accounts
  const { accounts: emailAccounts } = useEmailAccounts(accessToken)

  // Calculate a broad date range for external events (current month +/- 1 month)
  const externalDateRange = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    return { start, end }
  }, [])

  const { events: rawExternalEvents } = useExternalCalendarEvents({
    accessToken,
    accounts: emailAccounts,
    startDate: externalDateRange.start,
    endDate: externalDateRange.end,
    enabled: emailAccounts.length > 0
  })

  const externalCalendarSources: ExternalCalendarSource[] = useMemo(() => {
    return emailAccounts
      .filter(
        (account): account is CalendarAccount =>
          (account.provider === 'microsoft' || account.provider === 'google') && account.status === 'active'
      )
      .map(account => ({
        id: account.id,
        label: account.displayName || account.emailAddress,
        provider: account.provider
      }))
  }, [emailAccounts])

  const externalCalendarSourceLabels = useMemo(
    () => new Map(externalCalendarSources.map(source => [source.id, source.label])),
    [externalCalendarSources]
  )

  // Map external events to CalendarEvent format for the Calendar component
  const externalCalendarEvents: CalendarEvent[] = useMemo(() => {
    return rawExternalEvents
      .filter(evt => evt.status !== 'cancelled')
      .map(
        (evt: ExternalCalendarEvent): CalendarEvent => ({
          id: evt.id,
          title: evt.title,
          description: evt.description,
          start: new Date(evt.start),
          end: new Date(evt.end),
          allDay: evt.allDay,
          color: evt.provider === 'microsoft' ? '#0078D4' : '#4285F4',
          status: MeetingStatus.SCHEDULED,
          participantStatus:
            evt.responseStatus === 'accepted'
              ? InvitationStatus.ACCEPTED
              : evt.responseStatus === 'declined'
                ? InvitationStatus.DECLINED
                : evt.responseStatus === 'tentative'
                  ? InvitationStatus.TENTATIVE
                  : InvitationStatus.PENDING,
          isOrganizer: evt.isOrganizer,
          organizer: {
            id: '',
            displayName: evt.organizer?.name || evt.organizer?.email || '',
            email: evt.organizer?.email || ''
          },
          participantCount: evt.attendees?.length || 0,
          acceptedCount: evt.attendees?.filter(a => a.status === 'accepted').length || 0,
          participants:
            evt.attendees?.map(a => ({
              id: '',
              email: a.email,
              firstName: a.name?.split(' ')[0],
              lastName: a.name?.split(' ').slice(1).join(' '),
              displayName: a.name || a.email,
              status:
                a.status === 'accepted'
                  ? InvitationStatus.ACCEPTED
                  : a.status === 'declined'
                    ? InvitationStatus.DECLINED
                    : a.status === 'tentative'
                      ? InvitationStatus.TENTATIVE
                      : InvitationStatus.PENDING,
              isOrganizer: false
            })) || [],
          meetingLink: evt.meetingLink,
          location: evt.location,
          source: evt.provider as CalendarEventSource,
          externalId: evt.externalId,
          externalLink: evt.externalLink,
          isReadOnly: true,
          sourceId: evt.accountId,
          calendarName: externalCalendarSourceLabels.get(evt.accountId)
        })
      )
  }, [externalCalendarSourceLabels, rawExternalEvents])

  const isInSidepanel = useMemo(() => {
    // Explicit hint from the host shell wins over URL detection so the
    // sidepanel mount can stay independent from the fullscreen page mount.
    if (renderMode === 'sidepanel') return true
    if (renderMode === 'fullscreen') return false

    if (globalThis.window === undefined) return false

    let normalizedPath = globalThis.window.location.pathname
    while (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1)
    }
    // Fullscreen Chat can be mounted as canonical (/platform/chat) or as the app path (/platform/apps/chat) in local/dev.
    if (normalizedPath === '/platform/chat' || normalizedPath === '/platform/apps/chat') return false

    return true
  }, [renderMode])

  // Only the fullscreen instance owns the URL `?view=` query param. The
  // sidepanel instance must not read or write it, otherwise both mounts
  // mirror each other (and closing the sidepanel can leave stale state in
  // the URL that the page mount picks up).
  const ownsUrlState = !isInSidepanel

  const isNarrowViewport = useMemo(() => {
    if (globalThis.window === undefined) return false
    return globalThis.window.innerWidth < 768
  }, [])

  const isCompactMode = isInSidepanel || isNarrowViewport
  const isChatShellBlocked = !isTeamChatEnabled && !isChatAIEnabled

  const getSafeDefaultTab = useCallback((): ResolvedTabValue => {
    if (isChatShellBlocked) {
      return null
    }

    // Sidepanel opens on EveryAI by default (most common entry point from the
    // shell icon), fullscreen opens on Dashboard. All 5 tabs are available in
    // both modes — the only difference is the initial tab.
    if (isInSidepanel && isChatAIEnabled) {
      return 'everyai'
    }

    return 'dashboard'
  }, [isChatAIEnabled, isChatShellBlocked, isInSidepanel])

  const resolveAllowedTab = useCallback(
    (requestedTab: TabValue): ResolvedTabValue => {
      if (isChatShellBlocked) {
        return null
      }

      // Dashboard is always available — it's the EveryOne overview and the
      // sidepanel mount benefits from it just as much as the fullscreen page.
      if (requestedTab === 'dashboard') {
        return 'dashboard'
      }

      // EveryAI is available wherever the AI feature is enabled, regardless of
      // sidepanel vs fullscreen — the sidepanel and the page can both surface
      // EveryAI without duplicating each other thanks to renderMode plumbing.
      if (requestedTab === 'everyai') {
        return isChatAIEnabled ? 'everyai' : getSafeDefaultTab()
      }

      if (requestedTab === 'reminders') {
        return isChatAIEnabled ? 'reminders' : getSafeDefaultTab()
      }

      if (requestedTab === 'chat' || requestedTab === 'calendar') {
        return isTeamChatEnabled ? requestedTab : getSafeDefaultTab()
      }

      return getSafeDefaultTab()
    },
    [getSafeDefaultTab, isChatAIEnabled, isChatShellBlocked, isTeamChatEnabled]
  )

  const [chatInitState] = useState<{
    tab: ResolvedTabValue
    pending: { userId: string; userName?: string; prefilledMessage?: string; metadata?: Record<string, unknown> } | null
  }>(() => {
    try {
      if (globalThis.window === undefined) return { tab: resolveAllowedTab(defaultTab), pending: null }
      const raw = sessionStorage.getItem('chatPendingOpenWithUser')
      if (raw) {
        sessionStorage.removeItem('chatPendingOpenWithUser')
        const pending = JSON.parse(raw) as {
          userId: string
          userName?: string
          prefilledMessage?: string
          metadata?: Record<string, unknown>
        }
        return { tab: resolveAllowedTab('chat'), pending }
      }
      // Sidepanel mount never reads the URL — the URL is owned by the
      // fullscreen page mount when both are present.
      if (ownsUrlState) {
        const requestedTab = parseTabValue(new URLSearchParams(globalThis.window.location.search).get('view'))
        if (requestedTab) {
          return { tab: resolveAllowedTab(requestedTab), pending: null }
        }
      }
    } catch {
      // ignore
    }
    return { tab: resolveAllowedTab(defaultTab), pending: null }
  })
  const [activeTab, setActiveTab] = useState<ResolvedTabValue>(chatInitState.tab)
  const pendingOpenWithUser = chatInitState.pending

  const updateTabUrl = useCallback(
    (tab: ResolvedTabValue) => {
      if (!ownsUrlState) return
      if (globalThis.window === undefined || !tab) return

      const url = new URL(globalThis.window.location.href)
      url.searchParams.set('view', tab)
      globalThis.window.history.replaceState({}, '', url.toString())
    },
    [ownsUrlState]
  )

  const { setSuffix } = useDevReportScreenKey()
  useEffect(() => {
    setSuffix(activeTab)
  }, [activeTab, setSuffix])

  useEffect(() => {
    if (pendingOpenWithUser) {
      updateTabUrl(resolveAllowedTab('chat'))
    }
  }, [pendingOpenWithUser, resolveAllowedTab, updateTabUrl])

  useEffect(() => {
    const offReminder = chatSocket.on('meeting:reminder', (payload: { title?: string; minutesBefore?: number }) => {
      const minutesBefore = payload?.minutesBefore ?? 0
      const titleText = payload?.title || 'Meeting'
      let reminderMessage: string
      if (minutesBefore > 0) {
        const minuteSuffix = minutesBefore === 1 ? '' : 's'
        reminderMessage = `${titleText} starts in ${minutesBefore} minute${minuteSuffix}`
      } else {
        reminderMessage = `${titleText} is starting now`
      }
      toast.info(reminderMessage, { duration: 5000 })
    })

    const offStarting = chatSocket.on('meeting:starting', (payload: { title?: string }) => {
      toast.success(`${payload?.title || 'Meeting'} is starting`, { duration: 5000 })
    })

    return () => {
      offReminder()
      offStarting()
    }
  }, [chatSocket])

  const openFullscreen = useCallback(() => {
    const nextTab = activeTab ? resolveAllowedTab(activeTab) : getSafeDefaultTab()
    const url = nextTab ? `/platform/chat?view=${nextTab}` : '/platform/chat'
    navigateTo(url)
  }, [activeTab, getSafeDefaultTab, resolveAllowedTab])

  // Handle URL parameter for initial tab (fullscreen / URL-owning mount only)
  useEffect(() => {
    if (!ownsUrlState) return
    if (pendingOpenWithUser) return
    const requestedTab = parseTabValue(new URLSearchParams(globalThis.window.location.search).get('view'))

    if (requestedTab) {
      const nextTab = resolveAllowedTab(requestedTab)

      if (nextTab !== activeTab) {
        setActiveTab(nextTab)
      }

      if (nextTab && nextTab !== requestedTab) {
        updateTabUrl(nextTab)
      }
    }
  }, [activeTab, ownsUrlState, pendingOpenWithUser, resolveAllowedTab, updateTabUrl])

  // Sync tab from URL on popstate (e.g. user clicks Back to calendar link so calendar + meeting open correctly).
  // Only the URL-owning fullscreen mount reacts so it doesn't drag the sidepanel into the same tab.
  useEffect(() => {
    if (!ownsUrlState) return
    const syncTabFromUrl = () => {
      const requestedTab = parseTabValue(new URLSearchParams(globalThis.window.location.search).get('view'))
      if (!requestedTab) return

      const nextTab = resolveAllowedTab(requestedTab)
      setActiveTab(nextTab)

      if (nextTab && nextTab !== requestedTab) {
        updateTabUrl(nextTab)
      }
    }
    globalThis.window.addEventListener('popstate', syncTabFromUrl)
    return () => globalThis.window.removeEventListener('popstate', syncTabFromUrl)
  }, [ownsUrlState, resolveAllowedTab, updateTabUrl])

  useEffect(() => {
    const nextTab = activeTab ? resolveAllowedTab(activeTab) : getSafeDefaultTab()

    if (nextTab !== activeTab) {
      setActiveTab(nextTab)
      updateTabUrl(nextTab)
    }
  }, [activeTab, resolveAllowedTab, updateTabUrl])

  // Listen for custom event to open sidebar with specific tab.
  // Only the sidepanel mount should react — this event is dispatched by the
  // platform shell when it opens the sidepanel and is meant to seed THAT
  // mount's tab, not the unrelated fullscreen page mount.
  useEffect(() => {
    if (!isInSidepanel) return
    const handleChatSidebarOpened = (event: CustomEvent<{ defaultTab?: TabValue }>) => {
      const tab = event.detail?.defaultTab
      if (tab) {
        const nextTab = resolveAllowedTab(tab)
        setActiveTab(nextTab)
      }
    }

    globalThis.window.addEventListener('chatSidebarOpened', handleChatSidebarOpened as EventListener)
    return () => {
      globalThis.window.removeEventListener('chatSidebarOpened', handleChatSidebarOpened as EventListener)
    }
  }, [isInSidepanel, resolveAllowedTab])

  // Listen for custom event to switch to chat.
  // `switchToChat` is dispatched by the platform shell's chat message listener
  // immediately after it opens the global sidepanel (e.g. when a business app
  // sends OPEN_CHAT_WITH_USER). It targets the sidepanel mount, so the
  // fullscreen page mount must NOT react to it — otherwise opening the chat
  // sidepanel from another page would also yank the unrelated /platform/chat
  // page mount onto the chat tab.
  useEffect(() => {
    if (!isInSidepanel) return
    const handleSwitchToChat = () => {
      const nextTab = resolveAllowedTab('chat')
      setActiveTab(nextTab)
    }

    globalThis.window.addEventListener('switchToChat', handleSwitchToChat as EventListener)

    return () => {
      globalThis.window.removeEventListener('switchToChat', handleSwitchToChat as EventListener)
    }
  }, [isInSidepanel, resolveAllowedTab])

  // Listen for custom event to switch to calendar
  useEffect(() => {
    const handleSwitchToCalendar = () => {
      const nextTab = resolveAllowedTab('calendar')
      setActiveTab(nextTab)

      if (nextTab !== 'calendar') {
        updateTabUrl(nextTab)
      }
    }

    globalThis.window.addEventListener('switchToCalendar', handleSwitchToCalendar as EventListener)
    return () => {
      globalThis.window.removeEventListener('switchToCalendar', handleSwitchToCalendar as EventListener)
    }
  }, [resolveAllowedTab, updateTabUrl])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const requestedTab = parseTabValue(value)
    if (!requestedTab) return

    const nextTab = resolveAllowedTab(requestedTab)
    setActiveTab(nextTab)

    // Update URL without page reload
    updateTabUrl(nextTab)
  }

  if (activeTab === null) {
    return (
      <div
        className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-background gba:px-6 gba:text-center"
        data-testid={`${prefixDataTestId}-blocked`}
      >
        <div className="gba:max-w-md gba:space-y-2">
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('chat-shell-disabled-title')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground">{t('chat-shell-disabled-description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:relative" data-testid={prefixDataTestId}>
      {isInSidepanel && (
        <div className="gba:absolute gba:top-4 gba:left-4 gba:z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={openFullscreen}
            className="gba:relative gba:p-2 gba:rounded-full gba:bg-card/80 gba:backdrop-blur-sm gba:border gba:border-border hover:gba:bg-accent gba:transition-all hover:gba:shadow-lg gba:group"
            data-testid="chat-fullscreen-button"
            title={t('chat-fullscreen-button')}
          >
            <ArrowsOut
              className="gba:h-5 gba:w-5 gba:text-muted-foreground group-hover:gba:text-primary gba:transition-colors"
              weight="regular"
            />
          </Button>
        </div>
      )}

      <TabSwitch
        value={activeTab}
        onValueChange={handleTabChange}
        showBottomBorder
        className="gba:h-full gba:flex gba:flex-col"
      >
        <div
          className={`gba:flex gba:bg-card gba:overflow-x-auto gba:scrollbar-hide ${isCompactMode ? 'gba:justify-start gba:px-2 gba:py-1' : 'gba:justify-start gba:px-6 gba:py-2'}`}
        >
          <TabSwitchList className="gba:overflow-x-auto gba:scrollbar-hide">
            <TabSwitchTrigger
              value="dashboard"
              startIcon={<LayoutDashboard className="gba:h-4 gba:w-4" />}
              data-testid={`${prefixDataTestId}-dashboard-tab`}
            >
              {t('chat-tab-dashboard')}
            </TabSwitchTrigger>
            {isChatAIEnabled && (
              <TabSwitchTrigger
                value="everyai"
                startIcon={<Sparkles className="gba:h-4 gba:w-4" />}
                data-testid={`${prefixDataTestId}-everyai-tab`}
              >
                {t('chat-tab-everyai')}
              </TabSwitchTrigger>
            )}
            {isTeamChatEnabled && (
              <TabSwitchTrigger
                value="chat"
                startIcon={<MessageSquare className="gba:h-4 gba:w-4" />}
                data-testid={`${prefixDataTestId}-chat-tab`}
              >
                {t('chat-tab-chat')}
              </TabSwitchTrigger>
            )}
            {isTeamChatEnabled && (
              <TabSwitchTrigger
                value="calendar"
                startIcon={<CalendarIcon className="gba:h-4 gba:w-4" />}
                data-testid={`${prefixDataTestId}-calendar-tab`}
              >
                {t('chat-tab-calendar')}
              </TabSwitchTrigger>
            )}
            {isChatAIEnabled && (
              <TabSwitchTrigger
                value="reminders"
                startIcon={<Bell className="gba:h-4 gba:w-4" />}
                endAdornment={
                  overdueRemindersCount > 0 ? (
                    <TabSwitchBadge variant="destructive" size="sm">
                      {overdueRemindersCount}
                    </TabSwitchBadge>
                  ) : undefined
                }
                data-testid={`${prefixDataTestId}-reminders-tab`}
              >
                {t('chat-tab-reminders')}
              </TabSwitchTrigger>
            )}
          </TabSwitchList>
        </div>

        {/* Use forceMount to keep all tabs mounted for call persistence */}
        <TabSwitchContent
          value="dashboard"
          forceMount
          className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'dashboard' ? 'gba:hidden' : ''}`}
        >
          <EveryOneDashboard
            accessToken={accessToken}
            userInfo={userInfo as { displayName?: string; firstName?: string; lastName?: string; email?: string }}
            isActive={activeTab === 'dashboard'}
            presenceMap={presenceMap}
            onOpenChat={userId => {
              const nextTab = resolveAllowedTab('chat')
              setActiveTab(nextTab)

              if (nextTab !== 'chat') {
                updateTabUrl(nextTab)
                return
              }

              setTimeout(() => {
                globalThis.window.dispatchEvent(new CustomEvent('chat:open-with-user', { detail: { userId } }))
              }, 100)
            }}
            onStartCall={(userId, displayName, callType, avatarUrl) => {
              // Do not switch to Chat tab; PreCall dialog is global and works from any tab
              setTimeout(() => {
                globalThis.window.dispatchEvent(
                  new CustomEvent('chat:start-call-with-user', {
                    detail: { userId, displayName, avatarUrl, callType }
                  })
                )
              }, 100)
            }}
            onJoinMeeting={async meeting => {
              const conversationId = meeting.conversationId ?? meeting.id
              const callId = meeting.conversationId || meeting.id
              const isStarting = meeting.isOrganizer && !activeCalls[callId]
              // Only pass participants when starting (organizer, no active call) so invites are sent; when joining existing call, pass empty
              let participants: CallParticipant[] = []
              if (isStarting && calendarApiClient) {
                try {
                  const { meeting: fullMeeting } = await calendarApiClient.getMeeting<{ meeting: any }>(meeting.id)
                  const list: CallParticipant[] =
                    fullMeeting.participants
                      ?.filter((p: MeetingParticipantLike) => p.status !== InvitationStatus.DECLINED)
                      .map((p: MeetingParticipantLike) => ({
                        id: p.userId,
                        odId: p.userId,
                        odName:
                          p.user?.displayName ||
                          `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim() ||
                          p.user?.email ||
                          'Unknown',
                        avatarUrl: p.user?.avatarUrl
                      })) ?? []
                  if (fullMeeting.organizer && !list.some(p => p.id === fullMeeting.organizer?.id)) {
                    list.push({
                      id: fullMeeting.organizer.id,
                      odId: fullMeeting.organizer.id,
                      odName:
                        fullMeeting.organizer.displayName ||
                        `${fullMeeting.organizer.firstName ?? ''} ${fullMeeting.organizer.lastName ?? ''}`.trim() ||
                        fullMeeting.organizer.email ||
                        'Unknown',
                      avatarUrl: fullMeeting.organizer.avatarUrl
                    })
                  }
                  participants = list
                } catch {
                  participants =
                    meeting.participants
                      ?.filter(p => p.status !== InvitationStatus.DECLINED)
                      .map(p => ({
                        id: p.id,
                        odId: p.id,
                        odName:
                          p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown',
                        avatarUrl: p.avatarUrl
                      })) ?? []
                  if (meeting.organizer && !participants.some(p => p.id === meeting.organizer?.id)) {
                    participants.push({
                      id: meeting.organizer.id,
                      odId: meeting.organizer.id,
                      odName:
                        meeting.organizer.displayName ||
                        `${meeting.organizer.firstName || ''} ${meeting.organizer.lastName || ''}`.trim() ||
                        meeting.organizer.email ||
                        'Unknown',
                      avatarUrl: meeting.organizer.avatarUrl
                    })
                  }
                }
              }
              // Do not switch to Chat tab; PreCall dialog is global and works from any tab
              setTimeout(() => {
                globalThis.window.dispatchEvent(
                  new CustomEvent('chat:join-meeting', {
                    detail: {
                      meetingId: meeting.id,
                      conversationId,
                      title: meeting.title,
                      participants
                    }
                  })
                )
              }, 100)
            }}
            data-testid={`${prefixDataTestId}-dashboard`}
          />
        </TabSwitchContent>

        {isChatAIEnabled && (
          <TabSwitchContent
            value="everyai"
            forceMount
            className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'everyai' ? 'gba:hidden' : ''}`}
          >
            <EveryAI
              accessToken={accessToken}
              userInfo={userInfo}
              isActive={activeTab === 'everyai'}
              compactSuggestions={isInSidepanel}
              {...props}
            />
          </TabSwitchContent>
        )}

        {isTeamChatEnabled && (
          <TabSwitchContent
            value="chat"
            forceMount
            className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'chat' ? 'gba:hidden' : ''}`}
          >
            <Chat
              accessToken={accessToken}
              userInfo={userInfo}
              calendarApiClient={calendarApiClient}
              prefixDataTestId={`${prefixDataTestId}-chat`}
              onPresenceMapChange={setPresenceMap}
              onActiveCallsChange={setActiveCalls}
              initialOpenWithUser={pendingOpenWithUser}
              {...props}
            />
          </TabSwitchContent>
        )}

        {isTeamChatEnabled && (
          <TabSwitchContent
            value="calendar"
            forceMount
            className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'calendar' ? 'gba:hidden' : ''}`}
          >
            <Calendar
              accessToken={accessToken}
              userInfo={userInfo}
              prefixDataTestId={`${prefixDataTestId}-calendar`}
              activeCalls={activeCalls}
              externalCalendarEvents={externalCalendarEvents}
              externalCalendarSources={externalCalendarSources}
              defaultSidebarOpen={!isInSidepanel && !isNarrowViewport}
              onOpenChat={conversationId => {
                const nextTab = resolveAllowedTab('chat')
                setActiveTab(nextTab)

                if (nextTab !== 'chat') {
                  updateTabUrl(nextTab)
                  return
                }

                setTimeout(() => {
                  globalThis.dispatchEvent(
                    new CustomEvent('chat:open-with-conversation', { detail: { conversationId } })
                  )
                }, 100)
              }}
              {...props}
            />
          </TabSwitchContent>
        )}

        {isChatAIEnabled && (
          <TabSwitchContent
            value="reminders"
            forceMount
            className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'reminders' ? 'gba:hidden' : ''}`}
          >
            <RemindersPanel
              accessToken={accessToken}
              userInfo={userInfo}
              onOverdueCountChange={setOverdueRemindersCount}
              t={t}
            />
          </TabSwitchContent>
        )}
      </TabSwitch>
    </div>
  )
}

ChatWithCalendarInner.displayName = 'ChatWithCalendarInner'

export const ChatWithCalendar: React.FC<ChatWithCalendarProps> = props => {
  return (
    <>
      <ChatWithCalendarInner {...props} />

      {/* Global call UI - renders minimized/full call view that persists across tab navigation */}
      <GlobalCallContainer />

      {/* Global pre-call setup dialog - singleton to prevent duplicates when multiple Chat instances exist */}
      <GlobalPreCallSetupDialog />
    </>
  )
}
