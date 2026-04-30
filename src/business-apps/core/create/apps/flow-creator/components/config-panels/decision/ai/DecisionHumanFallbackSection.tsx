import React, { useMemo } from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import type { DesignerMode } from '../../../../types/studioTypes'
import type { TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { AssignmentMode } from '@/common/data/flow/types/flowTemplate'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextExpressionEditor } from '../../../shared/FlowContextExpressionEditor'
import { AssignmentConfigSection } from '../../task/AssignmentConfigSection'
import type { AIExecutor } from './DecisionExecutorTabs'
import type { DueUnit } from '../decisionConfigUtils'
import { deriveTimeUnit, MINUTES_PER } from '../decisionConfigUtils'

type EscalationConfig = {
  mode: 'USER'
  assignment: TaskAssignment
  timeoutMinutes?: number
}

interface DecisionHumanFallbackSectionProps {
  mode: DesignerMode
  variant: 'simple' | 'advanced'
  executor: AIExecutor
  aiConfig: any
  accessToken: string
  availableStartFields: Array<{ name: string; label: string }>
  expressionSuggestions: ExpressionSuggestionItem[]
  dataSources?: React.ComponentProps<typeof FlowContextExpressionEditor>['dataSources']
  onChange: (nextAiConfig: any) => void
  'data-testid': string
}

export const DecisionHumanFallbackSection: React.FC<DecisionHumanFallbackSectionProps> = ({
  mode,
  variant,
  executor,
  aiConfig,
  accessToken,
  availableStartFields,
  expressionSuggestions,
  dataSources,
  onChange,
  'data-testid': testId
}) => {
  const { t } = useTranslation(translations)
  const ai = aiConfig
  const fallbackMessageSuggestions = useMemo(
    () => [
      {
        id: 'self-ai-instructions',
        label: 'This decision - instructions',
        expression: '$steps.self.decisionInstructions',
        source: 'steps' as const,
        dataType: 'string' as const,
        description: 'Decision instructions used by the AI (without system instructions)'
      },
      {
        id: 'self-ai-reasoning',
        label: 'This decision - AI reasoning',
        expression: '$steps.self.resultData.reasoning',
        source: 'steps' as const,
        dataType: 'string' as const,
        description: 'Reasoning returned by the AI decision'
      },
      ...expressionSuggestions
    ],
    [expressionSuggestions]
  )
  const escalation: EscalationConfig = ai.escalation ?? {
    mode: 'USER',
    assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
  }

  const unit = useMemo(() => deriveTimeUnit(escalation.timeoutMinutes), [escalation.timeoutMinutes])
  const amountValue = useMemo(() => {
    const mins = Number(escalation.timeoutMinutes || 0)
    if (!mins) return ''
    const per = MINUTES_PER[unit]
    const val = Math.round(mins / per)
    return String(val > 0 ? val : '')
  }, [escalation.timeoutMinutes, unit])

  const suffix = variant === 'advanced' ? '-adv' : ''

  return (
    <div className="gba:flex gba:flex-col gba:gap-3 gba:rounded-lg gba:bg-muted gba:p-3 gba:border gba:border-border">
      <div className="gba:text-xs gba:font-semibold gba:text-foreground">{t('decision-human-fallback-title')}</div>
      <div className="gba:text-xs gba:text-muted-foreground">{t('decision-human-fallback-desc')}</div>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-human-instructions-label')}</Label>
        <p className="gba:text-xs gba:text-muted-foreground">{t('decision-human-instructions-desc')}</p>
        <FlowContextExpressionEditor
          value={ai.humanInstructions ?? ''}
          onChange={value => onChange({ ...ai, executor, humanInstructions: value })}
          suggestions={fallbackMessageSuggestions}
          dataSources={dataSources}
          placeholder={t('decision-human-instructions-placeholder')}
          allowFreeText
          multiline
          data-testid={`${testId}-ai-human-instructions${suffix}`}
        />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-3 gba:rounded-lg gba:bg-background gba:p-3 gba:border gba:border-border">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('assignment-mode-label')}</Label>
        <AssignmentConfigSection
          mode={mode}
          accessToken={accessToken}
          value={{
            targets: escalation.assignment.targets ?? null,
            assignmentMode: escalation.assignment.assignmentMode as any,
            allowReassignment: (escalation.assignment as any).allowReassignment ?? true
          }}
          onChange={(next: TaskAssignment) =>
            onChange({
              ...ai,
              executor,
              escalation: {
                ...escalation,
                assignment: {
                  targets: next.targets ?? null,
                  assignmentMode: next.assignmentMode as any,
                  allowReassignment: next.allowReassignment ?? true
                } as any
              }
            })
          }
          availableStartFields={availableStartFields}
          defaultUserTargets={['{{$orgchart.managerByUserId[$workflow.initiator]}}']}
          defaultStrategyId="REQUESTER_MANAGER"
          allowAssignAtExecution={false}
          disallowedAssignStrategyIds={['REQUESTER_DIRECT_REPORTS']}
          testId={`${testId}-ai-escalation-assignment${suffix}`}
        />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
          {t('decision-escalation-due-label')}
        </Label>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Input
            type="number"
            min={1}
            value={amountValue}
            placeholder={t('decision-due-placeholder')}
            onChange={e => {
              const raw = String(e.target.value || '').trim()
              if (!raw) {
                onChange({ ...ai, executor, escalation: { ...escalation, timeoutMinutes: undefined } })
                return
              }
              const n = Number.parseInt(raw, 10)
              if (!Number.isFinite(n) || n <= 0) {
                onChange({ ...ai, executor, escalation: { ...escalation, timeoutMinutes: undefined } })
                return
              }
              onChange({ ...ai, executor, escalation: { ...escalation, timeoutMinutes: n * MINUTES_PER[unit] } })
            }}
            className="gba:flex-1"
            data-testid={`${testId}-ai-escalation-due-amount${suffix}`}
          />
          <Select
            value={unit}
            onValueChange={(next: string) => {
              const nextUnit = next as DueUnit
              const currentAmount = Number.parseInt(String(amountValue || '1'), 10) || 1
              onChange({
                ...ai,
                executor,
                escalation: { ...escalation, timeoutMinutes: currentAmount * MINUTES_PER[nextUnit] }
              })
            }}
          >
            <SelectTrigger className="gba:w-32" data-testid={`${testId}-ai-escalation-due-unit${suffix}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">{t('decision-due-unit-minutes')}</SelectItem>
              <SelectItem value="hours">{t('decision-due-unit-hours')}</SelectItem>
              <SelectItem value="days">{t('decision-due-unit-days')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
