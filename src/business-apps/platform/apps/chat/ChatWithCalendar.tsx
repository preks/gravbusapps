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

const ChatWithCalendarInner: React.FC<ChatWithCalendarProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'chat-calendar',
  defaultTab = 'dashboard',
  ...props
}) => {
  const t = useChatTranslation()
  const [overdueRemindersCount, setOverdueRemindersCount] = useState<number>(0)

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
  const [activeTab, setActiveTab] = useState<TabValue>(effectiveDefaultTab)

  const openFullscreen = useCallback(() => {
    // Preserve the current tab when going fullscreen
    const url = `/platform/chat?view=${activeTab}`
    navigateTo(url)
  }, [activeTab])

  // Handle URL parameter for initial tab
  useEffect(() => {
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
  }, [isCompactMode, isInSidepanel])

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
          <div className={isCompactMode ? 'gba:scale-95 gba:origin-left' : ''}>
            <TabSwitchList>
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
              onOpenChat={userId => {
                setActiveTab('chat')
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('chat:open-with-user', { detail: { userId } }))
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
            <EveryAI accessToken={accessToken} userInfo={userInfo} isActive={activeTab === 'everyai'} compactSuggestions={isInSidepanel} {...props} />
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
