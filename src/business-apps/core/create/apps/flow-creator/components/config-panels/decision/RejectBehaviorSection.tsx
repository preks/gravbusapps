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
  sendBackEnabled: boolean
  sendBackDisabled: boolean
  requireReason: boolean
  selectedTargetId?: string
  eligibleTargets: Array<{ id: string; label: string }>
  rework?: RejectReworkConfig
  onToggleSendBack: (enabled: boolean) => void
  onChangeRequireReason: (requireReason: boolean) => void
  onChangeTarget: (targetNodeId: string) => void
  onChangePreserveData: (preserveData: boolean) => void
  onChangeMaxIterations: (maxIterations: number | undefined) => void
  'data-testid': string
}

export const RejectBehaviorSection: React.FC<RejectBehaviorSectionProps> = ({
  mode,
  sendBackEnabled,
  sendBackDisabled,
  requireReason,
  selectedTargetId,
  eligibleTargets,
  rework,
  onToggleSendBack,
  onChangeRequireReason,
  onChangeTarget,
  onChangePreserveData,
  onChangeMaxIterations,
  'data-testid': testId
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:flex-col gba:gap-0.5">
          <Label className="gba:text-xs gba:font-medium gba:text-foreground">Require reason</Label>
          <p className="gba:text-[11px] gba:text-muted-foreground">Ask for a comment when Reject is chosen.</p>
        </div>
        <Switch
          checked={requireReason}
          onCheckedChange={onChangeRequireReason}
          className={NEUTRAL_SWITCH_CLASSNAME}
          data-testid={`${testId}-require-reason`}
        />
      </div>

      <div className="gba:h-px gba:bg-border" />

      <div className="gba:flex gba:flex-col gba:gap-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:flex-col gba:gap-0.5">
            <Label className="gba:text-xs gba:font-medium gba:text-foreground">Send back</Label>
            <p className="gba:text-[11px] gba:text-muted-foreground">Route Reject to a previous step.</p>
          </div>
          <Switch
            checked={sendBackEnabled}
            disabled={sendBackDisabled}
            onCheckedChange={onToggleSendBack}
            className={NEUTRAL_SWITCH_CLASSNAME}
            data-testid={`${testId}-send-back-toggle`}
          />
        </div>

        {sendBackDisabled ? (
          <p className="gba:text-[11px] gba:text-muted-foreground">
            Add a task before this decision to enable send-back.
          </p>
        ) : null}

        {sendBackEnabled && eligibleTargets.length > 0 ? (
          <>
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium gba:text-foreground">Send back to</Label>
              <Select value={selectedTargetId ?? ''} onValueChange={onChangeTarget}>
                <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-target`}>
                  <SelectValue placeholder="Select step..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleTargets.map(target => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === 'advanced' ? (
              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:p-2 gba:rounded-md gba:bg-muted gba:border gba:border-border">
                  <Label className="gba:text-xs gba:font-medium gba:text-foreground">Preserve data</Label>
                  <Switch
                    checked={rework?.preserveData ?? true}
                    onCheckedChange={onChangePreserveData}
                    className={NEUTRAL_SWITCH_CLASSNAME}
                    data-testid={`${testId}-preserve-data`}
                  />
                </div>
                <div className="gba:flex gba:flex-col gba:gap-1.5 gba:col-span-2">
                  <Label className="gba:text-xs gba:font-medium gba:text-foreground">Max iterations (optional)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={rework?.maxIterations ?? ''}
                    onChange={event => {
                      const value = event.target.value
                      onChangeMaxIterations(value === '' ? undefined : Number(value))
                    }}
                    className="gba:h-8 gba:text-xs"
                    data-testid={`${testId}-max-iterations`}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
