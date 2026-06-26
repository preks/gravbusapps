import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { FC } from 'react'
import { buildAgentActivityTimelineSteps } from '../../hooks/agent-session/agentActivityTimeline'
import type { ActivityTimelineStep } from '../../hooks/agent-session/agentActivityTimeline'
import translations from '../../_i18n'
import { ShimmerText } from './ShimmerText'

const ACTIVE_DOT_PULSE_STYLE = `
@keyframes gba-agent-activity-dot-pulse {
  0%, 100% {
    transform: scale(0.86);
  }
  50% {
    transform: scale(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gba-agent-activity-dot-pulse-inner {
    animation: none !important;
    transform: none !important;
  }
}
`

const DOT_SIZES = {
  default: { base: 7, slot: 12 },
  compact: { base: 6, slot: 10 }
} as const

const DOT_PULSE_ANIMATION = 'gba-agent-activity-dot-pulse 1.65s cubic-bezier(0.37, 0, 0.63, 1) infinite'

interface ThinkingPulseDotProps {
  active: boolean
  compact?: boolean
}

const ThinkingPulseDot: FC<ThinkingPulseDotProps> = ({ active, compact }) => {
  const sizes = compact ? DOT_SIZES.compact : DOT_SIZES.default

  return (
    <span
      className="gba:flex gba:shrink-0 gba:items-center gba:justify-center"
      style={{ width: sizes.slot, height: sizes.slot }}
      aria-hidden
    >
      <span
        className={`gba-agent-activity-dot-pulse-inner gba:block gba:rounded-full ${
          active ? 'gba:bg-black' : 'gba:bg-muted-foreground/40'
        }`}
        style={{
          width: sizes.base,
          height: sizes.base,
          backgroundColor: active ? '#000' : undefined,
          transformOrigin: 'center',
          willChange: active ? 'transform' : undefined,
          animation: active ? DOT_PULSE_ANIMATION : undefined
        }}
        data-testid={active ? 'agent-activity-dot-active' : 'agent-activity-dot'}
      />
    </span>
  )
}

export interface AgentActivityTimelineProps {
  activityLines?: readonly string[] | null
  currentStatus?: string | null
  isStreaming: boolean
  variant?: 'default' | 'compact'
  /** Pre-built steps skip merge logic (optional). */
  steps?: readonly ActivityTimelineStep[]
}

const EXIT_DELAY_MS = 280

const opacityForStep = (index: number, total: number): number => {
  if (total === 1) return 0.85
  const distanceFromNewest = total - 1 - index
  if (distanceFromNewest === 0) return 0.9
  if (distanceFromNewest === 1) return 0.55
  return 0.3
}

interface TimelineRowProps {
  step: ActivityTimelineStep
  index: number
  total: number
  isStreaming: boolean
  isCompact: boolean
  isLast: boolean
}

const TimelineRow: FC<TimelineRowProps> = ({ step, index, total, isStreaming, isCompact, isLast }) => {
  const textSize = isCompact ? 'gba:text-[11px]' : 'gba:text-xs'
  const rowSpacing = isCompact ? 'gba:pb-2' : 'gba:pb-2.5'
  const showActiveDot = step.state === 'active' && isStreaming && isLast

  return (
    <div
      className={`gba:relative gba:flex gba:items-center gba:gap-2.5 ${rowSpacing} gba:last:pb-0`}
      data-testid={`agent-activity-step-${step.id}`}
    >
      <div className="gba:relative gba:flex gba:shrink-0 gba:items-center gba:justify-center">
        <ThinkingPulseDot active={showActiveDot} compact={isCompact} />
        {!isLast ? (
          <span
            className="gba:absolute gba:left-1/2 gba:top-full gba:mt-1 gba:h-3 gba:w-px gba:-translate-x-1/2 gba:bg-border/80"
            aria-hidden
          />
        ) : null}
      </div>
      <p
        className={`gba:min-w-0 gba:flex-1 gba:pt-px ${textSize} gba:leading-snug gba:text-muted-foreground gba:italic gba:animate-in gba:fade-in gba:slide-in-from-bottom-1 gba:duration-300`}
        style={{ opacity: opacityForStep(index, total) }}
      >
        <ShimmerText enabled={showActiveDot}>{step.label}</ShimmerText>
      </p>
    </div>
  )
}

export const AgentActivityTimeline: FC<AgentActivityTimelineProps> = ({
  activityLines,
  currentStatus,
  isStreaming,
  variant = 'default',
  steps: stepsOverride
}) => {
  const { t } = useTranslation(translations)
  const builtSteps = useMemo(
    () => stepsOverride ?? buildAgentActivityTimelineSteps(activityLines ?? [], currentStatus ?? null, isStreaming),
    [stepsOverride, activityLines, currentStatus, isStreaming]
  )

  const stepsKey = useMemo(() => builtSteps.map(s => `${s.id}:${s.state}`).join('\u0001'), [builtSteps])
  const hasSteps = builtSteps.length > 0 && isStreaming

  const [isMounted, setIsMounted] = useState(hasSteps)
  const [isLeaving, setIsLeaving] = useState(false)
  const lastStepsRef = useRef<readonly ActivityTimelineStep[]>([])
  const isMountedRef = useRef(isMounted)
  isMountedRef.current = isMounted

  useEffect(() => {
    if (hasSteps) {
      lastStepsRef.current = builtSteps
      setIsLeaving(false)
      setIsMounted(true)
      return
    }
    if (!isMountedRef.current) return
    setIsLeaving(true)
    const t = setTimeout(() => {
      setIsMounted(false)
      setIsLeaving(false)
    }, EXIT_DELAY_MS)
    return () => clearTimeout(t)
  }, [hasSteps, stepsKey, builtSteps])

  if (!isMounted) return null

  const displaySteps = hasSteps ? builtSteps : lastStepsRef.current
  if (displaySteps.length === 0) return null

  const isCompact = variant === 'compact'
  const containerSpacing = isCompact ? 'gba:mt-1' : 'gba:mt-2'
  const fadeOlderSteps = displaySteps.length > 1

  return (
    <>
      <style>{ACTIVE_DOT_PULSE_STYLE}</style>
      <div
        data-testid="agent-activity-timeline"
        className={`gba:relative gba:pl-0.5 ${containerSpacing}`}
        role="status"
        aria-live="polite"
        aria-label={t('chat-activity-aria')}
        style={{
          opacity: isLeaving ? 0 : 1,
          transform: isLeaving ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'opacity 220ms ease-out, transform 220ms ease-out',
          ...(fadeOlderSteps ? { maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 100%)' } : {})
        }}
      >
        <div className="gba:flex gba:flex-col">
          {displaySteps.map((step, idx) => (
            <TimelineRow
              key={step.id}
              step={step}
              index={idx}
              total={displaySteps.length}
              isStreaming={isStreaming}
              isCompact={isCompact}
              isLast={idx === displaySteps.length - 1}
            />
          ))}
        </div>
      </div>
    </>
  )
}
