import React, { useMemo } from 'react'
import { SectionKpiCards, type KpiCardData, useTranslation } from '@newwork/nw-design-system'
import { MessageSquare, Users, Phone, TrendingUp, Calendar } from 'lucide-react'
import type { UserOverviewResponse } from '../../types'
import translations from '../../_i18n'

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
  const { t } = useTranslation(translations)

  // Calculate member days (days since joined)
  const memberDays = overview?.memberSince
    ? Math.floor((Date.now() - new Date(overview.memberSince).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Build KPI cards data with icons and values
  const cards: KpiCardData[] = useMemo(() => {
    if (isLoading) {
      // Return placeholder cards during loading
      return [
        { id: 'messages', title: t('dashboard-personalStats-messagesSent'), value: 0 },
        { id: 'conversations', title: t('dashboard-personalStats-conversations'), value: 0 },
        { id: 'call-minutes', title: t('dashboard-personalStats-callMinutes'), value: '0m' },
        { id: 'avg-per-day', title: t('dashboard-personalStats-avgPerDay'), value: 0, decimalPlaces: 1 },
        { id: 'member-days', title: t('dashboard-personalStats-memberDays'), value: 0 }
      ]
    }

    return [
      {
        id: 'messages',
        title: t('dashboard-personalStats-messagesSent'),
        value: overview?.totalMessagesSent ?? 0,
        icon: <MessageSquare className="gba:size-4" />,
        trend:
          overview?.totalMessagesSent && overview.totalMessagesSent > 100
            ? { value: t('dashboard-personalStats-active'), badgeVariant: 'success' as const, hideBadge: true }
            : undefined
      },
      {
        id: 'conversations',
        title: t('dashboard-personalStats-conversations'),
        value: overview?.totalConversations ?? 0,
        icon: <Users className="gba:size-4" />
      },
      {
        id: 'call-minutes',
        title: t('dashboard-personalStats-callMinutes'),
        value: formatMinutesDisplay(overview?.totalCallMinutes ?? 0),
        icon: <Phone className="gba:size-4" />
      },
      {
        id: 'avg-per-day',
        title: t('dashboard-personalStats-avgPerDay'),
        value: overview?.averageMessagesPerDay ?? 0,
        decimalPlaces: 1,
        icon: <TrendingUp className="gba:size-4" />
      },
      {
        id: 'member-days',
        title: t('dashboard-personalStats-memberDays'),
        value: memberDays,
        icon: <Calendar className="gba:size-4" />,
        footer: memberDays > 30 ? t('dashboard-personalStats-longTimeMember') : undefined
      }
    ]
  }, [isLoading, memberDays, overview, t])

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        {t('dashboard-personalStats-title')}
      </h3>
      <SectionKpiCards cards={cards} className="gba:lg:grid-cols-5" />
    </section>
  )
}

export default PersonalStats
