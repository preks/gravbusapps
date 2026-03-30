import React, { useCallback } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { EveryOneHero } from './EveryOneHero'
import { PersonalStats } from './PersonalStats'
import { TopContacts, PresenceInfo } from './TopContacts'
import { GlobalStats } from './GlobalStats'
import { UpcomingMeetings } from './UpcomingMeetings'
import { useEveryOneAnalytics } from '../../hooks/useEveryOneAnalytics'
import type { CalendarEvent } from '../../calendar/types'
import { useChatClient } from '@/common/network/chat/useChatClient'

type CallType = 'audio' | 'video'

interface EveryOneDashboardProps {
  accessToken: string
  userInfo?: {
    displayName?: string
    firstName?: string
    lastName?: string
    email?: string
  }
  isActive?: boolean
  presenceMap?: Map<string, PresenceInfo>
  onOpenChat?: (userId: string) => void
  onStartCall?: (userId: string, displayName: string, callType: CallType, avatarUrl?: string) => void
  onJoinMeeting?: (meeting: CalendarEvent) => void
  'data-testid'?: string
}

/**
 * EveryOneDashboard - Main dashboard component for EveryOne
 * Displays personal and global statistics with a modern design
 */
export const EveryOneDashboard: React.FC<EveryOneDashboardProps> = ({
  accessToken,
  userInfo,
  isActive = true,
  presenceMap,
  onOpenChat,
  onStartCall,
  onJoinMeeting,
  'data-testid': testId = 'everyone-dashboard'
}) => {
  const apiClient = useChatClient(accessToken)

  const { userOverview, userContacts, globalStats, isLoading, error } = useEveryOneAnalytics({
    apiClient,
    isActive
  })

  // Handle contact click - open chat with that user
  const handleContactClick = useCallback(
    (userId: string) => {
      onOpenChat?.(userId)
    },
    [onOpenChat]
  )

  // Build user display name
  const userName =
    userInfo?.displayName ||
    (userInfo?.firstName && userInfo?.lastName
      ? `${userInfo.firstName} ${userInfo.lastName}`
      : userInfo?.firstName || userInfo?.email || '')

  // Error state
  if (error && !isLoading && !userOverview && !globalStats) {
    return (
      <div className="gba:h-full gba:flex gba:flex-col gba:bg-background" data-testid={testId}>
        <EveryOneHero userName={userName} />
        <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:p-6">
          <div className="gba:text-center">
            <p className="gba:text-muted-foreground gba:mb-2">Unable to load dashboard data</p>
            <p className="gba:text-sm gba:text-muted-foreground/70">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Initial loading state - show hero + skeleton
  const showSkeleton = isLoading && !userOverview && !globalStats

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-auto" data-testid={testId}>
      {/* Hero Section */}
      <EveryOneHero userName={userName} data-testid={`${testId}-hero`} />

      {/* Main Content - generous spacing following LAY-002 */}
      <div className="gba:flex-1 gba:px-6 gba:py-8">
        <div className="gba:max-w-7xl gba:mx-auto gba:space-y-10">
          {/* Personal Stats */}
          <PersonalStats overview={userOverview} isLoading={showSkeleton} data-testid={`${testId}-personal-stats`} />

          {/* Two-column layout */}
          <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6">
            {/* Left column: Meetings + Contacts stacked */}
            <div className="gba:space-y-6">
              {/* Upcoming Meetings */}
              <UpcomingMeetings
                accessToken={accessToken}
                isActive={isActive}
                isLoading={showSkeleton}
                onJoinMeeting={onJoinMeeting}
                data-testid={`${testId}-meetings`}
              />

              {/* Top Contacts */}
              <TopContacts
                contacts={userContacts}
                accessToken={accessToken}
                isLoading={showSkeleton}
                presenceMap={presenceMap}
                onContactClick={handleContactClick}
                onStartCall={onStartCall}
                data-testid={`${testId}-contacts`}
              />
            </div>

            {/* Right column: Global Stats */}
            <GlobalStats stats={globalStats} isLoading={showSkeleton} data-testid={`${testId}-global`} />
          </div>
        </div>
      </div>

      {/* Loading overlay for refresh - subtle indicator */}
      {isLoading && (userOverview || globalStats) && (
        <div className="gba:fixed gba:bottom-4 gba:right-4 gba:bg-card gba:rounded-full gba:p-2.5">
          <Spinner className="gba:w-4 gba:h-4" />
        </div>
      )}
    </div>
  )
}

export default EveryOneDashboard
