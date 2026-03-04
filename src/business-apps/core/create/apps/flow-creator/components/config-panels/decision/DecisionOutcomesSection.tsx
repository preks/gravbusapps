import React, { useMemo } from 'react'
import { Button, Input, Label, Switch } from '@newwork/nw-design-system'
import { Plus, X } from 'lucide-react'
import type { DecisionNodeConfig } from '../../../types/studioTypes'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../../utils/neutralSwitchClassName'

type BranchEdge = { id: string; label?: string }

const isApprovalLabel = (s: string) =>
  s.trim().toLowerCase().startsWith('approve') || s.trim().toLowerCase() === 'approve'
const isRejectLabel = (s: string) => s.trim().toLowerCase().startsWith('reject') || s.trim().toLowerCase() === 'reject'

interface DecisionOutcomesSectionProps {
  config: DecisionNodeConfig
  branchEdges: BranchEdge[]
  syncBranches: (labels: string[]) => void
  update: (partial: Partial<DecisionNodeConfig>) => void
  onUpdateEdgeLabel: (edgeId: string, label: string) => void
  testId: string
}

export const DecisionOutcomesSection: React.FC<DecisionOutcomesSectionProps> = ({
  config,
  branchEdges,
  syncBranches,
  update,
  onUpdateEdgeLabel,
  testId
}) => {
  const labels = useMemo(() => branchEdges.map(e => String(e.label || '').trim() || 'Outcome'), [branchEdges])

  const approvalSelected = useMemo(() => {
    if (branchEdges.length !== 2) return false
    const a = String(branchEdges[0]?.label || '')
    const b = String(branchEdges[1]?.label || '')
    return (isApprovalLabel(a) && isRejectLabel(b)) || (isApprovalLabel(b) && isRejectLabel(a))
  }, [branchEdges])

  const setApprovalOutcomes = () => {
    syncBranches(['Approve', 'Reject'])
  }

  const setCustomOutcomes = () => {
    // Switch away from approval-style outcomes so inputs become editable.
    syncBranches(['Option 1', 'Option 2'])
    update({
      rejectRework: undefined,
      userConfig: config.userConfig ? ({ ...(config.userConfig as any), rejectRework: undefined } as any) : undefined
    })
  }

  const canRemoveLast = branchEdges.length > 2
  const multipleChoices = !approvalSelected

  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-outcomes`}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <div className="gba:flex gba:flex-col gba:gap-0.5">
          <Label className="gba:text-xs gba:font-medium">Outcomes</Label>
          <p className="gba:text-xs gba:text-muted-foreground">Used by all decision kinds.</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-outcomes-multiple-toggle`}>
            <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Multiple choices</Label>
            <Switch
              checked={multipleChoices}
              onCheckedChange={checked => (checked ? setCustomOutcomes() : setApprovalOutcomes())}
              className={NEUTRAL_SWITCH_CLASSNAME}
              data-testid={`${testId}-outcomes-multiple-toggle-switch`}
            />
          </div>
          {multipleChoices ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => syncBranches([...labels, `Outcome ${labels.length + 1}`])}
              data-testid={`${testId}-outcomes-add`}
            >
              <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
              Add
            </Button>
          ) : null}
        </div>
      </div>

      {!multipleChoices ? (
        <div
          className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted"
          data-testid={`${testId}-outcomes-fixed`}
        >
          <span className="gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
            Fixed outcomes
          </span>
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:px-3 gba:py-1.5 gba:rounded-md gba:bg-success-secondary">
              <span className="gba:text-xs gba:font-medium gba:text-success-secondary-foreground">Approve</span>
            </div>
            <div className="gba:px-3 gba:py-1.5 gba:rounded-md gba:bg-destructive-secondary">
              <span className="gba:text-xs gba:font-medium gba:text-destructive-secondary-foreground">Reject</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-outcomes-list`}>
          {branchEdges.map((edge, i) => {
            const value = String(edge.label || '').trim()
            const isLast = i === branchEdges.length - 1
            return (
              <div key={edge.id} className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-xs gba:text-muted-foreground gba:w-10">#{i + 1}</span>
                <Input
                  value={value}
                  onChange={e => onUpdateEdgeLabel(edge.id, e.target.value)}
                  placeholder={`Outcome ${i + 1}`}
                  data-testid={`${testId}-outcome-label-${i}`}
                />
                {isLast && canRemoveLast ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => syncBranches(labels.slice(0, -1))}
                    data-testid={`${testId}-outcome-remove-${i}`}
                  >
                    <X className="gba:h-3 gba:w-3" />
                  </Button>
                ) : (
                  <span className="gba:w-9" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
