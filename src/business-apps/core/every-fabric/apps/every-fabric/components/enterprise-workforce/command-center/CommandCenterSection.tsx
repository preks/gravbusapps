// One collapsible section of the command-center feed (Needs you / Active /
// Recently done). A sticky header shows the icon, label and count; the body
// lists the section's run cards. Sections cap how many cards they show with a
// "Show N more" toggle. "Needs you" is always fully expanded — action items
// must never be hidden behind a collapse or a cap.

import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React, { useState } from 'react'
import type { WorkforceFeedItem, WorkforceFeedSectionConfig } from '../workforceFeedModel'
import translations from '../../../_i18n'
import { CommandCenterFeedItem } from './CommandCenterFeedItem'
import { sectionVisual } from './commandCenterSectionDisplay'

export interface CommandCenterSectionProps {
  config: WorkforceFeedSectionConfig
  items: readonly WorkforceFeedItem[]
  collapsed: boolean
  onToggleCollapsed: () => void
  nameById: Record<string, string>
  onOpenRun: (agentId: string, sessionId: string) => void
}

export const CommandCenterSection: React.FC<CommandCenterSectionProps> = ({
  config,
  items,
  collapsed,
  onToggleCollapsed,
  nameById,
  onOpenRun
}) => {
  const { t } = useTranslation(translations)
  const [showAll, setShowAll] = useState(false)
  const visual = sectionVisual(config.id)
  const HeaderIcon = visual.icon
  // Non-collapsible sections (Needs you) can never hide all their cards, but
  // they still honour the "Show N more" cap to keep the rail manageable.
  const isCollapsed = config.collapsible && collapsed
  const visibleItems = isCollapsed ? [] : showAll ? items : items.slice(0, config.initialVisible)
  const hiddenCount = items.length - config.initialVisible
  const CollapseIcon = isCollapsed ? CaretRightIcon : CaretDownIcon

  return (
    <section data-testid={`command-center-section-${config.id}`}>
      <header className="gba:sticky gba:top-0 gba:z-10 gba:bg-muted/20 gba:py-1.5 gba:backdrop-blur-sm">
        <button
          type="button"
          onClick={config.collapsible ? onToggleCollapsed : undefined}
          disabled={!config.collapsible}
          className="gba:flex gba:w-full gba:items-center gba:gap-1.5 gba:text-left gba:disabled:cursor-default"
          data-testid={`command-center-section-toggle-${config.id}`}
        >
          {config.collapsible && <CollapseIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" weight="bold" />}
          <HeaderIcon className={`gba:h-3.5 gba:w-3.5 ${visual.toneClass}`} weight="bold" />
          <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-foreground">
            {t(config.labelKey)}
          </span>
          <span className={`gba:text-[11px] gba:font-semibold ${visual.toneClass}`}>{items.length}</span>
        </button>
      </header>

      {visibleItems.length > 0 && (
        <ul
          className="gba:flex gba:flex-col gba:gap-2 gba:pt-1.5"
          data-testid={`command-center-section-list-${config.id}`}
        >
          {visibleItems.map(item => (
            <li key={item.key}>
              <CommandCenterFeedItem item={item} nameById={nameById} onOpenRun={onOpenRun} />
            </li>
          ))}
        </ul>
      )}

      {!isCollapsed && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(prev => !prev)}
          className="gba:mt-1.5 gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
          data-testid={`command-center-section-more-${config.id}`}
        >
          {showAll ? t('command-center-show-less') : t('command-center-show-more', { count: hiddenCount })}
        </button>
      )}
    </section>
  )
}
