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

type TabValue = 'dashboard' | 'everyai' | 'chat' | 'calendar' | 'reminders'

interface ChatWithCalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  defaultTab?: TabValue
}

// Custom event type for opening chat with specific user
declare global {
  interface WindowEventMap {
    openChatWithUser: CustomEvent<{ userId: string }>
  }
}

/**
 * ChatWithCalendar - Combined EveryAI, Chat, Calendar, and Reminders view
 *
 * This component provides a unified interface for AI assistance, messaging, scheduling, and reminders,
 * allowing users to seamlessly switch between EveryAI conversations, chat conversations,
 * their meeting calendar, and personal reminders.
 */
const ChatWithCalendarInner: React.FC<ChatWithCalendarProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'chat-calendar',
  defaultTab = 'dashboard',
  ...props
}) => {
  const t = useChatTranslation()
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab)
  const [overdueRemindersCount, setOverdueRemindersCount] = useState<number>(0)

  // Detect if we're in sidepanel mode (not the fullscreen view)
  const isInSidepanel = useMemo(() => {
    if (typeof window === 'undefined') return false

    // In prod mode, check if we're on /platform/chat (actual fullscreen route)
    if (window.location.pathname === '/platform/chat') return false

    // For dev mode with ?app parameter:
    // In dev, the component is always loaded via ?app parameter
    // We can't reliably distinguish sidebar from fullscreen in dev mode this way
    // So in dev mode (when ?app parameter exists), always show the button
    // This matches EveryAI behavior where button is always visible in dev

    return true // Always show button in dev mode, hide only in prod fullscreen
  }, [])

  // Navigate to fullscreen mode
  const openFullscreen = useCallback(() => {
    // Preserve the current tab when going fullscreen
    const url = `/platform/chat?view=${activeTab}`
    navigateTo(url)
  }, [activeTab])

  // Handle URL parameter for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewParam = urlParams.get('view')

    if (viewParam === 'dashboard') {
      setActiveTab('dashboard')
    } else if (viewParam === 'everyai') {
      setActiveTab('everyai')
    } else if (viewParam === 'calendar') {
      setActiveTab('calendar')
    } else if (viewParam === 'chat') {
      setActiveTab('chat')
    } else if (viewParam === 'reminders') {
      setActiveTab('reminders')
    }
  }, [])

  // Listen for custom event to open sidebar with specific tab (e.g., from AI Summary button)
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

  // Listen for custom event to switch to chat (e.g., from platform chat opener)
  useEffect(() => {
    const handleSwitchToChat = () => {
      setActiveTab('chat')
    }

    window.addEventListener('switchToChat', handleSwitchToChat as EventListener)

    return () => {
      window.removeEventListener('switchToChat', handleSwitchToChat as EventListener)
    }
  }, [activeTab])

  // Listen for custom event to switch to calendar (e.g., from MeetingCard click)
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
      {/* Floating fullscreen button (only in sidepanel mode) */}
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
        {/* Tab bar - centered with smooth animated indicator */}
        <div className="gba:flex gba:justify-center gba:bg-card">
          <TabSwitchList>
            <TabSwitchTrigger
              value="dashboard"
              startIcon={<LayoutDashboard className="gba:h-4 gba:w-4" />}
              data-testid={`${prefixDataTestId}-dashboard-tab`}
            >
              Dashboard
            </TabSwitchTrigger>
            <TabSwitchTrigger
              value="everyai"
              startIcon={<Sparkles className="gba:h-4 gba:w-4" />}
              data-testid={`${prefixDataTestId}-everyai-tab`}
            >
              {t('chat-tab-everyai')}
            </TabSwitchTrigger>
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

        {/* Tab content - ensure proper height for mobile web views */}
        {/* Use forceMount to keep all tabs mounted for call persistence */}
        <TabSwitchContent
          value="dashboard"
          forceMount
          className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'dashboard' ? 'gba:hidden' : ''}`}
        >
          <EveryOneDashboard
            accessToken={accessToken}
            userInfo={userInfo}
            isActive={activeTab === 'dashboard'}
            onOpenChat={userId => {
              // Switch to chat tab and trigger opening chat with user
              setActiveTab('chat')
              // Dispatch event for Chat component to handle
              window.dispatchEvent(new CustomEvent('openChatWithUser', { detail: { userId } }))
            }}
            data-testid={`${prefixDataTestId}-dashboard`}
          />
        </TabSwitchContent>

        <TabSwitchContent
          value="everyai"
          forceMount
          className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'everyai' ? 'gba:hidden' : ''}`}
        >
          <EveryAI accessToken={accessToken} userInfo={userInfo} isActive={activeTab === 'everyai'} {...props} />
        </TabSwitchContent>

        <TabSwitchContent
          value="chat"
          forceMount
          className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'chat' ? 'gba:hidden' : ''}`}
        >
          <Chat
            accessToken={accessToken}
            userInfo={userInfo}
            prefixDataTestId={`${prefixDataTestId}-chat`}
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
    </TranslationProvider>
  )
}
