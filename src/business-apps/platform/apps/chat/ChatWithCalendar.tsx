import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger,
  TabSwitchContent,
  TabSwitchBadge,
  Button
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
import { TranslationProvider, useChatTranslation } from './contexts/TranslationContext'
import { GlobalCallContainer } from './components/GlobalCallContainer'
import { GlobalPreCallSetupDialog } from './components/GlobalPreCallSetupDialog'
import { createCalendarApiClient } from './calendar/calendarApiClient'
import { env } from '@/common/env/EnvUtils'
import { useEmailAccounts } from '../email-apps/hooks/useEmailAccounts'
import { useExternalCalendarEvents } from '../email-apps/hooks/useExternalCalendarEvents'
import type { CalendarEvent, CalendarEventSource } from './calendar/types'
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
  const t = useChatTranslation()
  const [overdueRemindersCount, setOverdueRemindersCount] = useState<number>(0)
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceInfo>>(new Map())
  const [activeCalls, setActiveCalls] = useState<Record<string, any>>({})

  // Build API URL for calendar API client
  const calendarApiUrl = useMemo(() => {
    let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

    const chatServiceOverride = env('NEXT_PUBLIC_CHAT_SERVICE_URL')

    if (chatServiceOverride) {
      const localUrl = chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
      return `${localUrl}/api/v1`
    } else {
      const isLocalPlatform = baseUrl.includes('localhost')
      if (isLocalPlatform) {
        baseUrl = 'https://newwork-dev.newwork.com'
      }
      const apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1` || ''
      if (apiUrl.includes('localhost')) {
        return `${baseUrl}/chat-service/api/v1`
      }
      return apiUrl
    }
  }, [])

  // Create calendar API client
  const calendarApiClient = useMemo(() => {
    if (!accessToken || !calendarApiUrl) return null
    return createCalendarApiClient(calendarApiUrl, accessToken)
  }, [accessToken, calendarApiUrl])

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
          isReadOnly: true
        })
      )
  }, [rawExternalEvents])

  const isInSidepanel = useMemo(() => {
    if (typeof window === 'undefined') return false

    if (window.location.pathname === '/platform/chat') return false

    return true
  }, [])

  const isNarrowViewport = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  }, [])

  const isCompactMode = isInSidepanel || isNarrowViewport

  const effectiveDefaultTab = isCompactMode ? 'everyai' : defaultTab

  const [chatInitState] = useState<{
    tab: TabValue
    pending: { userId: string; userName?: string; prefilledMessage?: string; metadata?: Record<string, unknown> } | null
  }>(() => {
    try {
      if (typeof window === 'undefined') return { tab: effectiveDefaultTab, pending: null }
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
    } catch {
      // ignore
    }
    return { tab: effectiveDefaultTab, pending: null }
  })
  const [activeTab, setActiveTab] = useState<TabValue>(chatInitState.tab)
  const pendingOpenWithUser = chatInitState.pending

  useEffect(() => {
    if (pendingOpenWithUser) {
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'chat')
      window.history.replaceState({}, '', url.toString())
    }
  }, [pendingOpenWithUser])

  const openFullscreen = useCallback(() => {
    // Preserve the current tab when going fullscreen
    const url = `/platform/chat?view=${activeTab}`
    navigateTo(url)
  }, [activeTab])

  // Handle URL parameter for initial tab
  useEffect(() => {
    if (pendingOpenWithUser) return
    const urlParams = new URLSearchParams(window.location.search)
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

  // In fullscreen, EveryAI tab is not available; ensure we never stay on it
  useEffect(() => {
    if (!isInSidepanel && activeTab === 'everyai') {
      setActiveTab('dashboard')
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'dashboard')
      window.history.replaceState({}, '', url.toString())
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

    window.addEventListener('chatSidebarOpened', handleChatSidebarOpened as EventListener)
    return () => {
      window.removeEventListener('chatSidebarOpened', handleChatSidebarOpened as EventListener)
    }
  }, [])

  // Listen for custom event to switch to chat
  useEffect(() => {
    const handleSwitchToChat = () => {
      setActiveTab('chat')
    }

    window.addEventListener('switchToChat', handleSwitchToChat as EventListener)

    return () => {
      window.removeEventListener('switchToChat', handleSwitchToChat as EventListener)
    }
  }, [activeTab])

  // Listen for custom event to switch to calendar
  useEffect(() => {
    const handleSwitchToCalendar = () => {
      setActiveTab('calendar')
      // The Calendar component will handle the date/meetingId from URL params
    }

    window.addEventListener('switchToCalendar', handleSwitchToCalendar as EventListener)
    return () => {
      window.removeEventListener('switchToCalendar', handleSwitchToCalendar as EventListener)
    }
  }, [])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue)

    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set('view', value)
    window.history.replaceState({}, '', url.toString())
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
          className={`gba:flex gba:bg-card ${isCompactMode ? 'gba:justify-start gba:px-2 gba:py-1' : 'gba:justify-start gba:px-6 gba:py-2'}`}
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
              userInfo={userInfo}
              isActive={activeTab === 'dashboard'}
              presenceMap={presenceMap}
              onOpenChat={userId => {
                setActiveTab('chat')
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('chat:open-with-user', { detail: { userId } }))
                }, 100)
              }}
              onStartCall={(userId, displayName, callType, avatarUrl) => {
                setActiveTab('chat')
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent('chat:start-call-with-user', {
                      detail: { userId, displayName, avatarUrl, callType }
                    })
                  )
                }, 100)
              }}
              onJoinMeeting={meeting => {
                // Switch to chat tab and dispatch join meeting event
                setActiveTab('chat')
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent('chat:join-meeting', {
                      detail: {
                        meetingId: meeting.id,
                        conversationId: meeting.conversationId,
                        title: meeting.title
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

// Export wrapped version with TranslationProvider
export const ChatWithCalendar: React.FC<ChatWithCalendarProps> = props => {
  return (
    <TranslationProvider>
      <ChatWithCalendarInner {...props} />

      {/* Global call UI - renders minimized/full call view that persists across tab navigation */}
      <GlobalCallContainer />

      {/* Global pre-call setup dialog - singleton to prevent duplicates when multiple Chat instances exist */}
      <GlobalPreCallSetupDialog />
    </TranslationProvider>
  )
}
