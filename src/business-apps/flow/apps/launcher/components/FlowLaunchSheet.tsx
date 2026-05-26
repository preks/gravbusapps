import React, { useEffect, useMemo, useState } from 'react'
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
  summaryData: Array<{ label: string; value: unknown }>
  stepResults: Array<{
    stepTitle: string
    fields: Array<{ label: string; value: unknown }>
  }>
}

const TERMINAL_FLOW_STATUSES = new Set(['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT', 'CANCELED', 'CANCELLED'])

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
  const [testFlowStatus, setTestFlowStatus] = useState<TestFlowStatus>({
    isLoading: false,
    error: null,
    status: null,
    progress: null,
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
  const startFormTitle = launchFormContext.mode === 'first-task-form' ? 'First task form' : 'Start form'
  const isTestMode = mode === 'test'
  const launchButtonLabel = isTestMode ? 'Run test' : 'Launch'
  const launchingLabel = isTestMode ? 'Testing' : 'Launching'
  const successTitle = isTestMode ? 'Flow test started' : 'Flow launched'
  const failureTitle = isTestMode ? 'Flow test failed' : 'Launch failed'
  const startFormEmptyText =
    launchFormContext.mode === 'first-task-form'
      ? 'This flow has no launcher form and the first task does not expose a supported form fallback.'
      : 'This flow has no start form fields.'

  useEffect(() => {
    if (!open) return
    if (templateDefinition) {
      const dynamicTemplate = templateDefinition as FlowTemplate
      setIsLoading(false)
      setError(null)
      setLaunchResult(null)
      setTestFlowStatus({
        isLoading: false,
        error: null,
        status: null,
        progress: null,
        summaryData: [],
        stepResults: []
      })
      setTemplate(dynamicTemplate)
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
      setLaunchResult(null)
      setTestFlowStatus({
        isLoading: false,
        error: null,
        status: null,
        progress: null,
        summaryData: [],
        stepResults: []
      })
      setTemplate(null)
      setAssignments([])
      clearUploadError()
      try {
        const client = new FlowTemplateClient(accessToken)
        const res = await client.getTemplateWithMetadata(templateId)
        const tpl = res.template
        setTemplate(tpl)
        setAssignments(collectRuntimeAssignments(tpl, resolveLaunchFormContext(tpl)))
        form.reset({})
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load template')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [accessToken, clearUploadError, form, open, templateDefinition, templateId])

  const canLaunch = useMemo(() => {
    if (isLoading) return false
    if (!template) return false
    if (!accessToken) return false
    if (isUploadingFiles) return false
    return assignments.every(a => hasAssignmentTargets(a.targets))
  }, [accessToken, assignments, isLoading, isUploadingFiles, template])

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

  const handleLaunch = async () => {
    if (!templateId && !templateDefinition) return
    if (!accessToken) return

    setIsLaunching(true)
    setError(null)
    setLaunchResult(null)
    setTestFlowStatus({ isLoading: false, error: null, status: null, progress: null, summaryData: [], stepResults: [] })
    try {
      const isValid = await form.trigger()
      if (!isValid) return

      const effectiveInitiatorId =
        userInfo?.id || userInfo?.employeeDetails?.employeeId || userInfo?.userName || 'unknown'

      const client = new FlowTemplateClient(accessToken)
      const inputValues = form.getValues()
      const uploadScopeId = templateId || template?.name || 'dynamic-test-flow'
      const uploadedValues = await uploadFormFiles(startInputs, inputValues, uploadScopeId)
      const normalizedFallbackValues = coerceFormDataBySchema(startInputs, uploadedValues)
      const runtimeAssignments = buildRuntimeAssignmentsPayload(assignments, {
        template,
        launchFormContext,
        defaultUserId: effectiveInitiatorId
      })

      const context = {
        launchedAt: new Date().toISOString(),
        launchedBy: effectiveInitiatorId,
        templateTitle: template?.name || templateId || 'Dynamic flow',
        ...(isTestMode ? { executionMode: 'test', label: 'test' } : {})
      }

      const result =
        templateDefinition && isTestMode
          ? await client.executeDynamicTemplate({
              templateDefinition,
              initiatorId: effectiveInitiatorId,
              stepAssignments: toDynamicStepAssignments(runtimeAssignments),
              inputValues: normalizedFallbackValues,
              runtimeParameters: {},
              context
            })
          : await client.executeWorkflow(templateId!, {
              initiator: effectiveInitiatorId,
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
            effectiveInitiatorId
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
    const maxAttempts = 90
    let lastStatus: string | null = null
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

        if (isTerminalFlowStatus(status) && summaryData.length === 0) {
          const steps = Array.isArray(stepsPayload?.data?.steps) ? stepsPayload.data.steps : []
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

        setTestFlowStatus({
          isLoading: false,
          error: null,
          status,
          progress:
            typeof progressFlow?.userTaskProgressPercentage === 'number'
              ? progressFlow.userTaskProgressPercentage
              : null,
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
        globalThis.setTimeout(loadStatus, 2000)
      }
    }

    void loadStatus()

    return () => {
      cancelled = true
    }
  }, [accessToken, isTestMode, launchResult, userInfo?.employeeDetails?.employeeId, userInfo?.id, userInfo?.userName])

  useEffect(() => {
    if (!launchResult || !isTestMode) return
    globalThis.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }, [isTestMode, launchResult])

  const sheetWidth = 'gba:w-full gba:sm:max-w-xl'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={`${sheetWidth} gba:flex gba:flex-col gba:p-0`} data-testid={testId}>
        <SheetHeader className="gba:px-4 gba:pt-4 gba:pb-4">
          <SheetTitle className="gba:flex gba:flex-col gba:gap-1" data-testid={`${testId}-title`}>
            <span className="gba:flex gba:items-center gba:gap-2 gba:text-base">
              {template?.name || (isTestMode ? 'Test flow' : 'Start flow')}
              {isTestMode ? <Badge variant="warning">Test</Badge> : null}
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

              {assignments.length > 0 ? (
                <Card className="gba:bg-background gba:border gba:border-border" data-testid={`${testId}-assignments`}>
                  <CardContent className="gba:p-4 gba:space-y-5">
                    <div className="gba:text-sm gba:font-medium">Task assignments</div>
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
                    {launchResult.validationWarnings && launchResult.validationWarnings.length > 0 ? (
                      <Alert variant="warning" data-testid={`${testId}-result-warnings`}>
                        <div className="gba:space-y-1">
                          <div className="gba:font-medium">Validation warning</div>
                          {launchResult.validationWarnings.map((warning, index) => (
                            <div key={`${warning}-${index}`} className="gba:text-sm">
                              {warning}
                            </div>
                          ))}
                        </div>
                      </Alert>
                    ) : null}
                    {launchResult.testRun ? (
                      <div
                        className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-3 gba:space-y-2"
                        data-testid={`${testId}-test-run`}
                      >
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <div className="gba:text-sm gba:font-medium">Auto-completion</div>
                          <Badge
                            variant={
                              isTerminalFlowStatus(testFlowStatus.status)
                                ? testFlowStatus.status === 'COMPLETED'
                                  ? 'success'
                                  : 'warning'
                                : 'warning'
                            }
                          >
                            {isTerminalFlowStatus(testFlowStatus.status)
                              ? testFlowStatus.status
                              : launchResult.testRun.status}
                          </Badge>
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          {isTerminalFlowStatus(testFlowStatus.status)
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
                        {launchResult.testRun.warnings.length > 0 ? (
                          <Alert variant="warning" data-testid={`${testId}-test-run-warnings`}>
                            <div className="gba:space-y-1">
                              <div className="gba:font-medium">Auto-completion warning</div>
                              {launchResult.testRun.warnings.map((warning, index) => (
                                <div key={`${warning}-${index}`} className="gba:text-sm">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          </Alert>
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
            disabled={!canLaunch || isLaunching || isUploadingFiles}
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
