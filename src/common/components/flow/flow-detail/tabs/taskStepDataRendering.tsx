import React from 'react'
import type { StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import type { FlowStep, StepAssignmentInfo } from '../types'
import { FieldValueDisplay, buildStepDataTableRows, generateFieldLabel, isFileLikeValue } from './stepDataRendering'

function hasVisibleFormValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
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
    const entries = Object.entries(row.formData || {})
    if (entries.length === 0) return false
    return entries.some(([, value]) => hasVisibleFormValue(value))
  })
}

interface KeyValueFormDataProps {
  formData: Record<string, unknown>
  accessToken?: string
}

export const KeyValueFormData: React.FC<KeyValueFormDataProps> = ({ formData, accessToken }) => {
  const entries = Object.entries(formData).filter(([, value]) => hasVisibleFormValue(value))

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
