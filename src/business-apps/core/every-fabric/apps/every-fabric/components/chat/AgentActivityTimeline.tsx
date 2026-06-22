import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { FC } from 'react'
import { buildAgentActivityTimelineSteps } from '../../hooks/agent-session/agentActivityTimeline'
import type { ActivityTimelineStep } from '../../hooks/agent-session/agentActivityTimeline'
import translations from '../../_i18n'

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
  const nodeSize = isCompact ? 'gba:h-1.5 gba:w-1.5' : 'gba:h-2 gba:w-2'
  const showActiveDot = step.state === 'active' && isStreaming && isLast

  return (
    <div className={`gba:flex gba:gap-2.5 ${rowSpacing} gba:last:pb-0`} data-testid={`agent-activity-step-${step.id}`}>
      <div className="gba:flex gba:flex-col gba:items-center gba:shrink-0">
        <span
          className={`${nodeSize} gba:rounded-full gba:shrink-0 ${
            step.state === 'active' ? 'gba:bg-primary' : 'gba:bg-muted-foreground/40'
          }`}
          aria-hidden
        />
        {!isLast ? <span className="gba:flex-1 gba:w-px gba:min-h-3 gba:bg-border/80 gba:mt-1" aria-hidden /> : null}
      </div>
      <p
        className={`gba:min-w-0 gba:flex-1 gba:pt-px ${textSize} gba:leading-snug gba:text-muted-foreground gba:italic gba:animate-in gba:fade-in gba:slide-in-from-bottom-1 gba:duration-300`}
        style={{ opacity: opacityForStep(index, total) }}
      >
        {step.label}
        {showActiveDot ? (
          <span
            aria-hidden
            className="gba:inline-block gba:ml-1.5 gba:w-1 gba:h-1 gba:rounded-full gba:bg-muted-foreground/60 gba:animate-pulse gba:align-middle"
          />
        ) : null}
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

  return (
    <div
      data-testid="agent-activity-timeline"
      className={`gba:relative gba:overflow-hidden ${containerSpacing}`}
      role="status"
      aria-live="polite"
      aria-label={t('chat-activity-aria')}
      style={{
        opacity: isLeaving ? 0 : 1,
        transform: isLeaving ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'opacity 220ms ease-out, transform 220ms ease-out',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 100%)'
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
  )
}
