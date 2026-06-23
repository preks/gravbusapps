import React, { useEffect, useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { FlowStep as TemplateFlowStep } from '@/common/network/flows/FlowTemplateClient'
import type { StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import {
  containsFlowTemplateExpressions,
  resolveFlowTemplateText
} from '@/common/network/flows/resolveFlowTemplateText'
import type { FlowStep, StepAssignmentInfo } from '../types'
import {
  FieldValueDisplay,
  buildStepDataTableRows,
  generateFieldLabel,
  isFileLikeValue,
  isHiddenTransportField
} from './stepDataRendering'

function hasVisibleFormValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
}

/** Task message from template JSON — same field Flow Studio edits as `config.message`. */
export function getTemplateStepMessage(step?: TemplateFlowStep | null): string | undefined {
  if (!step) return undefined
  const message = typeof step.message === 'string' ? step.message.trim() : ''
  if (message) return message
  const humanInstructions =
    typeof step.aiConfig?.humanInstructions === 'string' ? step.aiConfig.humanInstructions.trim() : ''
  if (humanInstructions) return humanInstructions
  const userMessage = typeof step.userConfig?.message === 'string' ? step.userConfig.message.trim() : ''
  if (userMessage) return userMessage
  return undefined
}

export function getCapturedDataRows(args: {
  step: FlowStep
  stepData?: StepDataResponse | null
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  actorNames: Record<string, string>
  employeeMap: Map<string, { displayName?: string; avatarUrl?: string }>
}) {
  return buildStepDataTableRows(args).filter(row => {
    if (row.hasSubmission === false) return false
    const entries = Object.entries(row.formData || {}).filter(([key]) => !isHiddenTransportField(key))
    if (entries.length === 0) return false
    return entries.some(([, value]) => hasVisibleFormValue(value))
  })
}

interface KeyValueFormDataProps {
  formData: Record<string, unknown>
  accessToken?: string
}

export const KeyValueFormData: React.FC<KeyValueFormDataProps> = ({ formData, accessToken }) => {
  const entries = Object.entries(formData).filter(
    ([key, value]) => !isHiddenTransportField(key) && hasVisibleFormValue(value)
  )

  if (entries.length === 0) {
    return (
      <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/10 gba:px-3 gba:py-4 gba:text-sm gba:text-muted-foreground">
        No data captured yet.
      </div>
    )
  }

  return (
    <div className="gba:divide-y gba:divide-border gba:rounded-md gba:border gba:border-border gba:bg-card">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="gba:grid gba:grid-cols-1 gba:gap-2 gba:px-4 gba:py-3 md:gba:grid-cols-[minmax(140px,220px)_1fr] md:gba:gap-6"
        >
          <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
            {isFileLikeValue(value) ? 'Document' : generateFieldLabel(key)}
          </div>
          <div className="gba:min-w-0">
            <FieldValueDisplay fieldKey={key} value={value} accessToken={accessToken} />
          </div>
        </div>
      ))}
    </div>
  )
}

export interface TaskStepDataViewProps {
  step: FlowStep
  stepData?: StepDataResponse | null
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  actorNames: Record<string, string>
  employeeMap: Map<string, { displayName?: string; avatarUrl?: string }>
  accessToken?: string
}

interface TaskStepMessageSectionProps {
  message?: string
  flowId?: string
  accessToken?: string
}

/** Collapsible task message — matches Flow Launcher / Flow Studio preview (`step.message`). */
export const TaskStepMessageSection: React.FC<TaskStepMessageSectionProps> = ({ message, flowId, accessToken }) => {
  const [isOpen, setIsOpen] = useState(false)
  const rawText = typeof message === 'string' ? message.trim() : ''
  const [displayText, setDisplayText] = useState(rawText)

  useEffect(() => {
    setDisplayText(rawText)

    if (!rawText || !flowId || !accessToken || !containsFlowTemplateExpressions(rawText)) {
      return
    }

    let cancelled = false
    void resolveFlowTemplateText({ text: rawText, flowId, accessToken }).then(resolved => {
      if (!cancelled) {
        setDisplayText(resolved)
      }
    })

    return () => {
      cancelled = true
    }
  }, [rawText, flowId, accessToken])

  if (!rawText) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} data-testid="flow-task-step-message">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-2 gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2 gba:text-left"
          data-testid="flow-task-step-message-toggle"
        >
          <span className="gba:text-sm gba:font-semibold gba:text-foreground">Message</span>
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
            {isOpen ? 'Hide' : 'Show'}
            {isOpen ? (
              <ChevronDown className="gba:h-3.5 gba:w-3.5" />
            ) : (
              <ChevronRight className="gba:h-3.5 gba:w-3.5" />
            )}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="gba:mt-2 gba:rounded-md gba:border gba:border-border gba:bg-card gba:px-4 gba:py-3 gba:text-sm gba:leading-relaxed gba:text-foreground gba:whitespace-pre-wrap">
          {displayText}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export const TaskStepDataView: React.FC<TaskStepDataViewProps> = props => {
  const capturedRows = getCapturedDataRows(props)

  if (capturedRows.length === 0) {
    return (
      <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/10 gba:px-3 gba:py-4 gba:text-sm gba:text-muted-foreground">
        No data captured yet.
      </div>
    )
  }

  if (capturedRows.length === 1) {
    return <KeyValueFormData formData={capturedRows[0].formData} accessToken={props.accessToken} />
  }

  return (
    <div className="gba:space-y-4">
      {capturedRows.map(row => (
        <div key={`${row.taskId}-${row.userId}`} className="gba:space-y-2">
          <div className="gba:text-sm gba:font-medium gba:text-foreground">{row.userName}</div>
          <KeyValueFormData formData={row.formData} accessToken={props.accessToken} />
        </div>
      ))}
    </div>
  )
}
