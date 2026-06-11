import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { CheckIcon, CopyIcon, PushPinIcon, PushPinSlashIcon } from '@phosphor-icons/react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
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
import { useForm } from 'react-hook-form'
import {
  AssignmentMode,
  FlowTemplateClient,
  InputType,
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
import {
  buildRuntimeAssignmentsPayload,
  coerceFormDataBySchema,
  collectRuntimeAssignments,
  getFallbackCompletionUserId,
  hasAssignmentTargets,
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

type BranchTestOption = {
  decisionStepKey: string
  decisionTitle: string
  branchId: string
  branchLabel: string
  targetStepIndex?: number
  mergeStepIndex?: number
  inputValues: Record<string, unknown>
  description: string
}

const AGENT_TEST_STEP_TYPES = new Set(['AI_AGENT', 'AGENT', 'AI_TASK_EXPERT', 'TASK_EXPERT'])
const LOGIC_EXPRESSION_PATTERN =
  /\{\{\s*\$workflow\.input\.([a-zA-Z0-9_]+)\s*\}\}\s*(<=|>=|<|>|={1,3})\s*(-?\d+(?:\.\d+)?)/g

function buildJsonSchemaTestValue(schema: any): unknown {
  const type = Array.isArray(schema?.type) ? schema.type[0] : schema?.type
  const properties = schema?.properties && typeof schema.properties === 'object' ? schema.properties : null

  if (properties) {
    return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, buildJsonSchemaTestValue(value)]))
  }

  if (Array.isArray(schema?.enum) && schema.enum.length > 0) return schema.enum[0]
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
        stepKey: `step_${index}`,
        stepIndex: index,
        title: step?.title || `Agent step ${index + 1}`,
        fields,
        response:
          response && typeof response === 'object' && !Array.isArray(response)
            ? (response as Record<string, unknown>)
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
    if (!['TASK', 'USER_TASK', 'HUMAN'].includes(stepType)) return []

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
        stepKey: `step_${index}`,
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

function getLogicExpressionComparisons(
  expression: string
): Array<{ fieldName: string; operator: string; value: number }> {
  return Array.from(expression.matchAll(LOGIC_EXPRESSION_PATTERN)).map(match => ({
    fieldName: match[1],
    operator: match[2],
    value: Number(match[3])
  }))
}

function getBranchInputValue(expression: string): Record<string, unknown> {
  const comparisons = getLogicExpressionComparisons(expression)
  const byField = comparisons.reduce<Record<string, typeof comparisons>>((acc, comparison) => {
    acc[comparison.fieldName] = [...(acc[comparison.fieldName] || []), comparison]
    return acc
  }, {})

  return Object.fromEntries(
    Object.entries(byField).map(([fieldName, fieldComparisons]) => {
      const lower = fieldComparisons
        .filter(item => item.operator === '>' || item.operator === '>=')
        .map(item => item.value)
      const upper = fieldComparisons
        .filter(item => item.operator === '<' || item.operator === '<=')
        .map(item => item.value)
      const exact = fieldComparisons.find(item => item.operator.includes('=') && !['>=', '<='].includes(item.operator))

      if (exact) return [fieldName, String(exact.value)]
      if (lower.length > 0 && upper.length > 0)
        return [fieldName, String(Math.round((Math.max(...lower) + Math.min(...upper)) / 2))]
      if (lower.length > 0) return [fieldName, String(Math.max(...lower) + 1)]
      if (upper.length > 0) return [fieldName, String(Math.min(...upper) - 1)]
      return [fieldName, 'test']
    })
  )
}

function getDefaultBranchInputValue(conditions: Array<{ expression?: string }>): Record<string, unknown> {
  const comparisons = conditions.flatMap(condition => getLogicExpressionComparisons(String(condition.expression || '')))
  const firstField = comparisons[0]?.fieldName
  if (!firstField) return {}

  const upperBounds = comparisons
    .filter(item => item.fieldName === firstField && (item.operator === '<' || item.operator === '<='))
    .map(item => item.value)
  const lowerBounds = comparisons
    .filter(item => item.fieldName === firstField && (item.operator === '>' || item.operator === '>='))
    .map(item => item.value)

  if (upperBounds.length > 0) return { [firstField]: String(Math.max(...upperBounds) + 1) }
  if (lowerBounds.length > 0) return { [firstField]: String(Math.min(...lowerBounds) - 1) }
  return {}
}

function getBranchTestOptions(template: FlowTemplate | null): BranchTestOption[] {
  const steps = Array.isArray(template?.steps) ? template.steps : []
  return steps.flatMap((step: any, index: number) => {
    if (String(step?.type || '').toUpperCase() !== 'DECISION') return []
    if (String(step?.decisionMode || '').toUpperCase() !== 'LOGIC') return []

    const decisionStepKey = `step_${index}`
    const conditions = Array.isArray(step?.logicConfig?.conditions) ? step.logicConfig.conditions : []
    const branches = Array.isArray(step?.branches) ? step.branches : []

    return branches.map((branch: any) => {
      const condition = conditions.find((item: any) => item?.branchId === branch?.id)
      const inputValues = condition?.expression
        ? getBranchInputValue(String(condition.expression))
        : getDefaultBranchInputValue(conditions)
      return {
        decisionStepKey,
        decisionTitle: step?.title || `Decision ${index + 1}`,
        branchId: String(branch?.id || ''),
        branchLabel: branch?.label || branch?.id || 'Branch',
        targetStepIndex: typeof branch?.nextStep === 'number' ? branch.nextStep : undefined,
        mergeStepIndex: typeof step?.nextStep === 'number' ? step.nextStep : undefined,
        inputValues,
        description: condition?.expression || 'Default branch'
      }
    })
  })
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
      const stepKey = `step_${currentIndex}`
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
    const decisionStepKey = `step_${decisionIndex}`
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

function getDefaultTestInputValue(input: any): unknown {
  const inputType = String(input?.type || '').toUpperCase()
  const options = Array.isArray(input?.options) ? input.options.map(normalizeOption) : []
  const fieldText = `${input?.name || ''} ${input?.label || ''}`.toLowerCase()

  if (inputType === InputType.NUMBER) return 1
  if (inputType === InputType.DATE) return new Date().toISOString().slice(0, 10)
  if (inputType === InputType.DATETIME) return new Date().toISOString().slice(0, 16)
  if (inputType === InputType.CHECKBOX) return options.length > 0 ? [options[0].value] : true
  if (inputType === InputType.MULTISELECT) return options.length > 0 ? [options[0].value] : []
  if (inputType === InputType.SELECT || inputType === InputType.RADIO) return options[0]?.value
  if (fieldText.includes('mail')) return 'test@example.com'
  return 'test'
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
}

type TestFlowStatus = {
  isLoading: boolean
  error: string | null
  status: string | null
  progress: number | null
  timedOut: boolean
  pendingSteps: string[]
  summaryData: Array<{ label: string; value: unknown }>
  stepResults: Array<{
    stepTitle: string
    fields: Array<{ label: string; value: unknown }>
  }>
}

const TERMINAL_FLOW_STATUSES = new Set(['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT', 'CANCELED', 'CANCELLED'])
const TEST_RESULT_POLL_INTERVAL_MS = 2000
const TEST_RESULT_TIMEOUT_MS = 180_000
const DEFAULT_SHEET_WIDTH = 576
const MIN_SHEET_WIDTH = 420
const MAX_SHEET_WIDTH = 960

function isTerminalFlowStatus(status: string | null | undefined): boolean {
  return TERMINAL_FLOW_STATUSES.has(String(status || '').toUpperCase())
}

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function formatFieldLabel(field: string): string {
  return String(field || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase())
}

export interface FlowLaunchSheetProps extends Partial<BusinessAppContextProps> {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string | null
  templateDefinition?: Omit<FlowTemplate, 'id'> | null
  mode?: 'launch' | 'test'
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
  'data-testid': testId = 'flow-launch-sheet'
}) => {
  const form = useForm<Record<string, any>>({ defaultValues: {} })
  const [template, setTemplate] = useState<FlowTemplate | null>(null)
  const [assignments, setAssignments] = useState<RuntimeAssignment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launchResult, setLaunchResult] = useState<FlowLaunchResult | null>(null)
  const [agentTestResponses, setAgentTestResponses] = useState<Record<string, Record<string, unknown>>>({})
  const [agentTestModes, setAgentTestModes] = useState<Record<string, AgentTestMode>>({})
  const [taskTestResponses, setTaskTestResponses] = useState<Record<string, Record<string, unknown>>>({})
  const [selectedBranchTests, setSelectedBranchTests] = useState<Record<string, string>>({})
  const [isPinned, setIsPinned] = useState(mode === 'test')
  const [sheetWidth, setSheetWidth] = useState(DEFAULT_SHEET_WIDTH)
  const [copiedOutput, setCopiedOutput] = useState<string | null>(null)
  const [testFlowStatus, setTestFlowStatus] = useState<TestFlowStatus>({
    isLoading: false,
    error: null,
    status: null,
    progress: null,
    timedOut: false,
    pendingSteps: [],
    summaryData: [],
    stepResults: []
  })
  const resultRef = React.useRef<HTMLDivElement | null>(null)
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
  const launchButtonLabel = isTestMode ? 'Run test' : 'Launch'
  const launchingLabel = isTestMode ? 'Testing' : 'Launching'
  const successTitle = isTestMode ? 'Flow test started' : 'Flow launched'
  const failureTitle = isTestMode ? 'Flow test failed' : 'Launch failed'
  const startFormEmptyText =
    launchFormContext.mode === 'first-task-form'
      ? 'This flow has no launcher form and the first task does not expose a supported form fallback.'
      : 'This flow has no start form fields.'
  const agentTestSteps = useMemo(() => (isTestMode ? getAgentTestSteps(template) : []), [isTestMode, template])
  const taskTestSteps = useMemo(() => (isTestMode ? getTaskTestSteps(template) : []), [isTestMode, template])
  const branchTestOptions = useMemo(() => (isTestMode ? getBranchTestOptions(template) : []), [isTestMode, template])
  const reachableStepIndexes = useMemo(
    () => (isTestMode ? getReachableStepIndexes(template, selectedBranchTests) : null),
    [isTestMode, selectedBranchTests, template]
  )
  const visibleAgentTestSteps = useMemo(
    () => (isTestMode ? getReachableTestSteps(template, agentTestSteps, selectedBranchTests) : agentTestSteps),
    [agentTestSteps, isTestMode, selectedBranchTests, template]
  )
  const visibleTaskTestSteps = useMemo(() => {
    const reachableSteps = isTestMode
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
    selectedBranchTests,
    taskTestSteps,
    template
  ])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (open && isTestMode && isPinned) {
      root.style.setProperty('--flow-test-panel-offset', `${sheetWidth}px`)
      root.style.setProperty('--flow-test-panel-gap', '8px')
      return () => {
        root.style.removeProperty('--flow-test-panel-offset')
        root.style.removeProperty('--flow-test-panel-gap')
      }
    }

    root.style.removeProperty('--flow-test-panel-offset')
    root.style.removeProperty('--flow-test-panel-gap')
    return undefined
  }, [isPinned, isTestMode, open, sheetWidth])

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
          summaryData: [],
          stepResults: []
        })
      }
      setTemplate(dynamicTemplate)
      setAgentTestResponses(getDefaultAgentTestResponses(dynamicTemplate))
      setAgentTestModes(getDefaultAgentTestModes(dynamicTemplate))
      setTaskTestResponses(getDefaultTaskTestResponses(dynamicTemplate))
      setSelectedBranchTests({})
      setAssignments(collectRuntimeAssignments(dynamicTemplate, resolveLaunchFormContext(dynamicTemplate)))
      clearUploadError()
      form.reset({})
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
        setAssignments(collectRuntimeAssignments(tpl, resolveLaunchFormContext(tpl)))
        form.reset({})
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load template')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [accessToken, clearUploadError, form, isTestMode, open, templateDefinition, templateId])

  const canLaunch = useMemo(() => {
    if (isLoading) return false
    if (!template) return false
    if (!accessToken) return false
    if (isUploadingFiles) return false
    if (isTestMode) return true
    return assignments.every(a => hasAssignmentTargets(a.targets))
  }, [accessToken, assignments, isLoading, isTestMode, isUploadingFiles, template])
  const isTestRunActive = Boolean(
    isTestMode &&
      launchResult &&
      !testFlowStatus.error &&
      !testFlowStatus.timedOut &&
      !isTerminalFlowStatus(testFlowStatus.status)
  )

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

  const agentResponses =
    isTestMode && visibleAgentTestSteps.length > 0
      ? Object.fromEntries(visibleAgentTestSteps.map(step => [step.stepKey, agentTestResponses[step.stepKey] || {}]))
      : undefined
  const agentResponseModes =
    isTestMode && visibleAgentTestSteps.length > 0
      ? Object.fromEntries(
          visibleAgentTestSteps.map(step => [step.stepKey, agentTestModes[step.stepKey] || 'REAL_ONLY'])
        )
      : undefined
  const userTaskResponses =
    isTestMode && visibleTaskTestSteps.length > 0
      ? Object.fromEntries(visibleTaskTestSteps.map(step => [step.stepKey, taskTestResponses[step.stepKey] || {}]))
      : undefined
  const expectedBranches = isTestMode && Object.keys(selectedBranchTests).length > 0 ? selectedBranchTests : undefined
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
      ...(agentResponses ? { agentResponses } : {}),
      ...(agentResponseModes ? { agentResponseModes } : {}),
      ...(userTaskResponses ? { userTaskResponses } : {}),
      ...(expectedBranches ? { expectedBranches } : {})
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

  const applyBranchTestOption = (option: BranchTestOption) => {
    Object.entries(option.inputValues).forEach(([fieldName, value]) => {
      form.setValue(fieldName, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    })
    setSelectedBranchTests(current => ({
      ...current,
      [option.decisionStepKey]: option.branchId
    }))
  }

  const updateAgentTestResponseField = (stepKey: string, fieldName: string, value: unknown) => {
    setAgentTestResponses(current => ({
      ...current,
      [stepKey]: {
        ...(current[stepKey] || {}),
        [fieldName]: value
      }
    }))
  }

  const updateTaskTestResponseField = (stepKey: string, fieldName: string, value: unknown) => {
    setTaskTestResponses(current => ({
      ...current,
      [stepKey]: {
        ...(current[stepKey] || {}),
        [fieldName]: value
      }
    }))
  }

  const copyText = async (key: string, text: string) => {
    if (!text.trim()) return
    await navigator.clipboard?.writeText(text)
    setCopiedOutput(key)
    globalThis.setTimeout(() => setCopiedOutput(current => (current === key ? null : current)), 1200)
  }

  const fillMissingRequiredTestInputs = () => {
    startInputs.forEach((input: any, index: number) => {
      if (input.required !== true) return
      const fieldName = input.name || `input_${index}`
      if (!isEmptyLaunchValue(form.getValues(fieldName))) return

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
      const nextWidth = Math.min(maxWidth, Math.max(MIN_SHEET_WIDTH, viewportWidth - moveEvent.clientX))
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
    setTestFlowStatus({
      isLoading: false,
      error: null,
      status: null,
      progress: null,
      timedOut: false,
      pendingSteps: [],
      summaryData: [],
      stepResults: []
    })
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
              testOptions:
                agentResponses || userTaskResponses || expectedBranches
                  ? {
                      ...(agentResponses ? { agentResponses } : {}),
                      ...(agentResponseModes ? { agentResponseModes } : {}),
                      ...(userTaskResponses ? { userTaskResponses } : {}),
                      ...(expectedBranches ? { expectedBranches } : {})
                    }
                  : undefined
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
        setLaunchResult(result)
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

  useEffect(() => {
    if (!launchResult || !isTestMode || !accessToken) return

    let cancelled = false
    let attempt = 0
    const maxAttempts = Math.ceil(TEST_RESULT_TIMEOUT_MS / TEST_RESULT_POLL_INTERVAL_MS)
    let lastStatus: string | null = null
    let lastPendingSteps: string[] = []
    const userId = userInfo?.id || userInfo?.employeeDetails?.employeeId || userInfo?.userName || 'unknown'
    const apiBase = getFlowEngineApiBaseUrl()
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }

    const loadStatus = async () => {
      attempt += 1
      setTestFlowStatus(current => ({ ...current, isLoading: true, error: null }))

      try {
        const [progressResponse, stepsResponse] = await Promise.all([
          fetch(`${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/progress`, { headers }),
          fetch(`${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/progress/steps`, { headers })
        ])

        const progressPayload = progressResponse.ok ? await progressResponse.json() : null
        const stepsPayload = stepsResponse.ok ? await stepsResponse.json() : null
        const progressFlow = progressPayload?.data?.flow
        const status = progressFlow?.workflowStatus || null
        const summaryResponse = isTerminalFlowStatus(status)
          ? await fetch(
              `${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/summary?userId=${encodeURIComponent(userId)}`,
              { headers }
            )
          : null
        const summaryPayload = summaryResponse?.ok ? await summaryResponse.json() : null
        const summaryData = Array.isArray(summaryPayload?.summaryData) ? summaryPayload.summaryData : []

        if (cancelled) return
        lastStatus = status
        let stepResults: TestFlowStatus['stepResults'] = []
        const steps = Array.isArray(stepsPayload?.data?.steps) ? stepsPayload.data.steps : []
        lastPendingSteps = steps
          .filter((step: any) => {
            if (!reachableStepIndexes) return true
            const stepReference = String(step?.rootTaskReference || '')
            const stepIndex =
              typeof step?.rootTaskIndex === 'number'
                ? step.rootTaskIndex
                : stepReference.startsWith('step_')
                  ? Number(stepReference.replace('step_', ''))
                  : NaN
            return Number.isFinite(stepIndex) ? reachableStepIndexes.has(stepIndex) : true
          })
          .filter((step: any) => !isTerminalFlowStatus(step?.stepStatus))
          .map((step: any) => String(step?.rootTaskTitle || step?.rootTaskReference || 'Unnamed step'))
          .filter(Boolean)

        if (isTerminalFlowStatus(status) && summaryData.length === 0) {
          const completedSteps = steps.filter(
            (step: any) => String(step?.stepStatus || '').toUpperCase() === 'COMPLETED'
          )
          const stepDataResponses = await Promise.all(
            completedSteps.map(async (step: any) => {
              const stepReference = step.rootTaskReference || `step_${step.rootTaskIndex}`
              const response = await fetch(
                `${apiBase}/flows/${encodeURIComponent(launchResult.workflowId)}/steps/${encodeURIComponent(stepReference)}/data?limit=1`,
                { headers }
              )
              if (!response.ok) return null
              const payload = await response.json()
              const firstRow = Array.isArray(payload?.data) ? payload.data[0] : null
              const inputData =
                firstRow?.inputData && typeof firstRow.inputData === 'object' ? firstRow.inputData : null
              if (!inputData || Object.keys(inputData).length === 0) return null
              return {
                stepTitle: step.rootTaskTitle || firstRow?.stepTitle || stepReference,
                fields: Object.entries(inputData).map(([label, value]) => ({ label: formatFieldLabel(label), value }))
              }
            })
          )
          stepResults = stepDataResponses.filter(Boolean) as TestFlowStatus['stepResults']
        }

        const progress =
          String(status || '').toUpperCase() === 'COMPLETED'
            ? 100
            : typeof progressFlow?.userTaskProgressPercentage === 'number'
              ? progressFlow.userTaskProgressPercentage
              : null

        setTestFlowStatus({
          isLoading: false,
          error: null,
          status,
          progress,
          timedOut: false,
          pendingSteps: lastPendingSteps,
          summaryData,
          stepResults
        })
      } catch (statusError) {
        if (cancelled) return
        setTestFlowStatus(current => ({
          ...current,
          isLoading: false,
          error: statusError instanceof Error ? statusError.message : 'Failed to load test result status'
        }))
      }

      if (!cancelled && attempt < maxAttempts && !isTerminalFlowStatus(lastStatus)) {
        globalThis.setTimeout(loadStatus, TEST_RESULT_POLL_INTERVAL_MS)
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
      }
    }

    void loadStatus()

    return () => {
      cancelled = true
    }
  }, [
    accessToken,
    isTestMode,
    launchResult,
    reachableStepIndexes,
    userInfo?.employeeDetails?.employeeId,
    userInfo?.id,
    userInfo?.userName
  ])

  useEffect(() => {
    if (!open || !launchResult || !isTestMode) return
    globalThis.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          <SelectContent>
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
        value={String(value ?? '')}
        onChange={event => onChange(stepKey, field.name, event.target.value)}
        disabled={isLaunching || isUploadingFiles}
        data-testid={`${testId}-test-value-${stepKey}-${field.name}`}
      />
    )
  }

  const sheetClassName = 'gba:fixed gba:right-0 gba:top-0 gba:z-50 gba:h-full gba:w-full gba:sm:max-w-none'
  const sheetStyle = {
    width: `${sheetWidth}px`,
    maxWidth: 'calc(100vw - 1rem)',
    position: 'fixed' as const,
    top: 0,
    right: 0,
    zIndex: 50,
    height: '100vh',
    transform: 'translateX(0)',
    opacity: 1,
    pointerEvents: 'auto' as const
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={!isTestMode}>
      <SheetContent
        side="right"
        className={`${sheetClassName} gba:relative gba:flex gba:flex-col gba:p-0`}
        style={sheetStyle}
        onInteractOutside={event => {
          if (isPinned) event.preventDefault()
        }}
        data-testid={testId}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={isTestMode ? 'Resize test panel' : 'Resize launch panel'}
          className="gba:absolute gba:inset-y-0 gba:left-0 gba:z-10 gba:w-2 gba:cursor-ew-resize gba:touch-none gba:bg-transparent hover:gba:bg-primary/20"
          onPointerDown={handleResizeStart}
          data-testid={`${testId}-resize-handle`}
        />
        {isTestMode ? (
          <Button
            type="button"
            variant={isPinned ? 'default' : 'outline'}
            size="icon"
            onClick={() => setIsPinned(current => !current)}
            className="gba:absolute gba:right-12 gba:top-3 gba:z-20"
            aria-label={isPinned ? 'Unpin test panel' : 'Pin test panel'}
            title={isPinned ? 'Unpin test panel' : 'Pin test panel'}
            data-testid={`${testId}-pin`}
          >
            {isPinned ? <PushPinSlashIcon size={16} /> : <PushPinIcon size={16} />}
          </Button>
        ) : null}
        <SheetHeader className="gba:pl-4 gba:pr-24 gba:pt-4 gba:pb-4">
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

        <Separator />

        <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:py-5" data-testid={`${testId}-body`}>
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
              {isTestMode && branchTestOptions.length > 0 ? (
                <Card className="gba:bg-background gba:border gba:border-border" data-testid={`${testId}-branch-tests`}>
                  <CardContent className="gba:p-4 gba:space-y-4">
                    <div>
                      <div className="gba:text-sm gba:font-medium">Branch to test</div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        Pick the path you want to test before editing test values. The matching start-form values are
                        filled for this run only and are not saved to the flow.
                      </div>
                    </div>
                    <div className="gba:space-y-4">
                      {Object.entries(
                        branchTestOptions.reduce<Record<string, BranchTestOption[]>>((acc, option) => {
                          acc[option.decisionStepKey] = [...(acc[option.decisionStepKey] || []), option]
                          return acc
                        }, {})
                      ).map(([decisionStepKey, options]) => (
                        <div key={decisionStepKey} className="gba:space-y-2">
                          <div className="gba:text-xs gba:font-medium">{options[0]?.decisionTitle}</div>
                          <div className="gba:flex gba:flex-col gba:gap-2">
                            {options.map(option => {
                              const selected = selectedBranchTests[decisionStepKey] === option.branchId
                              const inputPreview = Object.entries(option.inputValues)
                                .map(([key, value]) => `${key}=${formatSummaryValue(value)}`)
                                .join(', ')
                              return (
                                <Button
                                  key={option.branchId}
                                  type="button"
                                  variant={selected ? 'default' : 'outline'}
                                  size="sm"
                                  className="gba:justify-start gba:h-auto gba:py-2"
                                  onClick={() => applyBranchTestOption(option)}
                                  disabled={isLaunching || isUploadingFiles || isTestRunActive}
                                  data-testid={`${testId}-branch-test-${decisionStepKey}-${option.branchId}`}
                                >
                                  <span className="gba:flex gba:flex-col gba:items-start gba:gap-1">
                                    <span>{option.branchLabel}</span>
                                    <span className="gba:text-xs gba:opacity-80">
                                      {inputPreview || option.description}
                                    </span>
                                  </span>
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <div className="gba:space-y-4" data-testid={`${testId}-start-form`}>
                <div className="gba:text-sm gba:font-medium">{startFormTitle}</div>
                {launchFormContext.mode === 'first-task-form' ? (
                  <div className="gba:text-xs gba:text-muted-foreground">
                    This flow has no trigger form. The launcher will submit these values to the first task after start.
                  </div>
                ) : null}

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
                        const options = Array.isArray(input.options) ? input.options.map(normalizeOption) : []

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
                            <Alert key={fieldName} variant="info" data-testid={`${testId}-unsupported-${fieldName}`}>
                              <div className="gba:space-y-1">
                                <div className="gba:font-medium">{input.label || fieldName}</div>
                                <div className="gba:text-sm">This field type isn’t supported in the sidebar yet.</div>
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
                                        <SelectContent>
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
              </div>

              {isTestMode && visibleTaskTestSteps.length > 0 ? (
                <Card
                  className="gba:bg-background gba:border gba:border-border"
                  data-testid={`${testId}-task-test-inputs`}
                >
                  <CardContent className="gba:p-4 gba:space-y-5">
                    <div>
                      <div className="gba:text-sm gba:font-medium">Task form test inputs</div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        Used when the test runner auto-completes user tasks on the selected path. These values are
                        test-only and are not saved with the flow.
                      </div>
                    </div>
                    <div className="gba:space-y-5">
                      {visibleTaskTestSteps.map((step, index) => (
                        <React.Fragment key={step.stepKey}>
                          {index > 0 ? <Separator /> : null}
                          <div className="gba:space-y-3">
                            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                              <div className="gba:text-sm gba:font-medium">{step.title}</div>
                              <Badge variant="outline">{step.stepKey}</Badge>
                            </div>
                            <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                              {step.fields.map(field => {
                                const value = taskTestResponses[step.stepKey]?.[field.name]
                                return (
                                  <div key={`${step.stepKey}-${field.name}`} className="gba:space-y-2">
                                    <Label htmlFor={`${testId}-${step.stepKey}-${field.name}`}>{field.label}</Label>
                                    {renderTestValueField(step.stepKey, field, value, updateTaskTestResponseField)}
                                    {field.description ? (
                                      <div className="gba:text-xs gba:text-muted-foreground">{field.description}</div>
                                    ) : null}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {isTestMode && visibleAgentTestSteps.length > 0 ? (
                <Card
                  className="gba:bg-background gba:border gba:border-border"
                  data-testid={`${testId}-agent-responses`}
                >
                  <CardContent className="gba:p-4 gba:space-y-5">
                    <div>
                      <div className="gba:text-sm gba:font-medium">Agent test responses</div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        Used when an agent step does not return during the test run. Fill expected fields to verify
                        downstream branches and result fields with meaningful data. These values are test-only and are
                        not saved with the flow.
                      </div>
                    </div>
                    <div className="gba:space-y-5">
                      {visibleAgentTestSteps.map((step, index) => {
                        const mode = agentTestModes[step.stepKey] || 'REAL_ONLY'
                        return (
                          <React.Fragment key={step.stepKey}>
                            {index > 0 ? <Separator /> : null}
                            <div className="gba:space-y-3">
                              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                                <div className="gba:text-sm gba:font-medium">{step.title}</div>
                                <Badge variant="outline">{step.stepKey}</Badge>
                              </div>
                              <div className="gba:space-y-2">
                                <Label htmlFor={`${testId}-${step.stepKey}-mode`}>Agent test mode</Label>
                                <Select
                                  value={mode}
                                  onValueChange={value =>
                                    setAgentTestModes(current => ({
                                      ...current,
                                      [step.stepKey]: value as AgentTestMode
                                    }))
                                  }
                                  disabled={isLaunching || isUploadingFiles}
                                >
                                  <SelectTrigger id={`${testId}-${step.stepKey}-mode`}>
                                    <SelectValue placeholder="Select agent test mode" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="REAL_WITH_TEST_FALLBACK">
                                      Use real agent, fallback to test response
                                    </SelectItem>
                                    <SelectItem value="TEST_RESPONSE">Use test response</SelectItem>
                                    <SelectItem value="REAL_ONLY">Require real agent response</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="gba:text-xs gba:text-muted-foreground">
                                  {mode === 'TEST_RESPONSE'
                                    ? 'The test will use the fields below without waiting for the agent.'
                                    : mode === 'REAL_ONLY'
                                      ? 'The test waits for the real agent. It fails on timeout if no response arrives.'
                                      : 'The test waits briefly for the real agent, then uses the fields below.'}
                                </div>
                              </div>
                              {mode !== 'REAL_ONLY' && step.fields.length > 0 ? (
                                <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                                  {step.fields.map(field => {
                                    const value = agentTestResponses[step.stepKey]?.[field.name]
                                    return (
                                      <div key={`${step.stepKey}-${field.name}`} className="gba:space-y-2">
                                        <Label htmlFor={`${testId}-${step.stepKey}-${field.name}`}>{field.label}</Label>
                                        {field.options && field.options.length > 0 ? (
                                          <Select
                                            value={String(value ?? '')}
                                            onValueChange={nextValue =>
                                              updateAgentTestResponseField(step.stepKey, field.name, nextValue)
                                            }
                                            disabled={isLaunching || isUploadingFiles}
                                          >
                                            <SelectTrigger id={`${testId}-${step.stepKey}-${field.name}`}>
                                              <SelectValue placeholder="Select test value" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {field.options.map((option, optionIndex) => (
                                                <SelectItem
                                                  key={`${String(option)}-${optionIndex}`}
                                                  value={String(option)}
                                                >
                                                  {String(option)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : field.type === 'boolean' ? (
                                          <div className="gba:flex gba:items-center gba:gap-2">
                                            <Checkbox
                                              id={`${testId}-${step.stepKey}-${field.name}`}
                                              checked={Boolean(value)}
                                              onCheckedChange={checked =>
                                                updateAgentTestResponseField(step.stepKey, field.name, Boolean(checked))
                                              }
                                              disabled={isLaunching || isUploadingFiles}
                                            />
                                            <Label htmlFor={`${testId}-${step.stepKey}-${field.name}`}>True</Label>
                                          </div>
                                        ) : field.type === 'number' || field.type === 'integer' ? (
                                          <Input
                                            id={`${testId}-${step.stepKey}-${field.name}`}
                                            type="number"
                                            value={value === undefined || value === null ? '' : String(value)}
                                            onChange={event =>
                                              updateAgentTestResponseField(
                                                step.stepKey,
                                                field.name,
                                                event.target.value === '' ? null : Number(event.target.value)
                                              )
                                            }
                                            disabled={isLaunching || isUploadingFiles}
                                            data-testid={`${testId}-agent-response-${step.stepKey}-${field.name}`}
                                          />
                                        ) : (
                                          <Textarea
                                            id={`${testId}-${step.stepKey}-${field.name}`}
                                            rows={field.name.toLowerCase().includes('body') ? 4 : 2}
                                            value={String(value ?? '')}
                                            onChange={event =>
                                              updateAgentTestResponseField(step.stepKey, field.name, event.target.value)
                                            }
                                            disabled={isLaunching || isUploadingFiles}
                                            data-testid={`${testId}-agent-response-${step.stepKey}-${field.name}`}
                                          />
                                        )}
                                        {field.description ? (
                                          <div className="gba:text-xs gba:text-muted-foreground">
                                            {field.description}
                                          </div>
                                        ) : null}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : mode !== 'REAL_ONLY' ? (
                                <Alert variant="info">
                                  <div className="gba:text-sm">
                                    This agent has no result schema. Add an output schema to configure test response
                                    fields.
                                  </div>
                                </Alert>
                              ) : null}
                            </div>
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {assignments.length > 0 ? (
                <Card className="gba:bg-background gba:border gba:border-border" data-testid={`${testId}-assignments`}>
                  <CardContent className="gba:p-4 gba:space-y-5">
                    <div>
                      <div className="gba:text-sm gba:font-medium">Task assignments</div>
                      {isTestMode ? (
                        <div className="gba:text-xs gba:text-muted-foreground">
                          Empty assignments are filled with the current user for this test run only.
                        </div>
                      ) : null}
                    </div>
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
                              accessToken={accessToken}
                              data-testid={`${testId}-assignment-selector-${a.stepIndex}`}
                            />
                          ) : (
                            <AssignmentSelector
                              value={toRuntimeTaskAssignment(a)}
                              onChange={next => handleAssignmentChange(a.stepIndex, next)}
                              assignmentMode={AssignmentMode.ASSIGN_SINGLE}
                              accessToken={accessToken}
                              allowedTypes={['people']}
                              maxSelectionsPerField={1}
                              data-testid={`${testId}-assignment-selector-${a.stepIndex}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {isTestMode ? (
                <Card
                  className="gba:bg-background gba:border gba:border-border"
                  data-testid={`${testId}-payload-preview`}
                >
                  <CardContent className="gba:p-4 gba:space-y-3">
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
                  </CardContent>
                </Card>
              ) : null}

              {launchResult ? (
                <Card
                  ref={resultRef}
                  className="gba:bg-success-secondary gba:border-success"
                  data-testid={`${testId}-result`}
                >
                  <CardContent className="gba:p-4 gba:space-y-3">
                    <div>
                      <div className="gba:text-sm gba:font-medium">Test started</div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        The dynamic flow was started successfully.
                      </div>
                    </div>
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
                    {launchResult.testRun ? (
                      <div
                        className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-3 gba:space-y-2"
                        data-testid={`${testId}-test-run`}
                      >
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <div className="gba:text-sm gba:font-medium">Auto-completion</div>
                          <Badge
                            variant={
                              testFlowStatus.timedOut
                                ? 'destructive'
                                : isTerminalFlowStatus(testFlowStatus.status)
                                  ? testFlowStatus.status === 'COMPLETED'
                                    ? 'success'
                                    : 'warning'
                                  : 'warning'
                            }
                          >
                            {testFlowStatus.timedOut
                              ? 'TIMED OUT'
                              : isTerminalFlowStatus(testFlowStatus.status)
                                ? testFlowStatus.status
                                : launchResult.testRun.status}
                          </Badge>
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          {testFlowStatus.timedOut
                            ? 'Auto-completion stopped because the test exceeded the polling timeout.'
                            : isTerminalFlowStatus(testFlowStatus.status)
                              ? testFlowStatus.status === 'COMPLETED'
                                ? 'Auto-completion finished.'
                                : 'Auto-completion stopped because the flow reached a terminal state.'
                              : launchResult.testRun.completedTasks.length > 0
                                ? `Completed ${launchResult.testRun.completedTasks.length} user task${
                                    launchResult.testRun.completedTasks.length === 1 ? '' : 's'
                                  } with generated test data.`
                                : 'Auto-completion is running in the background.'}
                        </div>
                        {launchResult.testRun.completedTasks.length > 0 ? (
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            {launchResult.testRun.completedTasks.map((task, index) => (
                              <div key={`${task.taskId}-${index}`} className="gba:text-xs">
                                {task.stepTitle || task.stepReference || task.taskId}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
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
                          <span>{testFlowStatus.status || 'Starting'}</span>
                          {typeof testFlowStatus.progress === 'number' ? (
                            <>
                              <span className="gba:text-muted-foreground">Progress</span>
                              <span>{Math.round(testFlowStatus.progress)}%</span>
                            </>
                          ) : null}
                        </div>
                      )}
                      {testFlowStatus.summaryData.length > 0 ? (
                        <div className="gba:space-y-2">
                          <div className="gba:text-sm gba:font-medium">Result summary</div>
                          <div className="gba:grid gba:grid-cols-[auto_1fr] gba:gap-x-3 gba:gap-y-1 gba:text-sm">
                            {testFlowStatus.summaryData.map((item, index) => (
                              <React.Fragment key={`${item.label}-${index}`}>
                                <span className="gba:text-muted-foreground">{item.label}</span>
                                <span>{formatSummaryValue(item.value)}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ) : testFlowStatus.stepResults.length > 0 ? (
                        <div className="gba:space-y-3">
                          <div className="gba:text-sm gba:font-medium">Test result data</div>
                          {testFlowStatus.stepResults.map((step, stepIndex) => (
                            <div key={`${step.stepTitle}-${stepIndex}`} className="gba:space-y-1">
                              <div className="gba:text-xs gba:font-medium">{step.stepTitle}</div>
                              <div className="gba:grid gba:grid-cols-[auto_1fr] gba:gap-x-3 gba:gap-y-1 gba:text-sm">
                                {step.fields.map((field, fieldIndex) => (
                                  <React.Fragment key={`${field.label}-${fieldIndex}`}>
                                    <span className="gba:text-muted-foreground">{field.label}</span>
                                    <span>{formatSummaryValue(field.value)}</span>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="gba:text-xs gba:text-muted-foreground">
                          {testFlowStatus.status === 'COMPLETED'
                            ? 'No result summary fields are configured for this flow.'
                            : 'No result summary yet. This flow is waiting for user tasks, or it has no summary fields.'}
                        </div>
                      )}
                    </div>
                    <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-3 gba:space-y-3">
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
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>

        <Separator />

        <div
          className="gba:px-4 gba:py-4 gba:flex gba:items-center gba:justify-end gba:gap-2"
          data-testid={`${testId}-footer`}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLaunching || isUploadingFiles}
            data-testid={`${testId}-cancel`}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleLaunch}
            disabled={!canLaunch || isLaunching || isUploadingFiles || isTestRunActive}
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
      </SheetContent>
    </Sheet>
  )
}

export default FlowLaunchSheet
