import { useState } from 'react'
import { ListBulletsIcon, TreeStructureIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import type { DelegationNode, DelegationStats } from '../../../types/delegation'
import translations from '../../../_i18n'
import { PanelCard } from '../PanelCard'
import { DelegationTimeline } from './DelegationTimeline'
import { DelegationTreeView } from './DelegationTreeView'

type ViewMode = 'tree' | 'timeline'

interface CollaborationPanelProps {
  root: DelegationNode
  stats: DelegationStats
  defaultCollapsed?: boolean
}

function buildSummary(stats: DelegationStats, t: (key: string, vars?: Record<string, unknown>) => string): string {
  const parts: string[] = []
  if (stats.done > 0) parts.push(t('workspace-collaboration-done', { count: stats.done }))
  if (stats.running > 0) parts.push(t('workspace-collaboration-running', { count: stats.running }))
  if (stats.failed > 0) parts.push(t('workspace-collaboration-failed', { count: stats.failed }))
  return parts.join(' · ')
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ root, stats, defaultCollapsed = false }) => {
  const { t } = useTranslation(translations)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')

  const viewToggle = (
    <div className="gba:flex gba:items-center gba:gap-0.5">
      <button
        type="button"
        onClick={() => setViewMode('tree')}
        className={`gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:transition-colors ${
          viewMode === 'tree'
            ? 'gba:bg-foreground/10 gba:text-foreground'
            : 'gba:text-muted-foreground/60 gba:hover:text-foreground gba:hover:bg-muted/40'
        }`}
        aria-label={t('workspace-collaboration-tree-view')}
        data-testid="collaboration-view-tree"
      >
        <TreeStructureIcon className="gba:h-3.5 gba:w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode('timeline')}
        className={`gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:transition-colors ${
          viewMode === 'timeline'
            ? 'gba:bg-foreground/10 gba:text-foreground'
            : 'gba:text-muted-foreground/60 gba:hover:text-foreground gba:hover:bg-muted/40'
        }`}
        aria-label={t('workspace-collaboration-timeline-view')}
        data-testid="collaboration-view-timeline"
      >
        <ListBulletsIcon className="gba:h-3.5 gba:w-3.5" />
      </button>
    </div>
  )

  return (
    <PanelCard
      title={t('workspace-collaboration-title')}
      badge={stats.total}
      summary={buildSummary(stats, t)}
      extra={viewToggle}
      defaultOpen={!defaultCollapsed}
    >
      <div className="gba:px-2 gba:py-2">
        {viewMode === 'tree' ? <DelegationTreeView root={root} /> : <DelegationTimeline root={root} />}
      </div>
    </PanelCard>
  )
}
