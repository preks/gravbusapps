import React, { useMemo } from 'react'
import { TrayIcon, EnvelopeSimpleIcon, RobotIcon, WarningCircleIcon, type Icon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import type { WorkplaceMetrics } from '../types'

const TEST_ID = 'digital-workplace-kpis'

export interface WorkplaceKpisProps {
  metrics: WorkplaceMetrics
}

interface WorkplaceStat {
  id: string
  label: string
  value: number
  icon: Icon
  /** Highlight the stat when it represents something needing attention. */
  emphasized?: boolean
  onClick: () => void
}

/**
 * Modern metric strip: each stat pairs a tinted icon tile with a large number
 * and a quiet label. Calm by default, with a subtle primary accent on the
 * "Needs you" stat when it is non-zero. Every stat deep-links into its app.
 */
const WorkplaceKpis: React.FC<WorkplaceKpisProps> = ({ metrics }) => {
  const { t } = useWorkplaceTranslation()

  const stats: WorkplaceStat[] = useMemo(
    () => [
      {
        id: 'agentsWaiting',
        label: t('kpi-agents-waiting'),
        value: metrics.agentsWaiting ?? 0,
        icon: WarningCircleIcon,
        emphasized: (metrics.agentsWaiting ?? 0) > 0,
        onClick: () => navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))
      },
      {
        id: 'tasksDue',
        label: t('kpi-tasks'),
        value: metrics.tasksDue ?? 0,
        icon: TrayIcon,
        onClick: () => navigateTo(Navigation.PLATFORM_TASK_MANAGER)
      },
      {
        id: 'agentsWorking',
        label: t('kpi-agents-working'),
        value: metrics.agentsWorking ?? 0,
        icon: RobotIcon,
        onClick: () => navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))
      },
      {
        id: 'unread',
        label: t('kpi-unread'),
        value: (metrics.mailUnread ?? 0) + (metrics.chatsUnread ?? 0),
        icon: EnvelopeSimpleIcon,
        onClick: () => navigateTo(buildPlatformUrl(Navigation.PLATFORM_TEAM_CHAT, { view: 'mail' }))
      }
    ],
    [t, metrics]
  )

  return (
    <div
      className="gba:grid gba:shrink-0 gba:grid-cols-2 gba:gap-px gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-border gba:shadow-sm gba:lg:grid-cols-4"
      data-testid={TEST_ID}
    >
      {stats.map(stat => {
        const StatIcon = stat.icon
        return (
          <button
            key={stat.id}
            type="button"
            onClick={stat.onClick}
            className="gba:group gba:flex gba:items-center gba:gap-3 gba:bg-card gba:px-4 gba:py-4 gba:text-left gba:transition-colors gba:hover:bg-accent gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-inset gba:focus-visible:ring-ring"
            data-testid={`${TEST_ID}-${stat.id}`}
          >
            <span
              className={`gba:flex gba:size-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:transition-colors ${
                stat.emphasized
                  ? 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
                  : 'gba:bg-muted gba:text-muted-foreground gba:group-hover:bg-background'
              }`}
            >
              <StatIcon className="gba:size-5" weight="duotone" />
            </span>
            <div className="gba:flex gba:min-w-0 gba:flex-col">
              <span
                className={`gba:text-2xl gba:font-semibold gba:leading-none gba:tabular-nums gba:tracking-tight ${
                  stat.emphasized ? 'gba:text-warning-secondary-foreground' : 'gba:text-foreground'
                }`}
              >
                {stat.value}
              </span>
              <span className="gba:mt-1.5 gba:truncate gba:text-xs gba:font-medium gba:text-muted-foreground">
                {stat.label}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default WorkplaceKpis
export { WorkplaceKpis }
