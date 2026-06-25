// Grouped command-center feed: a unified bar over three attention-ordered,
// collapsible sections (Needs you / Active / Recently done). Owns the scroll
// container, per-section refs and collapse state so the bar's pills can scroll
// to and expand a section without being a filter. The bar always renders (even
// when idle) so the live pill + throughput stay visible; a calm empty message
// replaces the sections when there is genuinely no activity.

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  groupFeed,
  WORKFORCE_FEED_SECTION_CONFIG,
  WORKFORCE_FEED_SECTION_ORDER,
  type WorkforceFeedItem,
  type WorkforceFeedSectionId
} from '../workforceFeedModel'
import translations from '../../../_i18n'
import { CommandCenterBar } from './CommandCenterBar'
import { CommandCenterSection } from './CommandCenterSection'

export interface CommandCenterFeedProps {
  items: readonly WorkforceFeedItem[]
  nameById: Record<string, string>
  onOpenRun: (agentId: string, sessionId: string) => void
  completedToday: number
  throughputBuckets: readonly number[]
  isConnected: boolean
  /** Sidebar layout fills available height; card layout caps the feed scroll area. */
  variant?: 'card' | 'sidebar'
}

type CollapsedState = Partial<Record<WorkforceFeedSectionId, boolean>>

export const CommandCenterFeed: React.FC<CommandCenterFeedProps> = ({
  items,
  nameById,
  onOpenRun,
  completedToday,
  throughputBuckets,
  isConnected,
  variant = 'card'
}) => {
  const { t } = useTranslation(translations)
  const grouped = useMemo(() => groupFeed(items), [items])
  const [collapsed, setCollapsed] = useState<CollapsedState>({})
  const sectionRefs = useRef(new Map<WorkforceFeedSectionId, HTMLDivElement | null>())

  const toggleCollapsed = useCallback((id: WorkforceFeedSectionId) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const jumpTo = useCallback((id: WorkforceFeedSectionId) => {
    // A jump expands the target section (never a filter) then scrolls to it.
    setCollapsed(prev => ({ ...prev, [id]: false }))
    sectionRefs.current.get(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [])

  const shellClassName =
    variant === 'sidebar' ? 'gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-3' : 'gba:flex gba:flex-col gba:gap-3'
  const scrollClassName =
    variant === 'sidebar'
      ? 'gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-3 gba:overflow-y-auto gba:pr-1'
      : 'gba:flex gba:max-h-80 gba:flex-col gba:gap-3 gba:overflow-y-auto gba:pr-1'

  return (
    <div className={shellClassName} data-testid="command-center-feed">
      <CommandCenterBar
        grouped={grouped}
        onJump={jumpTo}
        completedToday={completedToday}
        throughputBuckets={throughputBuckets}
        isConnected={isConnected}
      />

      {items.length === 0 ? (
        <p
          className="gba:py-6 gba:text-center gba:text-[11px] gba:text-muted-foreground"
          data-testid="command-center-feed-empty"
        >
          {t('command-center-empty')}
        </p>
      ) : (
        <div className={scrollClassName}>
          {WORKFORCE_FEED_SECTION_ORDER.map(id => {
            const sectionItems = grouped[id]
            if (sectionItems.length === 0) return null
            return (
              <div
                key={id}
                ref={el => {
                  sectionRefs.current.set(id, el)
                }}
              >
                <CommandCenterSection
                  config={WORKFORCE_FEED_SECTION_CONFIG[id]}
                  items={sectionItems}
                  collapsed={collapsed[id] ?? false}
                  onToggleCollapsed={() => toggleCollapsed(id)}
                  nameById={nameById}
                  onOpenRun={onOpenRun}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
