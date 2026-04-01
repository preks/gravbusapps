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
import translations from './_i18n'
import { GlobalCallContainer } from './components/GlobalCallContainer'
import { GlobalPreCallSetupDialog } from './components/GlobalPreCallSetupDialog'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { useChatWebSocketClient } from '@/common/network/chat/useChatWebSocketClient'
import { useEmailAccounts } from '../email-apps/hooks/useEmailAccounts'
import { useExternalCalendarEvents } from '../email-apps/hooks/useExternalCalendarEvents'
import type { CalendarEvent, CalendarEventSource, ExternalCalendarSource } from './calendar/types'
import { InvitationStatus, MeetingStatus } from './calendar/types'
import type { ExternalCalendarEvent } from '../email-apps/types'

type TabValue = 'dashboard' | 'everyai' | 'chat' | 'calendar' | 'reminders'

interface ChatWithCalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  defaultTab?: TabValue
}

// Presence info type (same as in Chat.tsx)
interface PresenceInfo {
  state: 'online' | 'offline'
  lastSeen?: string
}

const ChatWithCalendarInner: React.FC<ChatWithCalendarProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'chat-calendar',
  defaultTab = 'dashboard',
  ...props
}) => {
  const { t } = useTranslation(translations)
  const [overdueRemindersCount, setOverdueRemindersCount] = useState<number>(0)
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceInfo>>(new Map())
  const [activeCalls, setActiveCalls] = useState<Record<string, any>>({})

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
        account => (account.provider === 'microsoft' || account.provider === 'google') && account.status === 'active'
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
    if (globalThis.window === undefined) return false

    let normalizedPath = globalThis.window.location.pathname
    while (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1)
    }
    // Fullscreen Chat can be mounted as canonical (/platform/chat) or as the app path (/platform/apps/chat) in local/dev.
    if (normalizedPath === '/platform/chat' || normalizedPath === '/platform/apps/chat') return false

    return true
  }, [])

  const isNarrowViewport = useMemo(() => {
    if (globalThis.window === undefined) return false
    return globalThis.window.innerWidth < 768
  }, [])

  const isCompactMode = isInSidepanel || isNarrowViewport

  const effectiveDefaultTab = isCompactMode ? 'everyai' : defaultTab

  const [chatInitState] = useState<{
    tab: TabValue
    pending: { userId: string; userName?: string; prefilledMessage?: string; metadata?: Record<string, unknown> } | null
  }>(() => {
    try {
      if (globalThis.window === undefined) return { tab: effectiveDefaultTab, pending: null }
      const raw = sessionStorage.getItem('chatPendingOpenWithUser')
      if (raw) {
        sessionStorage.removeItem('chatPendingOpenWithUser')
        const pending = JSON.parse(raw) as {
          userId: string
          userName?: string
          prefilledMessage?: string
          metadata?: Record<string, unknown>
        }
        return { tab: 'chat', pending }
      }
      // On load with URL params (e.g. ?app=...&view=calendar&meetingId=... on localhost), open on the correct tab immediately
      const viewParam = new URLSearchParams(globalThis.window.location.search).get('view')
      if (viewParam === 'calendar' || viewParam === 'chat' || viewParam === 'reminders' || viewParam === 'everyai') {
        const tab: TabValue = viewParam === 'everyai' ? 'everyai' : viewParam
        return { tab, pending: null }
      }
      if (viewParam === 'dashboard') {
        return { tab: 'dashboard', pending: null }
      }
    } catch {
      // ignore
    }
    return { tab: effectiveDefaultTab, pending: null }
  })
  const [activeTab, setActiveTab] = useState<TabValue>(chatInitState.tab)
  const pendingOpenWithUser = chatInitState.pending

  const { setSuffix } = useDevReportScreenKey()
  useEffect(() => {
    setSuffix(activeTab)
  }, [activeTab, setSuffix])

  useEffect(() => {
    if (pendingOpenWithUser) {
      const url = new URL(globalThis.window.location.href)
      url.searchParams.set('view', 'chat')
      globalThis.window.history.replaceState({}, '', url.toString())
    }
  }, [pendingOpenWithUser])

  useEffect(() => {
    const offReminder = chatSocket.on('meeting:reminder', (payload: { title?: string; minutesBefore?: number }) => {
      const minutesBefore = payload?.minutesBefore ?? 0
      toast.info(
        minutesBefore > 0
          ? `${payload?.title || 'Meeting'} starts in ${minutesBefore} minute${minutesBefore === 1 ? '' : 's'}`
          : `${payload?.title || 'Meeting'} is starting now`,
        { duration: 5000 }
      )
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
    // Preserve the current tab when going fullscreen
    const url = `/platform/chat?view=${activeTab}`
    navigateTo(url)
  }, [activeTab])

  // Handle URL parameter for initial tab
  useEffect(() => {
    if (pendingOpenWithUser) return
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const viewParam = urlParams.get('view')

    // In sidepanel mode, don't allow dashboard tab - redirect to everyai
    if (viewParam === 'dashboard') {
      if (isCompactMode) {
        setActiveTab('everyai')
      } else {
        setActiveTab('dashboard')
      }
    } else if (viewParam === 'everyai') {
      // EveryAI tab only available in sidebar; in fullscreen fall back to dashboard
      setActiveTab(isInSidepanel ? 'everyai' : 'dashboard')
    } else if (viewParam === 'calendar') {
      setActiveTab('calendar')
    } else if (viewParam === 'chat') {
      setActiveTab('chat')
    } else if (viewParam === 'reminders') {
      setActiveTab('reminders')
    }
  }, [isCompactMode, isInSidepanel, pendingOpenWithUser])

  // Sync tab from URL on popstate (e.g. user clicks Back to calendar link so calendar + meeting open correctly)
  useEffect(() => {
    const syncTabFromUrl = () => {
      const viewParam = new URLSearchParams(globalThis.window.location.search).get('view')
      if (viewParam === 'calendar') setActiveTab('calendar')
      else if (viewParam === 'chat') setActiveTab('chat')
      else if (viewParam === 'reminders') setActiveTab('reminders')
      else if (viewParam === 'dashboard') setActiveTab(isCompactMode ? 'everyai' : 'dashboard')
      else if (viewParam === 'everyai') setActiveTab('everyai')
    }
    globalThis.window.addEventListener('popstate', syncTabFromUrl)
    return () => globalThis.window.removeEventListener('popstate', syncTabFromUrl)
  }, [isCompactMode])

  // In fullscreen, EveryAI tab is not available; ensure we never stay on it
  useEffect(() => {
    if (!isInSidepanel && activeTab === 'everyai') {
      setActiveTab('dashboard')
      const url = new URL(globalThis.window.location.href)
      url.searchParams.set('view', 'dashboard')
      globalThis.window.history.replaceState({}, '', url.toString())
    }
  }, [isInSidepanel, activeTab])

  // Listen for custom event to open sidebar with specific tab
  useEffect(() => {
    const handleChatSidebarOpened = (event: CustomEvent<{ defaultTab?: TabValue }>) => {
      const tab = event.detail?.defaultTab
      if (tab && (tab === 'dashboard' || tab === 'everyai' || tab === 'chat' || tab === 'calendar')) {
        setActiveTab(tab)
      }
    }

    globalThis.window.addEventListener('chatSidebarOpened', handleChatSidebarOpened as EventListener)
    return () => {
      globalThis.window.removeEventListener('chatSidebarOpened', handleChatSidebarOpened as EventListener)
    }
  }, [])

  // Listen for custom event to switch to chat
  useEffect(() => {
    const handleSwitchToChat = () => {
      setActiveTab('chat')
    }

    globalThis.window.addEventListener('switchToChat', handleSwitchToChat as EventListener)

    return () => {
      globalThis.window.removeEventListener('switchToChat', handleSwitchToChat as EventListener)
    }
  }, [activeTab])

  // Listen for custom event to switch to calendar
  useEffect(() => {
    const handleSwitchToCalendar = () => {
      setActiveTab('calendar')
      // The Calendar component will handle the date/meetingId from URL params
    }

    globalThis.window.addEventListener('switchToCalendar', handleSwitchToCalendar as EventListener)
    return () => {
      globalThis.window.removeEventListener('switchToCalendar', handleSwitchToCalendar as EventListener)
    }
  }, [])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue)

    // Update URL without page reload
    const url = new URL(globalThis.window.location.href)
    url.searchParams.set('view', value)
    globalThis.window.history.replaceState({}, '', url.toString())
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
            {!isCompactMode && (
              <TabSwitchTrigger
                value="dashboard"
                startIcon={<LayoutDashboard className="gba:h-4 gba:w-4" />}
                data-testid={`${prefixDataTestId}-dashboard-tab`}
              >
                Dashboard
              </TabSwitchTrigger>
            )}
            {isInSidepanel && (
              <TabSwitchTrigger
                value="everyai"
                startIcon={<Sparkles className="gba:h-4 gba:w-4" />}
                data-testid={`${prefixDataTestId}-everyai-tab`}
              >
                {t('chat-tab-everyai')}
              </TabSwitchTrigger>
            )}
            <TabSwitchTrigger
              value="chat"
              startIcon={<MessageSquare className="gba:h-4 gba:w-4" />}
              data-testid={`${prefixDataTestId}-chat-tab`}
            >
              {t('chat-tab-chat')}
            </TabSwitchTrigger>
            <TabSwitchTrigger
              value="calendar"
              startIcon={<CalendarIcon className="gba:h-4 gba:w-4" />}
              data-testid={`${prefixDataTestId}-calendar-tab`}
            >
              {t('chat-tab-calendar')}
            </TabSwitchTrigger>
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
          </TabSwitchList>
        </div>

        {/* Use forceMount to keep all tabs mounted for call persistence */}
        {!isCompactMode && (
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
                setActiveTab('chat')
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
                let participants: { id: string; odId: string; odName: string; avatarUrl?: string }[] = []
                if (isStarting && calendarApiClient) {
                  try {
                    const { meeting: fullMeeting } = await calendarApiClient.getMeeting<{ meeting: any }>(meeting.id)
                    const list =
                      fullMeeting.participants
                        ?.filter(p => p.status !== InvitationStatus.DECLINED)
                        .map(p => ({
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
        )}

        {isInSidepanel && (
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
              setActiveTab('chat')
              setTimeout(() => {
                globalThis.dispatchEvent(new CustomEvent('chat:open-with-conversation', { detail: { conversationId } }))
              }, 100)
            }}
            {...props}
          />
        </TabSwitchContent>

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
