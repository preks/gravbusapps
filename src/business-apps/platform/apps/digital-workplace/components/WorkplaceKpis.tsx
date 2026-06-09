import React, { useMemo } from 'react'
import { KpiCard, type KpiCardData } from '@newwork/nw-design-system'
import { TrayIcon, EnvelopeSimpleIcon, RobotIcon, WarningCircleIcon, type Icon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import type { WorkplaceMetrics } from '../types'

const TEST_ID = 'digital-workplace-kpis'

export interface WorkplaceKpisProps {
  metrics: WorkplaceMetrics
}

interface WorkplaceKpi {
  card: KpiCardData
  onClick: () => void
}

function buildCard(id: string, title: string, value: number, icon: Icon): KpiCardData {
  const CardIcon = icon
  return { id, title, value, icon: <CardIcon className="gba:size-4" /> }
}

/**
 * At-a-glance KPI strip using the design system KpiCard (animated counting
 * numbers) on the premium blue decorative gradient — matching the EveryOne
 * dashboard's "Company activity" highlight card.
 */
const WorkplaceKpis: React.FC<WorkplaceKpisProps> = ({ metrics }) => {
  const { t } = useWorkplaceTranslation()

  const kpis: WorkplaceKpi[] = useMemo(
    () => [
      {
        card: buildCard('tasksDue', t('kpi-tasks'), metrics.tasksDue ?? 0, TrayIcon),
        onClick: () => navigateTo(Navigation.PLATFORM_TASK_MANAGER)
      },
      {
        card: buildCard('agentsWaiting', t('kpi-agents-waiting'), metrics.agentsWaiting ?? 0, WarningCircleIcon),
        onClick: () => navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))
      },
      {
        card: buildCard('agentsWorking', t('kpi-agents-working'), metrics.agentsWorking ?? 0, RobotIcon),
        onClick: () => navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))
      },
      {
        card: buildCard(
          'unread',
          t('kpi-unread'),
          (metrics.mailUnread ?? 0) + (metrics.chatsUnread ?? 0),
          EnvelopeSimpleIcon
        ),
        onClick: () => navigateTo(buildPlatformUrl(Navigation.PLATFORM_TEAM_CHAT, { view: 'mail' }))
      }
    ],
    [t, metrics]
  )

  return (
    <div className="gba:grid gba:shrink-0 gba:grid-cols-2 gba:gap-3 gba:lg:grid-cols-4" data-testid={TEST_ID}>
      {kpis.map(({ card, onClick }) => (
        <button
          key={card.id}
          type="button"
          onClick={onClick}
          className="gba:rounded-xl gba:text-left gba:transition gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring"
          data-testid={`${TEST_ID}-${card.id}`}
        >
          <KpiCard card={card} variant="decorative" className="gba:h-full gba:cursor-pointer gba:hover:shadow-md" />
        </button>
      ))}
    </div>
  )
}

export default WorkplaceKpis
export { WorkplaceKpis }
