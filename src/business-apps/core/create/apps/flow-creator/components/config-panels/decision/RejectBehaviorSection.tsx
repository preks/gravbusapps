import React from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import type { DesignerMode } from '../../../types/studioTypes'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../../utils/neutralSwitchClassName'

export interface RejectReworkConfig {
  targetNodeId?: string
  requireReason: boolean
  preserveData: boolean
  maxIterations?: number
}

interface RejectBehaviorSectionProps {
  mode: DesignerMode
  enabled: boolean
  disabled: boolean
  selectedTargetId?: string
  eligibleTargets: Array<{ id: string; label: string }>
  rework?: RejectReworkConfig
  onToggle: (enabled: boolean) => void
  onChangeTarget: (targetNodeId: string) => void
  onChangeRequireReason: (requireReason: boolean) => void
  onChangePreserveData: (preserveData: boolean) => void
  onChangeMaxIterations: (maxIterations: number | undefined) => void
  'data-testid': string
}

export const RejectBehaviorSection: React.FC<RejectBehaviorSectionProps> = ({
  mode,
  enabled,
  disabled,
  selectedTargetId,
  eligibleTargets,
  rework,
  onToggle,
  onChangeTarget,
  onChangeRequireReason,
  onChangePreserveData,
  onChangeMaxIterations,
  'data-testid': testId
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <div className="gba:flex gba:items-center gba:justify-between">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Reject behavior</Label>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Send back</Label>
          <Switch
            checked={enabled}
            disabled={disabled}
            onCheckedChange={onToggle}
            className={NEUTRAL_SWITCH_CLASSNAME}
            data-testid={`${testId}-toggle`}
          />
        </div>
      </div>

      {eligibleTargets.length === 0 ? (
        <p className="gba:text-[11px] gba:text-muted-foreground">
          Add a task before this decision to enable send-back.
        </p>
      ) : (
        <>
          {enabled && (
            <>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs gba:font-medium">Send back to</Label>
                <Select value={selectedTargetId ?? ''} onValueChange={onChangeTarget}>
                  <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-target`}>
                    <SelectValue placeholder="Select step..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleTargets.map(tgt => (
                      <SelectItem key={tgt.id} value={tgt.id}>
                        {tgt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === 'advanced' && (
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:p-2 gba:rounded-md gba:bg-background gba:border gba:border-border">
                    <Label className="gba:text-xs gba:font-medium gba:text-foreground">Require reason</Label>
                    <Switch
                      checked={rework?.requireReason ?? false}
                      onCheckedChange={onChangeRequireReason}
                      className={NEUTRAL_SWITCH_CLASSNAME}
                      data-testid={`${testId}-require-reason`}
                    />
                  </div>
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:p-2 gba:rounded-md gba:bg-background gba:border gba:border-border">
                    <Label className="gba:text-xs gba:font-medium gba:text-foreground">Preserve data</Label>
                    <Switch
                      checked={rework?.preserveData ?? true}
                      onCheckedChange={onChangePreserveData}
                      className={NEUTRAL_SWITCH_CLASSNAME}
                      data-testid={`${testId}-preserve-data`}
                    />
                  </div>
                  <div className="gba:flex gba:flex-col gba:gap-1.5 gba:col-span-2">
                    <Label className="gba:text-xs gba:font-medium">Max iterations (optional)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rework?.maxIterations ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        onChangeMaxIterations(v === '' ? undefined : Number(v))
                      }}
                      className="gba:h-8 gba:text-xs gba:bg-background"
                      data-testid={`${testId}-max-iterations`}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!enabled && (
            <p className="gba:text-[11px] gba:text-muted-foreground">
              When enabled, the Reject branch becomes a backward connection.
            </p>
          )}
        </>
      )}
    </div>
  )
}
