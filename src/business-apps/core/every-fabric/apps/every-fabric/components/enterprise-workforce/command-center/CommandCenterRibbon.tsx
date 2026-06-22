// Status ribbon above the command-center feed: live counts (running / waiting
// for human / pending), a "done today" throughput sparkline, and the live pill.

import { HourglassMediumIcon, PulseIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import { LiveStatusPill } from '../LiveStatusPill'
import translations from '../../../_i18n'

export interface CommandCenterRibbonProps {
  running: number
  waitingForHuman: number
  pending: number
  completedToday: number
  throughputBuckets: readonly number[]
  isConnected: boolean
}

interface CountStatProps {
  icon: Icon
  label: string
  // Stable identifier for the test id, decoupled from the translated label.
  testKey: string
  value: number
  tone: 'primary' | 'warning' | 'muted'
}

const TONE_CLASS: Record<CountStatProps['tone'], string> = {
  primary: 'gba:text-primary',
  warning: 'gba:text-amber-700 gba:dark:text-amber-300',
  muted: 'gba:text-muted-foreground'
}

const CountStat: React.FC<CountStatProps> = ({ icon: IconComponent, label, testKey, value, tone }) => (
  <span className="gba:inline-flex gba:items-center gba:gap-1.5" data-testid={`command-center-stat-${testKey}`}>
    <IconComponent className={`gba:h-3.5 gba:w-3.5 ${TONE_CLASS[tone]}`} weight="bold" />
    <span className={`gba:text-sm gba:font-semibold ${TONE_CLASS[tone]}`}>{value}</span>
    <span className="gba:text-[11px] gba:text-muted-foreground">{label}</span>
  </span>
)

// Quantize a 0..1 fill ratio to a fixed set of token heights so we never use
// arbitrary/inline values (DS rule). Index 0 is the resting (empty) height.
const BAR_HEIGHT_CLASSES = ['gba:h-1', 'gba:h-2', 'gba:h-3', 'gba:h-4', 'gba:h-5', 'gba:h-6']

// Hours in a day — the sparkline always renders a full day's worth of slots so
// the indicator keeps a stable baseline shape even before anything completes.
const DAY_BUCKET_COUNT = 24

function barHeightClass(count: number, max: number): string {
  if (count <= 0) return BAR_HEIGHT_CLASSES[0]
  const ratio = count / max
  const step = Math.min(BAR_HEIGHT_CLASSES.length - 1, Math.ceil(ratio * (BAR_HEIGHT_CLASSES.length - 1)))
  return BAR_HEIGHT_CLASSES[step]
}

// Normalise server buckets to a fixed day length so the baseline never jumps.
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

export const CommandCenterRibbon: React.FC<CommandCenterRibbonProps> = ({
  running,
  waitingForHuman,
  pending,
  completedToday,
  throughputBuckets,
  isConnected
}) => {
  const { t } = useTranslation(translations)
  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-2"
      data-testid="command-center-ribbon"
    >
      <CountStat
        icon={SpinnerGapIcon}
        label={t('command-center-stat-running')}
        testKey="running"
        value={running}
        tone="primary"
      />
      <CountStat
        icon={HourglassMediumIcon}
        label={t('command-center-stat-waiting')}
        testKey="waiting"
        value={waitingForHuman}
        tone="warning"
      />
      <CountStat
        icon={PulseIcon}
        label={t('command-center-stat-pending')}
        testKey="pending"
        value={pending}
        tone="muted"
      />

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
