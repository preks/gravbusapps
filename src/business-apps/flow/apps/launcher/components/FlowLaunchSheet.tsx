import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast
} from '@newwork/nw-design-system'
import { ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import {
  AssignmentMode,
  FlowTemplateClient,
  InputType,
  type InteractiveFlowTestSession,
  type FlowTemplate,
  type TaskAssignment
} from '@/common/network/flows/FlowTemplateClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AssignmentSelector } from '@/components/assignment-selector/AssignmentSelector'
import FlowDataSourceSelect from '@/business-apps/flow/common/components/data-source/FlowDataSourceSelect'
import FlowDataSourceMultiSelect from '@/business-apps/flow/common/components/data-source/FlowDataSourceMultiSelect'
import { useFlowLaunchFileUpload } from '../hooks/useFlowLaunchFileUpload'
import { FlowLaunchFileField } from './FlowLaunchFileField'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type {
  FlowTestExecutionSnapshot,
  FlowTestStepOutcome,
  FlowTestStepStatus
} from '@/common/network/flows/flowTestExecutionTypes'
import {
  buildRuntimeAssignmentsPayload,
  coerceFormDataBySchema,
  collectRuntimeAssignments,
  getFallbackCompletionUserId,
  hasAssignmentTargets,
  isSystemTaskType,
  normalizeOption,
  resolveLaunchFormContext,
  submitFirstTaskFormFallback,
  toRuntimeTaskAssignment,
  type RuntimeAssignment
} from './flowLaunchUtils'

function toDynamicStepAssignments(runtimeAssignments: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(runtimeAssignments).map(([stepKey, assignment]) => [
      stepKey,
      {
        assignment,
        resolvedConfig: null
      }
    ])
  )
}

type AgentTestStep = {
  stepKey: string
  stepIndex: number
  title: string
  fields: AgentTestField[]
  response: Record<string, unknown>
}

type TaskTestStep = {
  stepKey: string
  stepIndex: number
  title: string
  fields: AgentTestField[]
  response: Record<string, unknown>
}

type AgentTestField = {
  name: string
  label: string
  type: string
  description?: string
  options?: unknown[]
}

type AgentTestMode = 'REAL_WITH_TEST_FALLBACK' | 'TEST_RESPONSE' | 'REAL_ONLY'

export type TestScope = 'flow' | 'single-step'

type TestableStepOption = {
  stepKey: string
  stepIndex: number
  title: string
  type: string
  aliases: string[]
}

const AGENT_TEST_STEP_TYPES = new Set(['AI_AGENT', 'AGENT', 'AI_TASK_EXPERT', 'TASK_EXPERT'])
const CONTROL_FLOW_STEP_TYPES = new Set(['DECISION', 'FORK', 'JOIN'])
const TEST_STEP_TYPE_LABELS: Record<string, string> = {
  AI_AGENT: 'AI agent',
  AGENT: 'Agent',
  AI_TASK_EXPERT: 'Task expert',
  TASK_EXPERT: 'Task expert',
  HUMAN_TASK: 'User task',
  USER_TASK: 'User task',
  TASK: 'Task'
}

function getStepOptionReference(_step: any, index: number): string {
  return `step_${index}`
}

function getStepOptionAliases(step: any, index: number): string[] {
  const aliases = new Set<string>([getStepOptionReference(step, index)])
  const reference = String(step?.reference || '').trim()
  const id = String(step?.id || '').trim()
  if (reference) aliases.add(reference)
  if (id) aliases.add(id)
  return Array.from(aliases)
}

function buildJsonSchemaTestValue(schema: any): unknown {
  const type = Array.isArray(schema?.type) ? schema.type[0] : schema?.type
  const properties = schema?.properties && typeof schema.properties === 'object' ? schema.properties : null

  if (properties) {
    return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, buildJsonSchemaTestValue(value)]))
  }

  const allowedValues = getFieldAllowedValues(schema)
  if (allowedValues.length > 0) return allowedValues[0]
  if (schema?.const !== undefined) return schema.const
  if (schema?.default !== undefined) return schema.default
  if (schema?.example !== undefined) return schema.example
  if (type === 'number' || type === 'integer') return 1
  if (type === 'boolean') return true
  if (type === 'array') return []
  if (type === 'object') return {}
  return 'test'
}

function getAgentTestSteps(template: FlowTemplate | null): AgentTestStep[] {
  const steps = Array.isArray(template?.steps) ? template.steps : []
  return steps.flatMap((step: any, index: number) => {
    const stepType = String(step?.type || '').toUpperCase()
    if (!AGENT_TEST_STEP_TYPES.has(stepType)) return []

    const schema = step?.aiAgentConfig?.resultSchema || step?.agentConfig?.responseSchema
    const properties = schema?.properties && typeof schema.properties === 'object' ? schema.properties : {}
    const fields = Object.entries(properties).map(([name, config]: [string, any]) => ({
      name,
      label: formatFieldLabel(name),
      type: String(Array.isArray(config?.type) ? config.type[0] : config?.type || 'string'),
      description: typeof config?.description === 'string' ? config.description : undefined,
      options: Array.isArray(config?.enum) ? config.enum : undefined
    }))
    const response =
      schema && typeof schema === 'object'
        ? buildJsonSchemaTestValue(schema)
        : {
            answer: 'Test response',
            decision: 'test',
            confidence: 1
          }

    return [
      {
        stepKey: getStepOptionReference(step, index),
        stepIndex: index,
        title: step?.title || `Agent step ${index + 1}`,
        fields,
        response:
          response && typeof response === 'object' && !Array.isArray(response)
            ? coerceAllowedValueDefaults(fields, response as Record<string, unknown>)
            : { value: response }
      }
    ]
  })
}

function getDefaultAgentTestResponses(template: FlowTemplate | null): Record<string, Record<string, unknown>> {
  return Object.fromEntries(getAgentTestSteps(template).map(step => [step.stepKey, step.response]))
}

function getDefaultAgentTestModes(template: FlowTemplate | null): Record<string, AgentTestMode> {
  return Object.fromEntries(getAgentTestSteps(template).map(step => [step.stepKey, 'REAL_ONLY']))
}

function getTaskTestSteps(template: FlowTemplate | null): TaskTestStep[] {
  const steps = Array.isArray(template?.steps) ? template.steps : []
  return steps.flatMap((step: any, index: number) => {
    const stepType = String(step?.type || '').toUpperCase()
    if (isSystemTaskType(stepType) || CONTROL_FLOW_STEP_TYPES.has(stepType)) return []

    const formFields = Array.isArray(step?.form) ? step.form : []
    if (formFields.length === 0) return []

    const fields = formFields.map((field: any, fieldIndex: number) => ({
      name: String(field?.name || field?.id || field?.key || `field_${fieldIndex}`),
      label: field?.label || field?.title || formatFieldLabel(field?.name || field?.id || `field_${fieldIndex}`),
      type: String(field?.type || 'text').toLowerCase(),
      description: typeof field?.description === 'string' ? field.description : undefined,
      options: Array.isArray(field?.options) ? field.options : undefined
    }))

    return [
      {
        stepKey: getStepOptionReference(step, index),
        stepIndex: index,
        title: step?.title || `Task ${index + 1}`,
        fields,
        response: Object.fromEntries(
          formFields.map((field: any, fieldIndex: number) => {
            const name = String(field?.name || field?.id || field?.key || `field_${fieldIndex}`)
            return [name, getDefaultTestInputValue(field)]
          })
        )
      }
    ]
  })
}

function getDefaultTaskTestResponses(template: FlowTemplate | null): Record<string, Record<string, unknown>> {
  return Object.fromEntries(getTaskTestSteps(template).map(step => [step.stepKey, step.response]))
}

function getTestableStepOptions(template: FlowTemplate | null): TestableStepOption[] {
  const steps = Array.isArray(template?.steps) ? template.steps : []
  return steps.flatMap((step: any, index: number) => {
    const stepType = String(step?.type || '').toUpperCase()
    if (CONTROL_FLOW_STEP_TYPES.has(stepType)) return []
    const stepKey = getStepOptionReference(step, index)
    return [
      {
        stepKey,
        stepIndex: index,
        title: step?.title || `Step ${index + 1}`,
        type: stepType || 'TASK',
        aliases: getStepOptionAliases(step, index)
      }
    ]
  })
}

function getTestStepTypeLabel(type: string): string {
  const normalizedType = String(type || '').toUpperCase()
  return TEST_STEP_TYPE_LABELS[normalizedType] || formatFieldLabel(normalizedType || 'Task')
}

function getReachableStepIndexes(
  template: FlowTemplate | null,
  selectedBranches: Record<string, string>
): Set<number> | null {
  const steps = Array.isArray(template?.steps) ? template.steps : []
  let reachableStepIndexes: Set<number> | null = null

  const collectSelectedPath = (startIndex: number, stopIndex: number | null): Set<number> => {
    const path = new Set<number>()
    const seen = new Set<number>()
    let currentIndex: number | null = startIndex

    while (typeof currentIndex === 'number' && currentIndex >= 0 && currentIndex < steps.length) {
      if (seen.has(currentIndex) || currentIndex === stopIndex) break
      seen.add(currentIndex)
      path.add(currentIndex)

      const step = steps[currentIndex] as any
      const stepKey = getStepOptionReference(step, currentIndex)
      const selectedBranchId = selectedBranches[stepKey]
      if (selectedBranchId && String(step?.type || '').toUpperCase() === 'DECISION') {
        const selectedBranch = (Array.isArray(step?.branches) ? step.branches : []).find(
          (branch: any) => String(branch?.id || '') === selectedBranchId
        )
        currentIndex = typeof selectedBranch?.nextStep === 'number' ? selectedBranch.nextStep : null
        continue
      }

      currentIndex = typeof step?.nextStep === 'number' ? step.nextStep : null
    }

    return path
  }

  steps.forEach((step: any, decisionIndex: number) => {
    const decisionStepKey = getStepOptionReference(step, decisionIndex)
    const selectedBranchId = selectedBranches[decisionStepKey]
    if (!selectedBranchId || String(step?.type || '').toUpperCase() !== 'DECISION') return

    const branches = Array.isArray(step?.branches) ? step.branches : []
    const selectedBranch = branches.find((branch: any) => String(branch?.id || '') === selectedBranchId)
    if (typeof selectedBranch?.nextStep !== 'number') return

    const mergeStepIndex = typeof step?.nextStep === 'number' ? step.nextStep : null
    const selectedPath = collectSelectedPath(selectedBranch.nextStep, mergeStepIndex)
    const allowedForDecision = new Set<number>()
    for (let index = 0; index < steps.length; index += 1) {
      if (index <= decisionIndex || selectedPath.has(index) || (mergeStepIndex !== null && index >= mergeStepIndex)) {
        allowedForDecision.add(index)
      }
    }

    reachableStepIndexes =
      reachableStepIndexes === null
        ? allowedForDecision
        : new Set([...reachableStepIndexes].filter(index => allowedForDecision.has(index)))
  })

  return reachableStepIndexes
}

function getPrerequisiteStepIndexes(template: FlowTemplate | null, targetStepIndex: number): Set<number> {
  const steps = Array.isArray(template?.steps) ? template.steps : []
  if (!Number.isFinite(targetStepIndex) || targetStepIndex < 0 || targetStepIndex >= steps.length) return new Set()

  const reverse = new Map<number, number[]>()
  steps.forEach((step: any, index: number) => {
    const addParent = (child: unknown) => {
      if (typeof child !== 'number' || child < 0 || child >= steps.length) return
      reverse.set(child, [...(reverse.get(child) ?? []), index])
    }
    addParent(step?.nextStep)
    ;(Array.isArray(step?.branches) ? step.branches : []).forEach((branch: any) => addParent(branch?.nextStep))
    ;(Array.isArray(step?.parallelBranches) ? step.parallelBranches : []).forEach((branch: any) => {
      ;(Array.isArray(branch?.steps) ? branch.steps : []).forEach((stepReference: unknown) => {
        const refIndex =
          typeof stepReference === 'number'
            ? stepReference
            : String(stepReference || '').startsWith('step_')
              ? Number(String(stepReference).replace('step_', ''))
              : steps.findIndex(
                  (candidate: any) => candidate?.id === stepReference || candidate?.reference === stepReference
                )
        addParent(refIndex)
      })
    })
  })

  const path = new Set<number>([targetStepIndex])
  const queue = [targetStepIndex]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const parent of reverse.get(current) ?? []) {
      if (path.has(parent)) continue
      path.add(parent)
      queue.push(parent)
    }
  }
  return path
}

function getReachableTestSteps<T extends { stepIndex: number }>(
  template: FlowTemplate | null,
  candidateSteps: T[],
  selectedBranches: Record<string, string>
): T[] {
  const reachableStepIndexes = getReachableStepIndexes(template, selectedBranches)
  return reachableStepIndexes === null
    ? candidateSteps
    : candidateSteps.filter(step => reachableStepIndexes?.has(step.stepIndex))
}

function getTemplateTestProgressStepIndexes(
  template: FlowTemplate | null,
  reachableStepIndexes: Set<number> | null
): number[] {
  const steps = Array.isArray(template?.steps) ? template.steps : []
  return steps
    .map((_step, index) => index)
    .filter(index => (reachableStepIndexes ? reachableStepIndexes.has(index) : true))
}

function getStepIndex(step: FlowTestStepStatus): number | null {
  if (typeof step.rootTaskIndex === 'number' && Number.isFinite(step.rootTaskIndex)) return step.rootTaskIndex

  const stepReference = String(step.rootTaskReference || '')
  if (!stepReference.startsWith('step_')) return null

  const index = Number(stepReference.replace('step_', ''))
  return Number.isFinite(index) ? index : null
}

function getLogicalStepProgress(step: FlowTestStepStatus | undefined): number {
  if (!step) return 0

  const explicitProgress = Number(step.stepProgressPercentage)
  if (Number.isFinite(explicitProgress)) {
    return Math.max(0, Math.min(100, explicitProgress))
  }

  const status = String(step.stepStatus || '').toUpperCase()
  if (status === 'COMPLETED' || status === 'SKIPPED') return 100
  if (status === 'IN_PROGRESS' || status === 'RUNNING' || status === 'SCHEDULED') return 50
  return 0
}

function calculateTestPathProgress(
  template: FlowTemplate | null,
  reachableStepIndexes: Set<number> | null,
  steps: FlowTestStepStatus[],
  status: string | null
): number | null {
  if (String(status || '').toUpperCase() === 'COMPLETED') return 100

  const expectedStepIndexes = getTemplateTestProgressStepIndexes(template, reachableStepIndexes)
  if (expectedStepIndexes.length === 0) return null

  const liveStepsByIndex = new Map<number, FlowTestStepStatus>()
  steps.forEach(step => {
    const index = getStepIndex(step)
    if (index === null) return
    liveStepsByIndex.set(index, step)
  })

  const totalProgress = expectedStepIndexes.reduce(
    (sum, stepIndex) => sum + getLogicalStepProgress(liveStepsByIndex.get(stepIndex)),
    0
  )

  return Math.round(totalProgress / expectedStepIndexes.length)
}

function getStepIndexFromReference(stepReference: unknown): number | undefined {
  const match = String(stepReference || '').match(/^step_(\d+)$/)
  if (!match) return undefined
  const index = Number(match[1])
  return Number.isFinite(index) ? index : undefined
}

function buildInteractiveSessionStepSnapshot(session: InteractiveFlowTestSession): FlowTestStepStatus[] {
  const steps = new Map<string, FlowTestStepStatus>()

  for (const completedTask of session.completedTasks || []) {
    const stepReference = String(completedTask.stepReference || '').trim()
    if (!stepReference) continue
    const stepIndex = getStepIndexFromReference(stepReference)
    steps.set(stepReference, {
      rootTaskReference: stepReference,
      rootTaskIndex: stepIndex,
      rootTaskTitle: completedTask.stepTitle || stepReference,
      stepStatus: 'COMPLETED',
      stepProgressPercentage: 100
    })
  }

  const pause = session.pause
  if (pause?.type === 'TASK' || pause?.type === 'AGENT') {
    const stepReference = String(pause.stepReference || '').trim()
    if (stepReference) {
      const stepIndex = typeof pause.stepIndex === 'number' ? pause.stepIndex : getStepIndexFromReference(stepReference)
      steps.set(stepReference, {
        rootTaskReference: stepReference,
        rootTaskIndex: stepIndex,
        rootTaskTitle: pause.stepTitle || stepReference,
        stepType: pause.type === 'AGENT' ? 'AGENT' : 'TASK',
        stepStatus: 'IN_PROGRESS',
        stepProgressPercentage: 50,
        assignmentMode: pause.assignmentMode,
        awaitingInput: true
      })
    }
  }

  return Array.from(steps.values()).sort((a, b) => (a.rootTaskIndex ?? 0) - (b.rootTaskIndex ?? 0))
}

function markPendingOutputSteps(
  steps: FlowTestStepStatus[],
  pendingOutputStepReferences: Set<string>
): FlowTestStepStatus[] {
  if (pendingOutputStepReferences.size === 0) return steps
  return steps.map(step => {
    const stepReference = String(step.rootTaskReference || '').trim()
    if (!pendingOutputStepReferences.has(stepReference)) return step
    return {
      ...step,
      stepStatus: 'IN_PROGRESS',
      stepProgressPercentage: Math.max(Number(step.stepProgressPercentage || 0), 75),
      awaitingOutput: true
    }
  })
}

function isEmptyLaunchValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

function getPreviewInputValues(inputs: any[], values: Record<string, unknown>): Record<string, unknown> {
  return inputs.reduce<Record<string, unknown>>((acc, input, index) => {
    const fieldName = input.name || `input_${index}`
    const currentValue = values[fieldName]
    acc[fieldName] =
      input.required === true && isEmptyLaunchValue(currentValue) ? getDefaultTestInputValue(input) : currentValue
    return acc
  }, {})
}

// Extract the set of available/allowed values for a form field regardless of
// how the schema expresses them. Different builders/flows store them in
// `options`, JSON-schema `enum`, `values`, or `allowedValues`; some only list
// them in the field's help text (e.g. "passed | failed | partial"). Returns the
// normalized value strings, or [] when the field is genuinely free-form.
function getFieldAllowedValues(field: any): string[] {
  const structuredSource =
    (Array.isArray(field?.options) && field.options) ||
    (Array.isArray(field?.enum) && field.enum) ||
    (Array.isArray(field?.values) && field.values) ||
    (Array.isArray(field?.allowedValues) && field.allowedValues) ||
    (Array.isArray(field?.schema?.enum) && field.schema.enum) ||
    null
  if (structuredSource) {
    return structuredSource.map((opt: any) => normalizeOption(opt).value).filter((value: string) => value !== '')
  }

  // Fallback: a help text / description that enumerates the allowed values with
  // space-padded pipe (or slash) separators, e.g. "passed | failed | partial".
  // The values may be preceded by prose (e.g. "Allowed: passed | failed | partial"),
  // so we extract the trailing run of separated tokens rather than requiring the
  // whole description to be the value list. Spaced separators avoid false matches
  // on things like "dd/mm/yyyy".
  const description: string = typeof field?.description === 'string' ? field.description.trim() : ''
  if (description) {
    const match = description.match(/([\p{L}\p{N}][\p{L}\p{N}_-]*(?:\s+[|/]\s+[\p{L}\p{N}][\p{L}\p{N}_-]*)+)\s*$/u)
    if (match) {
      const parts = match[1]
        .split(/\s*[|/]\s*/)
        .map((part: string) => part.trim())
        .filter(Boolean)
      if (parts.length >= 2) return parts
    }
  }
  return []
}

function getDefaultTestInputValue(input: any): unknown {
  const inputType = String(input?.type || '').toUpperCase()
  const allowedValues = getFieldAllowedValues(input)
  const fieldText = `${input?.name || ''} ${input?.label || ''}`.toLowerCase()

  if (inputType === InputType.NUMBER) return 1
  if (inputType === InputType.DATE) return new Date().toISOString().slice(0, 10)
  if (inputType === InputType.DATETIME) return new Date().toISOString().slice(0, 16)
  if (inputType === InputType.CHECKBOX) return allowedValues.length > 0 ? [allowedValues[0]] : true
  if (inputType === InputType.MULTISELECT) return allowedValues.length > 0 ? [allowedValues[0]] : []
  if (inputType === InputType.SELECT || inputType === InputType.RADIO) return allowedValues[0]
  // When a free-text field still declares a set of available/allowed values,
  // default to the first one so the input is pre-populated with a valid value.
  if (allowedValues.length > 0) return allowedValues[0]
  if (fieldText.includes('mail')) return 'test@example.com'
  return 'test'
}

// Pre-populate the test start form for fields that declare a set of
// available/allowed values, defaulting each to its first value so the input
// shows a valid value instead of being blank. Fields without available values
// are left untouched (the user types them in manually).
function buildStartFormInitialValues(inputs: any[]): Record<string, unknown> {
  if (!Array.isArray(inputs)) return {}
  return inputs.reduce<Record<string, unknown>>((acc, input, index) => {
    if (getFieldAllowedValues(input).length === 0) return acc
    const fieldName = input?.name || `input_${index}`
    const value = getDefaultTestInputValue(input)
    if (value !== undefined) acc[fieldName] = value
    return acc
  }, {})
}

function coerceAllowedValueDefaults(
  fields: Array<{ name: string; options?: unknown[]; description?: string; type?: string }>,
  values: Record<string, unknown>
): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>(
    (acc, field) => {
      const allowedValues = getFieldAllowedValues(field)
      const currentValue = acc[field.name]
      if (
        allowedValues.length > 0 &&
        (isEmptyLaunchValue(currentValue) || !allowedValues.includes(String(currentValue)))
      ) {
        acc[field.name] = allowedValues[0]
      }
      return acc
    },
    { ...values }
  )
}

type FlowLaunchResult = {
  workflowId: string
  workflowName?: string
  validationWarnings?: string[]
  testRun?: {
    enabled: boolean
    status: string
    completedTasks: Array<{ taskId: string; stepReference?: string; stepTitle?: string }>
    timedOut: boolean
    warnings: string[]
  }
  interactiveTest?: InteractiveFlowTestSession | null
}

type TestFlowStatus = {
  isLoading: boolean
  error: string | null
  status: string | null
  progress: number | null
  timedOut: boolean
  pendingSteps: string[]
  liveSteps: FlowTestStepStatus[]
  summaryData: Array<{ label: string; value: unknown }>
  stepResults: Array<{
    stepReference?: string
    stepTitle: string
    fields: Array<{ label: string; value: unknown }>
  }>
}

type FlowLiveEvent = {
  type?: string
  workflowId?: string
  payload?: {
    session?: InteractiveFlowTestSession
  }
}

async function subscribeToFlowLiveUpdates({
  workflowId,
  accessToken,
  signal,
  onEvent
}: {
  workflowId: string
  accessToken: string
  signal: AbortSignal
  onEvent: (event: FlowLiveEvent) => void
}): Promise<void> {
  const apiBase = CUSTOM_FLOW_ENGINE_API_URL
  const response = await fetch(`${apiBase}/flows/${encodeURIComponent(workflowId)}/events`, {
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${accessToken}`
    },
    signal
  })

  if (!response.ok || !response.body) {
    throw new Error(`Flow live updates failed with status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = 'message'
  let dataLines: string[] = []

  const dispatchEvent = () => {
    if (dataLines.length === 0) {
      eventName = 'message'
      return
    }

    const dataText = dataLines.join('\n')
    dataLines = []
    const currentEventName = eventName
    eventName = 'message'

    try {
      const data = JSON.parse(dataText) as FlowLiveEvent
      onEvent({ ...data, type: data.type || currentEventName })
    } catch {
      // Ignore malformed SSE frames; polling still keeps the test UI current.
    }
  }

  const processLine = (rawLine: string) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line === '') {
      dispatchEvent()
      return
    }
    if (line.startsWith(':')) return

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') eventName = value
    else if (field === 'data') dataLines.push(value)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let lineBreakIndex = buffer.indexOf('\n')
    while (lineBreakIndex >= 0) {
      processLine(buffer.slice(0, lineBreakIndex))
      buffer = buffer.slice(lineBreakIndex + 1)
      lineBreakIndex = buffer.indexOf('\n')
    }
  }

  if (buffer) processLine(buffer)
  dispatchEvent()
}

function FlowLaunchSection({
  title,
  description,
  children,
  defaultOpen = true,
  className = '',
  contentClassName = 'gba:p-4 gba:space-y-4',
  'data-testid': testId
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  contentClassName?: string
  'data-testid'?: string
}) {
  return (
    <Card className={`gba:bg-background gba:border gba:border-border ${className}`} data-testid={testId}>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="gba:flex gba:w-full gba:items-start gba:justify-between gba:gap-3 gba:px-4 gba:py-3 gba:text-left hover:gba:bg-muted/40 [&[data-state=open]>svg]:gba:rotate-180">
          <span>
            <span className="gba:block gba:text-sm gba:font-medium">{title}</span>
            {description ? (
              <span className="gba:block gba:text-xs gba:text-muted-foreground">{description}</span>
            ) : null}
          </span>
          <ChevronDown className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className={contentClassName}>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function DraggableTestDialogContent({
  title,
  description,
  children,
  footer,
  onClose,
  width = 'min(42rem, calc(100vw - 2rem))',
  contentClassName = '',
  bodyClassName = 'gba:space-y-6',
  'data-testid': testId
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose?: () => void
  width?: string
  contentClassName?: string
  bodyClassName?: string
  'data-testid'?: string
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    const start = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setOffset({
        x: start.offsetX + moveEvent.clientX - start.x,
        y: start.offsetY + moveEvent.clientY - start.y
      })
    }

    const stopDrag = () => {
      document.body.style.userSelect = previousUserSelect
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', stopDrag)
      document.removeEventListener('pointercancel', stopDrag)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', stopDrag)
    document.addEventListener('pointercancel', stopDrag)
  }

  const content = (
    <>
      <div
        className="gba:pointer-events-none gba:fixed gba:-inset-px gba:bg-slate-900/45"
        style={{ zIndex: 55 }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={testId ? `${testId}-title` : undefined}
        className={`gba:fixed gba:flex gba:flex-col gba:gap-0 gba:overflow-hidden gba:rounded-lg gba:border gba:bg-background gba:p-0 gba:shadow-lg ${contentClassName}`}
        style={{
          left: `calc(50% + ${offset.x}px)`,
          top: `calc(50% + ${offset.y}px)`,
          transform: 'translate(-50%, -50%)',
          zIndex: 60,
          pointerEvents: 'auto',
          width,
          maxWidth: width,
          maxHeight: 'calc(100dvh - 2rem)',
          overflow: 'hidden'
        }}
        data-testid={testId}
      >
        <DialogHeader
          className="gba:relative gba:shrink-0 gba:cursor-move gba:select-none gba:border-b gba:px-5 gba:py-4 gba:pr-12"
          onPointerDown={handleDragStart}
        >
          <DialogTitle id={testId ? `${testId}-title` : undefined}>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          {onClose ? (
            <button
              type="button"
              className="gba:absolute gba:right-4 gba:top-4 gba:rounded gba:text-muted-foreground gba:hover:text-foreground"
              onClick={onClose}
              onPointerDown={event => event.stopPropagation()}
              aria-label="Close"
            >
              ×
            </button>
          ) : null}
        </DialogHeader>
        <div className={`gba:min-h-0 gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-5 ${bodyClassName}`}>
          {children}
        </div>
        {footer ? (
          <DialogFooter className="gba:shrink-0 gba:border-t gba:bg-background gba:px-5 gba:py-4">
            {footer}
          </DialogFooter>
        ) : null}
      </div>
    </>
  )

  return typeof document === 'undefined' ? content : createPortal(content, document.body)
}

/**
 * Hosts one focused piece of the test interaction UI (e.g. the start/trigger
 * form, branch selection, agent responses) as its own layered dialog overlay so
 * the test sheet's left panel can stay focused on scope + live results. In launch
 * mode the content renders inline.
 *
 * Note: test mode uses its own sheet-sized overlay. Keep this dialog explicitly
 * centered so sheet positioning styles cannot make it behave like a side panel.
 */
function FlowTestDialog({
  asOverlay,
  open,
  onOpenChange,
  title,
  description,
  footer,
  contentClassName = 'gba:!max-w-2xl',
  children,
  'data-testid': testId
}: {
  asOverlay: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  footer?: React.ReactNode
  contentClassName?: string
  children: React.ReactNode
  'data-testid'?: string
}) {
  if (!asOverlay) return <>{children}</>

  if (!open) return null

  return (
    <DraggableTestDialogContent
      title={title}
      description={description}
      footer={footer}
      onClose={() => onOpenChange(false)}
      contentClassName={contentClassName}
      data-testid={testId}
    >
      {children}
    </DraggableTestDialogContent>
  )
}

const TERMINAL_FLOW_STATUSES = new Set(['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT', 'CANCELED', 'CANCELLED'])
const TEST_FLOW_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  TERMINATED: 'Terminated',
  TIMED_OUT: 'Timed out',
  CANCELED: 'Canceled',
  CANCELLED: 'Canceled',
  IN_PROGRESS: 'In progress',
  RUNNING: 'Running',
  SCHEDULED: 'Scheduled',
  PAUSED: 'Paused',
  STARTING: 'Starting'
}
const TEST_SESSION_FALLBACK_POLL_INTERVAL_MS = 15_000
const TEST_RESULT_POLL_INTERVAL_MS = 5_000
const TEST_RESULT_TIMEOUT_MS = 180_000
const DEFAULT_SHEET_WIDTH = 576
const MIN_SHEET_WIDTH = 420
const MAX_SHEET_WIDTH = 960

function isTerminalFlowStatus(status: string | null | undefined): boolean {
  return TERMINAL_FLOW_STATUSES.has(String(status || '').toUpperCase())
}

function formatTestFlowStatus(status: string | null | undefined): string {
  const normalizedStatus = String(status || '')
    .trim()
    .toUpperCase()
  if (!normalizedStatus) return 'Starting'
  return TEST_FLOW_STATUS_LABELS[normalizedStatus] || formatFieldLabel(normalizedStatus)
}

type UserDisplayNames = Record<string, string>

function formatSummaryValue(value: unknown, userDisplayNames: UserDisplayNames = {}, preserveUserId = false): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return preserveUserId ? value : userDisplayNames[value] || value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function getUserDisplayName(userInfo: BusinessAppContextProps['userInfo']): string | null {
  const employeeDisplayName = userInfo?.employeeDetails?.displayName?.trim()
  if (employeeDisplayName) return employeeDisplayName

  const employeeFullName = [userInfo?.employeeDetails?.firstName, userInfo?.employeeDetails?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (employeeFullName) return employeeFullName

  const fullName = [userInfo?.givenName, userInfo?.familyName].filter(Boolean).join(' ').trim()
  return fullName || userInfo?.userName || null
}

function buildUserDisplayNames(userInfo: BusinessAppContextProps['userInfo']): UserDisplayNames {
  const displayName = getUserDisplayName(userInfo)
  if (!displayName) return {}

  return [userInfo?.id, userInfo?.employeeDetails?.employeeId, userInfo?.userName]
    .filter((value): value is string => Boolean(value))
    .reduce<UserDisplayNames>((acc, userId) => {
      acc[userId] = displayName
      return acc
    }, {})
}

function shouldKeepUserIdPlain(labelOrKey: string): boolean {
  return ['userid', 'user id'].includes(
    String(labelOrKey || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  )
}

function replaceKnownUserIds(value: unknown, userDisplayNames: UserDisplayNames, parentKey = ''): unknown {
  if (shouldKeepUserIdPlain(parentKey)) return value
  if (typeof value === 'string') return userDisplayNames[value] || value
  if (Array.isArray(value)) return value.map(item => replaceKnownUserIds(item, userDisplayNames, parentKey))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        replaceKnownUserIds(entryValue, userDisplayNames, key)
      ])
    )
  }
  return value
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function deepParseJsonValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return value
  const parsedValue = parseJsonValue(value)
  if (Array.isArray(parsedValue)) return parsedValue.map(item => deepParseJsonValue(item, depth + 1))
  if (parsedValue && typeof parsedValue === 'object') {
    return Object.fromEntries(
      Object.entries(parsedValue as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        deepParseJsonValue(entryValue, depth + 1)
      ])
    )
  }
  return parsedValue
}

function isJsonFieldValue(value: unknown): boolean {
  const parsedValue = deepParseJsonValue(value)
  return Boolean(parsedValue && typeof parsedValue === 'object')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getResultRecord(value: unknown): Record<string, unknown> | null {
  const parsedValue = deepParseJsonValue(value)
  if (!isPlainObject(parsedValue)) return null
  if (isPlainObject(parsedValue.result)) return parsedValue.result
  return parsedValue
}

function hasKnownTestResultShape(record: Record<string, unknown>): boolean {
  return ['message', 'success', 'testMode', 'resultData', 'testResponse'].some(key => key in record)
}

function isPrimitiveDisplayValue(value: unknown): boolean {
  return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value)
}

function normalizeResultLabel(label: string): string {
  return String(label || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isBusinessResultField(label: string, value: unknown): boolean {
  const normalizedLabel = normalizeResultLabel(label)
  if (['form data', 'result data', 'submitted answers', 'result', 'output', 'response'].includes(normalizedLabel)) {
    return true
  }

  const record = getResultRecord(value)
  return Boolean(record && hasKnownTestResultShape(record))
}

function hasDisplayableResultValue(value: unknown): boolean {
  const parsedValue = deepParseJsonValue(value)
  if (parsedValue === null || parsedValue === undefined || parsedValue === '') return false
  if (Array.isArray(parsedValue)) return parsedValue.length > 0
  if (isPlainObject(parsedValue)) return Object.keys(parsedValue).length > 0
  return true
}

function isRunnerSubmittedStepFields(fields: Array<{ label: string; value: unknown }>): boolean {
  return fields.some(
    field =>
      normalizeResultLabel(field.label) === 'comment' &&
      typeof field.value === 'string' &&
      field.value.toLowerCase().includes('auto-completed by flow test runner')
  )
}

function formatBusinessResultLabel(label: string, isRunnerSubmitted = false): string {
  const normalizedLabel = normalizeResultLabel(label)
  if (normalizedLabel === 'form data') return isRunnerSubmitted ? 'Test input' : 'Submitted answers'
  if (normalizedLabel === 'executed by') return 'Completed by'
  return formatFieldLabel(label)
}

function splitStepResultFields(fields: Array<{ label: string; value: unknown }>): {
  businessFields: Array<{ label: string; value: unknown }>
  technicalFields: Array<{ label: string; value: unknown }>
} {
  const businessFields: Array<{ label: string; value: unknown }> = []
  const technicalFields: Array<{ label: string; value: unknown }> = []

  fields.forEach(field => {
    if (!hasDisplayableResultValue(field.value)) return
    if (isBusinessResultField(field.label, field.value)) businessFields.push(field)
    else technicalFields.push(field)
  })

  return { businessFields, technicalFields }
}

function flattenStructuredRows(
  value: unknown,
  userDisplayNames: UserDisplayNames = {},
  prefix = '',
  depth = 0
): Array<{ label: string; value: unknown }> {
  const parsedValue = deepParseJsonValue(value)
  if (!parsedValue || typeof parsedValue !== 'object' || depth > 4) {
    return prefix
      ? [{ label: formatFieldLabel(prefix), value: replaceKnownUserIds(parsedValue, userDisplayNames, prefix) }]
      : []
  }

  if (Array.isArray(parsedValue)) {
    if (parsedValue.every(isPrimitiveDisplayValue)) {
      return [
        {
          label: formatFieldLabel(prefix || 'Items'),
          value: parsedValue
            .map(item => (shouldKeepUserIdPlain(prefix) ? item : replaceKnownUserIds(item, userDisplayNames, prefix)))
            .map(item => formatSummaryValue(item, userDisplayNames, shouldKeepUserIdPlain(prefix)))
            .join(', ')
        }
      ]
    }

    return parsedValue.flatMap((entryValue, index) =>
      flattenStructuredRows(
        entryValue,
        userDisplayNames,
        prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`,
        depth + 1
      )
    )
  }

  return Object.entries(parsedValue as Record<string, unknown>).flatMap(([key, entryValue]) => {
    const label = prefix ? `${prefix} ${key}` : key
    if (isPrimitiveDisplayValue(entryValue)) {
      return [{ label: formatFieldLabel(label), value: replaceKnownUserIds(entryValue, userDisplayNames, key) }]
    }
    if (Array.isArray(entryValue) && entryValue.every(isPrimitiveDisplayValue)) {
      return [
        {
          label: formatFieldLabel(label),
          value: entryValue
            .map(item => (shouldKeepUserIdPlain(key) ? item : replaceKnownUserIds(item, userDisplayNames, key)))
            .map(item => formatSummaryValue(item, userDisplayNames, shouldKeepUserIdPlain(key)))
            .join(', ')
        }
      ]
    }
    return flattenStructuredRows(entryValue, userDisplayNames, label, depth + 1)
  })
}

function ParsedStructuredValue({
  value,
  userDisplayNames = {}
}: {
  value: unknown
  userDisplayNames?: UserDisplayNames
}) {
  const rows = flattenStructuredRows(value, userDisplayNames)
  if (rows.length === 0) {
    return <span className="gba:whitespace-pre-wrap gba:break-words">-</span>
  }

  return (
    <div className="gba:rounded gba:border gba:bg-muted/60 gba:p-3 gba:text-sm">
      <div className="gba:grid gba:grid-cols-[9rem_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2">
        {rows.map((row, index) => (
          <React.Fragment key={`${row.label}-${index}`}>
            <span className="gba:text-muted-foreground">{row.label}</span>
            <span className="gba:break-words">
              {formatSummaryValue(row.value, userDisplayNames, shouldKeepUserIdPlain(row.label))}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function HumanResultValue({ value, userDisplayNames = {} }: { value: unknown; userDisplayNames?: UserDisplayNames }) {
  const record = getResultRecord(value)
  if (!record || !hasKnownTestResultShape(record)) return null

  const message = typeof record.message === 'string' ? record.message : ''
  const resultData = isPlainObject(record.resultData) ? record.resultData : null
  const rows: Array<{ label: string; value: unknown }> = []
  const agentTestMode = typeof record.agentTestMode === 'string' ? record.agentTestMode : ''

  if (agentTestMode === 'TEST_RESPONSE') {
    rows.push({
      label: 'Agent completion',
      value: 'Configured test response was used directly.'
    })
  } else if (message.includes('did not finish in time')) {
    rows.push({
      label: 'Agent completion',
      value: 'Agent did not complete in time; configured test response was used.'
    })
  }
  if (!resultData && message) rows.push({ label: 'Message', value: message })

  return (
    <div className="gba:rounded gba:border gba:bg-muted/60 gba:p-3 gba:text-sm gba:space-y-3">
      {rows.length > 0 ? (
        <div className="gba:grid gba:grid-cols-[9rem_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2">
          {rows.map(row => (
            <React.Fragment key={row.label}>
              <span className="gba:text-muted-foreground">{row.label}</span>
              <span className="gba:break-words">{formatSummaryValue(row.value, userDisplayNames)}</span>
            </React.Fragment>
          ))}
        </div>
      ) : null}
      {resultData ? (
        <div className="gba:space-y-2">
          <div className="gba:text-xs gba:font-medium gba:text-muted-foreground">Result</div>
          <div className="gba:grid gba:grid-cols-[9rem_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2">
            {Object.entries(resultData).map(([key, entryValue]) => (
              <React.Fragment key={key}>
                <span className="gba:text-muted-foreground">{formatFieldLabel(key)}</span>
                <span className="gba:break-words">{formatSummaryValue(entryValue, userDisplayNames)}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function JsonResultValue({
  value,
  userDisplayNames = {},
  fieldLabel = ''
}: {
  value: unknown
  userDisplayNames?: UserDisplayNames
  fieldLabel?: string
}) {
  const parsedValue = deepParseJsonValue(value)
  if (!isJsonFieldValue(parsedValue)) {
    return (
      <span className="gba:whitespace-pre-wrap gba:break-words">
        {formatSummaryValue(value, userDisplayNames, shouldKeepUserIdPlain(fieldLabel))}
      </span>
    )
  }

  if (Array.isArray(parsedValue) && parsedValue.every(isPrimitiveDisplayValue)) {
    return (
      <span className="gba:whitespace-pre-wrap gba:break-words">
        {parsedValue
          .map(item =>
            shouldKeepUserIdPlain(fieldLabel) ? item : replaceKnownUserIds(item, userDisplayNames, fieldLabel)
          )
          .map(item => formatSummaryValue(item, userDisplayNames, shouldKeepUserIdPlain(fieldLabel)))
          .join(', ')}
      </span>
    )
  }

  const resultRecord = getResultRecord(parsedValue)
  if (resultRecord && hasKnownTestResultShape(resultRecord)) {
    return <HumanResultValue value={parsedValue} userDisplayNames={userDisplayNames} />
  }

  return <ParsedStructuredValue value={parsedValue} userDisplayNames={userDisplayNames} />
}

function formatEditableTestValue(value: unknown): string {
  const parsedValue = deepParseJsonValue(value)
  if (parsedValue && typeof parsedValue === 'object') return formatJson(parsedValue)
  return String(value ?? '')
}

function formatJson(value: unknown): string {
  return safeJsonStringify(value)
}

function safeJsonStringify(value: unknown): string {
  try {
    const seen = new WeakSet<object>()
    return JSON.stringify(
      value,
      (_key, item) => {
        if (typeof Window !== 'undefined' && item instanceof Window) return '[Window]'
        if (typeof Element !== 'undefined' && item instanceof Element) return `[Element ${item.tagName.toLowerCase()}]`
        if (typeof File !== 'undefined' && item instanceof File) {
          return {
            name: item.name,
            size: item.size,
            type: item.type
          }
        }
        if (item && typeof item === 'object') {
          if (seen.has(item)) return '[Circular]'
          seen.add(item)
        }
        return item
      },
      2
    )
  } catch {
    return String(value)
  }
}

function formatFieldLabel(field: string): string {
  const normalizedField = String(field || '')
    .trim()
    .replace(/[_\s-]+/g, '')
    .toLowerCase()
  if (['decisionbranch', 'branchid', 'selectedbranch'].includes(normalizedField)) return 'Selected branch'

  return String(field || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function formatSubmittedInputValue(label: string, value: unknown): unknown {
  const normalizedLabel = normalizeResultLabel(label)
  if (!normalizedLabel.includes('branch') || typeof value !== 'string') return value

  return value
    .replace(/_?branch$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase())
}

function getOutcomeFields(value: unknown): Array<{ label: string; value: unknown }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>).map(([label, fieldValue]) => {
    const displayLabel = formatFieldLabel(label)
    return {
      label: displayLabel,
      value: formatSubmittedInputValue(displayLabel, fieldValue)
    }
  })
}

function buildStepOutcome(step: FlowTestStepStatus, firstRow: any, stepReference: string): FlowTestStepOutcome | null {
  if (!firstRow || typeof firstRow !== 'object') return null
  const inputData = firstRow.inputData && typeof firstRow.inputData === 'object' ? firstRow.inputData : undefined
  const outputFormData = getPathValue(firstRow.outputData, ['result', 'formData'])
  const formData =
    firstRow.formData && typeof firstRow.formData === 'object'
      ? firstRow.formData
      : outputFormData && typeof outputFormData === 'object' && !Array.isArray(outputFormData)
        ? (outputFormData as Record<string, unknown>)
        : undefined
  const executionDetails =
    firstRow.executionDetails && typeof firstRow.executionDetails === 'object' ? firstRow.executionDetails : undefined
  const outputData =
    firstRow.outputData ??
    (executionDetails && 'resultData' in executionDetails ? executionDetails.resultData : undefined)
  const fields =
    getOutcomeFields(outputData).length > 0 ? getOutcomeFields(outputData) : getOutcomeFields(formData ?? inputData)
  if (fields.length === 0 && outputData === undefined && !executionDetails) return null

  return {
    stepReference,
    stepTitle: String(step.rootTaskTitle || firstRow.stepTitle || stepReference),
    status: String(step.stepStatus || ''),
    timestamp: typeof firstRow.timestamp === 'string' ? firstRow.timestamp : undefined,
    taskType: typeof firstRow.taskType === 'string' ? firstRow.taskType : undefined,
    inputData,
    formData,
    outputData,
    executionDetails,
    fields
  }
}

function applyUserDisplayNamesToOutcome(
  outcome: FlowTestStepOutcome,
  userDisplayNames: UserDisplayNames
): FlowTestStepOutcome {
  if (Object.keys(userDisplayNames).length === 0) return outcome

  return {
    ...outcome,
    fields: outcome.fields.map(field => ({
      ...field,
      value: replaceKnownUserIds(field.value, userDisplayNames, field.label)
    })),
    inputData: replaceKnownUserIds(outcome.inputData, userDisplayNames) as Record<string, unknown> | undefined,
    formData: replaceKnownUserIds(outcome.formData, userDisplayNames) as Record<string, unknown> | undefined,
    outputData: replaceKnownUserIds(outcome.outputData, userDisplayNames),
    executionDetails: replaceKnownUserIds(outcome.executionDetails, userDisplayNames) as
      | Record<string, unknown>
      | undefined
  }
}

function getPathValue(value: unknown, path: string[]): unknown {
  let current = value
  for (const part of path) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function getTemplateStepReference(template: FlowTemplate | null, stepReference: string): string | undefined {
  const match = stepReference.match(/^step_(\d+)$/)
  if (!match) return undefined
  const stepIndex = Number(match[1])
  const step = Array.isArray((template as any)?.steps) ? (template as any).steps[stepIndex] : null
  return typeof step?.reference === 'string' ? step.reference : typeof step?.id === 'string' ? step.id : undefined
}

function getOutcomeValueFromPath(outcome: FlowTestStepOutcome, path: string[]): unknown {
  if (path.length === 0) return undefined
  const [firstPart, ...remainingPath] = path
  if (firstPart === 'formData') return getPathValue(outcome.formData, remainingPath)
  if (firstPart === 'inputData') return getPathValue(outcome.inputData, remainingPath)
  if (firstPart === 'outputData') return getPathValue(outcome.outputData, remainingPath)

  const candidates = [
    outcome.formData,
    outcome.inputData,
    getPathValue(outcome.outputData, ['result', 'resultData']),
    getPathValue(outcome.outputData, ['result']),
    outcome.outputData,
    outcome.executionDetails
  ]
  for (const candidate of candidates) {
    const directValue = getPathValue(candidate, path)
    if (directValue !== undefined) return directValue
  }
  return undefined
}

function getOutcomePathValue(
  outcome: FlowTestStepOutcome,
  pathExpression: string,
  template: FlowTemplate | null
): unknown {
  const cleanPath = pathExpression
    .trim()
    .replace(/^\{\{\s*/, '')
    .replace(/\s*\}\}$/, '')
    .replace(/^\$steps\./, '')
  const match = cleanPath.match(/^(step_\d+)\.(.+)$/)
  if (!match) return undefined

  const [, stepReference, restPath] = match
  const templateStepReference = getTemplateStepReference(template, stepReference)
  if (outcome.stepReference !== stepReference && outcome.stepReference !== templateStepReference) return undefined

  const path = restPath.split('.').filter(Boolean)
  return getOutcomeValueFromPath(outcome, path)
}

function getAnyOutcomePathValue(outcomes: Record<string, FlowTestStepOutcome>, pathExpression: string): unknown {
  const cleanPath = pathExpression
    .trim()
    .replace(/^\{\{\s*/, '')
    .replace(/\s*\}\}$/, '')
    .replace(/^\$steps\./, '')
  const match = cleanPath.match(/^(?:step_\d+\.)?(.+)$/)
  const restPath = match?.[1] ?? cleanPath
  const path = restPath.split('.').filter(Boolean)
  return Object.values(outcomes)
    .map(outcome => getOutcomeValueFromPath(outcome, path))
    .find(value => value !== undefined)
}

function resolveSummaryExpression(
  template: FlowTemplate | null,
  outcomes: Record<string, FlowTestStepOutcome>,
  expression: string
): unknown {
  const trimmedExpression = expression.trim()
  if (!trimmedExpression) return null
  const expressionMatches = Array.from(trimmedExpression.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g))
  const resolvePath = (pathExpression: string) =>
    Object.values(outcomes)
      .map(outcome => getOutcomePathValue(outcome, pathExpression, template))
      .find(value => value !== undefined) ?? getAnyOutcomePathValue(outcomes, pathExpression)

  if (expressionMatches.length === 0) return resolvePath(trimmedExpression)

  if (expressionMatches.length === 1 && expressionMatches[0][0].trim() === trimmedExpression) {
    return resolvePath(expressionMatches[0][1])
  }

  let resolvedText = trimmedExpression
  for (const match of expressionMatches) {
    const resolvedValue = resolvePath(match[1])
    resolvedText = resolvedText.replace(match[0], formatSummaryValue(resolvedValue))
  }
  return resolvedText
}

function buildSummaryDataFromTemplate(
  template: FlowTemplate | null,
  outcomes: Record<string, FlowTestStepOutcome>
): Array<{ label: string; value: unknown }> {
  const summaryFields = Array.isArray((template as any)?.summaryFields)
    ? ((template as any).summaryFields as any[])
    : []
  if (summaryFields.length === 0) return []

  return summaryFields
    .map((field, index) => {
      const label = String(field?.label || `Summary ${index + 1}`)
      const expression = String(field?.value || '').trim()
      const resolvedValue = resolveSummaryExpression(template, outcomes, expression)
      return { label, value: resolvedValue ?? null }
    })
    .filter(item => item.label.trim())
}

function buildSummaryDataFromSingleStepResult(
  outcomes: Record<string, FlowTestStepOutcome>,
  selectedStepReference: string | null
): Array<{ label: string; value: unknown }> {
  const outcome = (selectedStepReference ? outcomes[selectedStepReference] : undefined) ?? Object.values(outcomes)[0]
  if (!outcome) return []

  const resultData =
    getPathValue(outcome.outputData, ['result', 'resultData']) ??
    getPathValue(outcome.outputData, ['result', 'formData']) ??
    outcome.executionDetails?.resultData ??
    outcome.formData

  const fields = getOutcomeFields(resultData)
  if (fields.length > 0) return fields
  return resultData === undefined ? [] : [{ label: 'Result', value: resultData }]
}

function isEmptySummaryValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || value === '-'
}

function mergeSummaryDataWithFallback(
  summaryData: Array<{ label: string; value: unknown }>,
  fallbackSummaryData: Array<{ label: string; value: unknown }>
): Array<{ label: string; value: unknown }> {
  if (summaryData.length === 0) return fallbackSummaryData
  const fallbackByLabel = new Map(fallbackSummaryData.map(item => [item.label, item.value] as const))
  return summaryData.map(item => {
    const fallbackValue = fallbackByLabel.get(item.label)
    if (isEmptySummaryValue(item.value) && !isEmptySummaryValue(fallbackValue)) {
      return { ...item, value: fallbackValue }
    }
    return item
  })
}

export interface FlowLaunchSheetProps extends Partial<BusinessAppContextProps> {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string | null
  templateDefinition?: Omit<FlowTemplate, 'id'> | null
  mode?: 'launch' | 'test'
  initialSingleStepKey?: string | null
  singleStepSelectionRequest?: { stepKey: string | null; requestId: number } | null
  onTestScopeChange?: (scope: TestScope) => void
  onSingleStepSelectionChange?: (stepKey: string | null) => void
  onTestExecutionSnapshot?: (snapshot: FlowTestExecutionSnapshot | null) => void
  testPreview?: React.ReactNode
  'data-testid'?: string
}

export const FlowLaunchSheet: React.FC<FlowLaunchSheetProps> = ({
  open,
  onOpenChange,
  accessToken,
  userInfo,
  templateId,
  templateDefinition,
  mode = 'launch',
  initialSingleStepKey = null,
  singleStepSelectionRequest = null,
  onTestScopeChange,
  onSingleStepSelectionChange,
  onTestExecutionSnapshot,
  testPreview,
  'data-testid': testId = 'flow-launch-sheet'
}) => {
  const form = useForm<Record<string, any>>({ defaultValues: {} })
  const [template, setTemplate] = useState<FlowTemplate | null>(null)
  const [assignments, setAssignments] = useState<RuntimeAssignment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [isStoppingTest, setIsStoppingTest] = useState(false)
  const [isContinuingInteractiveTest, setIsContinuingInteractiveTest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launchResult, setLaunchResult] = useState<FlowLaunchResult | null>(null)
  const [interactiveTestSession, setInteractiveTestSession] = useState<InteractiveFlowTestSession | null>(null)
  const [interactivePauseValues, setInteractivePauseValues] = useState<Record<string, unknown>>({})
  const [interactivePauseAssignment, setInteractivePauseAssignment] = useState<TaskAssignment | null>(null)
  const [agentTestResponses, setAgentTestResponses] = useState<Record<string, Record<string, unknown>>>({})
  const [agentTestModes, setAgentTestModes] = useState<Record<string, AgentTestMode>>({})
  const [taskTestResponses, setTaskTestResponses] = useState<Record<string, Record<string, unknown>>>({})
  const [selectedBranchTests, setSelectedBranchTests] = useState<Record<string, string>>({})
  const [testScope, setTestScope] = useState<TestScope>('flow')
  const [selectedSingleStepKey, setSelectedSingleStepKey] = useState<string | null>(null)
  const [sheetWidth, setSheetWidth] = useState(DEFAULT_SHEET_WIDTH)
  const [copiedOutput, setCopiedOutput] = useState<string | null>(null)
  const [startFormOpen, setStartFormOpen] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [agentPauseOpen, setAgentPauseOpen] = useState(false)
  const [dismissedPauseDialogKey, setDismissedPauseDialogKey] = useState<string | null>(null)
  const [dismissedAgentDialogKey, setDismissedAgentDialogKey] = useState<string | null>(null)
  const [agentPauseResponse, setAgentPauseResponse] = useState<Record<string, unknown>>({})
  const [agentPauseMode, setAgentPauseMode] = useState<AgentTestMode>('TEST_RESPONSE')
  const [testStatusRefreshTick, setTestStatusRefreshTick] = useState(0)
  const [testFlowStatus, setTestFlowStatus] = useState<TestFlowStatus>({
    isLoading: false,
    error: null,
    status: null,
    progress: null,
    timedOut: false,
    pendingSteps: [],
    liveSteps: [],
    summaryData: [],
    stepResults: []
  })
  const resultRef = React.useRef<HTMLDivElement | null>(null)
  const sheetContentRef = React.useRef<HTMLDivElement | null>(null)
  const bodyScrollRef = React.useRef<HTMLDivElement | null>(null)
  const testInputStateKeyRef = React.useRef('')
  const testInputStateWorkflowIdRef = React.useRef<string | null>(null)
  const testRunInvalidatedRef = React.useRef(false)
  const stepOutcomeCacheRef = React.useRef<Record<string, FlowTestStepOutcome>>({})
  const pendingOutputStepReferencesRef = React.useRef<Set<string>>(new Set())
  const {
    uploadFormFiles,
    isUploading: isUploadingFiles,
    clearError: clearUploadError
  } = useFlowLaunchFileUpload({
    accessToken
  })

  const launchFormContext = useMemo(() => resolveLaunchFormContext(template), [template])
  const startInputs = launchFormContext.inputs
  const watchedInputValues = form.watch()
  const startFormTitle = launchFormContext.mode === 'first-task-form' ? 'First task form' : 'Start form'
  const isTestMode = mode === 'test'
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || userInfo?.userName || 'unknown'
  const userDisplayNames = useMemo(() => buildUserDisplayNames(userInfo), [userInfo])
  const launchButtonLabel = isTestMode ? 'Run test' : 'Launch'
  const launchingLabel = isTestMode ? 'Testing' : 'Launching'
  const successTitle = isTestMode ? 'Flow test started' : 'Flow launched'
  const failureTitle = isTestMode ? 'Flow test failed' : 'Launch failed'
  const startFormEmptyText =
    launchFormContext.mode === 'first-task-form'
      ? 'This flow has no launcher form and the first task does not expose a supported form fallback.'
      : 'This flow has no start form fields.'
  const testableStepOptions = useMemo(
    () => (isTestMode ? getTestableStepOptions(template) : []),
    [isTestMode, template]
  )
  const selectedSingleStepOption = useMemo(
    () =>
      testableStepOptions.find(
        step => step.stepKey === selectedSingleStepKey || step.aliases.includes(String(selectedSingleStepKey || ''))
      ) ?? null,
    [selectedSingleStepKey, testableStepOptions]
  )
  const selectedSingleStepCanonicalKey = selectedSingleStepOption?.stepKey ?? null
  const agentTestSteps = useMemo(() => (isTestMode ? getAgentTestSteps(template) : []), [isTestMode, template])
  const taskTestSteps = useMemo(() => (isTestMode ? getTaskTestSteps(template) : []), [isTestMode, template])
  const isSingleStepTest = isTestMode && testScope === 'single-step' && Boolean(selectedSingleStepKey)
  const reachableStepIndexes = useMemo(() => {
    if (!isTestMode) return null
    if (isSingleStepTest && selectedSingleStepOption) {
      return getPrerequisiteStepIndexes(template, selectedSingleStepOption.stepIndex)
    }
    return getReachableStepIndexes(template, selectedBranchTests)
  }, [isSingleStepTest, isTestMode, selectedBranchTests, selectedSingleStepOption, template])
  const visibleAgentTestSteps = useMemo(
    () =>
      isTestMode && reachableStepIndexes
        ? agentTestSteps.filter(step => reachableStepIndexes.has(step.stepIndex))
        : isTestMode
          ? getReachableTestSteps(template, agentTestSteps, selectedBranchTests)
          : agentTestSteps,
    [agentTestSteps, isTestMode, reachableStepIndexes, selectedBranchTests, template]
  )
  const visibleTaskTestSteps = useMemo(() => {
    const reachableSteps =
      isTestMode && reachableStepIndexes
        ? taskTestSteps.filter(step => reachableStepIndexes.has(step.stepIndex))
        : isTestMode
          ? getReachableTestSteps(template, taskTestSteps, selectedBranchTests)
          : taskTestSteps
    if (launchFormContext.mode !== 'first-task-form' || typeof launchFormContext.fallbackStepIndex !== 'number') {
      return reachableSteps
    }
    return reachableSteps.filter(step => step.stepIndex !== launchFormContext.fallbackStepIndex)
  }, [
    isTestMode,
    launchFormContext.fallbackStepIndex,
    launchFormContext.mode,
    reachableStepIndexes,
    selectedBranchTests,
    taskTestSteps,
    template
  ])
  const prerequisiteStepLabels = useMemo(() => {
    if (!isSingleStepTest || !selectedSingleStepOption || !reachableStepIndexes) return []
    return testableStepOptions
      .filter(step => step.stepIndex !== selectedSingleStepOption.stepIndex && reachableStepIndexes.has(step.stepIndex))
      .sort((a, b) => a.stepIndex - b.stepIndex)
      .map(step => step.title)
  }, [isSingleStepTest, reachableStepIndexes, selectedSingleStepOption, testableStepOptions])
  const testInputStateKey = useMemo(
    () =>
      safeJsonStringify({
        startInputs: watchedInputValues,
        testScope,
        selectedSingleStepKey,
        branches: launchResult ? undefined : selectedBranchTests,
        agentModes: agentTestModes,
        agentResponses: agentTestResponses,
        taskResponses: taskTestResponses,
        assignments: assignments.map(assignment => ({
          stepIndex: assignment.stepIndex,
          targets: assignment.targets,
          assignmentMode: assignment.assignmentMode
        }))
      }),
    [
      agentTestModes,
      agentTestResponses,
      assignments,
      launchResult,
      selectedBranchTests,
      selectedSingleStepKey,
      taskTestResponses,
      testScope,
      watchedInputValues
    ]
  )

  useEffect(() => {
    if (!isTestMode || open) return
    onTestExecutionSnapshot?.(null)
    setLaunchResult(null)
    setInteractiveTestSession(null)
    setInteractivePauseValues({})
    setTestFlowStatus({
      isLoading: false,
      error: null,
      status: null,
      progress: null,
      timedOut: false,
      pendingSteps: [],
      liveSteps: [],
      summaryData: [],
      stepResults: []
    })
  }, [isTestMode, onTestExecutionSnapshot, open])

  useEffect(() => {
    if (!isTestMode) return
    onTestScopeChange?.(testScope)
  }, [isTestMode, onTestScopeChange, testScope])

  useEffect(() => {
    if (!isTestMode) return
    onSingleStepSelectionChange?.(open && testScope === 'single-step' ? selectedSingleStepCanonicalKey : null)
  }, [isTestMode, onSingleStepSelectionChange, open, selectedSingleStepCanonicalKey, testScope])

  const interactivePauseType = interactiveTestSession?.pause?.type
  const interactivePauseStepReference = interactiveTestSession?.pause?.stepReference
  const runtimePauseDialogKey =
    interactivePauseType && interactivePauseStepReference
      ? `${interactivePauseType}:${interactivePauseStepReference}`
      : null
  // Auto-open the relevant runtime dialog whenever the run pauses. Keying on the
  // pause type + step reference means a new task/agent step re-opens its dialog,
  // while a same-step poll refresh does not spuriously re-open after the user
  // dismisses it.
  useEffect(() => {
    setPauseOpen(isTestMode && interactivePauseType === 'TASK' && runtimePauseDialogKey !== dismissedPauseDialogKey)
    setAgentPauseOpen(
      isTestMode && interactivePauseType === 'AGENT' && runtimePauseDialogKey !== dismissedAgentDialogKey
    )
  }, [dismissedAgentDialogKey, dismissedPauseDialogKey, interactivePauseType, isTestMode, runtimePauseDialogKey])

  useEffect(() => {
    if (open) return
    setStartFormOpen(false)
    setPauseOpen(false)
    setAgentPauseOpen(false)
  }, [open])

  // Reset any runtime assignment override whenever the run pauses on a different
  // task, so a previous task's override never carries over to the next one.
  const interactivePauseTaskId = interactiveTestSession?.pause?.taskId
  useEffect(() => {
    setInteractivePauseAssignment(null)
  }, [interactivePauseTaskId])

  const hasStartInputs = startInputs.length > 0
  // The agent step definition (fields + defaults) for the agent the run is
  // currently paused on, matched by step reference.
  const agentPauseStep = useMemo(() => {
    if (interactivePauseType !== 'AGENT' || !interactivePauseStepReference) return null
    return (
      visibleAgentTestSteps.find(step => step.stepKey === interactivePauseStepReference) ??
      agentTestSteps.find(step => step.stepKey === interactivePauseStepReference) ??
      null
    )
  }, [agentTestSteps, interactivePauseStepReference, interactivePauseType, visibleAgentTestSteps])

  // Prefill the runtime agent response/mode when the run pauses on a new agent
  // step. Keyed on the step reference so user edits are not overwritten by polls.
  useEffect(() => {
    if (interactivePauseType !== 'AGENT' || !interactivePauseStepReference) return
    const defaults = agentTestResponses[interactivePauseStepReference] ?? agentPauseStep?.response ?? {}
    setAgentPauseResponse(
      agentPauseStep ? coerceAllowedValueDefaults(agentPauseStep.fields, defaults) : { ...defaults }
    )
    const mode = interactiveTestSession?.pause?.agentMode
    setAgentPauseMode(
      mode === 'TEST_RESPONSE' || mode === 'REAL_WITH_TEST_FALLBACK' || mode === 'REAL_ONLY' ? mode : 'TEST_RESPONSE'
    )
  }, [interactivePauseType, interactivePauseStepReference])

  useEffect(() => {
    if (!isTestMode || testScope !== 'single-step') return
    if (testableStepOptions.length === 0) {
      if (selectedSingleStepKey !== null) setSelectedSingleStepKey(null)
      return
    }
    const initialOption = initialSingleStepKey
      ? testableStepOptions.find(
          step => step.stepKey === initialSingleStepKey || step.aliases.includes(initialSingleStepKey)
        )
      : null
    if (
      !selectedSingleStepKey ||
      !testableStepOptions.some(
        step => step.stepKey === selectedSingleStepKey || step.aliases.includes(selectedSingleStepKey)
      )
    ) {
      setSelectedSingleStepKey(initialOption?.stepKey ?? testableStepOptions[0]?.stepKey ?? null)
    }
  }, [initialSingleStepKey, isTestMode, selectedSingleStepKey, testScope, testableStepOptions])

  useEffect(() => {
    if (!isTestMode || !open || !initialSingleStepKey) return
    const initialOption = testableStepOptions.find(
      step => step.stepKey === initialSingleStepKey || step.aliases.includes(initialSingleStepKey)
    )
    if (!initialOption) return
    setTestScope('single-step')
    setSelectedSingleStepKey(current =>
      current === initialOption.stepKey || initialOption.aliases.includes(String(current || ''))
        ? current
        : initialOption.stepKey
    )
  }, [initialSingleStepKey, isTestMode, open, testableStepOptions])

  useEffect(() => {
    if (!isTestMode || !open || testScope !== 'single-step') return
    const requestedStepKey = singleStepSelectionRequest?.stepKey
    if (!requestedStepKey) return
    const requestedOption = testableStepOptions.find(
      step => step.stepKey === requestedStepKey || step.aliases.includes(requestedStepKey)
    )
    if (!requestedOption) return
    setSelectedSingleStepKey(current =>
      current === requestedOption.stepKey || requestedOption.aliases.includes(String(current || ''))
        ? current
        : requestedOption.stepKey
    )
  }, [isTestMode, open, singleStepSelectionRequest, testScope, testableStepOptions])

  useEffect(() => {
    if (!isTestMode || !open) {
      testInputStateKeyRef.current = ''
      testInputStateWorkflowIdRef.current = null
      testRunInvalidatedRef.current = false
      return
    }

    if (!launchResult) {
      testInputStateKeyRef.current = testInputStateKey
      testInputStateWorkflowIdRef.current = null
      testRunInvalidatedRef.current = false
      return
    }

    if (testInputStateWorkflowIdRef.current !== launchResult.workflowId) {
      testInputStateKeyRef.current = testInputStateKey
      testInputStateWorkflowIdRef.current = launchResult.workflowId
      return
    }

    if (testInputStateKeyRef.current !== testInputStateKey) {
      testInputStateKeyRef.current = testInputStateKey
      testRunInvalidatedRef.current = true
      onTestExecutionSnapshot?.(null)
    }
  }, [isTestMode, launchResult, onTestExecutionSnapshot, open, testInputStateKey])

  useEffect(() => {
    if (!open) return
    if (templateDefinition) {
      const dynamicTemplate = templateDefinition as FlowTemplate
      setIsLoading(false)
      setError(null)
      if (!isTestMode) {
        setLaunchResult(null)
        setTestFlowStatus({
          isLoading: false,
          error: null,
          status: null,
          progress: null,
          timedOut: false,
          pendingSteps: [],
          liveSteps: [],
          summaryData: [],
          stepResults: []
        })
      }
      setTemplate(dynamicTemplate)
      setAgentTestResponses(getDefaultAgentTestResponses(dynamicTemplate))
      setAgentTestModes(getDefaultAgentTestModes(dynamicTemplate))
      setTaskTestResponses(getDefaultTaskTestResponses(dynamicTemplate))
      setSelectedBranchTests({})
      setTestScope(initialSingleStepKey ? 'single-step' : 'flow')
      setSelectedSingleStepKey(initialSingleStepKey)
      setAssignments(collectRuntimeAssignments(dynamicTemplate, resolveLaunchFormContext(dynamicTemplate)))
      clearUploadError()
      form.reset(isTestMode ? buildStartFormInitialValues(resolveLaunchFormContext(dynamicTemplate).inputs) : {})
      return
    }
    if (!templateId) return

    const load = async () => {
      if (!accessToken) {
        setError('Access token is required to launch flows')
        return
      }

      setIsLoading(true)
      setError(null)
      if (!isTestMode) {
        setLaunchResult(null)
        setTestFlowStatus({
          isLoading: false,
          error: null,
          status: null,
          progress: null,
          timedOut: false,
          pendingSteps: [],
          liveSteps: [],
          summaryData: [],
          stepResults: []
        })
      }
      setTemplate(null)
      setAssignments([])
      clearUploadError()
      try {
        const client = new FlowTemplateClient(accessToken)
        const res = await client.getTemplateWithMetadata(templateId)
        const tpl = res.template
        setTemplate(tpl)
        setAgentTestResponses(getDefaultAgentTestResponses(tpl))
        setAgentTestModes(getDefaultAgentTestModes(tpl))
        setTaskTestResponses(getDefaultTaskTestResponses(tpl))
        setSelectedBranchTests({})
        setTestScope(initialSingleStepKey ? 'single-step' : 'flow')
        setSelectedSingleStepKey(initialSingleStepKey)
        setAssignments(collectRuntimeAssignments(tpl, resolveLaunchFormContext(tpl)))
        form.reset(isTestMode ? buildStartFormInitialValues(resolveLaunchFormContext(tpl).inputs) : {})
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load template')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [accessToken, clearUploadError, form, initialSingleStepKey, isTestMode, open, templateDefinition, templateId])

  const canLaunch = useMemo(() => {
    if (isLoading) return false
    if (!template) return false
    if (!accessToken) return false
    if (isUploadingFiles) return false
    if (isTestMode && testScope === 'single-step') return Boolean(selectedSingleStepKey)
    if (isTestMode) return true
    return assignments.every(a => hasAssignmentTargets(a.targets))
  }, [accessToken, assignments, isLoading, isTestMode, isUploadingFiles, selectedSingleStepKey, template, testScope])
  const isTestRunActive = Boolean(
    isTestMode &&
      launchResult &&
      !testFlowStatus.error &&
      !testFlowStatus.timedOut &&
      !isTerminalFlowStatus(testFlowStatus.status)
  )
  const isInteractiveTestFinished =
    Boolean(isTestMode && launchResult?.interactiveTest) &&
    (testFlowStatus.timedOut ||
      isTerminalFlowStatus(testFlowStatus.status) ||
      isTerminalFlowStatus(interactiveTestSession?.status))
  const isTestResultPollingFinished =
    Boolean(isTestMode && launchResult) && (testFlowStatus.timedOut || isTerminalFlowStatus(testFlowStatus.status))

  const effectiveTestAssignments = useMemo(
    () =>
      isTestMode
        ? assignments.map(assignment =>
            hasAssignmentTargets(assignment.targets)
              ? assignment
              : {
                  ...assignment,
                  targets: { users: [currentUserId] },
                  assignedUserId: currentUserId,
                  assignedUserIds: [currentUserId]
                }
          )
        : assignments,
    [assignments, currentUserId, isTestMode]
  )

  const payloadAgentTestSteps = visibleAgentTestSteps
  const payloadTaskTestSteps = visibleTaskTestSteps
  const agentResponses =
    isTestMode && payloadAgentTestSteps.length > 0
      ? Object.fromEntries(
          payloadAgentTestSteps.map(step => [step.stepKey, agentTestResponses[step.stepKey] || step.response])
        )
      : undefined
  const agentResponseModes =
    isTestMode && payloadAgentTestSteps.length > 0
      ? Object.fromEntries(
          payloadAgentTestSteps.map(step => [
            step.stepKey,
            isSingleStepTest && step.stepKey !== selectedSingleStepCanonicalKey
              ? 'TEST_RESPONSE'
              : agentTestModes[step.stepKey] || 'REAL_ONLY'
          ])
        )
      : undefined
  const userTaskResponses =
    isTestMode && payloadTaskTestSteps.length > 0
      ? Object.fromEntries(
          payloadTaskTestSteps.map(step => [step.stepKey, taskTestResponses[step.stepKey] || step.response])
        )
      : undefined
  const expectedBranches =
    isTestMode && !isSingleStepTest && Object.keys(selectedBranchTests).length > 0 ? selectedBranchTests : undefined
  const singleStepReference = isSingleStepTest ? selectedSingleStepCanonicalKey : undefined
  const singleStepIndex = isSingleStepTest ? selectedSingleStepOption?.stepIndex : undefined
  const initialFormStepIndex =
    isTestMode &&
    launchFormContext.mode === 'first-task-form' &&
    typeof launchFormContext.fallbackStepIndex === 'number'
      ? launchFormContext.fallbackStepIndex
      : undefined
  const initialFormStepReference =
    typeof initialFormStepIndex === 'number' ? getStepOptionReference(null, initialFormStepIndex) : undefined
  const previewInputValues = isTestMode
    ? coerceFormDataBySchema(startInputs, getPreviewInputValues(startInputs, watchedInputValues))
    : watchedInputValues
  const runtimeAssignmentsPreview = buildRuntimeAssignmentsPayload(effectiveTestAssignments, {
    template,
    launchFormContext,
    defaultUserId: currentUserId
  })
  const testPayloadPreview = {
    inputValues: previewInputValues,
    runtimeAssignments: runtimeAssignmentsPreview,
    testOptions: {
      interactive: true,
      ...(agentResponses ? { agentResponses } : {}),
      ...(agentResponseModes ? { agentResponseModes } : {}),
      ...(userTaskResponses ? { userTaskResponses } : {}),
      ...(expectedBranches ? { expectedBranches } : {}),
      ...(singleStepReference ? { singleStepReference } : {}),
      ...(typeof singleStepIndex === 'number' ? { singleStepIndex } : {}),
      ...(initialFormStepReference ? { initialFormStepReference } : {}),
      ...(typeof initialFormStepIndex === 'number' ? { initialFormStepIndex } : {})
    }
  }
  const testPayloadPreviewText = formatJson(testPayloadPreview)

  const handleAssignmentChange = (stepIndex: number, nextAssignment: TaskAssignment) => {
    setAssignments(prev =>
      prev.map(a =>
        a.stepIndex === stepIndex
          ? {
              ...a,
              targets: nextAssignment.targets,
              assignedUserId: nextAssignment.targets?.users?.[0] ?? null,
              assignedUserIds: nextAssignment.targets?.users ?? []
            }
          : a
      )
    )
  }

  const copyText = async (key: string, text: string) => {
    if (!text.trim()) return
    await navigator.clipboard?.writeText(text)
    setCopiedOutput(key)
    globalThis.setTimeout(() => setCopiedOutput(current => (current === key ? null : current)), 1200)
  }

  const fillMissingRequiredTestInputs = () => {
    startInputs.forEach((input: any, index: number) => {
      const fieldName = input.name || `input_${index}`
      const allowedValues = getFieldAllowedValues(input)
      const currentValue = form.getValues(fieldName)
      const currentValueIsAllowed = allowedValues.length === 0 || allowedValues.includes(String(currentValue))

      if (allowedValues.length > 0 && (!currentValueIsAllowed || isEmptyLaunchValue(currentValue))) {
        form.setValue(fieldName, getDefaultTestInputValue(input), {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false
        })
        return
      }

      if (input.required !== true || !isEmptyLaunchValue(currentValue)) return

      const value = getDefaultTestInputValue(input)
      if (value !== undefined) {
        form.setValue(fieldName, value, { shouldDirty: true, shouldTouch: true, shouldValidate: false })
      }
    })
  }

  const focusFirstInvalidInput = () => {
    const invalidInput = startInputs.find((input: any, index: number) => {
      const fieldName = input.name || `input_${index}`
      return Boolean(form.getFieldState(fieldName).error)
    })
    if (!invalidInput) return

    const fieldName = invalidInput.name || `input_${startInputs.indexOf(invalidInput)}`
    form.setFocus(fieldName)
    const fieldElement = Array.from(document.querySelectorAll('[data-testid]')).find(
      element => element.getAttribute('data-testid') === `${testId}-field-${fieldName}`
    )
    fieldElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const viewportWidth = window.innerWidth
      const maxWidth = Math.min(MAX_SHEET_WIDTH, viewportWidth - 32)
      const rawWidth = isTestMode ? moveEvent.clientX : viewportWidth - moveEvent.clientX
      const nextWidth = Math.min(maxWidth, Math.max(MIN_SHEET_WIDTH, rawWidth))
      setSheetWidth(nextWidth)
    }

    const stopResize = () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', stopResize)
      document.removeEventListener('pointercancel', stopResize)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', stopResize)
    document.addEventListener('pointercancel', stopResize)
  }

  const handleLaunch = async () => {
    if (!templateId && !templateDefinition) return
    if (!accessToken) return

    setIsLaunching(true)
    setError(null)
    setLaunchResult(null)
    setInteractiveTestSession(null)
    setInteractivePauseValues({})
    setTestStatusRefreshTick(0)
    stepOutcomeCacheRef.current = {}
    pendingOutputStepReferencesRef.current = new Set()
    testRunInvalidatedRef.current = false
    setTestFlowStatus({
      isLoading: false,
      error: null,
      status: null,
      progress: null,
      timedOut: false,
      pendingSteps: [],
      liveSteps: [],
      summaryData: [],
      stepResults: []
    })
    if (isTestMode) onTestExecutionSnapshot?.(null)
    try {
      if (isTestMode) fillMissingRequiredTestInputs()
      const isValid = await form.trigger()
      if (!isValid) {
        focusFirstInvalidInput()
        toast.error('Fill required test inputs', {
          description: 'Some start form fields are required before the flow test can run.'
        })
        return
      }

      const client = new FlowTemplateClient(accessToken)
      const inputValues = form.getValues()
      const uploadScopeId = templateId || template?.name || 'dynamic-test-flow'
      const uploadedValues = await uploadFormFiles(startInputs, inputValues, uploadScopeId)
      const normalizedFallbackValues = coerceFormDataBySchema(startInputs, uploadedValues)
      const runtimeAssignments = buildRuntimeAssignmentsPayload(effectiveTestAssignments, {
        template,
        launchFormContext,
        defaultUserId: currentUserId
      })

      const context = {
        launchedAt: new Date().toISOString(),
        launchedBy: currentUserId,
        templateTitle: template?.name || templateId || 'Dynamic flow',
        ...(isTestMode ? { executionMode: 'test', label: 'test' } : {})
      }

      const result =
        templateDefinition && isTestMode
          ? await client.executeDynamicTemplate({
              templateDefinition,
              initiatorId: currentUserId,
              stepAssignments: toDynamicStepAssignments(runtimeAssignments),
              inputValues: normalizedFallbackValues,
              runtimeParameters: {},
              context,
              testOptions: {
                interactive: true,
                ...(agentResponses ? { agentResponses } : {}),
                ...(agentResponseModes ? { agentResponseModes } : {}),
                ...(userTaskResponses ? { userTaskResponses } : {}),
                ...(expectedBranches ? { expectedBranches } : {}),
                ...(singleStepReference ? { singleStepReference } : {}),
                ...(typeof singleStepIndex === 'number' ? { singleStepIndex } : {}),
                ...(initialFormStepReference ? { initialFormStepReference } : {}),
                ...(typeof initialFormStepIndex === 'number' ? { initialFormStepIndex } : {})
              }
            })
          : await client.executeWorkflow(templateId!, {
              initiator: currentUserId,
              inputValues: normalizedFallbackValues,
              runtimeAssignments,
              runtimeParameters: {},
              context
            })

      if (launchFormContext.mode === 'first-task-form' && !isTestMode) {
        try {
          const completionUserId = getFallbackCompletionUserId(
            assignments,
            launchFormContext.fallbackStepIndex,
            currentUserId
          )

          await submitFirstTaskFormFallback({
            accessToken,
            userId: completionUserId,
            workflowId: result.workflowId,
            templateId: templateId || 'DYNAMIC',
            formData: normalizedFallbackValues
          })
        } catch (fallbackError) {
          const description =
            fallbackError instanceof Error
              ? fallbackError.message
              : 'The first task form could not be submitted automatically.'
          toast.error(`${successTitle}, but the first task still needs input`, { description })
        }
      }

      toast.success(successTitle, {
        description: `Flow ID: ${result.workflowId}`
      })

      if (isTestMode) {
        if (initialFormStepReference) {
          const initialLiveStep = {
            rootTaskReference: initialFormStepReference,
            rootTaskIndex: initialFormStepIndex,
            rootTaskTitle:
              typeof initialFormStepIndex === 'number' && Array.isArray(template?.steps)
                ? (template.steps as any[])[initialFormStepIndex]?.title || initialFormStepReference
                : initialFormStepReference,
            stepType: 'TASK',
            stepStatus: 'IN_PROGRESS',
            stepProgressPercentage: 0,
            awaitingInput: true
          }
          setTestFlowStatus(current => ({
            ...current,
            status: 'RUNNING',
            progress: null,
            liveSteps: [initialLiveStep]
          }))
          onTestExecutionSnapshot?.({
            workflowId: result.workflowId,
            status: 'RUNNING',
            progress: null,
            timedOut: false,
            steps: [initialLiveStep],
            outcomes: {},
            summaryData: [],
            reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
          })
        }
        setLaunchResult(result)
        setInteractiveTestSession((result as FlowLaunchResult).interactiveTest ?? null)
      } else {
        onOpenChange(false)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to launch flow'
      setError(msg)
      toast.error(failureTitle, { description: msg })
    } finally {
      setIsLaunching(false)
    }
  }

  const handleStopTest = async () => {
    if (!isTestMode || !launchResult || !accessToken) return

    setIsStoppingTest(true)
    try {
      const apiBase = getFlowEngineApiBaseUrl()
      const response = await fetch(`${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/terminate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Flow test stopped by user' })
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || payload?.message || 'Failed to stop flow test')
      }

      setTestFlowStatus(current => ({
        ...current,
        isLoading: false,
        error: null,
        status: 'TERMINATED',
        timedOut: false,
        pendingSteps: [],
        liveSteps: []
      }))
      onTestExecutionSnapshot?.({
        workflowId: launchResult.workflowId,
        status: 'TERMINATED',
        progress: testFlowStatus.progress,
        timedOut: false,
        steps: [],
        outcomes: {},
        summaryData: [],
        reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
      })
      setInteractiveTestSession(null)
      setInteractivePauseValues({})
      setInteractivePauseAssignment(null)
      setAgentPauseResponse({})
      setPauseOpen(false)
      setAgentPauseOpen(false)
      toast.success('Flow test stopped')
    } catch (stopError) {
      const message = stopError instanceof Error ? stopError.message : 'Failed to stop flow test'
      setTestFlowStatus(current => ({ ...current, isLoading: false, error: message }))
      toast.error('Could not stop flow test', { description: message })
    } finally {
      setIsStoppingTest(false)
    }
  }

  const updateInteractivePauseField = (_stepKey: string, fieldName: string, value: unknown) => {
    setInteractivePauseValues(current => ({
      ...current,
      [fieldName]: value
    }))
  }

  const updateAgentPauseField = (_stepKey: string, fieldName: string, value: unknown) => {
    setAgentPauseResponse(current => ({
      ...current,
      [fieldName]: value
    }))
  }

  const handleClaimInteractiveTask = async () => {
    if (!accessToken || !launchResult || !interactiveTestSession?.pause) return
    const pause = interactiveTestSession.pause
    if (pause.type !== 'TASK' || !pause.claimRequired || pause.claimSimulated) return

    setIsContinuingInteractiveTest(true)
    try {
      const client = new FlowTemplateClient(accessToken)
      const nextSession = await client.continueInteractiveTest(launchResult.workflowId, {
        userId: currentUserId,
        claimOnly: true
      })
      setInteractiveTestSession(nextSession)
      toast.success('Task claimed for test')
    } catch (claimError) {
      const message = claimError instanceof Error ? claimError.message : 'Could not claim task for test'
      toast.error('Could not claim task', { description: message })
    } finally {
      setIsContinuingInteractiveTest(false)
    }
  }

  const handleContinueInteractiveTest = async () => {
    if (!accessToken || !launchResult || !interactiveTestSession?.pause) return
    const pause = interactiveTestSession.pause
    if (pause.type !== 'TASK') return

    const pauseFields = Array.isArray(pause.form) ? pause.form : []
    const missingRequiredField = pauseFields.find(field => {
      if (field?.required !== true) return false
      const name = String(field?.name || '').trim()
      return !name || interactivePauseValues[name] === undefined || interactivePauseValues[name] === ''
    })
    if (missingRequiredField) {
      toast.error('Fill required input', {
        description: `${missingRequiredField.label || missingRequiredField.name} is required to continue the test.`
      })
      return
    }

    const assignmentOverride =
      interactivePauseAssignment && hasAssignmentTargets(interactivePauseAssignment.targets)
        ? {
            targets: interactivePauseAssignment.targets,
            assignmentMode: interactivePauseAssignment.assignmentMode,
            allowReassignment: interactivePauseAssignment.allowReassignment ?? true
          }
        : undefined
    const runtimeDecisionBranch =
      pauseFields.some(field => field?.name === 'decisionBranch') && pause.stepReference
        ? (() => {
            const selectedValue = String(interactivePauseValues.decisionBranch || '').trim()
            if (!selectedValue) return null

            const stepIndex =
              typeof pause.stepIndex === 'number' ? pause.stepIndex : getStepIndexFromReference(pause.stepReference)
            const decisionStep =
              typeof stepIndex === 'number' && Array.isArray(template?.steps)
                ? (template.steps as any[])[stepIndex]
                : null
            const selectedBranch = (Array.isArray(decisionStep?.branches) ? decisionStep.branches : []).find(
              (branch: any) =>
                String(branch?.id || '') === selectedValue ||
                String(branch?.label || '') === selectedValue ||
                String(branch?.name || '') === selectedValue
            )

            return {
              stepKey: getStepOptionReference(
                decisionStep,
                stepIndex ?? getStepIndexFromReference(pause.stepReference) ?? 0
              ),
              branchId: String(selectedBranch?.id || selectedValue),
              branchLabel: String(selectedBranch?.label || selectedBranch?.name || selectedValue),
              targetStepIndex: typeof selectedBranch?.nextStep === 'number' ? selectedBranch.nextStep : null,
              targetHasForm:
                typeof selectedBranch?.nextStep === 'number' &&
                Array.isArray(template?.steps) &&
                Array.isArray((template.steps as any[])[selectedBranch.nextStep]?.form) &&
                (template.steps as any[])[selectedBranch.nextStep].form.length > 0,
              targetStepReference:
                typeof selectedBranch?.nextStep === 'number'
                  ? getStepOptionReference(null, selectedBranch.nextStep)
                  : null,
              targetStepTitle:
                typeof selectedBranch?.nextStep === 'number' && Array.isArray(template?.steps)
                  ? (template.steps as any[])[selectedBranch.nextStep]?.title ||
                    getStepOptionReference(null, selectedBranch.nextStep)
                  : null
            }
          })()
        : null

    setIsContinuingInteractiveTest(true)
    try {
      const pauseStepReference = String(pause.stepReference || '').trim()
      if (pauseStepReference && !runtimeDecisionBranch) {
        pendingOutputStepReferencesRef.current.add(pauseStepReference)
        const activeOutputStep = {
          rootTaskReference: pauseStepReference,
          rootTaskIndex:
            typeof pause.stepIndex === 'number' ? pause.stepIndex : getStepIndexFromReference(pauseStepReference),
          rootTaskTitle: pause.stepTitle || pauseStepReference,
          stepType: 'TASK',
          stepStatus: 'IN_PROGRESS',
          stepProgressPercentage: 75,
          assignmentMode: pause.assignmentMode,
          awaitingOutput: true
        }
        stepOutcomeCacheRef.current[pauseStepReference] = {
          stepReference: pauseStepReference,
          stepTitle: pause.stepTitle || pauseStepReference,
          status: 'IN_PROGRESS',
          taskType: pause.type,
          formData: { ...interactivePauseValues },
          fields: []
        }
        onTestExecutionSnapshot?.({
          workflowId: launchResult.workflowId,
          status: 'RUNNING',
          progress: testFlowStatus.progress,
          timedOut: false,
          steps: [activeOutputStep],
          outcomes: stepOutcomeCacheRef.current,
          summaryData: [],
          reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
        })
        setTestFlowStatus(current => ({
          ...current,
          status: 'RUNNING',
          liveSteps: [activeOutputStep]
        }))
      }

      const client = new FlowTemplateClient(accessToken)
      const nextSession = await client.continueInteractiveTest(launchResult.workflowId, {
        userId: currentUserId,
        formData: interactivePauseValues,
        ...(assignmentOverride ? { assignment: assignmentOverride } : {})
      })
      setInteractiveTestSession(nextSession)
      if (runtimeDecisionBranch) {
        if (pauseStepReference) {
          stepOutcomeCacheRef.current[pauseStepReference] = {
            stepReference: pauseStepReference,
            stepTitle: pause.stepTitle || pauseStepReference,
            status: 'COMPLETED',
            taskType: 'DECISION',
            formData: { selectedBranch: runtimeDecisionBranch.branchLabel },
            fields: [{ label: 'Selected branch', value: runtimeDecisionBranch.branchLabel }]
          }
        }
        setSelectedBranchTests(current => ({
          ...current,
          [runtimeDecisionBranch.stepKey]: runtimeDecisionBranch.branchId
        }))
        if (runtimeDecisionBranch.targetStepReference) {
          if (runtimeDecisionBranch.targetHasForm) {
            pendingOutputStepReferencesRef.current.delete(runtimeDecisionBranch.targetStepReference)
          } else {
            pendingOutputStepReferencesRef.current.add(runtimeDecisionBranch.targetStepReference)
          }
          delete stepOutcomeCacheRef.current[runtimeDecisionBranch.targetStepReference]
          const branchSteps = markPendingOutputSteps(
            buildInteractiveSessionStepSnapshot(nextSession),
            pendingOutputStepReferencesRef.current
          )
          if (
            !branchSteps.some(
              step => String(step.rootTaskReference || '') === runtimeDecisionBranch.targetStepReference
            )
          ) {
            branchSteps.push({
              rootTaskReference: runtimeDecisionBranch.targetStepReference,
              rootTaskIndex: runtimeDecisionBranch.targetStepIndex ?? undefined,
              rootTaskTitle: runtimeDecisionBranch.targetStepTitle || runtimeDecisionBranch.targetStepReference,
              stepType: 'TASK',
              stepStatus: 'IN_PROGRESS',
              stepProgressPercentage: runtimeDecisionBranch.targetHasForm ? 0 : 75,
              ...(runtimeDecisionBranch.targetHasForm ? { awaitingInput: true } : { awaitingOutput: true })
            })
          }
          setTestFlowStatus(current => ({
            ...current,
            status: 'RUNNING',
            liveSteps: branchSteps
          }))
          onTestExecutionSnapshot?.({
            workflowId: launchResult.workflowId,
            status: 'RUNNING',
            progress: testFlowStatus.progress,
            timedOut: false,
            steps: branchSteps,
            outcomes: stepOutcomeCacheRef.current,
            summaryData: [],
            reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
          })
        }
      }
      setInteractivePauseValues({})
      setInteractivePauseAssignment(null)
    } catch (continueError) {
      const message = continueError instanceof Error ? continueError.message : 'Could not continue interactive test'
      toast.error('Could not continue test', { description: message })
    } finally {
      setIsContinuingInteractiveTest(false)
    }
  }

  const handleContinueAgentTest = async (skip: boolean) => {
    if (!accessToken || !launchResult || interactiveTestSession?.pause?.type !== 'AGENT') return

    setIsContinuingInteractiveTest(true)
    try {
      const client = new FlowTemplateClient(accessToken)
      const nextSession = await client.continueInteractiveTest(launchResult.workflowId, {
        userId: currentUserId,
        ...(skip ? { skipAgent: true } : { agentResponse: agentPauseResponse, agentMode: agentPauseMode })
      })
      setInteractiveTestSession(nextSession)
      setAgentPauseResponse({})
    } catch (continueError) {
      const message = continueError instanceof Error ? continueError.message : 'Could not continue interactive test'
      toast.error('Could not continue test', { description: message })
    } finally {
      setIsContinuingInteractiveTest(false)
    }
  }

  const handleRunTestClick = () => {
    if (isTestMode && hasStartInputs) {
      fillMissingRequiredTestInputs()
      setStartFormOpen(true)
      return
    }
    void handleLaunch()
  }

  useEffect(() => {
    if (!open || !launchResult?.workflowId || !isTestMode || !accessToken || !launchResult.interactiveTest) return
    if (isInteractiveTestFinished) return

    const controller = new AbortController()
    const applySession = (session: InteractiveFlowTestSession) => {
      setInteractiveTestSession(session)
      if (testRunInvalidatedRef.current || (session.status !== 'RUNNING' && session.status !== 'PAUSED')) return

      const sessionSteps = markPendingOutputSteps(
        buildInteractiveSessionStepSnapshot(session),
        pendingOutputStepReferencesRef.current
      )
      if (sessionSteps.length === 0) return

      setTestFlowStatus(current => ({
        ...current,
        status: session.status,
        liveSteps: sessionSteps
      }))
      onTestExecutionSnapshot?.({
        workflowId: launchResult.workflowId,
        status: session.status,
        progress: null,
        timedOut: false,
        steps: sessionSteps,
        outcomes: stepOutcomeCacheRef.current,
        summaryData: [],
        reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
      })
    }

    void subscribeToFlowLiveUpdates({
      workflowId: launchResult.workflowId,
      accessToken,
      signal: controller.signal,
      onEvent: event => {
        const session = event.payload?.session
        if (event.type === 'interactive-test-session' && session?.workflowId === launchResult.workflowId) {
          applySession(session)
          setTestStatusRefreshTick(current => current + 1)
        }
      }
    }).catch(() => {
      // Existing polling below remains the fallback if SSE is unavailable.
    })

    return () => controller.abort()
  }, [
    accessToken,
    isInteractiveTestFinished,
    isTestMode,
    launchResult,
    onTestExecutionSnapshot,
    open,
    reachableStepIndexes
  ])

  useEffect(() => {
    if (!open || !launchResult?.workflowId || !isTestMode || !accessToken || !launchResult.interactiveTest) return
    if (isInteractiveTestFinished) return

    let cancelled = false
    let intervalId: ReturnType<typeof globalThis.setInterval> | null = null
    const client = new FlowTemplateClient(accessToken)
    const pollSession = async () => {
      try {
        const session = await client.getInteractiveTestSession(launchResult.workflowId)
        if (cancelled) return
        setInteractiveTestSession(session)
        if (!testRunInvalidatedRef.current && (session.status === 'RUNNING' || session.status === 'PAUSED')) {
          const sessionSteps = markPendingOutputSteps(
            buildInteractiveSessionStepSnapshot(session),
            pendingOutputStepReferencesRef.current
          )
          if (sessionSteps.length > 0) {
            setTestFlowStatus(current => ({
              ...current,
              status: session.status,
              liveSteps: sessionSteps
            }))
            onTestExecutionSnapshot?.({
              workflowId: launchResult.workflowId,
              status: session.status,
              progress: null,
              timedOut: false,
              steps: sessionSteps,
              outcomes: stepOutcomeCacheRef.current,
              summaryData: [],
              reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
            })
          }
        }
      } catch (sessionError) {
        const message = sessionError instanceof Error ? sessionError.message : String(sessionError)
        if (message.includes('404')) {
          cancelled = true
          if (intervalId) globalThis.clearInterval(intervalId)
          setInteractiveTestSession(null)
          return
        }
        // The normal progress poll still reports the workflow state; ignore transient session polling errors.
      }
    }

    void pollSession()
    intervalId = globalThis.setInterval(() => {
      void pollSession()
    }, TEST_SESSION_FALLBACK_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (intervalId) globalThis.clearInterval(intervalId)
    }
  }, [
    accessToken,
    isInteractiveTestFinished,
    isTestMode,
    launchResult,
    onTestExecutionSnapshot,
    open,
    reachableStepIndexes
  ])

  useEffect(() => {
    const pause = interactiveTestSession?.pause
    if (!pause || pause.type !== 'TASK') return
    const formFields = Array.isArray(pause.form) ? pause.form : []
    setInteractivePauseValues(current => {
      if (Object.keys(current).length > 0) return current
      return Object.fromEntries(
        formFields.flatMap((field: any) => {
          const name = String(field?.name || '').trim()
          if (!name) return []
          const inputValues = pause.inputData?.inputValues
          const existingValue =
            inputValues && typeof inputValues === 'object' && !Array.isArray(inputValues)
              ? (inputValues as Record<string, unknown>)[name]
              : undefined
          // When the field declares a set of available/allowed values (via
          // options/enum or a "a | b | c" help text), prefer one of those. A
          // previously echoed or launch-default value (e.g. the generic "test")
          // that is not a valid option is replaced with the first allowed value.
          const allowedValues = getFieldAllowedValues(field)
          const isAllowedValue = (value: unknown) => allowedValues.length === 0 || allowedValues.includes(String(value))
          if (existingValue !== undefined && isAllowedValue(existingValue)) return [[name, existingValue]]
          if (field?.default !== undefined && isAllowedValue(field.default)) return [[name, field.default]]
          if (allowedValues.length > 0) return [[name, allowedValues[0]]]
          if (existingValue !== undefined) return [[name, existingValue]]
          if (field?.default !== undefined) return [[name, field.default]]
          return []
        })
      )
    })
  }, [interactiveTestSession?.pause])

  useEffect(() => {
    if (!open || !launchResult || !isTestMode || !accessToken) return
    if (isTestResultPollingFinished) return

    let cancelled = false
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null
    let attempt = 0
    const maxAttempts = Math.ceil(TEST_RESULT_TIMEOUT_MS / TEST_RESULT_POLL_INTERVAL_MS)
    let lastStatus: string | null = null
    let lastPendingSteps: string[] = []
    const userId = userInfo?.id || userInfo?.employeeDetails?.employeeId || userInfo?.userName || 'unknown'
    const apiBase = CUSTOM_FLOW_ENGINE_API_URL
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
    const requestOptions = { headers, signal: controller.signal }

    const loadStatus = async () => {
      attempt += 1
      setTestFlowStatus(current => ({ ...current, isLoading: true, error: null }))

      try {
        const [progressResponse, stepsResponse] = await Promise.all([
          fetch(`${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/progress`, requestOptions),
          fetch(`${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/progress/steps`, requestOptions)
        ])

        const progressPayload = progressResponse.ok ? await progressResponse.json() : null
        const stepsPayload = stepsResponse.ok ? await stepsResponse.json() : null
        const progressFlow = progressPayload?.data?.flow
        const status = progressFlow?.workflowStatus || null
        const summaryResponse = isTerminalFlowStatus(status)
          ? await fetch(
              `${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/summary?userId=${encodeURIComponent(userId)}`,
              requestOptions
            )
          : null
        const summaryPayload = summaryResponse?.ok ? await summaryResponse.json() : null
        const summaryData = Array.isArray(summaryPayload?.summaryData) ? summaryPayload.summaryData : []

        if (cancelled) return
        lastStatus = status
        let stepResults: TestFlowStatus['stepResults'] = []
        const steps: FlowTestStepStatus[] = Array.isArray(stepsPayload?.data?.steps) ? stepsPayload.data.steps : []
        const isReachableStep = (step: FlowTestStepStatus): boolean => {
          if (!reachableStepIndexes) return true
          const stepReference = String(step?.rootTaskReference || '')
          const stepIndex =
            typeof step?.rootTaskIndex === 'number'
              ? step.rootTaskIndex
              : stepReference.startsWith('step_')
                ? Number(stepReference.replace('step_', ''))
                : NaN
          return Number.isFinite(stepIndex) ? reachableStepIndexes.has(stepIndex) : true
        }
        const isTerminalStatus = isTerminalFlowStatus(status)
        if (isTerminalStatus) {
          pendingOutputStepReferencesRef.current.clear()
        }
        const rawReachableSteps = steps.filter(isReachableStep)
        const reachableSteps = markPendingOutputSteps(rawReachableSteps, pendingOutputStepReferencesRef.current)
        lastPendingSteps = isTerminalStatus
          ? []
          : reachableSteps
              .filter((step: any) => !isTerminalFlowStatus(step?.stepStatus))
              .map((step: any) => String(step?.rootTaskTitle || step?.rootTaskReference || 'Unnamed step'))
              .filter(Boolean)

        const completedSteps = rawReachableSteps.filter(
          step => String(step?.stepStatus || '').toUpperCase() === 'COMPLETED'
        )
        const stepOutcomes: Record<string, FlowTestStepOutcome> = {}
        if (completedSteps.length > 0) {
          const stepDataResponses = await Promise.all(
            completedSteps.map(async step => {
              const stepReference = step.rootTaskReference || `step_${step.rootTaskIndex}`
              const cachedOutcome = stepOutcomeCacheRef.current[stepReference]
              if (cachedOutcome && String(cachedOutcome.status || '').toUpperCase() === 'COMPLETED')
                return cachedOutcome

              const response = await fetch(
                `${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/steps/${encodeURIComponent(stepReference)}/data?limit=1&includeOutput=true`,
                requestOptions
              )
              if (!response.ok) return null
              const payload = await response.json()
              const firstRow = Array.isArray(payload?.data) ? payload.data[0] : null
              const outcome = buildStepOutcome(step, firstRow, stepReference)
              const displayOutcome = outcome ? applyUserDisplayNamesToOutcome(outcome, userDisplayNames) : null
              if (displayOutcome) {
                stepOutcomeCacheRef.current[stepReference] = displayOutcome
                if (
                  displayOutcome.outputData !== undefined ||
                  (displayOutcome.executionDetails && Object.keys(displayOutcome.executionDetails).length > 0)
                ) {
                  pendingOutputStepReferencesRef.current.delete(stepReference)
                }
              }
              return displayOutcome
            })
          )
          for (const outcome of stepDataResponses) {
            if (!outcome) continue
            stepOutcomes[outcome.stepReference] = outcome
          }
          if (isTerminalStatus && (summaryData.length === 0 || isSingleStepTest)) {
            stepResults = Object.values(stepOutcomes).map(outcome => ({
              stepReference: outcome.stepReference,
              stepTitle: outcome.stepTitle,
              fields: outcome.fields
            }))
          }
        }
        const fallbackSummaryData = isTerminalStatus ? buildSummaryDataFromTemplate(template, stepOutcomes) : []
        const singleStepSummaryData =
          isTerminalStatus && isSingleStepTest
            ? buildSummaryDataFromSingleStepResult(stepOutcomes, selectedSingleStepCanonicalKey)
            : []
        const effectiveSummaryData = isSingleStepTest
          ? singleStepSummaryData
          : mergeSummaryDataWithFallback(summaryData, fallbackSummaryData)

        const progress =
          isSingleStepTest && status === 'TERMINATED'
            ? 100
            : (calculateTestPathProgress(template, reachableStepIndexes, steps, status) ??
              (typeof progressFlow?.userTaskProgressPercentage === 'number'
                ? progressFlow.userTaskProgressPercentage
                : null))
        const displayStatus = isSingleStepTest && status === 'TERMINATED' && progress === 100 ? 'COMPLETED' : status

        const nextTestFlowStatus = {
          isLoading: false,
          error: null,
          status: displayStatus,
          progress,
          timedOut: false,
          pendingSteps: lastPendingSteps,
          liveSteps: reachableSteps,
          summaryData: effectiveSummaryData,
          stepResults: effectiveSummaryData.length > 0 && !isSingleStepTest ? [] : stepResults
        }
        setTestFlowStatus(nextTestFlowStatus)
        if (!testRunInvalidatedRef.current) {
          onTestExecutionSnapshot?.({
            workflowId: launchResult.workflowId,
            status: displayStatus,
            progress,
            timedOut: false,
            steps: reachableSteps,
            outcomes: stepOutcomes,
            summaryData: effectiveSummaryData,
            reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
          })
        }
      } catch (statusError) {
        if (cancelled) return
        setTestFlowStatus(current => ({
          ...current,
          isLoading: false,
          error: statusError instanceof Error ? statusError.message : 'Failed to load test result status'
        }))
      }

      const isWaitingForInteractiveInput = interactiveTestSession?.status === 'PAUSED'
      if (!cancelled && (attempt < maxAttempts || isWaitingForInteractiveInput) && !isTerminalFlowStatus(lastStatus)) {
        timeoutId = globalThis.setTimeout(loadStatus, TEST_RESULT_POLL_INTERVAL_MS)
      } else if (!cancelled && !isTerminalFlowStatus(lastStatus)) {
        const pendingText = lastPendingSteps.length > 0 ? ` Pending steps: ${lastPendingSteps.join(', ')}.` : ''
        setTestFlowStatus(current => ({
          ...current,
          isLoading: false,
          timedOut: true,
          error: `Flow test did not finish after ${Math.round(TEST_RESULT_TIMEOUT_MS / 60000)} minutes. Last status: ${
            lastStatus || 'UNKNOWN'
          }.${pendingText}`
        }))
        if (!testRunInvalidatedRef.current) {
          onTestExecutionSnapshot?.({
            workflowId: launchResult.workflowId,
            status: lastStatus,
            progress: null,
            timedOut: true,
            steps: [],
            outcomes: {},
            summaryData: [],
            reachableStepIndexes: reachableStepIndexes ? Array.from(reachableStepIndexes) : undefined
          })
        }
      }
    }

    void loadStatus()

    return () => {
      cancelled = true
      controller.abort()
      if (timeoutId) globalThis.clearTimeout(timeoutId)
    }
  }, [
    accessToken,
    isTestMode,
    isTestResultPollingFinished,
    launchResult,
    onTestExecutionSnapshot,
    open,
    reachableStepIndexes,
    template,
    testStatusRefreshTick,
    userDisplayNames,
    userInfo?.employeeDetails?.employeeId,
    userInfo?.id,
    userInfo?.userName
  ])

  useEffect(() => {
    if (!open || !launchResult || !isTestMode) return
    globalThis.setTimeout(() => {
      const body = bodyScrollRef.current
      const result = resultRef.current
      if (!body || !result) return

      body.scrollTo({
        top: Math.max(result.offsetTop - body.offsetTop - 16, 0),
        behavior: 'smooth'
      })
      if (sheetContentRef.current) sheetContentRef.current.scrollTop = 0
    }, 0)
  }, [isTestMode, launchResult, open])

  const testResultText = formatJson({
    workflowId: launchResult?.workflowId,
    workflowName: launchResult?.workflowName,
    status: testFlowStatus.status,
    progress: testFlowStatus.progress,
    summaryData: testFlowStatus.summaryData,
    stepResults: testFlowStatus.stepResults
  })
  const testDiagnostics = [
    ...(launchResult?.validationWarnings || []).map(warning => ({
      type: 'validation',
      label: 'Validation warning',
      message: warning
    })),
    ...(launchResult?.testRun?.warnings || []).map(warning => ({
      type: 'auto-completion',
      label: 'Auto-completion note',
      message: warning
    })),
    ...(testFlowStatus.pendingSteps.length > 0
      ? [
          {
            type: 'pending',
            label: 'Pending steps',
            message: testFlowStatus.pendingSteps.join(', ')
          }
        ]
      : []),
    ...(testFlowStatus.error
      ? [
          {
            type: 'error',
            label: 'Error',
            message: testFlowStatus.error
          }
        ]
      : [])
  ]
  const testDiagnosticsText = testDiagnostics.map(item => `[${item.type}] ${item.label}: ${item.message}`).join('\n')
  const liveStepItems = useMemo(() => {
    if (!isTestMode || !template) return []
    const steps = Array.isArray(template.steps) ? template.steps : []
    const liveSteps = testFlowStatus.liveSteps
    const liveByReference = new Map(liveSteps.map(step => [String(step.rootTaskReference || ''), step]))
    const liveByIndex = new Map(
      liveSteps
        .filter(step => typeof step.rootTaskIndex === 'number')
        .map(step => [step.rootTaskIndex as number, step] as const)
    )
    const stepResultsByReference = new Map(
      testFlowStatus.stepResults
        .filter(step => step.stepReference)
        .map(step => [String(step.stepReference), step] as const)
    )
    const stepResultsByTitle = new Map(testFlowStatus.stepResults.map(step => [step.stepTitle, step] as const))
    const pause = interactiveTestSession?.pause?.type === 'TASK' ? interactiveTestSession.pause : null
    const isTerminal = isTerminalFlowStatus(testFlowStatus.status)
    let nextAssigned = false

    return steps
      .flatMap((step: any, index: number) => {
        if (reachableStepIndexes && !reachableStepIndexes.has(index)) return []
        const stepType = String(step?.type || '').toUpperCase()
        if (stepType === 'FORK' || stepType === 'JOIN') return []
        const reference = getStepOptionReference(step, index)
        const liveStep = liveByReference.get(reference) || liveByIndex.get(index)
        const isPauseStep =
          pause &&
          (pause.stepReference === reference || (typeof pause.stepIndex === 'number' && pause.stepIndex === index))
        const isStartFormStep =
          startFormOpen &&
          launchFormContext.mode === 'first-task-form' &&
          (reference === initialFormStepReference || index === initialFormStepIndex)
        const normalizedStatus = String(liveStep?.stepStatus || '').toUpperCase()
        const completed = !isPauseStep && !isStartFormStep && normalizedStatus === 'COMPLETED'
        const active =
          !completed &&
          (isPauseStep ||
            isStartFormStep ||
            liveStep?.awaitingInput === true ||
            liveStep?.awaitingOutput === true ||
            ['IN_PROGRESS', 'RUNNING', 'SCHEDULED'].includes(normalizedStatus))
        const result =
          stepResultsByReference.get(reference) || stepResultsByTitle.get(liveStep?.rootTaskTitle || step?.title || '')
        const next = !isTerminal && !completed && !active && !nextAssigned
        if (next) nextAssigned = true

        return [
          {
            reference,
            title: liveStep?.rootTaskTitle || step?.title || `Step ${index + 1}`,
            type: stepType || liveStep?.stepType || 'TASK',
            status: completed ? 'done' : active ? 'active' : next ? 'next' : 'pending',
            progress:
              typeof liveStep?.stepProgressPercentage === 'number' ? Math.round(liveStep.stepProgressPercentage) : null,
            resultFields: result?.fields ?? []
          }
        ]
      })
      .filter(item => item.status !== 'pending' || !isTerminal)
  }, [
    initialFormStepIndex,
    initialFormStepReference,
    interactiveTestSession?.pause,
    isTestMode,
    launchFormContext.mode,
    reachableStepIndexes,
    startFormOpen,
    template,
    testFlowStatus.liveSteps,
    testFlowStatus.status,
    testFlowStatus.stepResults
  ])

  const renderTestValueField = (
    stepKey: string,
    field: AgentTestField,
    value: unknown,
    onChange: (stepKey: string, fieldName: string, value: unknown) => void
  ) => {
    const fieldId = `${testId}-${stepKey}-${field.name}`
    const options = Array.isArray(field.options) ? field.options.map(normalizeOption) : []
    const fieldType = String(field.type || '').toLowerCase()

    if (options.length > 0 || fieldType === 'select' || fieldType === 'radio') {
      return (
        <Select
          value={String(value ?? '')}
          onValueChange={nextValue => onChange(stepKey, field.name, nextValue)}
          disabled={isLaunching || isUploadingFiles}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder="Select test value" />
          </SelectTrigger>
          <SelectContent className="gba:z-[80]">
            {options.map((option, optionIndex) => (
              <SelectItem key={`${option.value}-${optionIndex}`} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (fieldType === 'boolean' || fieldType === 'checkbox') {
      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Checkbox
            id={fieldId}
            checked={Boolean(value)}
            onCheckedChange={checked => onChange(stepKey, field.name, Boolean(checked))}
            disabled={isLaunching || isUploadingFiles}
          />
          <Label htmlFor={fieldId}>True</Label>
        </div>
      )
    }

    if (fieldType === 'number' || fieldType === 'integer') {
      return (
        <Input
          id={fieldId}
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={event =>
            onChange(stepKey, field.name, event.target.value === '' ? null : Number(event.target.value))
          }
          disabled={isLaunching || isUploadingFiles}
          data-testid={`${testId}-test-value-${stepKey}-${field.name}`}
        />
      )
    }

    return (
      <Textarea
        id={fieldId}
        rows={field.name.toLowerCase().includes('body') || fieldType === 'textarea' ? 4 : 2}
        value={formatEditableTestValue(value)}
        onChange={event => onChange(stepKey, field.name, deepParseJsonValue(event.target.value))}
        disabled={isLaunching || isUploadingFiles}
        data-testid={`${testId}-test-value-${stepKey}-${field.name}`}
      />
    )
  }

  const startDialogFooter = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setStartFormOpen(false)}
        data-testid={`${testId}-test-setup-done`}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="default"
        onClick={() => {
          setStartFormOpen(false)
          void handleLaunch()
        }}
        disabled={!canLaunch || isLaunching || isUploadingFiles || isTestRunActive || isStoppingTest}
        data-testid={`${testId}-test-setup-run`}
      >
        {launchButtonLabel}
      </Button>
    </>
  )

  const sheetClassName = isTestMode
    ? 'gba:fixed gba:z-50 gba:flex gba:flex-row gba:!overflow-hidden gba:rounded-xl gba:border gba:border-border gba:bg-background gba:shadow-2xl gba:sm:max-w-none gba:!animate-none'
    : 'gba:w-full gba:sm:max-w-none'
  const hasFloatingTestOverlay = isTestMode && (startFormOpen || pauseOpen || agentPauseOpen)
  const sheetStyle = isTestMode
    ? {
        width: 'calc(100vw - 5rem)',
        maxWidth: 'calc(100vw - 5rem)',
        position: 'fixed' as const,
        top: '2rem',
        bottom: '2rem',
        left: '2rem',
        right: 'auto',
        zIndex: 60,
        height: 'calc(100vh - 5rem)',
        display: 'flex',
        flexDirection: 'row' as const,
        overflow: 'hidden' as const,
        overflowY: 'hidden' as const,
        overscrollBehavior: 'contain' as const,
        transform: 'translateX(0)',
        opacity: 1,
        pointerEvents: 'auto' as const
      }
    : {
        width: `${sheetWidth}px`,
        maxWidth: 'calc(100vw - 1rem)',
        position: 'fixed' as const,
        top: 0,
        right: 0,
        bottom: 0,
        left: 'auto',
        zIndex: 60
      }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={!isTestMode}>
      <SheetContent
        ref={sheetContentRef}
        side={isTestMode ? 'left' : 'right'}
        className={`${sheetClassName} gba:relative gba:flex ${isTestMode ? 'gba:flex-row' : 'gba:flex-col'} gba:p-0 ${hasFloatingTestOverlay ? 'gba:!border-transparent' : ''}`}
        style={sheetStyle}
        onScrollCapture={event => {
          if (isTestMode && event.currentTarget.scrollTop !== 0) {
            event.currentTarget.scrollTop = 0
          }
        }}
        onInteractOutside={event => {
          if (isTestMode) event.preventDefault()
        }}
        data-testid={testId}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={isTestMode ? 'Resize test panel' : 'Resize launch panel'}
          className={`gba:absolute gba:inset-y-0 gba:z-10 gba:w-2 gba:cursor-ew-resize gba:touch-none gba:bg-transparent hover:gba:bg-primary/20 ${
            isTestMode ? '' : 'gba:left-0'
          }`}
          style={isTestMode ? { left: `${sheetWidth - 4}px` } : undefined}
          onPointerDown={handleResizeStart}
          data-testid={`${testId}-resize-handle`}
        />
        <div
          className={
            isTestMode
              ? 'gba:flex gba:h-full gba:min-h-0 gba:shrink-0 gba:flex-col gba:!overflow-hidden gba:border-r gba:border-border gba:bg-background'
              : 'gba:contents'
          }
          style={isTestMode ? { width: `${sheetWidth}px` } : undefined}
        >
          <SheetHeader className="gba:shrink-0 gba:pl-4 gba:pr-24 gba:pt-4 gba:pb-4">
            <SheetTitle className="gba:flex gba:flex-col gba:gap-1" data-testid={`${testId}-title`}>
              <span className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:text-base">
                <span className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                  <span className="gba:truncate">{template?.name || (isTestMode ? 'Test flow' : 'Start flow')}</span>
                  {isTestMode ? <Badge variant="warning">Test</Badge> : null}
                </span>
              </span>
              {template?.description ? (
                <span className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-description`}>
                  {template.description}
                </span>
              ) : null}
            </SheetTitle>
          </SheetHeader>

          <Separator className="gba:shrink-0" />

          <div
            ref={bodyScrollRef}
            className="gba:min-h-0 gba:flex-1 gba:overflow-y-auto gba:overscroll-contain gba:px-4 gba:py-5"
            data-testid={`${testId}-body`}
          >
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-10" data-testid={`${testId}-loading`}>
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <Alert variant="destructive" data-testid={`${testId}-error`}>
                <div className="gba:space-y-2">
                  <div className="gba:font-medium">Could not load flow</div>
                  <div className="gba:text-sm">{error}</div>
                </div>
              </Alert>
            ) : template ? (
              <div className="gba:flex gba:flex-col gba:gap-6" data-testid={`${testId}-content`}>
                {isTestMode && testableStepOptions.length > 0 ? (
                  <FlowLaunchSection
                    title="Scope"
                    description="Run the full flow or stop the test after one selected task has completed."
                    data-testid={`${testId}-test-scope`}
                  >
                    <RadioGroup
                      value={testScope}
                      onValueChange={value => setTestScope(value === 'single-step' ? 'single-step' : 'flow')}
                      className="gba:flex gba:flex-col gba:gap-3"
                    >
                      <div className="gba:grid gba:grid-cols-[auto_minmax(0,1fr)] gba:items-start gba:gap-x-3">
                        <RadioGroupItem value="flow" id={`${testId}-scope-flow`} className="gba:mt-0.5 gba:shrink-0" />
                        <Label
                          htmlFor={`${testId}-scope-flow`}
                          className="gba:!flex gba:!h-auto gba:min-w-0 gba:flex-col gba:!items-start gba:!justify-start gba:gap-1 gba:!text-left"
                        >
                          <span className="gba:block gba:text-left">Full flow</span>
                          <span className="gba:block gba:text-left gba:text-xs gba:font-normal gba:text-muted-foreground">
                            Execute the selected path until the workflow completes.
                          </span>
                        </Label>
                      </div>
                      <div className="gba:grid gba:grid-cols-[auto_minmax(0,1fr)] gba:items-start gba:gap-x-3">
                        <RadioGroupItem
                          value="single-step"
                          id={`${testId}-scope-single-step`}
                          className="gba:mt-0.5 gba:shrink-0"
                        />
                        <Label
                          htmlFor={`${testId}-scope-single-step`}
                          className="gba:!flex gba:!h-auto gba:min-w-0 gba:flex-col gba:!items-start gba:!justify-start gba:gap-1 gba:!text-left"
                        >
                          <span className="gba:block gba:text-left">Single task</span>
                          <span className="gba:block gba:text-left gba:text-xs gba:font-normal gba:text-muted-foreground">
                            Execute prerequisites, capture this task result, then stop the test workflow.
                          </span>
                        </Label>
                      </div>
                    </RadioGroup>
                    {testScope === 'single-step' ? (
                      <div className="gba:space-y-2">
                        <Label htmlFor={`${testId}-single-step`}>Task to test</Label>
                        <Select
                          value={selectedSingleStepKey ?? ''}
                          onValueChange={value => setSelectedSingleStepKey(value || null)}
                        >
                          <SelectTrigger id={`${testId}-single-step`}>
                            <SelectValue placeholder="Select task" />
                          </SelectTrigger>
                          <SelectContent className="gba:z-[80]">
                            {testableStepOptions.map(step => (
                              <SelectItem key={step.stepKey} value={step.stepKey}>
                                <span className="gba:flex gba:flex-col gba:items-start gba:gap-0.5">
                                  <span>{step.title}</span>
                                  <span className="gba:text-xs gba:text-muted-foreground">
                                    {getTestStepTypeLabel(step.type)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedSingleStepOption ? (
                          <div className="gba:rounded-md gba:border gba:border-info/30 gba:bg-info/10 gba:p-3 gba:text-xs">
                            <div className="gba:font-medium gba:text-foreground">Upstream data needed</div>
                            {prerequisiteStepLabels.length > 0 ? (
                              <div className="gba:mt-1 gba:text-muted-foreground">
                                This test will also run {prerequisiteStepLabels.length} prerequisite step
                                {prerequisiteStepLabels.length === 1 ? '' : 's'}: {prerequisiteStepLabels.join(', ')}
                              </div>
                            ) : (
                              <div className="gba:mt-1 gba:text-muted-foreground">
                                This task can be tested directly after the start input.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </FlowLaunchSection>
                ) : null}

                <FlowTestDialog
                  asOverlay={isTestMode}
                  open={startFormOpen}
                  onOpenChange={setStartFormOpen}
                  title={startFormTitle}
                  description="These values are used for this test run only and are not saved with the flow."
                  footer={startDialogFooter}
                  data-testid={`${testId}-test-setup-dialog-start`}
                >
                  <FlowLaunchSection
                    title={startFormTitle}
                    description={
                      launchFormContext.mode === 'first-task-form'
                        ? 'This flow has no trigger form. The launcher will submit these values to the first task after start.'
                        : undefined
                    }
                    data-testid={`${testId}-start-form`}
                  >
                    {startInputs.length === 0 ? (
                      <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-no-form`}>
                        {startFormEmptyText}
                      </div>
                    ) : (
                      <Form {...form}>
                        <form className="gba:grid gba:grid-cols-1 gba:gap-6">
                          {startInputs.map((input: any, index: number) => {
                            const fieldName = input.name || `input_${index}`
                            const inputType = String(input.type || '').toUpperCase()
                            const options: Array<{ label: string; value: string }> = Array.isArray(input.options)
                              ? input.options.map(normalizeOption)
                              : []

                            const rules =
                              input.required === true
                                ? inputType === InputType.CHECKBOX || inputType === InputType.MULTISELECT
                                  ? {
                                      validate: (value: any) => {
                                        if (Array.isArray(value)) return value.length > 0 || 'Required'
                                        if (typeof value === 'boolean') return value === true || 'Required'
                                        return Boolean(value) || 'Required'
                                      }
                                    }
                                  : { required: 'Required' as const }
                                : undefined

                            if (inputType === InputType.FILE) {
                              return (
                                <FormField
                                  key={fieldName}
                                  control={form.control}
                                  name={fieldName}
                                  rules={rules as any}
                                  render={({ field }) => (
                                    <FormItem className="gba:space-y-2">
                                      <FormLabel>{input.label || fieldName}</FormLabel>
                                      <FormControl>
                                        <FlowLaunchFileField
                                          value={field.value}
                                          onChange={field.onChange}
                                          disabled={isLaunching || isUploadingFiles}
                                          data-testid={`${testId}-field-${fieldName}`}
                                        />
                                      </FormControl>
                                      {input.description ? (
                                        <div className="gba:text-xs gba:text-muted-foreground gba:leading-5">
                                          {input.description}
                                        </div>
                                      ) : null}
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )
                            }

                            if (inputType === InputType.SIGNATURE) {
                              return (
                                <Alert
                                  key={fieldName}
                                  variant="default"
                                  data-testid={`${testId}-unsupported-${fieldName}`}
                                >
                                  <div className="gba:space-y-1">
                                    <div className="gba:font-medium">{input.label || fieldName}</div>
                                    <div className="gba:text-sm">
                                      This field type isn’t supported in the sidebar yet.
                                    </div>
                                  </div>
                                </Alert>
                              )
                            }

                            return (
                              <FormField
                                key={fieldName}
                                control={form.control}
                                name={fieldName}
                                rules={rules as any}
                                render={({ field }) => (
                                  <FormItem className="gba:space-y-2">
                                    <FormLabel>{input.label || fieldName}</FormLabel>
                                    <FormControl>
                                      {inputType === InputType.TEXTAREA ? (
                                        <Textarea
                                          rows={4}
                                          placeholder={input.placeholder}
                                          {...field}
                                          value={field.value ?? ''}
                                          data-testid={`${testId}-field-${fieldName}`}
                                        />
                                      ) : inputType === InputType.SELECT ? (
                                        input.dataSource ? (
                                          <FlowDataSourceSelect
                                            value={String(field.value ?? '')}
                                            onValueChange={field.onChange}
                                            dataSource={input.dataSource}
                                            accessToken={accessToken}
                                            placeholder={input.placeholder || 'Select'}
                                            initialOptions={options}
                                            data-testid={`${testId}-field-${fieldName}`}
                                          />
                                        ) : (
                                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <SelectTrigger data-testid={`${testId}-field-${fieldName}`}>
                                              <SelectValue placeholder={input.placeholder || 'Select'} />
                                            </SelectTrigger>
                                            <SelectContent className="gba:z-[80]">
                                              {options.map((opt, optIndex) => (
                                                <SelectItem key={`${opt.value}-${optIndex}`} value={opt.value}>
                                                  {opt.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )
                                      ) : inputType === InputType.RADIO ? (
                                        <RadioGroup
                                          onValueChange={field.onChange}
                                          value={field.value ?? ''}
                                          className="gba:flex gba:flex-col gba:gap-3"
                                          data-testid={`${testId}-field-${fieldName}`}
                                        >
                                          {options.map((opt, optIndex) => (
                                            <div
                                              key={`${opt.value}-${optIndex}`}
                                              className="gba:flex gba:items-start gba:gap-3"
                                            >
                                              <RadioGroupItem
                                                value={opt.value}
                                                id={`${fieldName}-${optIndex}`}
                                                data-testid={`${testId}-field-${fieldName}-option-${optIndex}`}
                                              />
                                              <Label htmlFor={`${fieldName}-${optIndex}`} className="gba:leading-5">
                                                {opt.label}
                                              </Label>
                                            </div>
                                          ))}
                                        </RadioGroup>
                                      ) : inputType === InputType.MULTISELECT ? (
                                        input.dataSource ? (
                                          <FlowDataSourceMultiSelect
                                            value={Array.isArray(field.value) ? field.value : []}
                                            onValueChange={field.onChange}
                                            dataSource={input.dataSource}
                                            accessToken={accessToken}
                                            placeholder={input.placeholder || 'Select'}
                                            initialOptions={options}
                                            data-testid={`${testId}-field-${fieldName}`}
                                          />
                                        ) : (
                                          <div
                                            className="gba:flex gba:flex-col gba:gap-3"
                                            data-testid={`${testId}-field-${fieldName}`}
                                          >
                                            {options.map((opt, optIndex) => {
                                              const currentValue = Array.isArray(field.value) ? field.value : []
                                              const checked = currentValue.includes(opt.value)
                                              return (
                                                <div
                                                  key={`${opt.value}-${optIndex}`}
                                                  className="gba:flex gba:items-start gba:gap-3"
                                                >
                                                  <Checkbox
                                                    id={`${fieldName}-${optIndex}`}
                                                    checked={checked}
                                                    onCheckedChange={nextChecked => {
                                                      const next = Boolean(nextChecked)
                                                      const updated = next
                                                        ? Array.from(new Set([...currentValue, opt.value]))
                                                        : currentValue.filter((v: string) => v !== opt.value)
                                                      field.onChange(updated)
                                                    }}
                                                    data-testid={`${testId}-field-${fieldName}-option-${optIndex}`}
                                                  />
                                                  <Label htmlFor={`${fieldName}-${optIndex}`} className="gba:leading-5">
                                                    {opt.label}
                                                  </Label>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )
                                      ) : inputType === InputType.CHECKBOX && options.length > 0 ? (
                                        <div
                                          className="gba:flex gba:flex-col gba:gap-3"
                                          data-testid={`${testId}-field-${fieldName}`}
                                        >
                                          {options.map((opt, optIndex) => {
                                            const currentValue = Array.isArray(field.value) ? field.value : []
                                            const checked = currentValue.includes(opt.value)
                                            return (
                                              <div
                                                key={`${opt.value}-${optIndex}`}
                                                className="gba:flex gba:items-start gba:gap-3"
                                              >
                                                <Checkbox
                                                  id={`${fieldName}-${optIndex}`}
                                                  checked={checked}
                                                  onCheckedChange={nextChecked => {
                                                    const next = Boolean(nextChecked)
                                                    const updated = next
                                                      ? Array.from(new Set([...currentValue, opt.value]))
                                                      : currentValue.filter((v: string) => v !== opt.value)
                                                    field.onChange(updated)
                                                  }}
                                                  data-testid={`${testId}-field-${fieldName}-option-${optIndex}`}
                                                />
                                                <Label htmlFor={`${fieldName}-${optIndex}`} className="gba:leading-5">
                                                  {opt.label}
                                                </Label>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : inputType === InputType.CHECKBOX ? (
                                        <div
                                          className="gba:flex gba:items-start gba:gap-3"
                                          data-testid={`${testId}-field-${fieldName}`}
                                        >
                                          <Checkbox
                                            id={fieldName}
                                            checked={Boolean(field.value)}
                                            onCheckedChange={field.onChange}
                                            data-testid={`${testId}-field-${fieldName}-checkbox`}
                                          />
                                          <Label htmlFor={fieldName} className="gba:leading-5">
                                            {input.placeholder || input.label || fieldName}
                                          </Label>
                                        </div>
                                      ) : (
                                        <Input
                                          type={
                                            inputType === InputType.NUMBER
                                              ? 'number'
                                              : inputType === InputType.DATE
                                                ? 'date'
                                                : inputType === InputType.DATETIME
                                                  ? 'datetime-local'
                                                  : 'text'
                                          }
                                          placeholder={input.placeholder}
                                          {...field}
                                          value={field.value ?? ''}
                                          data-testid={`${testId}-field-${fieldName}`}
                                        />
                                      )}
                                    </FormControl>
                                    {input.description ? (
                                      <div className="gba:text-xs gba:text-muted-foreground gba:leading-5">
                                        {input.description}
                                      </div>
                                    ) : null}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )
                          })}
                        </form>
                      </Form>
                    )}
                  </FlowLaunchSection>
                </FlowTestDialog>
                {!isTestMode && assignments.length > 0 ? (
                  <FlowLaunchSection
                    title="Task assignments"
                    data-testid={`${testId}-assignments`}
                    contentClassName="gba:p-4 gba:space-y-5"
                  >
                    <div className="gba:space-y-5">
                      {assignments.map(a => (
                        <div
                          key={a.stepIndex}
                          className="gba:space-y-2"
                          data-testid={`${testId}-assignment-${a.stepIndex}`}
                        >
                          <div className="gba:flex gba:items-center gba:justify-between">
                            <div className="gba:text-sm gba:font-medium">{a.stepTitle}</div>
                            <Badge variant="outline">{a.assignmentMode}</Badge>
                          </div>
                          {a.selectionMode === 'multi' ? (
                            <AssignmentSelector
                              value={toRuntimeTaskAssignment(a)}
                              onChange={next => handleAssignmentChange(a.stepIndex, next)}
                              assignmentMode={AssignmentMode.ASSIGN}
                              accessToken={accessToken ?? ''}
                              data-testid={`${testId}-assignment-selector-${a.stepIndex}`}
                            />
                          ) : (
                            <AssignmentSelector
                              value={toRuntimeTaskAssignment(a)}
                              onChange={next => handleAssignmentChange(a.stepIndex, next)}
                              assignmentMode={AssignmentMode.ASSIGN_SINGLE}
                              accessToken={accessToken ?? ''}
                              allowedTypes={['people']}
                              maxSelectionsPerField={1}
                              data-testid={`${testId}-assignment-selector-${a.stepIndex}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </FlowLaunchSection>
                ) : null}

                {isTestMode && !launchResult ? (
                  <FlowLaunchSection
                    title="Advanced"
                    description="Inspect the generated test payload before running."
                    defaultOpen={false}
                    data-testid={`${testId}-payload-preview`}
                  >
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                      <div>
                        <div className="gba:text-sm gba:font-medium">Test payload preview</div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          Shows what will be sent for this run. Test inputs, branch choices, agent responses, and
                          assignment fallbacks are not saved.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void copyText('payload', testPayloadPreviewText)}
                        data-testid={`${testId}-payload-preview-copy`}
                      >
                        {copiedOutput === 'payload' ? (
                          <CheckIcon className="gba:h-4 gba:w-4" />
                        ) : (
                          <CopyIcon className="gba:h-4 gba:w-4" />
                        )}
                        <span className="gba:ml-1">{copiedOutput === 'payload' ? 'Copied' : 'Copy'}</span>
                      </Button>
                    </div>
                    <pre className="gba:max-h-64 gba:overflow-auto gba:rounded-md gba:border gba:border-border gba:bg-muted gba:p-3 gba:font-mono gba:text-xs gba:whitespace-pre-wrap gba:break-words">
                      {testPayloadPreviewText}
                    </pre>
                  </FlowLaunchSection>
                ) : null}

                {launchResult ? (
                  <FlowLaunchSection
                    title="Result"
                    description="Current execution status and resolved result summary."
                    className="gba:bg-success-secondary gba:border-success"
                    contentClassName="gba:p-4 gba:space-y-3"
                    data-testid={`${testId}-result`}
                  >
                    <div ref={resultRef}>
                      <div className="gba:text-sm gba:font-medium">Test started</div>
                      <div className="gba:text-xs gba:text-muted-foreground">The flow was started successfully.</div>
                    </div>
                    {interactiveTestSession?.pause?.type === 'TASK' ? (
                      <>
                        <div
                          className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-warning/40 gba:bg-warning/10 gba:p-3"
                          data-testid={`${testId}-interactive-pause-banner`}
                        >
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:text-sm gba:font-medium">Paused</span>
                            <Badge variant="warning">Needs input</Badge>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setPauseOpen(true)}
                            data-testid={`${testId}-open-interactive-pause`}
                          >
                            Provide input
                          </Button>
                        </div>
                        {pauseOpen ? (
                          <DraggableTestDialogContent
                            title="Test paused — needs input"
                            description={
                              Array.isArray(interactiveTestSession.pause.form) &&
                              interactiveTestSession.pause.form.some((field: any) => field?.name === 'decisionBranch')
                                ? 'Choose which branch should run next.'
                                : interactiveTestSession.pause.claimRequired &&
                                    !interactiveTestSession.pause.claimSimulated
                                  ? 'Simulate claiming this task before entering test input or completing it.'
                                  : 'Review or enter the task input, then continue the test.'
                            }
                            width="min(36rem, calc(100vw - 2rem))"
                            bodyClassName="gba:space-y-3"
                            onClose={() => {
                              setDismissedPauseDialogKey(runtimePauseDialogKey)
                              setPauseOpen(false)
                            }}
                            footer={
                              <>
                                {interactiveTestSession.pause.claimRequired &&
                                !interactiveTestSession.pause.claimSimulated ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void handleClaimInteractiveTask()}
                                    disabled={isContinuingInteractiveTest}
                                    data-testid={`${testId}-interactive-claim`}
                                  >
                                    {isContinuingInteractiveTest ? (
                                      <span className="gba:flex gba:items-center gba:gap-2">
                                        <Spinner size="sm" />
                                        Claiming
                                      </span>
                                    ) : (
                                      'Simulate claim'
                                    )}
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  onClick={handleContinueInteractiveTest}
                                  disabled={
                                    isContinuingInteractiveTest ||
                                    (interactiveTestSession.pause.claimRequired &&
                                      !interactiveTestSession.pause.claimSimulated)
                                  }
                                  data-testid={`${testId}-interactive-continue`}
                                >
                                  {isContinuingInteractiveTest ? (
                                    <span className="gba:flex gba:items-center gba:gap-2">
                                      <Spinner size="sm" />
                                      Continuing
                                    </span>
                                  ) : (
                                    'Continue test'
                                  )}
                                </Button>
                              </>
                            }
                            data-testid={`${testId}-interactive-pause-dialog`}
                          >
                            <div className="gba:space-y-4" data-testid={`${testId}-interactive-pause`}>
                              <div className="gba:text-xs gba:font-medium">
                                {interactiveTestSession.pause.stepTitle ||
                                  interactiveTestSession.pause.stepReference ||
                                  'Current task'}
                              </div>
                              {interactiveTestSession.pause.claimRequired ? (
                                <div className="gba:rounded-lg gba:border gba:border-info/30 gba:bg-info/10 gba:p-3 gba:text-xs">
                                  <div className="gba:font-medium gba:text-foreground">
                                    {interactiveTestSession.pause.claimSimulated ? 'Claim simulated' : 'Claim required'}
                                  </div>
                                  <div className="gba:mt-1 gba:text-muted-foreground">
                                    {interactiveTestSession.pause.claimSimulated
                                      ? `Task was claimed by ${formatSummaryValue(
                                          interactiveTestSession.pause.claimUserId || currentUserId,
                                          userDisplayNames
                                        )} for this test run.`
                                      : 'This task is configured as claimable. Simulate claiming it to verify configured claim targets before continuing.'}
                                  </div>
                                </div>
                              ) : null}
                              {Array.isArray(interactiveTestSession.pause.form) &&
                              interactiveTestSession.pause.form.length > 0 ? (
                                <div className="gba:space-y-3">
                                  {interactiveTestSession.pause.form.map((field: any, fieldIndex: number) => {
                                    const name = String(field?.name || field?.id || field?.key || `field_${fieldIndex}`)
                                    const inputField: AgentTestField = {
                                      name,
                                      label: field?.label || field?.title || formatFieldLabel(name),
                                      type: String(field?.type || 'text').toLowerCase(),
                                      description:
                                        typeof field?.description === 'string' ? field.description : undefined,
                                      options: Array.isArray(field?.options) ? field.options : undefined
                                    }
                                    return (
                                      <div key={`${name}-${fieldIndex}`} className="gba:space-y-2">
                                        <Label htmlFor={`${testId}-interactive-${name}`}>
                                          {inputField.label}
                                          {field?.required === true ? ' *' : ''}
                                        </Label>
                                        {renderTestValueField(
                                          'interactive-pause',
                                          inputField,
                                          interactivePauseValues[name],
                                          updateInteractivePauseField
                                        )}
                                        {inputField.description ? (
                                          <div className="gba:text-xs gba:text-muted-foreground">
                                            {inputField.description}
                                          </div>
                                        ) : null}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="gba:text-xs gba:text-muted-foreground">
                                  This task has no form fields. Continue when ready.
                                </div>
                              )}
                              {interactiveTestSession.pause.type === 'TASK' &&
                              !interactiveTestSession.pause.form?.some(
                                (field: any) => field?.name === 'decisionBranch'
                              ) ? (
                                <div className="gba:space-y-2 gba:rounded-lg gba:border gba:border-border gba:p-3">
                                  <div className="gba:text-xs gba:font-medium">Assignment override (optional)</div>
                                  <div className="gba:text-xs gba:text-muted-foreground">
                                    Leave empty to keep the configured assignment (defaults to the current user). Pick a
                                    person to reassign this task for this test run.
                                  </div>
                                  <AssignmentSelector
                                    value={
                                      interactivePauseAssignment ?? {
                                        assignmentMode: AssignmentMode.ASSIGN_SINGLE,
                                        targets: {},
                                        allowReassignment: true
                                      }
                                    }
                                    onChange={next => setInteractivePauseAssignment(next)}
                                    assignmentMode={AssignmentMode.ASSIGN_SINGLE}
                                    accessToken={accessToken ?? ''}
                                    allowedTypes={['people']}
                                    maxSelectionsPerField={1}
                                    data-testid={`${testId}-interactive-assignment`}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </DraggableTestDialogContent>
                        ) : null}
                      </>
                    ) : null}
                    {interactiveTestSession?.pause?.type === 'AGENT' ? (
                      <>
                        <div
                          className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-info/40 gba:bg-info/10 gba:p-3"
                          data-testid={`${testId}-agent-pause-banner`}
                        >
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Badge variant="outline">Agent step</Badge>
                            <span className="gba:text-sm gba:font-medium">
                              {interactiveTestSession.pause.stepTitle ||
                                interactiveTestSession.pause.stepReference ||
                                'Agent response needed'}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAgentPauseOpen(true)}
                            data-testid={`${testId}-agent-pause-open`}
                          >
                            Provide response
                          </Button>
                        </div>
                        {agentPauseOpen ? (
                          <DraggableTestDialogContent
                            title="Agent test response"
                            description="The run reached an agent step. Provide a test response to continue, or skip to use the existing test behavior."
                            width="min(36rem, calc(100vw - 2rem))"
                            bodyClassName="gba:space-y-4"
                            onClose={() => {
                              setDismissedAgentDialogKey(runtimePauseDialogKey)
                              setAgentPauseOpen(false)
                            }}
                            footer={
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleContinueAgentTest(true)}
                                  disabled={isContinuingInteractiveTest}
                                  data-testid={`${testId}-agent-pause-skip`}
                                >
                                  Skip
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => void handleContinueAgentTest(false)}
                                  disabled={isContinuingInteractiveTest}
                                  data-testid={`${testId}-agent-pause-submit`}
                                >
                                  {isContinuingInteractiveTest ? (
                                    <span className="gba:flex gba:items-center gba:gap-2">
                                      <Spinner size="sm" />
                                      Continuing
                                    </span>
                                  ) : (
                                    'Submit response'
                                  )}
                                </Button>
                              </>
                            }
                            data-testid={`${testId}-agent-pause-dialog`}
                          >
                            <div data-testid={`${testId}-agent-pause`}>
                              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                                <div className="gba:text-sm gba:font-medium">
                                  {interactiveTestSession.pause.stepTitle ||
                                    interactiveTestSession.pause.stepReference ||
                                    'Agent step'}
                                </div>
                                {interactiveTestSession.pause.stepReference ? (
                                  <Badge variant="outline">{interactiveTestSession.pause.stepReference}</Badge>
                                ) : null}
                              </div>
                              <div className="gba:space-y-2">
                                <Label htmlFor={`${testId}-agent-pause-mode`}>Agent test mode</Label>
                                <Select
                                  value={agentPauseMode}
                                  onValueChange={value => setAgentPauseMode(value as AgentTestMode)}
                                  disabled={isContinuingInteractiveTest}
                                >
                                  <SelectTrigger id={`${testId}-agent-pause-mode`}>
                                    <SelectValue placeholder="Select agent test mode" />
                                  </SelectTrigger>
                                  <SelectContent className="gba:z-[80]">
                                    <SelectItem value="TEST_RESPONSE">Use this test response</SelectItem>
                                    <SelectItem value="REAL_WITH_TEST_FALLBACK">
                                      Use real agent, fallback to this response
                                    </SelectItem>
                                    <SelectItem value="REAL_ONLY">Require real agent response</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="gba:text-xs gba:text-muted-foreground">
                                  {agentPauseMode === 'TEST_RESPONSE'
                                    ? 'The test continues immediately with the response below.'
                                    : agentPauseMode === 'REAL_ONLY'
                                      ? 'The test waits for the real agent. It fails on timeout if no response arrives.'
                                      : 'The test waits briefly for the real agent, then uses the response below.'}
                                </div>
                              </div>
                              {agentPauseMode !== 'REAL_ONLY' && agentPauseStep && agentPauseStep.fields.length > 0 ? (
                                <div className="gba:space-y-3">
                                  {agentPauseStep.fields.map(field => (
                                    <div key={field.name} className="gba:space-y-2">
                                      <Label htmlFor={`${testId}-agent-pause-${field.name}`}>{field.label}</Label>
                                      {renderTestValueField(
                                        'agent-pause',
                                        field,
                                        agentPauseResponse[field.name],
                                        updateAgentPauseField
                                      )}
                                      {field.description ? (
                                        <div className="gba:text-xs gba:text-muted-foreground">{field.description}</div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : agentPauseMode !== 'REAL_ONLY' ? (
                                <div className="gba:text-xs gba:text-muted-foreground">
                                  This agent has no result schema fields. Submit to continue with a default test
                                  response, or skip to use the existing test behavior.
                                </div>
                              ) : null}
                            </div>
                          </DraggableTestDialogContent>
                        ) : null}
                      </>
                    ) : null}
                    <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-3 gba:space-y-3">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <div className="gba:text-sm gba:font-medium">Flow status</div>
                        {testFlowStatus.isLoading ? <Spinner size="sm" /> : null}
                      </div>
                      {testFlowStatus.error ? (
                        <div className="gba:text-sm gba:text-destructive">{testFlowStatus.error}</div>
                      ) : (
                        <div className="gba:grid gba:grid-cols-[auto_1fr] gba:gap-x-3 gba:gap-y-1 gba:text-sm">
                          <span className="gba:text-muted-foreground">Status</span>
                          <span>{formatTestFlowStatus(testFlowStatus.status)}</span>
                          {typeof testFlowStatus.progress === 'number' ? (
                            <>
                              <span className="gba:text-muted-foreground">Progress</span>
                              <span>{Math.round(testFlowStatus.progress)}%</span>
                            </>
                          ) : null}
                        </div>
                      )}
                      {liveStepItems.length > 0 ? (
                        <div className="gba:space-y-2">
                          <div className="gba:text-sm gba:font-medium">Live task progress</div>
                          <div className="gba:space-y-2">
                            {liveStepItems.map(item => {
                              const isActive = item.status === 'active'
                              const badgeVariant =
                                item.status === 'done'
                                  ? 'success'
                                  : isActive
                                    ? 'warning'
                                    : item.status === 'next'
                                      ? 'secondary'
                                      : 'outline'
                              const statusLabel =
                                item.status === 'done'
                                  ? 'Done'
                                  : isActive
                                    ? 'Active'
                                    : item.status === 'next'
                                      ? 'Next'
                                      : 'Pending'
                              const { businessFields, technicalFields } = splitStepResultFields(item.resultFields)
                              const isRunnerSubmitted = isRunnerSubmittedStepFields(item.resultFields)

                              return (
                                <div
                                  key={item.reference}
                                  className={`gba:space-y-2 gba:rounded-md gba:border gba:p-2 ${
                                    isActive
                                      ? 'gba:border-warning/50 gba:bg-warning/10'
                                      : 'gba:border-border gba:bg-muted/20'
                                  }`}
                                  data-testid={`${testId}-live-step-${item.reference}`}
                                >
                                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                                    <div className="gba:min-w-0">
                                      <div className="gba:truncate gba:text-xs gba:font-medium">{item.title}</div>
                                      <div className="gba:mt-0.5 gba:flex gba:items-center gba:gap-2 gba:text-[11px] gba:text-muted-foreground">
                                        <span>{getTestStepTypeLabel(item.type)}</span>
                                        {typeof item.progress === 'number' ? <span>{item.progress}%</span> : null}
                                      </div>
                                    </div>
                                    <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
                                      {isActive ? <Spinner size="sm" /> : null}
                                      <Badge variant={badgeVariant}>{statusLabel}</Badge>
                                    </div>
                                  </div>
                                  {businessFields.length > 0 ? (
                                    <div className="gba:grid gba:grid-cols-[auto_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2 gba:text-sm">
                                      {businessFields.map((field, fieldIndex) => (
                                        <React.Fragment key={`${field.label}-${fieldIndex}`}>
                                          <span className="gba:text-muted-foreground">
                                            {formatBusinessResultLabel(field.label, isRunnerSubmitted)}
                                          </span>
                                          <JsonResultValue
                                            value={field.value}
                                            userDisplayNames={userDisplayNames}
                                            fieldLabel={field.label}
                                          />
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  ) : null}
                                  {technicalFields.length > 0 ? (
                                    <FlowLaunchSection
                                      title="Technical details"
                                      description="Raw step status, assignments, IDs, and execution metadata."
                                      defaultOpen={false}
                                      contentClassName="gba:p-3"
                                      className="gba:bg-background/60"
                                    >
                                      <div className="gba:grid gba:grid-cols-[auto_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2 gba:text-sm">
                                        {technicalFields.map((field, fieldIndex) => (
                                          <React.Fragment key={`${field.label}-${fieldIndex}`}>
                                            <span className="gba:text-muted-foreground">
                                              {formatBusinessResultLabel(field.label, isRunnerSubmitted)}
                                            </span>
                                            <JsonResultValue
                                              value={field.value}
                                              userDisplayNames={userDisplayNames}
                                              fieldLabel={field.label}
                                            />
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    </FlowLaunchSection>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                      {testFlowStatus.summaryData.length > 0 ? (
                        <div className="gba:space-y-2">
                          <div className="gba:text-sm gba:font-medium">Result summary</div>
                          {launchResult.testRun?.completedTasks.length ? (
                            <div className="gba:text-xs gba:text-muted-foreground">
                              Some values can come from launch form or task test inputs submitted by the test runner.
                            </div>
                          ) : null}
                          <div className="gba:grid gba:grid-cols-[auto_1fr] gba:gap-x-3 gba:gap-y-1 gba:text-sm">
                            {testFlowStatus.summaryData.map((item, index) => (
                              <React.Fragment key={`${item.label}-${index}`}>
                                <span className="gba:text-muted-foreground">{item.label}</span>
                                <JsonResultValue
                                  value={item.value}
                                  userDisplayNames={userDisplayNames}
                                  fieldLabel={item.label}
                                />
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {testFlowStatus.summaryData.length === 0 &&
                      testFlowStatus.stepResults.length === 0 &&
                      liveStepItems.length === 0 ? (
                        <div className="gba:text-xs gba:text-muted-foreground">
                          {testFlowStatus.status === 'COMPLETED'
                            ? 'No result summary fields are configured for this flow.'
                            : 'No result summary yet. This flow is waiting for user tasks, or it has no summary fields.'}
                        </div>
                      ) : null}
                    </div>
                    <FlowLaunchSection
                      title="Advanced"
                      description="Workflow identifiers, raw result JSON, and diagnostics."
                      defaultOpen={false}
                      contentClassName="gba:p-3 gba:space-y-3"
                    >
                      <div className="gba:grid gba:grid-cols-[auto_1fr] gba:gap-x-3 gba:gap-y-1 gba:text-sm">
                        <span className="gba:text-muted-foreground">Workflow ID</span>
                        <span className="gba:font-mono gba:text-xs gba:break-all">{launchResult.workflowId}</span>
                        {launchResult.workflowName ? (
                          <>
                            <span className="gba:text-muted-foreground">Workflow</span>
                            <span>{launchResult.workflowName}</span>
                          </>
                        ) : null}
                      </div>
                      <Tabs defaultValue="result" data-testid={`${testId}-output-tabs`}>
                        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                          <TabsList>
                            <TabsTrigger value="result" data-testid={`${testId}-output-tab-result`}>
                              Result
                            </TabsTrigger>
                            <TabsTrigger value="diagnostics" data-testid={`${testId}-output-tab-diagnostics`}>
                              Diagnostics
                            </TabsTrigger>
                          </TabsList>
                        </div>
                        <TabsContent value="result" className="gba:mt-3">
                          <div className="gba:relative">
                            <pre
                              className="gba:max-h-72 gba:overflow-auto gba:rounded-md gba:border gba:border-border gba:bg-muted gba:p-3 gba:pr-12 gba:font-mono gba:text-xs gba:whitespace-pre-wrap gba:break-words"
                              data-testid={`${testId}-output-result`}
                            >
                              {testResultText}
                            </pre>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void copyText('result', testResultText)}
                              className="gba:absolute gba:right-2 gba:top-2"
                              data-testid={`${testId}-output-result-copy`}
                              aria-label={copiedOutput === 'result' ? 'Copied result' : 'Copy result'}
                            >
                              {copiedOutput === 'result' ? (
                                <CheckIcon className="gba:h-4 gba:w-4" />
                              ) : (
                                <CopyIcon className="gba:h-4 gba:w-4" />
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                        <TabsContent value="diagnostics" className="gba:mt-3">
                          <div className="gba:relative">
                            <div
                              className="gba:max-h-72 gba:overflow-auto gba:rounded-md gba:border gba:border-border gba:bg-muted gba:p-3 gba:pr-12 gba:space-y-2"
                              data-testid={`${testId}-output-diagnostics`}
                            >
                              {testDiagnostics.length > 0 ? (
                                testDiagnostics.map((item, index) => (
                                  <div
                                    key={`${item.type}-${index}`}
                                    className="gba:rounded-md gba:border gba:border-border gba:bg-background gba:p-2 gba:space-y-1"
                                  >
                                    <div className="gba:flex gba:items-center gba:gap-2">
                                      <Badge variant={item.type === 'error' ? 'destructive' : 'outline'}>
                                        {item.type}
                                      </Badge>
                                      <div className="gba:text-xs gba:font-medium">{item.label}</div>
                                    </div>
                                    <div className="gba:text-xs gba:text-muted-foreground gba:break-words">
                                      {item.message}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="gba:text-xs gba:text-muted-foreground">
                                  No diagnostics for this test yet.
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void copyText('diagnostics', testDiagnosticsText)}
                              disabled={!testDiagnosticsText.trim()}
                              className="gba:absolute gba:right-2 gba:top-2"
                              data-testid={`${testId}-output-diagnostics-copy`}
                              aria-label={copiedOutput === 'diagnostics' ? 'Copied diagnostics' : 'Copy diagnostics'}
                            >
                              {copiedOutput === 'diagnostics' ? (
                                <CheckIcon className="gba:h-4 gba:w-4" />
                              ) : (
                                <CopyIcon className="gba:h-4 gba:w-4" />
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </FlowLaunchSection>
                  </FlowLaunchSection>
                ) : null}
              </div>
            ) : null}
          </div>

          <Separator />

          <div
            className="gba:shrink-0 gba:px-4 gba:py-4 gba:flex gba:items-center gba:justify-end gba:gap-2"
            data-testid={`${testId}-footer`}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLaunching || isUploadingFiles || isStoppingTest}
              data-testid={`${testId}-cancel`}
            >
              Cancel
            </Button>
            {isTestRunActive ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleStopTest}
                disabled={isStoppingTest}
                data-testid={`${testId}-stop`}
              >
                {isStoppingTest ? (
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <Spinner size="sm" />
                    Stopping
                  </span>
                ) : (
                  'Stop test'
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="default"
              onClick={handleRunTestClick}
              disabled={!canLaunch || isLaunching || isUploadingFiles || isTestRunActive || isStoppingTest}
              data-testid={`${testId}-launch`}
            >
              {isLaunching ? (
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  {launchingLabel}
                </span>
              ) : (
                launchButtonLabel
              )}
            </Button>
          </div>
        </div>
        {isTestMode ? (
          <div
            className="gba:flex gba:h-full gba:min-w-0 gba:flex-1 gba:flex-col gba:overflow-hidden gba:bg-background"
            data-testid={`${testId}-preview`}
          >
            {testPreview}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export default FlowLaunchSheet
