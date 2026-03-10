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

export interface FlowLaunchSheetProps extends Partial<BusinessAppContextProps> {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string | null
  'data-testid'?: string
}

export const FlowLaunchSheet: React.FC<FlowLaunchSheetProps> = ({
  open,
  onOpenChange,
  accessToken,
  userInfo,
  templateId,
  'data-testid': testId = 'flow-launch-sheet'
}) => {
  const form = useForm<Record<string, any>>({ defaultValues: {} })
  const [template, setTemplate] = useState<FlowTemplate | null>(null)
  const [assignments, setAssignments] = useState<RuntimeAssignment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launchFormContext = useMemo(() => resolveLaunchFormContext(template), [template])
  const startInputs = launchFormContext.inputs
  const startFormTitle = launchFormContext.mode === 'first-task-form' ? 'First task form' : 'Start form'
  const startFormEmptyText =
    launchFormContext.mode === 'first-task-form'
      ? 'This flow has no launcher form and the first task does not expose a supported form fallback.'
      : 'This flow has no start form fields.'

  useEffect(() => {
    if (!open) return
    if (!templateId) return

    const load = async () => {
      if (!accessToken) {
        setError('Access token is required to launch flows')
        return
      }

      setIsLoading(true)
      setError(null)
      setTemplate(null)
      setAssignments([])
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
  }, [accessToken, form, open, templateId])

  const canLaunch = useMemo(() => {
    if (isLoading) return false
    if (!template) return false
    if (!accessToken) return false
    return assignments.every(a => hasAssignmentTargets(a.targets))
  }, [accessToken, assignments, isLoading, template])

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
    if (!templateId) return
    if (!accessToken) return

    setIsLaunching(true)
    setError(null)
    try {
      const isValid = await form.trigger()
      if (!isValid) return

      const effectiveInitiatorId =
        userInfo?.id || userInfo?.employeeDetails?.employeeId || userInfo?.userName || 'unknown'

      const client = new FlowTemplateClient(accessToken)
      const inputValues = form.getValues()
      const normalizedFallbackValues = coerceFormDataBySchema(startInputs, inputValues)
      const runtimeAssignments = buildRuntimeAssignmentsPayload(assignments, {
        template,
        launchFormContext,
        defaultUserId: effectiveInitiatorId
      })

      const result = await client.executeWorkflow(templateId, {
        initiator: effectiveInitiatorId,
        inputValues: normalizedFallbackValues,
        runtimeAssignments,
        runtimeParameters: {},
        context: {
          launchedAt: new Date().toISOString(),
          launchedBy: effectiveInitiatorId,
          templateTitle: template?.name || templateId
        }
      })

      if (launchFormContext.mode === 'first-task-form') {
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
            templateId,
            formData: normalizedFallbackValues
          })
        } catch (fallbackError) {
          const description =
            fallbackError instanceof Error
              ? fallbackError.message
              : 'The first task form could not be submitted automatically.'
          toast.error('Flow launched, but the first task still needs input', { description })
        }
      }

      toast.success('Flow launched', {
        description: `Flow ID: ${result.workflowId}`
      })

      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to launch flow'
      setError(msg)
      toast.error('Launch failed', { description: msg })
    } finally {
      setIsLaunching(false)
    }
  }

  const sheetWidth = 'gba:w-full gba:sm:max-w-xl'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={`${sheetWidth} gba:flex gba:flex-col gba:p-0`} data-testid={testId}>
        <SheetHeader className="gba:px-4 gba:pt-4 gba:pb-4">
          <SheetTitle className="gba:flex gba:flex-col gba:gap-1" data-testid={`${testId}-title`}>
            <span className="gba:text-base">{template?.name || 'Start flow'}</span>
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

                        if (inputType === InputType.FILE || inputType === InputType.SIGNATURE) {
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
            disabled={isLaunching}
            data-testid={`${testId}-cancel`}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleLaunch}
            disabled={!canLaunch || isLaunching}
            data-testid={`${testId}-launch`}
          >
            {isLaunching ? (
              <span className="gba:flex gba:items-center gba:gap-2">
                <Spinner size="sm" />
                Launching
              </span>
            ) : (
              'Launch'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default FlowLaunchSheet
