import type { FC } from 'react'
import type { FabricTaskNode } from '../../types/fabric'
import { FabricProgressTaskRow } from './fabricProgressShared'
import { PanelCard } from './PanelCard'

function rightPanelPlanLabel(params: {
  totalCount: number
  isStreaming: boolean
  hasActiveWork: boolean
  completedCount: number
}): string {
  const { totalCount, isStreaming, hasActiveWork, completedCount } = params
  if (totalCount === 0) return 'Waiting to start'
  if (isStreaming && hasActiveWork) return `${completedCount} of ${totalCount} done`
  if (isStreaming && completedCount >= totalCount) return 'Finalizing response…'
  return `${completedCount} of ${totalCount} done`
}

interface PlanCardProps {
  nodes: FabricTaskNode[]
  completedCount: number
  totalCount: number
  progressPercent: number
  isStreaming: boolean
  /**
   * When true, the card starts collapsed. We keep the same UX as legacy
   * Progress: Plan collapses by default when a Live Preview is open so the
   * preview dominates the rail.
   */
  defaultCollapsed?: boolean
}

/**
 * Plan panel — strictly the agent's todo list (from `write_todos` /
 * `update_todos` / `terminal.todos`). Hidden by the parent when there is
 * no plan yet; tool chronology lives in the Session timeline panel.
 */
export const PlanCard: FC<PlanCardProps> = ({
  nodes,
  completedCount,
  totalCount,
  progressPercent,
  isStreaming,
  defaultCollapsed = false
}) => {
  const hasActiveWork = nodes.some(node => node.status === 'active' || node.status === 'pending')
  const displayPercent = isStreaming && totalCount > 0 && completedCount >= totalCount ? 96 : progressPercent
  const planLabel = rightPanelPlanLabel({ totalCount, isStreaming, hasActiveWork, completedCount })

  return (
    <PanelCard
      title="Plan"
      summary={totalCount > 0 ? `${planLabel} · ${displayPercent}%` : 'Waiting to start'}
      defaultOpen={!defaultCollapsed}
    >
      <div className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain">
        <div className="gba:px-4 gba:pt-3 gba:pb-1">
          {totalCount > 0 && (
            <div className="gba:mb-3">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-1.5">
                <span className="gba:text-[11px] gba:text-muted-foreground/60">{planLabel}</span>
                <span className="gba:text-[11px] gba:font-semibold gba:text-foreground">{displayPercent}%</span>
              </div>
              <div className="gba:h-1 gba:w-full gba:rounded-full gba:bg-border gba:overflow-hidden">
                <div
                  className="gba:h-full gba:rounded-full gba:bg-primary gba:transition-all gba:duration-500"
                  style={{ width: `${displayPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="gba:min-h-0 gba:py-1 gba:space-y-0.5">
          {nodes.map((node, i) => (
            <FabricProgressTaskRow key={node.id} node={node} index={i} />
          ))}
        </div>
      </div>
    </PanelCard>
  )
}
