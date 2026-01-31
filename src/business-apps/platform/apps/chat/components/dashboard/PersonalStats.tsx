import React, { useMemo } from 'react'
import { SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import { MessageSquare, Users, Phone, TrendingUp, Calendar } from 'lucide-react'
import type { UserOverviewResponse } from '../../services/chatApiClient'

interface PersonalStatsProps {
  overview: UserOverviewResponse | null
  isLoading?: boolean
  'data-testid'?: string
}

/**
 * Format minutes to hours and minutes display
 */
const formatMinutesDisplay = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${minutes}m`
}

/**
 * PersonalStats - Display user's personal statistics using SectionKpiCards
 * Shows messages, conversations, call minutes, and activity metrics
 * Uses design system KpiCards for animated numbers and consistent styling
 */
export const PersonalStats: React.FC<PersonalStatsProps> = ({
  overview,
  isLoading = false,
  'data-testid': testId = 'personal-stats'
}) => {
  // Calculate member days (days since joined)
  const memberDays = overview?.memberSince
    ? Math.floor((Date.now() - new Date(overview.memberSince).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Build KPI cards data with icons and values
  const cards: KpiCardData[] = useMemo(() => {
    if (isLoading) {
      // Return placeholder cards during loading
      return [
        { id: 'messages', title: 'Messages sent', value: 0 },
        { id: 'conversations', title: 'Conversations', value: 0 },
        { id: 'call-minutes', title: 'Call minutes', value: '0m' },
        { id: 'avg-per-day', title: 'Avg per day', value: 0, decimalPlaces: 1 },
        { id: 'member-days', title: 'Member days', value: 0 }
      ]
    }

    return [
      {
        id: 'messages',
        title: 'Messages sent',
        value: overview?.totalMessagesSent ?? 0,
        icon: <MessageSquare className="gba:size-4" />,
        trend:
          overview?.totalMessagesSent && overview.totalMessagesSent > 100
            ? { value: 'Active', badgeVariant: 'success' as const, hideBadge: true }
            : undefined
      },
      {
        id: 'conversations',
        title: 'Conversations',
        value: overview?.totalConversations ?? 0,
        icon: <Users className="gba:size-4" />
      },
      {
        id: 'call-minutes',
        title: 'Call minutes',
        value: formatMinutesDisplay(overview?.totalCallMinutes ?? 0),
        icon: <Phone className="gba:size-4" />
      },
      {
        id: 'avg-per-day',
        title: 'Avg per day',
        value: overview?.averageMessagesPerDay ?? 0,
        decimalPlaces: 1,
        icon: <TrendingUp className="gba:size-4" />
      },
      {
        id: 'member-days',
        title: 'Member days',
        value: memberDays,
        icon: <Calendar className="gba:size-4" />,
        footer: memberDays > 30 ? 'Long-time member' : undefined
      }
    ]
  }, [overview, isLoading, memberDays])

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        Your activity
      </h3>
      <SectionKpiCards cards={cards} className="gba:lg:grid-cols-5" />
    </section>
  )
}

export default PersonalStats
