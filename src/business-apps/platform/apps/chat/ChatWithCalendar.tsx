import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { MessageSquare, Calendar as CalendarIcon } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Chat } from './Chat'
import { Calendar } from './calendar/Calendar'

type TabValue = 'chat' | 'calendar'

interface ChatWithCalendarProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  defaultTab?: TabValue
}

/**
 * ChatWithCalendar - Combined Chat and Calendar view
 *
 * This component provides a unified interface for messaging and scheduling,
 * allowing users to seamlessly switch between chat conversations and their
 * meeting calendar.
 */
export const ChatWithCalendar: React.FC<ChatWithCalendarProps> = ({
  accessToken,
  userInfo,
  prefixDataTestId = 'chat-calendar',
  defaultTab = 'chat',
  ...props
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab)

  // Handle URL parameter for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewParam = urlParams.get('view')

    if (viewParam === 'calendar') {
      setActiveTab('calendar')
    } else if (viewParam === 'chat') {
      setActiveTab('chat')
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
        {/* Tab header */}
        <div className="gba:flex gba:items-center gba:justify-center gba:px-4 gba:py-2 gba:border-b gba:border-border/50 gba:bg-muted/30">
          <TabsList className="gba:grid gba:grid-cols-2 gba:w-[280px]">
            <TabsTrigger
              value="chat"
              className="gba:flex gba:items-center gba:gap-2 gba:text-sm"
              data-testid={`${prefixDataTestId}-chat-tab`}
            >
              <MessageSquare className="gba:h-4 gba:w-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="gba:flex gba:items-center gba:gap-2 gba:text-sm"
              data-testid={`${prefixDataTestId}-calendar-tab`}
            >
              <CalendarIcon className="gba:h-4 gba:w-4" />
              <span>Calendar</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <TabsContent value="chat" className="gba:flex-1 gba:m-0 gba:overflow-hidden">
          <Chat
            accessToken={accessToken}
            userInfo={userInfo}
            prefixDataTestId={`${prefixDataTestId}-chat`}
            {...props}
          />
        </TabsContent>

        <TabsContent value="calendar" className="gba:flex-1 gba:m-0 gba:overflow-hidden">
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
