import type { FC } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import translations from '../../_i18n'
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
  const { t } = useTranslation(translations)
  const ordered = [...decisions].sort((a, b) => a.seq - b.seq)

  const summary = (() => {
    if (ordered.length === 0) return t('workspace-decisions-no-branch')
    const latest = ordered[0]
    if (latest?.title) return latest.title
    if (ordered.length === 1) return t('workspace-decisions-branch-singular', { count: ordered.length })
    return t('workspace-decisions-branch-plural', { count: ordered.length })
  })()

  return (
    <PanelCard
      title={t('workspace-decisions-title')}
      badge={decisions.length}
      summary={summary}
      defaultOpen={!defaultCollapsed}
    >
      <div className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain gba:py-1">
        <DecisionsTimelineList decisions={decisions} />
      </div>
    </PanelCard>
  )
}
