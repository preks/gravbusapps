import React from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { Plus, Trash2 } from 'lucide-react'
import type { DesignerMode, ReworkTarget, TaskNodeConfig } from '../../../types/studioTypes'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../../utils/neutralSwitchClassName'

interface EarlierStep {
  id: string
  label: string
}

interface TaskReworkTabProps {
  mode: DesignerMode
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  earlierSteps: EarlierStep[]
  title: string
  onRejectLabel: string
  sendBackPlaceholder: string
  reasonRequiredLabel: string
  preserveDataLabel: string
  maxIterationsLabel: string
  addLabel: string
  toggleTestId: string
  testId: string
}

export const TaskReworkTab: React.FC<TaskReworkTabProps> = ({
  mode,
  config,
  update,
  earlierSteps,
  title,
  onRejectLabel,
  sendBackPlaceholder,
  reasonRequiredLabel,
  preserveDataLabel,
  maxIterationsLabel,
  addLabel,
  toggleTestId,
  testId
}) => {
  return (
    <>
      <div className="gba:flex gba:items-center gba:justify-between">
        <Label className="gba:text-xs gba:font-medium">{title}</Label>
        <Switch
          checked={config.reworkConfig?.enabled ?? false}
          onCheckedChange={checked =>
            update({
              reworkConfig: {
                enabled: checked,
                targets: config.reworkConfig?.targets ?? [],
                maxIterations: config.reworkConfig?.maxIterations ?? 10
              }
            })
          }
          className={NEUTRAL_SWITCH_CLASSNAME}
          data-testid={toggleTestId}
        />
      </div>

      {config.reworkConfig?.enabled && (
        <>
          {config.reworkConfig.targets.map((target, index) => (
            <div key={index} className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-xs gba:font-medium">{onRejectLabel}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const targets = [...config.reworkConfig!.targets]
                    targets.splice(index, 1)
                    update({
                      reworkConfig: { ...config.reworkConfig!, targets }
                    })
                  }}
                  data-testid={`${testId}-remove-${index}`}
                >
                  <Trash2 className="gba:h-3 gba:w-3" />
                </Button>
              </div>

              <Select
                value={target.targetStepReference}
                onValueChange={v => {
                  const targets = [...config.reworkConfig!.targets]
                  targets[index] = { ...targets[index], targetStepReference: v }
                  update({
                    reworkConfig: { ...config.reworkConfig!, targets }
                  })
                }}
              >
                <SelectTrigger data-testid={`${testId}-target-${index}`}>
                  <SelectValue placeholder={sendBackPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {earlierSteps.map(step => (
                    <SelectItem key={step.id} value={step.id}>
                      {step.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="gba:flex gba:items-center gba:gap-2">
                <Switch
                  checked={target.requireReason}
                  onCheckedChange={checked => {
                    const targets = [...config.reworkConfig!.targets]
                    targets[index] = { ...targets[index], requireReason: checked }
                    update({
                      reworkConfig: { ...config.reworkConfig!, targets }
                    })
                  }}
                  className={NEUTRAL_SWITCH_CLASSNAME}
                  data-testid={`${testId}-reason-${index}`}
                />
                <span className="gba:text-xs">{reasonRequiredLabel}</span>
              </div>

              <div className="gba:flex gba:items-center gba:gap-2">
                <Switch
                  checked={target.preserveData}
                  onCheckedChange={checked => {
                    const targets = [...config.reworkConfig!.targets]
                    targets[index] = { ...targets[index], preserveData: checked }
                    update({
                      reworkConfig: { ...config.reworkConfig!, targets }
                    })
                  }}
                  className={NEUTRAL_SWITCH_CLASSNAME}
                  data-testid={`${testId}-preserve-${index}`}
                />
                <span className="gba:text-xs">{preserveDataLabel}</span>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newTarget: ReworkTarget = {
                triggerAction: 'REJECT',
                targetStepReference: '',
                requireReason: false,
                preserveData: true
              }
              update({
                reworkConfig: {
                  ...config.reworkConfig!,
                  targets: [...config.reworkConfig!.targets, newTarget]
                }
              })
            }}
            data-testid={`${testId}-add`}
          >
            <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
            {addLabel}
          </Button>

          {mode === 'advanced' && (
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium">{maxIterationsLabel}</Label>
              <Input
                type="number"
                min={2}
                value={config.reworkConfig.maxIterations ?? 10}
                onChange={e =>
                  update({
                    reworkConfig: {
                      ...config.reworkConfig!,
                      maxIterations: parseInt(e.target.value) || 10
                    }
                  })
                }
                data-testid={`${testId}-max-iter`}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}
