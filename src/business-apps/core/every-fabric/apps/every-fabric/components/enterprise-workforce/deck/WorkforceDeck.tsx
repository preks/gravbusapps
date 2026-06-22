// Agent Deck - a sleek, fanned "hand of cards" view of the workforce.
//
// Cards overlap in a gentle arc; hovering (or focusing) a card straightens it,
// lifts and scales it above the rest, and nudges its neighbours aside. Every
// card is fully self-contained (status, stats, and the Activate / Pause /
// Archive / Open actions), so the deck keeps all the functionality of the old
// grid. Works in both normal browsing and AI-matching mode.
//
// Card transforms/stacking come from `computeDeckTransform` (data-driven
// geometry, the same exception charts rely on); all colours/spacing stay on DS
// tokens.

import { SparkleIcon } from '@phosphor-icons/react'
import React, { useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { WorkforceAgentSummary } from '../useWorkforceData'
import type { WorkforceAgent } from '../workforceTypes'
import { WorkforceDeckCard } from './WorkforceDeckCard'
import { computeDeckTransform } from './deckLayout'
import translations from '../../../_i18n'

export interface DeckMatchInfo {
  rank: number
  confidence: number
}

interface WorkforceDeckProps {
  summaries: WorkforceAgentSummary[]
  isAgentWorking?: (agentId: string) => boolean
  currentActivityForAgent?: (agentId: string) => string | null | undefined
  /** Per-agent rank/confidence; presence switches the deck into AI-match styling. */
  matchById?: Record<string, DeckMatchInfo>
  aiQuery?: string
  activatingAgentId?: string | null
  pausingAgentId?: string | null
  archivingAgentId?: string | null
  onActivate?: (agent: WorkforceAgent) => void
  onPause?: (agent: WorkforceAgent) => void
  onArchive?: (agent: WorkforceAgent) => void
  onConfigure?: (agent: WorkforceAgent) => void
}

export const WorkforceDeck: React.FC<WorkforceDeckProps> = ({
  summaries,
  isAgentWorking,
  currentActivityForAgent,
  matchById,
  aiQuery,
  activatingAgentId,
  pausingAgentId,
  archivingAgentId,
  onActivate,
  onPause,
  onArchive,
  onConfigure
}) => {
  const { t } = useTranslation(translations)
  const [hovered, setHovered] = useState<number | null>(null)
  const isAiMode = Boolean(matchById)

  return (
    <div data-testid="workforce-deck">
      {isAiMode && (
        <div className="gba:mb-2 gba:flex gba:items-center gba:justify-center gba:gap-1.5">
          <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="fill" />
          <p className="gba:text-xs gba:text-muted-foreground">
            {t('deck-best-matches-for', { query: aiQuery ?? '' })}
          </p>
        </div>
      )}

      <div className="gba:flex gba:w-full gba:overflow-x-auto gba:px-6 gba:py-12" onMouseLeave={() => setHovered(null)}>
        <div className="gba:mx-auto gba:flex gba:items-end gba:gap-4">
          {summaries.map((summary, index) => {
            const { transform, zIndex } = computeDeckTransform(index, summaries.length, hovered)
            const match = matchById?.[summary.agent.agent_id]
            return (
              <WorkforceDeckCard
                key={summary.agent.agent_id}
                summary={summary}
                isActive={hovered === index}
                onHover={() => setHovered(index)}
                style={{ transform, zIndex }}
                isActivating={activatingAgentId === summary.agent.agent_id}
                isPausing={pausingAgentId === summary.agent.agent_id}
                isArchiving={archivingAgentId === summary.agent.agent_id}
                isWorking={isAgentWorking?.(summary.agent.agent_id)}
                currentActivity={currentActivityForAgent?.(summary.agent.agent_id)}
                matchConfidence={match?.confidence}
                matchRank={match?.rank}
                onActivate={onActivate}
                onPause={onPause}
                onArchive={onArchive}
                onConfigure={onConfigure}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
