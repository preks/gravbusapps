import React, { useMemo } from 'react'
import {
  SectionKpiCards,
  type KpiCardData,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  CountingNumber
} from '@newwork/nw-design-system'
import { Globe, Users, MessageSquare, Activity, Smile, Phone } from 'lucide-react'
import type { GlobalStatsResponse, EmojiCount } from '../../services/chatApiClient'

interface GlobalStatsProps {
  stats: GlobalStatsResponse | null
  isLoading?: boolean
  'data-testid'?: string
}

/**
 * Format large numbers with K/M suffix
 */
const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * Format minutes to hours and minutes
 */
const formatMinutes = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${minutes}m`
}

interface EmojiGridProps {
  reactions: EmojiCount[]
  isLoading?: boolean
  'data-testid'?: string
}

/**
 * EmojiGrid - Display top reactions
 */
const EmojiGrid: React.FC<EmojiGridProps> = ({ reactions, isLoading, 'data-testid': testId }) => {
  if (isLoading) {
    return (
      <div className="gba:flex gba:gap-4" data-testid={testId}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="gba:flex gba:flex-col gba:items-center gba:gap-1">
            <div className="gba:w-10 gba:h-10 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse" />
            <div className="gba:w-6 gba:h-3 gba:bg-muted/50 gba:rounded gba:animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (reactions.length === 0) {
    return (
      <p className="gba:text-sm gba:text-muted-foreground" data-testid={testId}>
        No reactions yet
      </p>
    )
  }

  return (
    <div className="gba:flex gba:gap-6" data-testid={testId}>
      {reactions.slice(0, 5).map((reaction, index) => (
        <div
          key={reaction.emoji}
          className="gba:flex gba:flex-col gba:items-center gba:gap-1"
          data-testid={`${testId}-${index}`}
        >
          <span className="gba:text-2xl">{reaction.emoji}</span>
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
            {formatCompactNumber(reaction.count)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * HighlightStatCard - A special highlight card with vibrant decorative blue gradient
 * Matches the "Primary Highlight" style from the design system
 */
interface HighlightStatCardProps {
  title: string
  value: number
  subtitle?: string
  isLoading?: boolean
  'data-testid'?: string
}

const HighlightStatCard: React.FC<HighlightStatCardProps> = ({
  title,
  value,
  subtitle,
  isLoading,
  'data-testid': testId
}) => {
  return (
    <Card className="gba:overflow-hidden gba:relative gba:bg-card-decorative gba:border-0" data-testid={testId}>
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1">
            <CardDescription className="gba:mb-2 gba:text-decorative-foreground/70">{title}</CardDescription>
            <CardTitle className="gba:text-4xl gba:font-bold gba:tracking-tight gba:tabular-nums gba:mb-1 gba:text-decorative-foreground">
              {isLoading ? (
                <div className="gba:h-10 gba:w-32 gba:bg-decorative-foreground/20 gba:rounded-lg gba:animate-pulse" />
              ) : (
                <CountingNumber number={value} transition={{ stiffness: 400, damping: 70 }} />
              )}
            </CardTitle>
            {subtitle && <p className="gba:text-sm gba:text-decorative-foreground/70">{subtitle}</p>}
          </div>
          <div className="gba:w-11 gba:h-11 gba:rounded-lg gba:bg-decorative-foreground/20 gba:flex gba:items-center gba:justify-center">
            <Globe className="gba:w-5 gba:h-5 gba:text-decorative-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * GlobalStats - Display platform-wide statistics
 * Features a highlighted total messages card and other global metrics
 * Uses design system KpiCards for animated numbers and badges
 */
export const GlobalStats: React.FC<GlobalStatsProps> = ({
  stats,
  isLoading = false,
  'data-testid': testId = 'global-stats'
}) => {
  // Build secondary stats cards
  const secondaryCards: KpiCardData[] = useMemo(() => {
    if (isLoading) {
      return [
        { id: 'active-now', title: 'Active now', value: 0 },
        { id: 'today', title: 'Messages today', value: 0 },
        { id: 'total-users', title: 'Total users', value: 0 },
        { id: 'call-minutes', title: 'Call minutes', value: '0m' }
      ]
    }

    return [
      {
        id: 'active-now',
        title: 'Active now',
        value: stats?.activeUsersNow ?? 0,
        icon: <Activity className="gba:size-4" />,
        trend:
          stats?.activeUsersNow && stats.activeUsersNow > 0
            ? { value: 'Live', badgeVariant: 'warning' as const, trendIcon: 'none' as const }
            : undefined
      },
      {
        id: 'today',
        title: 'Messages today',
        value: stats?.messagesLast24h ?? 0,
        icon: <MessageSquare className="gba:size-4" />
      },
      {
        id: 'total-users',
        title: 'Total users',
        value: stats?.totalUsers ?? 0,
        icon: <Users className="gba:size-4" />
      },
      {
        id: 'call-minutes',
        title: 'Total call time',
        value: formatMinutes(stats?.totalCallMinutes ?? 0),
        icon: <Phone className="gba:size-4" />
      }
    ]
  }, [stats, isLoading])

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        Company activity
      </h3>

      <div className="gba:space-y-4">
        {/* Highlight Card - Total Messages with decorative background */}
        <HighlightStatCard
          title="Total platform messages"
          value={stats?.totalMessages ?? 0}
          subtitle={
            stats?.messagesLast24h
              ? `+${formatCompactNumber(stats.messagesLast24h)} today`
              : 'All time across the platform'
          }
          isLoading={isLoading}
          data-testid={`${testId}-highlight`}
        />

        {/* Secondary Stats Grid */}
        <SectionKpiCards cards={secondaryCards} className="gba:lg:grid-cols-4" />

        {/* Top Reactions Section */}
        <div className="gba:rounded-xl gba:bg-card gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
            <Smile className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Top reactions</span>
          </div>
          <EmojiGrid reactions={stats?.topReactions ?? []} isLoading={isLoading} data-testid={`${testId}-reactions`} />
        </div>
      </div>
    </section>
  )
}

export default GlobalStats
