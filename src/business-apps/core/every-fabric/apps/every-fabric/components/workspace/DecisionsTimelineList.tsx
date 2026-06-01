import React, { type FC, type ReactNode } from 'react'
import { BrainIcon, CompassIcon, HandIcon, ListChecksIcon, SparkleIcon, TargetIcon } from '@phosphor-icons/react'
import type { DecisionCategory } from '../../types/enterpriseAgent'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import { parseIsoTimestamp } from '../../utils/renderUtils'

const CATEGORY_ICON: Record<DecisionCategory, ReactNode> = {
  skill: <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-500" weight="duotone" />,
  tool_routing: <CompassIcon className="gba:h-3.5 gba:w-3.5 gba:text-sky-500" weight="duotone" />,
  reflection: <BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-violet-500" weight="duotone" />,
  hitl: <HandIcon className="gba:h-3.5 gba:w-3.5 gba:text-orange-500" weight="duotone" />,
  plan: <ListChecksIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-500" weight="duotone" />
}

const FALLBACK_ICON = <TargetIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" weight="duotone" />

const CATEGORY_LABEL: Record<DecisionCategory, string> = {
  skill: 'Skill',
  tool_routing: 'Tool routing',
  reflection: 'Reflection',
  hitl: 'Human in the loop',
  plan: 'Plan'
}

function formatDecisionTimestamp(timestamp: string): string {
  const date = parseIsoTimestamp(timestamp)
  if (!date) return ''
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function categoryIcon(category: DecisionCategory): ReactNode {
  return CATEGORY_ICON[category] ?? FALLBACK_ICON
}

function categoryLabel(category: DecisionCategory): string {
  return CATEGORY_LABEL[category] ?? category
}

interface DecisionsTimelineListProps {
  decisions: DecisionItem[]
}

export const DecisionsTimelineList: FC<DecisionsTimelineListProps> = ({ decisions }) => {
  const ordered = [...decisions].sort((a, b) => b.seq - a.seq)

  if (ordered.length === 0) {
    return (
      <div className="gba:px-4 gba:py-3">
        <p className="gba:text-xs gba:text-muted-foreground/60 gba:italic">
          Agent decisions will appear here as the session progresses…
        </p>
      </div>
    )
  }

  return (
    <>
      {ordered.map(decision => {
        const timestampLabel = formatDecisionTimestamp(decision.timestamp)
        return (
          <div
            key={decision.id}
            className="gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2 gba:hover:bg-muted/20 gba:transition-colors"
            data-testid={`fabric-decision-${decision.id}`}
          >
            <div className="gba:shrink-0 gba:mt-0.5">{categoryIcon(decision.category)}</div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-x-2 gba:gap-y-0.5">
                <span className="gba:inline-flex gba:items-center gba:rounded gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground/80">
                  {categoryLabel(decision.category)}
                </span>
                {typeof decision.confidence === 'number' && (
                  <span className="gba:text-[10px] gba:text-muted-foreground/60">
                    {Math.round(decision.confidence * 100)}%
                  </span>
                )}
              </div>
              <p className="gba:mt-0.5 gba:text-xs gba:font-medium gba:text-foreground gba:leading-snug">
                {decision.title}
              </p>
              {decision.chosen && decision.chosen !== decision.title && (
                <p className="gba:text-[11px] gba:text-muted-foreground/80 gba:font-mono gba:leading-snug">
                  {decision.chosen}
                </p>
              )}
              {decision.rationale && (
                <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground gba:leading-snug gba:line-clamp-3">
                  {decision.rationale}
                </p>
              )}
              {decision.alternatives && decision.alternatives.length > 0 && (
                <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-1">
                  {decision.alternatives.slice(0, 4).map(alt => (
                    <span
                      key={alt}
                      className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              )}
              {timestampLabel && (
                <p className="gba:mt-1 gba:text-[10px] gba:leading-4 gba:text-muted-foreground/40">{timestampLabel}</p>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
