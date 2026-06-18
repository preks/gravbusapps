import React, { useMemo } from 'react'
import { Button, Input, Label } from '@newwork/nw-design-system'
import { Plus, X } from 'lucide-react'
import type { DecisionNodeConfig, DesignerMode } from '../../../types/studioTypes'
import { isApprovalUserDecision } from '../../step-picker/decisionUserKind'
import { DecisionRejectBehaviorSection } from './DecisionRejectBehaviorSection'

type BranchEdge = { id: string; label?: string }
type RoutingBranchEdge = { id: string; source: string; target: string; label?: string }

export interface DecisionOutcomesSectionProps {
  config: DecisionNodeConfig
  mode: DesignerMode
  branchEdges: BranchEdge[]
  routingBranchEdges?: RoutingBranchEdge[]
  eligibleSendBackTargets?: Array<{ id: string; label: string }>
  syncBranches: (labels: string[]) => void
  update: (partial: Partial<DecisionNodeConfig>) => void
  onUpdateEdgeLabel: (edgeId: string, label: string) => void
  testId: string
}

function buildOptionLabel(index: number): string {
  return `Option ${index + 1}`
}

export const DecisionOutcomesSection: React.FC<DecisionOutcomesSectionProps> = ({
  config,
  mode,
  branchEdges,
  routingBranchEdges,
  eligibleSendBackTargets = [],
  syncBranches,
  update,
  onUpdateEdgeLabel,
  testId
}) => {
  const labels = useMemo(
    () =>
      branchEdges.map(edge => {
        const rawLabel = String(edge.label || '')
        return rawLabel.trim() ? rawLabel : 'Outcome'
      }),
    [branchEdges]
  )

  const approvalSelected = useMemo(() => isApprovalUserDecision(config), [config])
  const canRemoveOutcome = branchEdges.length > 2

  const removeOutcomeAt = (index: number) => {
    syncBranches(labels.filter((_, labelIndex) => labelIndex !== index))
  }

  return (
    <section className="gba:flex gba:flex-col gba:gap-3" data-testid={`${testId}-outcomes`}>
      <div className="gba:flex gba:flex-col gba:gap-0.5">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Outcomes</Label>
        <p className="gba:text-xs gba:text-muted-foreground">Branches created when someone completes this decision.</p>
      </div>

      {approvalSelected ? (
        <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-outcomes-fixed`}>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:flex-shrink-0">#1</span>
            <div
              className="gba:flex-1 gba:px-3 gba:py-2 gba:rounded-md gba:bg-success-secondary"
              data-testid={`${testId}-outcome-label-0`}
            >
              <span className="gba:text-xs gba:font-medium gba:text-success-secondary-foreground">Approve</span>
            </div>
          </div>

          <div className="gba:flex gba:gap-2">
            <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:pt-2 gba:flex-shrink-0">#2</span>
            <div className="gba:flex-1 gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
              <div className="gba:px-3 gba:py-2 gba:bg-destructive-secondary" data-testid={`${testId}-outcome-label-1`}>
                <span className="gba:text-xs gba:font-semibold gba:text-destructive-secondary-foreground">Reject</span>
              </div>
              {routingBranchEdges ? (
                <div className="gba:p-3 gba:bg-background">
                  <DecisionRejectBehaviorSection
                    config={config}
                    update={update}
                    mode={mode}
                    testId={testId}
                    branchEdges={routingBranchEdges}
                    eligibleSendBackTargets={eligibleSendBackTargets}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-outcomes-list`}>
          {branchEdges.map((edge, index) => {
            const value = String(edge.label || '')
            return (
              <div key={edge.id} className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:flex-shrink-0">#{index + 1}</span>
                <Input
                  value={value}
                  onChange={event => onUpdateEdgeLabel(edge.id, event.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                  className="gba:flex-1 gba:min-w-0 gba:h-9"
                  data-testid={`${testId}-outcome-label-${index}`}
                />
                {canRemoveOutcome ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="gba:h-9 gba:w-9 gba:shrink-0"
                    onClick={() => removeOutcomeAt(index)}
                    data-testid={`${testId}-outcome-remove-${index}`}
                  >
                    <X className="gba:h-3.5 gba:w-3.5" />
                  </Button>
                ) : (
                  <span className="gba:h-9 gba:w-9 gba:shrink-0" aria-hidden="true" />
                )}
              </div>
            )
          })}
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:w-8 gba:flex-shrink-0" aria-hidden="true" />
            <Button
              type="button"
              variant="outline"
              className="gba:flex-1 gba:h-9"
              onClick={() => syncBranches([...labels, buildOptionLabel(labels.length)])}
              data-testid={`${testId}-outcomes-add`}
            >
              <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
              Add
            </Button>
            <span className="gba:h-9 gba:w-9 gba:shrink-0" aria-hidden="true" />
          </div>
        </div>
      )}
    </section>
  )
}
