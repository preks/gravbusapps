import type { FC } from 'react'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import { DecisionsTimelineList } from './DecisionsTimelineList'
import { PanelCard } from './PanelCard'

interface DecisionsCardProps {
  decisions: DecisionItem[]
  defaultCollapsed?: boolean
}

/**
 * Standalone decisions panel (legacy). Prefer SessionTimelineCard in the right rail.
 */
export const DecisionsCard: FC<DecisionsCardProps> = ({ decisions, defaultCollapsed = true }) => {
  const ordered = [...decisions].sort((a, b) => b.seq - a.seq)

  const summary = (() => {
    if (ordered.length === 0) return 'No branch points yet'
    const latest = ordered[0]
    return latest?.title ? latest.title : `${ordered.length} branch ${ordered.length === 1 ? 'point' : 'points'}`
  })()

  return (
    <PanelCard title="Decisions" badge={decisions.length} summary={summary} defaultOpen={!defaultCollapsed}>
      <div className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain gba:py-1">
        <DecisionsTimelineList decisions={decisions} />
      </div>
    </PanelCard>
  )
}
