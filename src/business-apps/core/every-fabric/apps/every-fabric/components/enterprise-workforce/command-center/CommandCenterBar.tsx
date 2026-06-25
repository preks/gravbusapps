// Unified command-center bar. Merges what used to be two stacked rows — the
// status ribbon (running / waiting / pending) and the section jump anchors —
// into one row to avoid double-counting the same runs. The three section pills
// ARE the counts (Needs you / Active / Recently done) and double as jump
// anchors: clicking scrolls to and expands that section (never a filter). The
// right side keeps the bits the sections don't express: the "done today"
// throughput sparkline and the live-connection pill. Empty sections render a
// disabled pill so the row stays stable when idle.

import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import { LiveStatusPill } from '../LiveStatusPill'
import {
  WORKFORCE_FEED_SECTION_CONFIG,
  WORKFORCE_FEED_SECTION_ORDER,
  type GroupedWorkforceFeed,
  type WorkforceFeedSectionId
} from '../workforceFeedModel'
import translations from '../../../_i18n'
import { sectionVisual } from './commandCenterSectionDisplay'

export interface CommandCenterBarProps {
  grouped: GroupedWorkforceFeed
  onJump: (sectionId: WorkforceFeedSectionId) => void
  completedToday: number
  throughputBuckets: readonly number[]
  isConnected: boolean
}

// Quantize a 0..1 fill ratio to a fixed set of token heights so we never use
// arbitrary/inline values (DS rule). Index 0 is the resting (empty) height.
const BAR_HEIGHT_CLASSES = ['gba:h-1', 'gba:h-2', 'gba:h-3', 'gba:h-4', 'gba:h-5', 'gba:h-6']
// The sparkline always renders a full UTC day of slots so its baseline shape
// stays stable before anything completes.
const DAY_BUCKET_COUNT = 24

function barHeightClass(count: number, max: number): string {
  if (count <= 0) return BAR_HEIGHT_CLASSES[0]
  const ratio = count / max
  const step = Math.min(BAR_HEIGHT_CLASSES.length - 1, Math.ceil(ratio * (BAR_HEIGHT_CLASSES.length - 1)))
  return BAR_HEIGHT_CLASSES[step]
}

function dayBuckets(buckets: readonly number[]): number[] {
  const out = new Array<number>(DAY_BUCKET_COUNT).fill(0)
  for (let index = 0; index < Math.min(buckets.length, DAY_BUCKET_COUNT); index += 1) {
    out[index] = buckets[index]
  }
  return out
}

const Sparkline: React.FC<{ buckets: readonly number[] }> = ({ buckets }) => {
  const slots = dayBuckets(buckets)
  const max = Math.max(1, ...slots)
  return (
    <span className="gba:flex gba:h-6 gba:items-end gba:gap-px" aria-hidden data-testid="command-center-sparkline">
      {slots.map((count, index) => (
        <span
          // Buckets are positional time slots, not entities; index is stable here.
          key={`bucket-${index}`}
          className={`gba:w-0.5 gba:rounded-sm ${count > 0 ? 'gba:bg-primary/60' : 'gba:bg-muted'} ${barHeightClass(count, max)}`}
        />
      ))}
    </span>
  )
}

export const CommandCenterBar: React.FC<CommandCenterBarProps> = ({
  grouped,
  onJump,
  completedToday,
  throughputBuckets,
  isConnected
}) => {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-2" data-testid="command-center-bar">
      {WORKFORCE_FEED_SECTION_ORDER.map(id => {
        const config = WORKFORCE_FEED_SECTION_CONFIG[id]
        const liveCount = grouped[id].length
        // "Recently done" falls back to the daily total when the live 4-hour
        // window is empty — keeps the pill enabled and the count honest.
        const count = id === 'recentlyDone' && liveCount === 0 ? completedToday : liveCount
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

      <div className="gba:ml-auto gba:flex gba:items-center gba:gap-2">
        <Sparkline buckets={throughputBuckets} />
        <span className="gba:whitespace-nowrap gba:text-[11px] gba:text-muted-foreground">
          <span className="gba:font-semibold gba:text-foreground">{completedToday}</span>{' '}
          {t('command-center-done-today')}
        </span>
        <LiveStatusPill connected={isConnected} />
      </div>
    </div>
  )
}
