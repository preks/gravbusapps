// Jump bar above the command-center feed: one pill per section with its live
// count (e.g. "Needs you 3 · Active 12 · Done 8"). Clicking a pill scrolls to
// and expands that section — it is a locator, NOT a filter, so nothing is ever
// hidden and no status can be missed. Empty sections render a disabled pill.

import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import {
  WORKFORCE_FEED_SECTION_CONFIG,
  WORKFORCE_FEED_SECTION_ORDER,
  type GroupedWorkforceFeed,
  type WorkforceFeedSectionId
} from '../workforceFeedModel'
import translations from '../../../_i18n'
import { sectionVisual } from './commandCenterSectionDisplay'

export interface CommandCenterJumpBarProps {
  grouped: GroupedWorkforceFeed
  onJump: (sectionId: WorkforceFeedSectionId) => void
}

export const CommandCenterJumpBar: React.FC<CommandCenterJumpBarProps> = ({ grouped, onJump }) => {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5" data-testid="command-center-jump-bar">
      {WORKFORCE_FEED_SECTION_ORDER.map(id => {
        const config = WORKFORCE_FEED_SECTION_CONFIG[id]
        const count = grouped[id].length
        const visual = sectionVisual(id)
        const PillIcon = visual.icon
        const isEmpty = count === 0
        return (
          <button
            key={id}
            type="button"
            onClick={() => onJump(id)}
            disabled={isEmpty}
            className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border/60 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:transition-colors gba:hover:border-foreground/20 gba:disabled:cursor-default gba:disabled:opacity-50 gba:disabled:hover:border-border/60 ${
              isEmpty ? 'gba:text-muted-foreground' : 'gba:text-foreground'
            }`}
            data-testid={`command-center-jump-${id}`}
          >
            <PillIcon className={`gba:h-3 gba:w-3 ${visual.toneClass}`} weight="bold" />
            <span>{t(config.labelKey)}</span>
            <span className={`gba:font-semibold ${visual.toneClass}`}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}
