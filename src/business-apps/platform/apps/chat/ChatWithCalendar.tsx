import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent } from '@newwork/nw-design-system'
import { MessageSquare, Calendar as CalendarIcon, Sparkles } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Chat } from './Chat'
import { Calendar } from './calendar/Calendar'
import { EveryAI } from '../every-ai/EveryAI'

type TabValue = 'everyai' | 'chat' | 'calendar'

interface ChatWithCalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  defaultTab?: TabValue
}

/**
 * ChatWithCalendar - Combined EveryAI, Chat and Calendar view
 *
 * This component provides a unified interface for AI assistance, messaging and scheduling,
 * allowing users to seamlessly switch between EveryAI conversations, chat conversations
 * and their meeting calendar.
 */
export const ChatWithCalendar: React.FC<ChatWithCalendarProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'chat-calendar',
  defaultTab = 'everyai',
  ...props
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab)

  // Handle URL parameter for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewParam = urlParams.get('view')

    if (viewParam === 'everyai') {
      setActiveTab('everyai')
    } else if (viewParam === 'calendar') {
      setActiveTab('calendar')
    } else if (viewParam === 'chat') {
      setActiveTab('chat')
    }
  }, [])

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
    <div className="gba:h-full gba:flex gba:flex-col gba:bg-background" data-testid={prefixDataTestId}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full gba:flex gba:flex-col">
        {/* Minimal tab bar */}
        <div className="gba:flex gba:justify-center gba:border-b gba:border-border/40">
          <div className="gba:flex gba:gap-0">
            <button
              onClick={() => handleTabChange('everyai')}
              className={`gba:relative gba:flex gba:items-center gba:gap-1.5 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:transition-colors ${
                activeTab === 'everyai' ? 'gba:text-foreground' : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid={`${prefixDataTestId}-everyai-tab`}
            >
              <Sparkles className="gba:h-3.5 gba:w-3.5" />
              <span>EveryAI</span>
              {activeTab === 'everyai' && (
                <span className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-0.5 gba:bg-primary gba:rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('chat')}
              className={`gba:relative gba:flex gba:items-center gba:gap-1.5 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:transition-colors ${
                activeTab === 'chat' ? 'gba:text-foreground' : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid={`${prefixDataTestId}-chat-tab`}
            >
              <MessageSquare className="gba:h-3.5 gba:w-3.5" />
              <span>Chat</span>
              {activeTab === 'chat' && (
                <span className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-0.5 gba:bg-primary gba:rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('calendar')}
              className={`gba:relative gba:flex gba:items-center gba:gap-1.5 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:transition-colors ${
                activeTab === 'calendar' ? 'gba:text-foreground' : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid={`${prefixDataTestId}-calendar-tab`}
            >
              <CalendarIcon className="gba:h-3.5 gba:w-3.5" />
              <span>Calendar</span>
              {activeTab === 'calendar' && (
                <span className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-0.5 gba:bg-primary gba:rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Tab content - ensure proper height for mobile web views */}
        {/* Use forceMount to keep all tabs mounted for call persistence */}
        <TabsContent
          value="everyai"
          forceMount
          className={`gba:flex-1 gba:m-0 gba:h-full gba:min-h-0 gba:overflow-hidden ${activeTab !== 'everyai' ? 'gba:hidden' : ''}`}
        >
          <EveryAI accessToken={accessToken} userInfo={userInfo} {...props} />
        </TabsContent>

        <TabsContent
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
        </TabsContent>

        <TabsContent
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
