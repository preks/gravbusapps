import React from 'react'
import { Badge, Button, Input } from '@newwork/nw-design-system'
import { GitBranch, Link2, Sparkles, SplitSquareHorizontal, UserCheck, Zap } from 'lucide-react'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { DesignerMode } from '../../types/studioTypes'
import type { FlowNodeType } from '@/common/components/flow/flow-viewer'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'

const CONTROL_INSERT_OPTIONS: Array<{ type: FlowNodeType; label: string; Icon: React.FC<{ className?: string }> }> = [
  { type: 'decision', label: 'Decision', Icon: GitBranch },
  { type: 'fork', label: 'Parallelize tasks', Icon: SplitSquareHorizontal }
]

const TASK_INSERT_OPTIONS: Array<{
  id: string
  stepType: FlowStepType
  label: string
  description: string
  Icon: React.FC<{ className?: string }>
  preset?: 'HYBRID'
  advancedOnly?: boolean
  disabled?: boolean
  badge?: string
}> = [
  {
    id: 'user-task',
    stepType: FlowStepType.TASK,
    label: 'User Task',
    description: 'Assigned to people',
    Icon: UserCheck
  },
  {
    id: 'ai-task',
    stepType: FlowStepType.AI_AGENT,
    label: 'AI Task',
    description: 'Let AI do the work',
    Icon: Sparkles
  },
  {
    id: 'automation-task',
    stepType: FlowStepType.FUNCTION,
    label: 'Function Task',
    description: 'Run an automation function',
    Icon: Zap,
    advancedOnly: true
  }
]

interface EdgeConfigPanelProps {
  edgeId: string
  mode: DesignerMode
  'data-testid'?: string
}

export const EdgeConfigPanel: React.FC<EdgeConfigPanelProps> = ({
  edgeId,
  mode,
  'data-testid': testId = 'flow-studio-edge-config'
}) => {
  const edges = useFlowStudioStore(s => s.edges)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)
  const insertNodeOnEdge = useFlowStudioStore(s => s.insertNodeOnEdge)
  const edge = edges.find(item => item.id === edgeId)
  if (!edge) return null

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-info-secondary">
            <Link2 className="gba:h-4 gba:w-4 gba:text-info-secondary-foreground" />
          </div>
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Edge</h3>
        </div>

        <Input
          value={edge.label ?? ''}
          onChange={event => updateEdge(edge.id, { label: event.target.value })}
          placeholder="Branch label (optional)"
          className="gba:w-52 gba:h-8 gba:text-xs gba:bg-muted"
          aria-label="Branch label"
          data-testid={`${testId}-label`}
        />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:pb-5">
        {/* Insert step on this edge */}
        <div className="gba:rounded-lg gba:bg-muted gba:p-4" data-testid={`${testId}-insert-panel`}>
          <div className="gba:flex gba:items-start gba:gap-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:bg-background gba:text-foreground">
              <Sparkles className="gba:h-4 gba:w-4" />
            </div>
            <div className="gba:flex gba:flex-col gba:gap-0.5">
              <div className="gba:text-sm gba:font-semibold gba:text-foreground">Insert step</div>
              <div className="gba:text-xs gba:text-muted-foreground">Choose what happens next on this path.</div>
            </div>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-4 gba:pt-4">
            <div className="gba:flex gba:flex-col gba:gap-2">
              <div className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                Tasks
              </div>
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                {TASK_INSERT_OPTIONS.filter(opt => mode === 'advanced' || !opt.advancedOnly).map(
                  ({ id, stepType, label, description, Icon, preset, disabled, badge }) => (
                    <Button
                      key={id}
                      variant="outline"
                      className={[
                        'gba:bg-background gba:h-auto gba:py-4 gba:px-3 gba:flex gba:items-center gba:justify-between gba:gap-3',
                        disabled ? 'gba:opacity-60' : ''
                      ].join(' ')}
                      onClick={() =>
                        disabled
                          ? undefined
                          : insertNodeOnEdge(edge.id, 'task', preset ? { stepType, preset } : stepType)
                      }
                      disabled={disabled}
                      data-testid={`${testId}-insert-task-${id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:bg-muted gba:text-foreground">
                          <Icon className="gba:h-4 gba:w-4" />
                        </div>
                        <div className="gba:flex gba:flex-col gba:items-start gba:leading-tight">
                          <span className="gba:text-xs gba:font-semibold gba:text-foreground">{label}</span>
                          <span className="gba:text-[11px] gba:text-muted-foreground">{description}</span>
                        </div>
                      </div>
                      {badge && (
                        <Badge
                          variant="secondary"
                          className="gba:whitespace-nowrap"
                          data-testid={`${testId}-insert-task-badge-${id}`}
                        >
                          {badge}
                        </Badge>
                      )}
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="gba:flex gba:flex-col gba:gap-2">
              <div className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                Control flow
              </div>
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                {CONTROL_INSERT_OPTIONS.map(({ type, label, Icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    className="gba:bg-background gba:h-auto gba:py-4 gba:px-3 gba:flex gba:items-center gba:justify-between gba:gap-3"
                    onClick={() => insertNodeOnEdge(edge.id, type)}
                    data-testid={`${testId}-insert-${type}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-lg gba:bg-muted gba:text-foreground">
                        <Icon className="gba:h-4 gba:w-4" />
                      </div>
                      <div className="gba:flex gba:flex-col gba:items-start gba:leading-tight">
                        <span className="gba:text-xs gba:font-semibold gba:text-foreground">{label}</span>
                        <span className="gba:text-[11px] gba:text-muted-foreground">
                          {type === 'decision' ? 'Branch based on outcomes' : 'Run tasks in parallel'}
                        </span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* task variants live in Task Configuration */}
          </div>
        </div>
      </div>
    </div>
  )
}
