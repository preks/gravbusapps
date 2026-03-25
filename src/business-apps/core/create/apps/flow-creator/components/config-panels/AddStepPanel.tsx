import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { GitBranch, Sparkles, SplitSquareHorizontal } from 'lucide-react'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { DesignerMode } from '../../types/studioTypes'
import type { FlowNodeType } from '@/common/components/flow/flow-viewer'
import { TaskCategoryTiles } from './shared/TaskCategoryTiles'

const CONTROL_INSERT_OPTIONS: Array<{
  type: FlowNodeType
  label: string
  description: string
  Icon: React.FC<{ className?: string }>
}> = [
  {
    type: 'decision',
    label: 'Decision',
    description: 'Branch on outcomes',
    Icon: GitBranch
  },
  {
    type: 'fork',
    label: 'Parallelize tasks',
    description: 'Run tasks in parallel',
    Icon: SplitSquareHorizontal
  }
]

interface AddStepPanelProps {
  edgeId: string
  mode: DesignerMode
  'data-testid'?: string
}

export const AddStepPanel: React.FC<AddStepPanelProps> = ({
  edgeId,
  mode,
  'data-testid': testId = 'flow-studio-add-step'
}) => {
  const edges = useFlowStudioStore(s => s.edges)
  const nodes = useFlowStudioStore(s => s.nodes)
  const edge = edges.find(e => e.id === edgeId)
  const insertNodeOnEdge = useFlowStudioStore(s => s.insertNodeOnEdge)

  if (!edge) return null

  const sourceLabel = nodes.find(n => n.id === edge.source)?.label ?? edge.source
  const targetLabel = nodes.find(n => n.id === edge.target)?.label ?? edge.target

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:bg-background gba:px-5 gba:py-4" data-testid={testId}>
      <div className="gba:rounded-lg gba:bg-muted gba:p-4" data-testid={`${testId}-insert-panel`}>
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:bg-background gba:text-foreground">
            <Sparkles className="gba:h-4 gba:w-4" />
          </div>
          <div className="gba:flex gba:flex-col gba:gap-0.5">
            <div className="gba:text-sm gba:font-semibold gba:text-foreground">Add step</div>
            <div className="gba:text-xs gba:text-muted-foreground">Choose what happens next on this path.</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:pt-0.5">
              Between <span className="gba:font-medium gba:text-foreground">{sourceLabel}</span> →{' '}
              <span className="gba:font-medium gba:text-foreground">{targetLabel}</span>
            </div>
          </div>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-4 gba:pt-4">
          <div className="gba:flex gba:flex-col gba:gap-2">
            <div className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
              Tasks
            </div>
            <TaskCategoryTiles
              mode={mode}
              onSelect={opt => insertNodeOnEdge(edge.id, 'task', opt.stepType)}
              data-testid={`${testId}-insert-task`}
            />
          </div>

          <div className="gba:flex gba:flex-col gba:gap-2">
            <div className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
              Control flow
            </div>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              {CONTROL_INSERT_OPTIONS.map(({ type, label, description, Icon }) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  className="gba:w-full gba:h-auto gba:py-3 gba:px-3 gba:flex gba:items-center gba:justify-between gba:gap-3"
                  onClick={() => insertNodeOnEdge(edge.id, type)}
                  data-testid={`${testId}-insert-${type}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:bg-muted gba:text-foreground">
                      <Icon className="gba:h-4 gba:w-4" />
                    </div>
                    <div className="gba:flex gba:flex-col gba:items-start gba:leading-tight gba:min-w-0">
                      <span className="gba:text-xs gba:font-semibold gba:text-foreground">{label}</span>
                      <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{description}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="gba:flex gba:flex-col gba:gap-2 gba:text-xs gba:text-muted-foreground"
        data-testid={`${testId}-tips`}
      >
        <div className="gba:font-semibold gba:text-foreground">What happens next</div>
        <ul className="gba:list-disc gba:pl-5 gba:space-y-1">
          <li>Picking a tile inserts a new step on this edge and opens its configuration.</li>
          <li>The canvas stays auto-laid out — no manual positioning needed.</li>
          {mode === 'simple' && <li>Switch to Advanced mode to unlock Function Tasks and AI Task Expert steps.</li>}
        </ul>
      </div>
    </div>
  )
}
