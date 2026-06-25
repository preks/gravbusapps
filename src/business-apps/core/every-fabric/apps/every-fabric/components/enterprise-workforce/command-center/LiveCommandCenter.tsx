// Live Command Center for the Workforce overview hub.
//
// A workspace-wide, semi-live view of what the whole digital workforce is
// doing right now: a single unified bar (section counts that double as jump
// anchors + the "done today" throughput and live pill) over three grouped,
// collapsible sections of active, waiting, and just-finished runs. Subsumes the
// old "working now" strip. Always visible on the overview; the feed shows a
// calm idle state when there is genuinely no activity.

import { LightningIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import type { WorkforceFeedItem } from '../workforceFeedModel'
import { CommandCenterFeed } from './CommandCenterFeed'
import translations from '../../../_i18n'

export interface LiveCommandCenterProps {
  feed: readonly WorkforceFeedItem[]
  completedToday: number
  throughputBuckets: readonly number[]
  isConnected: boolean
  nameById: Record<string, string>
  onOpenRun: (agentId: string, sessionId: string) => void
  /** Card = inset panel; sidebar = flat rail content without extra chrome. */
  variant?: 'card' | 'sidebar'
}

export const LiveCommandCenter: React.FC<LiveCommandCenterProps> = ({
  feed,
  completedToday,
  throughputBuckets,
  isConnected,
  nameById,
  onOpenRun,
  variant = 'card'
}) => {
  const { t } = useTranslation(translations)
  const shellClassName =
    variant === 'sidebar'
      ? 'gba:flex gba:h-full gba:min-h-0 gba:flex-col gba:gap-3 gba:p-4'
      : 'gba:flex gba:flex-col gba:gap-3 gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-4'

  return (
    <section className={shellClassName} data-testid="workforce-command-center">
      <header className="gba:flex gba:items-center gba:gap-2">
        <LightningIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="fill" />
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('command-center-title')}</h2>
      </header>

      <CommandCenterFeed
        items={feed}
        nameById={nameById}
        onOpenRun={onOpenRun}
        completedToday={completedToday}
        throughputBuckets={throughputBuckets}
        isConnected={isConnected}
        variant={variant}
      />
    </section>
  )
}
