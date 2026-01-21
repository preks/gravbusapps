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
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Component } from '@/common/data/resources/types/component.types'
import { useResourceManagerContext } from '../../contexts/ResourceManagerContext'
import {
  urlPathToScreenKey,
  screenKeyToUrlPath,
  generateFormScreenKey,
  splitCombinedType,
  combineBuildAndScreenType,
  parseFormScreenKey
} from '../../utils/componentKeyUtils'

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
  | 'native-form'
  | 'native-popup'
  | 'native-window'
  | 'lowcoder-screen'
  | 'lowcoder-form'
  | 'formio-form'

const COMBINED_TYPE_OPTIONS: Array<{ value: CombinedType; label: string }> = [
  { value: 'native-screen', label: 'Native Screen' },
  { value: 'native-form', label: 'Native Form' },
  { value: 'native-popup', label: 'Native Popup' },
  { value: 'native-window', label: 'Native Window' },
  { value: 'lowcoder-screen', label: 'Lowcoder Screen' },
  { value: 'lowcoder-form', label: 'Lowcoder Form' },
  { value: 'formio-form', label: 'FormIO Form' }
]

// Form validation schema
const componentFormSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  name: z.string().min(1, 'Name is required'),
  componentPath: z.string().min(1, 'Component path is required'),
  urlPath: z.string().optional(),
  domain: z.string().optional(),
  process: z.string().optional(),
  isLaunchingForm: z.boolean().optional(),
  userTaskName: z.string().optional(),
  version: z.string().optional(),
  flowIcon: z.string().optional()
})

type ComponentFormData = z.infer<typeof componentFormSchema>

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

  // Get domain/process data from context
  const { domains, getProcessesForDomain, isLoading: isLoadingServices } = useResourceManagerContext()

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
      isLaunchingForm: true,
      userTaskName: '',
      version: '',
      flowIcon: ''
    },
    mode: 'onChange'
  })

  const selectedDomain = form.watch('domain')
  const selectedProcess = form.watch('process')
  const isLaunchingForm = form.watch('isLaunchingForm')
  const userTaskName = form.watch('userTaskName')
  const urlPath = form.watch('urlPath')
  const componentName = form.watch('name')

  const processOptions = selectedDomain ? getProcessesForDomain(selectedDomain) : []

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCombinedType('native-screen')
      form.reset({
        type: 'native-screen',
        name: '',
        componentPath: '',
        urlPath: '',
        domain: '',
        process: '',
        isLaunchingForm: true,
        userTaskName: '',
        version: '',
        flowIcon: ''
      })
      setIsSubmitting(false)
    }
  }, [open, form])

  // Load initial data for update mode
  useEffect(() => {
    if (open && initialData && mode === 'update') {
      // Reconstruct combined type from builder and screen type
      const combined = combineBuildAndScreenType(
        initialData.screenComponents?.builderType || 'NATIVE_SCREEN',
        initialData.type || 'SCREEN'
      )
      setCombinedType(combined as CombinedType)

      // Extract URL path from screen key if it's url_ format
      let extractedUrlPath = ''
      if (initialData.screenKey?.startsWith('url_')) {
        extractedUrlPath = screenKeyToUrlPath(initialData.screenKey)
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

      form.setValue('type', combined)
      form.setValue('name', initialData.name || '')
      form.setValue('componentPath', initialData.screenComponents?.formDefinition?.componentPath || '')
      form.setValue('urlPath', extractedUrlPath)
      form.setValue('domain', parsedFormData?.domain || '')
      form.setValue('process', parsedFormData?.process || '')
      form.setValue('isLaunchingForm', parsedFormData?.isLaunchingForm ?? true)
      form.setValue('userTaskName', parsedFormData?.userTaskName || '')
      form.setValue('version', initialData.screenComponents?.formDefinition?.version || '')
      form.setValue('flowIcon', initialData.screenComponents?.flowIcon || '')
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
        form.setValue('isLaunchingForm', true)
        form.setValue('userTaskName', '')
      }
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
        } else if (
          combinedType === 'native-form' ||
          combinedType === 'native-popup' ||
          combinedType === 'native-window' ||
          combinedType === 'lowcoder-form' ||
          combinedType === 'formio-form'
        ) {
          if (data.process) {
            if (data.isLaunchingForm) {
              // Launching form: frm_<processName>
              screenKey = `frm_${data.process}`
            } else {
              // User Task form (new format): tfrm_<processName>_<userTaskName>
              screenKey = `tfrm_${data.process}_${data.userTaskName}`
            }
          } else {
            // Fallback: generate from name
            screenKey = generateFormScreenKey(data.name)
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
              flowIcon: data.flowIcon || '',
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
    [combinedType, onSubmit, onOpenChange]
  )

  const isNativeScreen = combinedType === 'native-screen'
  const isFormOrPopup =
    combinedType === 'native-form' ||
    combinedType === 'native-popup' ||
    combinedType === 'native-window' ||
    combinedType === 'lowcoder-form' ||
    combinedType === 'formio-form'

  // Generate display screen key for preview
  const getDisplayScreenKey = useCallback(() => {
    if (combinedType === 'native-screen' && urlPath) {
      return urlPathToScreenKey(urlPath)
    } else if (isFormOrPopup) {
      if (selectedProcess) {
        if (isLaunchingForm) {
          return `frm_${selectedProcess}`
        } else {
          // New format with underscore separator
          return `tfrm_${selectedProcess}_${userTaskName}`
        }
      } else if (componentName) {
        return generateFormScreenKey(componentName)
      }
    }
    return isNativeScreen ? 'url_' : 'frm_'
  }, [
    combinedType,
    urlPath,
    selectedProcess,
    isLaunchingForm,
    userTaskName,
    componentName,
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

            {/* Domain/Process Selection (Form/Popup types only) */}
            {isFormOrPopup && (
              <>
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  {/* Domain */}
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
                              form.setValue('process', '') // Reset process
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

                  {/* Process */}
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
                            placeholder={!selectedDomain ? 'Select domain first' : 'Select process'}
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

                {/* Launching Form Checkbox */}
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

                {/* User Task Name (if not launching form) */}
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
                        <p className="gba:text-xs gba:text-muted-foreground">
                          Enter the user task name (e.g., ApprovalTask, ReviewTask)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    <FormLabel>URL</FormLabel>
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
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Enter the URL path after "platform/". Use forward slashes (/) to separate segments.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Generated Screen Key Display */}
            <div
              className={`gba:p-3 gba:border gba:rounded-md ${
                isNativeScreen ? 'gba:bg-blue-50 gba:border-blue-200' : 'gba:bg-green-50 gba:border-green-200'
              }`}
            >
              <div
                className={`gba:text-xs gba:font-medium gba:mb-1 ${
                  isNativeScreen ? 'gba:text-blue-600' : 'gba:text-green-600'
                }`}
              >
                Generated Screen Key:
              </div>
              <div
                className={`gba:text-sm gba:font-mono ${isNativeScreen ? 'gba:text-blue-800' : 'gba:text-green-800'}`}
                data-testid={`${dataTestId}-generated-screenkey`}
              >
                {getDisplayScreenKey()}
              </div>
            </div>

            {/* Component Path */}
            <FormField
              control={form.control}
              name="componentPath"
              render={({ field }) => (
                <FormItem>
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

            {/* Version */}
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter version (optional)"
                      data-testid={`${dataTestId}-version-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Flow Icon */}
            <FormField
              control={form.control}
              name="flowIcon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flow Icon</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter icon (optional)"
                      data-testid={`${dataTestId}-flowIcon-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid={`${dataTestId}-submit-button`}>
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
