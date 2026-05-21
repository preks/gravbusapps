import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Label,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Component } from '@/common/data/resources/types/component.types'
import { useResourceData, useResourceActions } from '../../contexts/ResourceManagerContext'
import {
  urlPathToScreenKey,
  screenKeyToUrlPath,
  getActionScreenKeyPrefix,
  splitCombinedType,
  combineBuildAndScreenType,
  parseFormScreenKey,
  getFormScreenKeySuffix,
  normalizeScreenKeySuffixPreserveCase,
  normalizeSystemScreenKeySuffix
} from '../../utils/componentKeyUtils'

// Helper function to get submit button text based on mode
const getSubmitButtonText = (mode: 'create' | 'update'): string => {
  return mode === 'create' ? 'Create' : 'Update'
}

interface ComponentDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    data: Omit<Component, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'>
  ) => Promise<void>
  mode: 'create' | 'update'
  initialData?: Component
  'data-testid'?: string
}

// Combined type options (merged builder + screen type)
type CombinedType =
  | 'native-screen'
  | 'system-component'
  | 'native-form'
  | 'native-popup'
  | 'native-window'
  | 'lowcoder-screen'
  | 'lowcoder-form'
  | 'formio-form'

const COMBINED_TYPE_OPTIONS: Array<{ value: CombinedType; label: string }> = [
  { value: 'native-screen', label: 'Native Screen' },
  { value: 'system-component', label: 'System Component' },
  { value: 'native-form', label: 'Native Form' },
  { value: 'native-popup', label: 'Native Popup' },
  { value: 'native-window', label: 'Native Window' },
  { value: 'lowcoder-screen', label: 'Lowcoder Screen' },
  { value: 'lowcoder-form', label: 'Lowcoder Form' },
  { value: 'formio-form', label: 'FormIO Form' }
]

// Form validation schema
const componentFormSchema = z
  .object({
    type: z.string().min(1, 'Type is required'),
    name: z.string().min(1, 'Name is required'),
    componentPath: z.string().min(1, 'Component path is required'),
    urlPath: z.string().optional(),
    domain: z.string().optional(),
    process: z.string().optional(),
    keyOverride: z.string().optional(),
    isLaunchingForm: z.boolean().optional(),
    userTaskName: z.string().optional(),
    version: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.type === 'system-component' && !data.keyOverride?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'System key is required',
        path: ['keyOverride']
      })
    }
  })

type ComponentFormData = z.infer<typeof componentFormSchema>

const upperFirst = (value: string): string => {
  if (!value) return ''
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

const buildTaskFormSuffix = (process?: string, userTaskName?: string): string => {
  const processName = process?.trim() || ''
  const taskName = userTaskName?.trim() || ''
  if (!processName) return ''
  return `${processName}${upperFirst(taskName)}`
}

export const ComponentDialog: React.FC<ComponentDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
  'data-testid': dataTestId = 'component-dialog'
}) => {
  // Combined type state (for UI)
  const [combinedType, setCombinedType] = useState<CombinedType>('native-screen')
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** For forms: 'key' = single key suffix field; 'domainProcess' = domain + process (and optional key override) */
  const [formKeyMode, setFormKeyMode] = useState<'key' | 'domainProcess'>('key')

  // Get domain/process data from context
  const { domains, getProcessesForDomain } = useResourceData()
  const { isLoading: isLoadingServices } = useResourceActions()

  // Initialize form
  const form = useForm<ComponentFormData>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      type: 'native-screen',
      name: '',
      componentPath: '',
      urlPath: '',
      domain: '',
      process: '',
      keyOverride: '',
      isLaunchingForm: true,
      userTaskName: '',
      version: ''
    },
    mode: 'onChange'
  })

  const selectedDomain = form.watch('domain')
  const selectedProcess = form.watch('process')
  const keyOverride = form.watch('keyOverride')
  const isLaunchingForm = form.watch('isLaunchingForm')
  const userTaskName = form.watch('userTaskName')
  const urlPath = form.watch('urlPath')

  const processOptions = selectedDomain ? getProcessesForDomain(selectedDomain) : []

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCombinedType('native-screen')
      setFormKeyMode('key')
      form.reset({
        type: 'native-screen',
        name: '',
        componentPath: '',
        urlPath: '',
        domain: '',
        process: '',
        keyOverride: '',
        isLaunchingForm: true,
        userTaskName: '',
        version: ''
      })
      setIsSubmitting(false)
    }
  }, [open, form])

  // Load initial data for update mode
  useEffect(() => {
    if (open && initialData && mode === 'update') {
      // Reconstruct combined type from builder and screen type
      let combined = combineBuildAndScreenType(
        initialData.screenComponents?.builderType || 'NATIVE_SCREEN',
        initialData.type || 'SCREEN'
      )
      if (initialData.screenKey?.startsWith('sys_')) {
        combined = 'system-component'
      }
      setCombinedType(combined as CombinedType)

      // Extract URL path from screen key if it's url_ format
      let extractedUrlPath = ''
      if (initialData.screenKey?.startsWith('url_')) {
        extractedUrlPath = screenKeyToUrlPath(initialData.screenKey)
      }
      let extractedSystemKeySuffix = ''
      if (initialData.screenKey?.startsWith('sys_')) {
        extractedSystemKeySuffix = initialData.screenKey.substring(4)
      }

      // Parse form screen key for forms/popups/windows
      let parsedFormData = null
      const isFormOrPopup =
        combined === 'native-form' ||
        combined === 'native-popup' ||
        combined === 'native-window' ||
        combined === 'lowcoder-form' ||
        combined === 'formio-form'

      if (isFormOrPopup && initialData.screenKey) {
        parsedFormData = parseFormScreenKey(initialData.screenKey, domains)
      }

      const keySuffixFromScreenKey =
        isFormOrPopup && initialData.screenKey ? getFormScreenKeySuffix(initialData.screenKey) : ''

      const hasDomainAndProcess = !!(parsedFormData?.domain && parsedFormData?.process)
      setFormKeyMode(hasDomainAndProcess ? 'domainProcess' : 'key')

      form.setValue('type', combined)
      form.setValue('name', initialData.name || '')
      form.setValue('componentPath', initialData.screenComponents?.formDefinition?.componentPath || '')
      form.setValue('urlPath', extractedUrlPath)
      form.setValue('domain', parsedFormData?.domain || '')
      form.setValue('process', parsedFormData?.process || '')
      form.setValue('keyOverride', extractedSystemKeySuffix || keySuffixFromScreenKey)
      form.setValue('isLaunchingForm', parsedFormData?.isLaunchingForm ?? true)
      form.setValue('userTaskName', parsedFormData?.userTaskName || '')
      form.setValue('version', initialData.screenComponents?.formDefinition?.version || '')
    }
  }, [open, initialData, mode, form, domains])

  const handleCombinedTypeChange = useCallback(
    (newType: CombinedType) => {
      setCombinedType(newType)
      form.setValue('type', newType)

      // Reset URL path when changing away from native-screen
      if (newType !== 'native-screen') {
        form.setValue('urlPath', '')
      }

      // Reset domain/process when changing away from form/popup/window
      const isFormOrPopup =
        newType === 'native-form' ||
        newType === 'native-popup' ||
        newType === 'native-window' ||
        newType === 'lowcoder-form' ||
        newType === 'formio-form'
      if (!isFormOrPopup) {
        form.setValue('domain', '')
        form.setValue('process', '')
        form.setValue('keyOverride', '')
        form.setValue('isLaunchingForm', true)
        form.setValue('userTaskName', '')
        setFormKeyMode('key')
      }
    },
    [form]
  )

  const handleFormKeyModeChange = useCallback(
    (mode: 'key' | 'domainProcess') => {
      if (mode === 'key') {
        const process = form.getValues('process')
        const userTask = form.getValues('userTaskName')
        const override = form.getValues('keyOverride')
        const launching = form.getValues('isLaunchingForm')
        const effectiveSuffix = launching
          ? override?.trim() || process?.trim() || ''
          : process
            ? `${process}${userTask ? `_${userTask}` : ''}`
            : override?.trim() || ''
        form.setValue('keyOverride', effectiveSuffix)
      }
      setFormKeyMode(mode)
    },
    [form]
  )

  // Auto-generate screen key based on type and inputs (for display purposes)
  // The actual key is generated during submission

  const handleFormSubmit = useCallback(
    async (data: ComponentFormData) => {
      setIsSubmitting(true)
      try {
        // Generate screen key based on type
        let screenKey = ''
        if (combinedType === 'native-screen' && data.urlPath) {
          screenKey = urlPathToScreenKey(data.urlPath)
        } else if (combinedType === 'system-component') {
          const suffix = data.keyOverride?.trim() ? normalizeSystemScreenKeySuffix(data.keyOverride.trim()) : ''
          screenKey = suffix ? `sys_${suffix}` : 'sys_'
        } else if (
          combinedType === 'native-form' ||
          combinedType === 'native-popup' ||
          combinedType === 'native-window' ||
          combinedType === 'lowcoder-form' ||
          combinedType === 'formio-form'
        ) {
          const prefix = getActionScreenKeyPrefix(combinedType)
          if (formKeyMode === 'key') {
            const suffix = data.keyOverride?.trim() ? normalizeScreenKeySuffixPreserveCase(data.keyOverride.trim()) : ''
            screenKey = suffix ? `${prefix}_${suffix}` : `${prefix}_`
          } else {
            if (data.isLaunchingForm) {
              const suffix = data.keyOverride?.trim()
                ? normalizeScreenKeySuffixPreserveCase(data.keyOverride.trim())
                : data.process?.trim() || ''
              screenKey = suffix ? `${prefix}_${suffix}` : `${prefix}_`
            } else if (data.process || data.keyOverride?.trim()) {
              const suffix = data.keyOverride?.trim()
                ? normalizeScreenKeySuffixPreserveCase(data.keyOverride.trim())
                : buildTaskFormSuffix(data.process, data.userTaskName)
              screenKey = suffix ? `t${prefix}_${suffix}` : `t${prefix}_`
            } else {
              const suffix = data.keyOverride?.trim() ? normalizeSystemScreenKeySuffix(data.keyOverride.trim()) : ''
              screenKey = suffix ? `${prefix}_${suffix}` : `${prefix}_`
            }
          }
        }

        // Split combined type into builder and screen type
        const { builderType, screenType } = splitCombinedType(combinedType)

        // Build submission payload
        const submitData: Omit<Component, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'> =
          {
            name: data.name,
            screenKey,
            namespaceCode: 'nw_dev',
            namespaceId: '1e6e2926-33f1-4dfb-a3b8-d535602d06b0',
            namespaceDescription: 'nw_dev',
            type: screenType as any,
            screenComponents: {
              key: screenKey,
              name: data.name,
              builderType: builderType as any,
              appName: data.name,
              flowIcon: '',
              formDefinition: {
                componentPath: data.componentPath,
                version: data.version || ''
              },
              release: ''
            }
          }

        await onSubmit(submitData)
        onOpenChange(false)
      } catch (error) {
        console.error('Error submitting component:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [combinedType, formKeyMode, onSubmit, onOpenChange]
  )

  const isNativeScreen = combinedType === 'native-screen'
  const isSystemComponent = combinedType === 'system-component'
  const isFormOrPopup =
    combinedType === 'native-form' ||
    combinedType === 'native-popup' ||
    combinedType === 'native-window' ||
    combinedType === 'lowcoder-form' ||
    combinedType === 'formio-form'

  const getDisplayScreenKey = useCallback(() => {
    if (combinedType === 'native-screen' && urlPath) {
      return urlPathToScreenKey(urlPath)
    } else if (combinedType === 'system-component') {
      const suffix = keyOverride?.trim() ? normalizeSystemScreenKeySuffix(keyOverride.trim()) : ''
      return suffix ? `sys_${suffix}` : 'sys_'
    } else if (isFormOrPopup) {
      const prefix = getActionScreenKeyPrefix(combinedType)
      if (formKeyMode === 'key') {
        const suffix = keyOverride?.trim() ? normalizeScreenKeySuffixPreserveCase(keyOverride.trim()) : ''
        return suffix ? `${prefix}_${suffix}` : `${prefix}_`
      }
      if (isLaunchingForm) {
        const suffix = keyOverride?.trim()
          ? normalizeScreenKeySuffixPreserveCase(keyOverride.trim())
          : selectedProcess || ''
        return suffix ? `${prefix}_${suffix}` : `${prefix}_`
      }
      if (selectedProcess || keyOverride?.trim()) {
        const suffix = keyOverride?.trim()
          ? normalizeScreenKeySuffixPreserveCase(keyOverride.trim())
          : buildTaskFormSuffix(selectedProcess, userTaskName)
        return suffix ? `t${prefix}_${suffix}` : `t${prefix}_`
      }
      const suffix = keyOverride?.trim() ? normalizeScreenKeySuffixPreserveCase(keyOverride.trim()) : ''
      return suffix ? `${prefix}_${suffix}` : `${prefix}_`
    }
    const prefix = isFormOrPopup ? getActionScreenKeyPrefix(combinedType) : 'frm'
    return isNativeScreen ? 'url_' : `${prefix}_`
  }, [
    combinedType,
    formKeyMode,
    urlPath,
    selectedProcess,
    keyOverride,
    isLaunchingForm,
    userTaskName,
    isNativeScreen,
    isFormOrPopup
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[700px] gba:max-h-[90vh] gba:overflow-y-auto" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Component' : 'Update Component'}</DialogTitle>
        </DialogHeader>

        <Form {...form} schema={componentFormSchema}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="gba:space-y-4 gba:py-4">
            {/* Combined Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={combinedType}
                    onValueChange={value => {
                      const typedValue = value as CombinedType
                      handleCombinedTypeChange(typedValue)
                      field.onChange(typedValue)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger id="type" data-testid={`${dataTestId}-type-select`}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMBINED_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter component name (e.g., Employee Directory)"
                      data-testid={`${dataTestId}-name-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form key: by key suffix or by domain & process */}
            {isFormOrPopup && (
              <>
                <FormItem>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FormLabel>Screen key</FormLabel>
                      </TooltipTrigger>
                      <TooltipContent>
                        {formKeyMode === 'key'
                          ? 'Enter the key suffix (e.g. my-process or processName_UserTaskName for user tasks).'
                          : 'Select domain and process; optional key override. Domain/process cannot always be derived from an existing key.'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <RadioGroup
                    value={formKeyMode}
                    onValueChange={v => handleFormKeyModeChange(v as 'key' | 'domainProcess')}
                    className="gba:flex gba:gap-4 gba:flex-wrap"
                    data-testid={`${dataTestId}-form-key-mode`}
                  >
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <RadioGroupItem value="key" id={`${dataTestId}-mode-key`} />
                      <Label htmlFor={`${dataTestId}-mode-key`} className="gba:cursor-pointer gba:font-normal">
                        By key
                      </Label>
                    </div>
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <RadioGroupItem value="domainProcess" id={`${dataTestId}-mode-domain-process`} />
                      <Label
                        htmlFor={`${dataTestId}-mode-domain-process`}
                        className="gba:cursor-pointer gba:font-normal"
                      >
                        By domain & process
                      </Label>
                    </div>
                  </RadioGroup>
                </FormItem>

                {formKeyMode === 'key' && (
                  <FormField
                    control={form.control}
                    name="keyOverride"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key suffix</FormLabel>
                        <FormControl>
                          <Input
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="e.g. my-process or processName_UserTaskName"
                            className="gba:w-full"
                            data-testid={`${dataTestId}-key-override-input`}
                          />
                        </FormControl>
                        <p
                          className="gba:text-sm gba:font-mono gba:text-muted-foreground"
                          data-testid={`${dataTestId}-generated-screenkey`}
                        >
                          {getDisplayScreenKey()}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {formKeyMode === 'domainProcess' && (
                  <>
                    {mode === 'update' && !selectedDomain && !selectedProcess && keyOverride && (
                      <p className="gba:text-xs gba:text-amber-600 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded gba:px-3 gba:py-2">
                        Domain and process could not be derived from the existing key. Please select them below.
                      </p>
                    )}
                    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                      <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain (Service)</FormLabel>
                            <FormControl>
                              <Combobox
                                value={field.value}
                                onValueChange={value => {
                                  field.onChange(value)
                                  form.setValue('process', '')
                                }}
                                options={domains.map(d => ({ value: d.id, label: d.name }))}
                                placeholder={isLoadingServices ? 'Loading...' : 'Select domain'}
                                searchPlaceholder="Search domains..."
                                emptyText="No domains found"
                                disabled={isLoadingServices}
                                data-testid={`${dataTestId}-domain-combobox`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="process"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Process</FormLabel>
                            <FormControl>
                              <Combobox
                                value={field.value}
                                onValueChange={field.onChange}
                                options={processOptions.map(p => ({ value: p.name, label: p.name }))}
                                placeholder={selectedDomain ? 'Select process' : 'Select domain first'}
                                searchPlaceholder="Search processes..."
                                emptyText="No processes found"
                                disabled={!selectedDomain}
                                data-testid={`${dataTestId}-process-combobox`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="isLaunchingForm"
                      render={({ field }) => (
                        <FormItem className="gba:flex gba:items-center gba:space-x-2 gba:space-y-0">
                          <FormControl>
                            <Checkbox
                              id="isLaunchingForm"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid={`${dataTestId}-launching-form-checkbox`}
                            />
                          </FormControl>
                          <FormLabel htmlFor="isLaunchingForm" className="gba:cursor-pointer gba:font-normal">
                            Launching Form
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    {!isLaunchingForm && (
                      <FormField
                        control={form.control}
                        name="userTaskName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User Task Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ApprovalTask"
                                data-testid={`${dataTestId}-userTaskName-input`}
                                {...field}
                              />
                            </FormControl>
                            <p className="gba:text-xs gba:text-muted-foreground">e.g. ApprovalTask, ReviewTask</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="keyOverride"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Key override (optional)</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Override suffix; leave empty to use process"
                              className="gba:w-full"
                              data-testid={`${dataTestId}-key-override-input`}
                            />
                          </FormControl>
                          <p
                            className="gba:text-sm gba:font-mono gba:text-muted-foreground"
                            data-testid={`${dataTestId}-generated-screenkey`}
                          >
                            {getDisplayScreenKey()}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </>
            )}

            {/* URL Path Input (Native Screen only) */}
            {isNativeScreen && (
              <FormField
                control={form.control}
                name="urlPath"
                render={({ field }) => (
                  <FormItem>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <FormLabel>URL</FormLabel>
                        </TooltipTrigger>
                        <TooltipContent>
                          Enter the URL path after "platform/". Use forward slashes (/) to separate segments.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="gba:flex gba:items-center gba:space-x-0">
                      <div className="gba:flex gba:items-center gba:bg-gray-100 gba:border gba:border-r-0 gba:rounded-l-md gba:px-3 gba:py-2 gba:text-sm gba:text-gray-600">
                        platform/
                      </div>
                      <FormControl>
                        <Input
                          placeholder="apps/my-app"
                          className="gba:rounded-l-none gba:border-l-0"
                          data-testid={`${dataTestId}-urlPath-input`}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <p
                      className="gba:text-sm gba:font-mono gba:text-muted-foreground"
                      data-testid={`${dataTestId}-generated-screenkey`}
                    >
                      {getDisplayScreenKey()}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* System Key Input (System Component only) */}
            {isSystemComponent && (
              <FormField
                control={form.control}
                name="keyOverride"
                render={({ field }) => (
                  <FormItem>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <FormLabel>System Key</FormLabel>
                        </TooltipTrigger>
                        <TooltipContent>Define the suffix after "sys_" (e.g. home, chat, my_feature).</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="gba:flex gba:items-center gba:space-x-0">
                      <div className="gba:flex gba:items-center gba:bg-gray-100 gba:border gba:border-r-0 gba:rounded-l-md gba:px-3 gba:py-2 gba:text-sm gba:text-gray-600">
                        sys_
                      </div>
                      <FormControl>
                        <Input
                          placeholder="home"
                          className="gba:rounded-l-none gba:border-l-0"
                          data-testid={`${dataTestId}-system-key-input`}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <p
                      className="gba:text-sm gba:font-mono gba:text-muted-foreground"
                      data-testid={`${dataTestId}-generated-screenkey`}
                    >
                      {getDisplayScreenKey()}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="gba:grid gba:grid-cols-[1fr_minmax(0,6rem)] gba:gap-4">
              <FormField
                control={form.control}
                name="componentPath"
                render={({ field }) => (
                  <FormItem className="gba:min-w-0">
                    <FormLabel>Component Path</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/module/core/apps/component-name"
                        data-testid={`${dataTestId}-componentPath-input`}
                        {...field}
                      />
                    </FormControl>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Path to component in repository (e.g., /hr/core/apps/employee-directory)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem className="gba:min-w-0">
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0.0" data-testid={`${dataTestId}-version-input`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid={`${dataTestId}-submit-button`}>
                {isSubmitting ? 'Saving...' : getSubmitButtonText(mode)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
