/**
 * AutomationWizard Component
 *
 * Multi-step wizard for creating and editing spreadsheet automations.
 * Guides users through type selection, trigger configuration, workflow design, and column mapping.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Checkbox,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  FileSpreadsheet,
  Users,
  ClipboardCheck,
  Zap,
  Play,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  ArrowDown,
  AlertCircle,
  Info,
  User,
  UserCheck,
  Building,
  X
} from 'lucide-react'
import { TrackingColumnsConfig, getDefaultTrackingColumns } from './TrackingColumnsConfig'
import type {
  SpreadsheetAutomation,
  AutomationType,
  AutomationTrigger,
  ColumnWorkflowMapping,
  ResultMapping,
  AutomationFlowStep,
  AutomationFlowTemplate,
  SheetApprovalConfig
} from '../../types/automation'
import type { SpreadsheetColumn } from '../../types/spreadsheet'
import { UserSelect } from '@/components/user-select'
import MultiEmployeeSelect from '@/components/multi-employee-select/MultiEmployeeSelect'

function getTriggerStepDescription(automationType: AutomationType): string {
  if (automationType === 'sheet_approval') {
    return 'Sheet approval is triggered manually when you submit the spreadsheet for review.'
  }
  if (automationType === 'bulk_collection') {
    return 'Choose when to send out collection requests to participants.'
  }
  return 'Choose when this automation should run.'
}

export interface AutomationWizardProps {
  /** Whether the wizard dialog is open */
  isOpen: boolean
  /** Callback to close the wizard */
  onClose: () => void
  /** Callback when automation is saved */
  onSave: (automation: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => Promise<void>
  /** Existing automation to edit (undefined for new) */
  existingAutomation?: SpreadsheetAutomation
  /** Available columns in the sheet */
  columns: SpreadsheetColumn[]
  /** Spreadsheet ID */
  spreadsheetId: string
  /** Sheet ID */
  sheetId: string
  /** Access token for API calls (user selection) */
  accessToken?: string
  /** Optional: Update column labels to match form field labels (for bulk collection headers) */
  onColumnLabelsUpdate?: (updates: Array<{ columnId: string; newLabel: string }>) => void
  /** Data test ID */
  'data-testid'?: string
}

type WizardStep = 'type' | 'trigger' | 'workflow' | 'mapping' | 'review'

const WIZARD_STEPS: WizardStep[] = ['type', 'trigger', 'workflow', 'mapping', 'review']

/** Local wizard state for step assignment configuration */
interface WizardStepAssignment {
  stepId: string
  assignee?: string // 'initiator' | 'manager' | 'column' | 'specific' | 'team' | 'department'
  assigneeColumn?: string
  assigneeUserId?: string
  assigneeEmail?: string
  recipientList?: string
}

interface AutomationTypeOption {
  type: AutomationType
  title: string
  description: string
  icon: React.FC<{ className?: string }>
  useCases: string[]
}

const AUTOMATION_TYPES: AutomationTypeOption[] = [
  {
    type: 'row_workflow',
    title: 'Row Workflow',
    description: 'Trigger a workflow for each row. Track progress and results per row.',
    icon: FileSpreadsheet,
    useCases: ['Purchase approvals', 'Invoice processing', 'Onboarding tasks']
  },
  {
    type: 'bulk_collection',
    title: 'Bulk Collection',
    description: 'Send workflows to multiple users and collect responses into this spreadsheet.',
    icon: Users,
    useCases: ['Employee surveys', 'Performance reviews', 'Status updates']
  },
  {
    type: 'sheet_approval',
    title: 'Sheet Approval',
    description: 'Submit the entire sheet for approval before processing.',
    icon: ClipboardCheck,
    useCases: ['Budget approval', 'Batch processing', 'Quality review']
  },
  {
    type: 'line_approval',
    title: 'Line Item Approval',
    description: 'Approve or reject individual rows with detailed review.',
    icon: Zap,
    useCases: ['Expense review', 'Order validation', 'Content moderation']
  }
]

interface TriggerOption {
  trigger: AutomationTrigger
  title: string
  description: string
  icon: React.FC<{ className?: string }>
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    trigger: 'manual',
    title: 'Manual',
    description: 'Run the automation when you click the Run button.',
    icon: Play
  },
  {
    trigger: 'onRowAdd',
    title: 'On Row Add',
    description: 'Automatically run when a new row is added.',
    icon: Plus
  },
  {
    trigger: 'onFieldChange',
    title: 'On Field Change',
    description: 'Run when specific columns are modified.',
    icon: RefreshCw
  },
  {
    trigger: 'scheduled',
    title: 'Scheduled',
    description: 'Run at specific times or intervals.',
    icon: Clock
  }
]

/**
 * Get available triggers based on automation type
 * Different automation types have different valid triggers
 */
const getAvailableTriggersForType = (type: AutomationType | null): AutomationTrigger[] => {
  switch (type) {
    case 'row_workflow':
      // Row workflows can be triggered by anything
      return ['manual', 'onRowAdd', 'onFieldChange', 'scheduled']

    case 'bulk_collection':
      // Bulk collection is about sending forms to users - only manual or scheduled makes sense
      return ['manual', 'scheduled']

    case 'sheet_approval':
      // Sheet approval is a conscious decision to submit - only manual
      return ['manual']

    case 'line_approval':
      // Line approval can be manual or triggered when rows are added/changed
      return ['manual', 'onRowAdd', 'onFieldChange']

    default:
      return ['manual']
  }
}

/**
 * AutomationWizard Component
 */
export const AutomationWizard: React.FC<AutomationWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  existingAutomation,
  columns,
  accessToken,
  onColumnLabelsUpdate,
  'data-testid': testId = 'automation-wizard'
}) => {
  const isEditing = !!existingAutomation

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('type')
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [automationType, setAutomationType] = useState<AutomationType | null>(null)
  const [trigger, setTrigger] = useState<AutomationTrigger>('manual')
  const [watchColumns, setWatchColumns] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnWorkflowMapping[]>([])
  const [resultMappings, setResultMappings] = useState<ResultMapping[]>([])
  const [statusColumn, setStatusColumn] = useState<string | undefined>()

  // Workflow configuration
  const [workflowSteps, setWorkflowSteps] = useState<AutomationFlowStep[]>([])

  // Approval configuration (using local wizard state type)
  const [approvalSteps, setApprovalSteps] = useState<WizardStepAssignment[]>([])

  // Selected recipients for bulk collection (id=employeeId for display, userId for assignment - flow engine requires userId)
  const [selectedRecipients, setSelectedRecipients] = useState<
    Array<{ id: string; userId?: string; name: string; email?: string }>
  >([])

  // Form fields for bulk collection (what questions to ask)
  const [formFields, setFormFields] = useState<
    Array<{
      id: string
      label: string
      type: 'text' | 'number' | 'date' | 'textarea' | 'select'
      required: boolean
      targetColumn: string // which column to write response to
      options?: string[] // for select type
    }>
  >([])

  // Tracking columns for bulk collection (auto-generated metadata columns)
  const [trackingColumns, setTrackingColumns] = useState<string[]>(() => getDefaultTrackingColumns())

  // Helper to add a form field from a column
  const addFormFieldFromColumn = (col: SpreadsheetColumn) => {
    const fieldType = col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'
    setFormFields(prev => [
      ...prev,
      {
        id: `field_${Date.now()}`,
        label: col.label,
        type: fieldType,
        required: false,
        targetColumn: col.id
      }
    ])
  }

  // Helper to remove a form field
  const removeFormField = (fieldId: string) => {
    setFormFields(prev => prev.filter(f => f.id !== fieldId))
  }

  // Helper to update a form field
  const updateFormField = (fieldId: string, updates: Partial<(typeof formFields)[0]>) => {
    setFormFields(prev => prev.map(f => (f.id === fieldId ? { ...f, ...updates } : f)))
  }

  // Initialize from existing automation
  useEffect(() => {
    if (existingAutomation) {
      setName(existingAutomation.name)
      setDescription(existingAutomation.description || '')
      setAutomationType(existingAutomation.type)
      setTrigger(existingAutomation.trigger)
      setWatchColumns(existingAutomation.triggerConfig.watchColumns || [])
      setColumnMappings(existingAutomation.workflowConfig.columnMappings || [])
      setResultMappings(existingAutomation.workflowConfig.resultMappings || [])
      setStatusColumn(existingAutomation.workflowConfig.statusColumn)

      if (existingAutomation.workflowConfig.dynamicTemplate?.steps) {
        setWorkflowSteps(existingAutomation.workflowConfig.dynamicTemplate.steps)
      }

      if (existingAutomation.approvalConfig?.approvalSteps) {
        setApprovalSteps(existingAutomation.approvalConfig.approvalSteps)
      }

      // Load bulk collection specific config
      if (existingAutomation.collectionConfig) {
        // Load tracking columns (or use defaults)
        setTrackingColumns(existingAutomation.collectionConfig.trackingColumns || getDefaultTrackingColumns())

        // Load form fields
        if (existingAutomation.collectionConfig.formFields) {
          setFormFields(
            existingAutomation.collectionConfig.formFields.map(f => ({
              id: f.id,
              label: f.label,
              type: (f.inputType?.toLowerCase() || 'text') as 'text' | 'number' | 'date' | 'textarea' | 'select',
              required: f.required || false,
              targetColumn: f.columnId || f.id
            }))
          )
        }

        // Load recipient type
        if (existingAutomation.collectionConfig.recipientType) {
          setApprovalSteps([{ stepId: 'collect', assignee: existingAutomation.collectionConfig.recipientType }])
        }
      }

      // When editing, skip to the workflow step since type/trigger are already set
      setCurrentStep('workflow')
    }
  }, [existingAutomation])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      if (!existingAutomation) {
        setCurrentStep('type')
        setName('')
        setDescription('')
        setAutomationType(null)
        setTrigger('manual')
        setWatchColumns([])
        setColumnMappings([])
        setResultMappings([])
        setStatusColumn(undefined)
        setWorkflowSteps([])
        setApprovalSteps([])
        setValidationErrors([])
        setFormFields([])
        setTrackingColumns(getDefaultTrackingColumns())
        setSelectedRecipients([])
      }
    }
  }, [isOpen, existingAutomation])

  // Current step index
  const currentStepIndex = WIZARD_STEPS.indexOf(currentStep)

  // Helper: Get placeholder name based on automation type
  const getPlaceholderName = (): string => {
    switch (automationType) {
      case 'row_workflow':
        return 'e.g., Process Customer Requests'
      case 'bulk_collection':
        return 'e.g., Q4 Employee Survey'
      case 'sheet_approval':
        return 'e.g., Budget Approval'
      case 'line_approval':
        return 'e.g., Expense Line Approval'
      default:
        return 'e.g., My Automation'
    }
  }

  // Helper: Get placeholder description based on automation type
  const getPlaceholderDescription = (): string => {
    switch (automationType) {
      case 'row_workflow':
        return 'Process each row through review and completion tasks...'
      case 'bulk_collection':
        return 'Collect responses from team members into this spreadsheet...'
      case 'sheet_approval':
        return 'Submit the entire sheet for manager approval...'
      case 'line_approval':
        return 'Each line item will be reviewed and approved separately...'
      default:
        return 'Describe what this automation does...'
    }
  }

  // Validation
  const validateCurrentStep = useCallback((): boolean => {
    const errors: string[] = []

    switch (currentStep) {
      case 'type':
        if (!automationType) {
          errors.push('Please select an automation type')
        }
        break

      case 'trigger':
        if (trigger === 'onFieldChange' && watchColumns.length === 0) {
          errors.push('Please select at least one column to watch')
        }
        break

      case 'workflow':
        if (!name.trim()) {
          errors.push('Please enter an automation name')
        }
        if (workflowSteps.length === 0 && approvalSteps.length === 0) {
          errors.push('Please add at least one workflow step')
        }
        break

      case 'mapping':
        // Mapping is optional
        break

      case 'review':
        // Final validation before save
        if (!name.trim()) errors.push('Automation name is required')
        if (!automationType) errors.push('Automation type is required')
        break
    }

    setValidationErrors(errors)
    return errors.length === 0
  }, [currentStep, automationType, trigger, watchColumns, name, workflowSteps, approvalSteps])

  // Navigation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 'type':
        return !!automationType
      case 'trigger':
        return trigger !== 'onFieldChange' || watchColumns.length > 0
      case 'workflow':
        return name.trim().length > 0
      case 'mapping':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }, [currentStep, automationType, trigger, watchColumns, name])

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return

    const nextIndex = currentStepIndex + 1
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex])
    }
  }, [currentStepIndex, validateCurrentStep])

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex])
      setValidationErrors([])
    }
  }, [currentStepIndex])

  // Add column mapping
  const addColumnMapping = useCallback(() => {
    if (columns.length === 0) return

    const newMapping: ColumnWorkflowMapping = {
      columnId: columns[0].id,
      columnName: columns[0].name,
      workflowParameter: '',
      direction: 'toWorkflow'
    }
    setColumnMappings(prev => [...prev, newMapping])
  }, [columns])

  // Update column mapping
  const updateColumnMapping = useCallback((index: number, updates: Partial<ColumnWorkflowMapping>) => {
    setColumnMappings(prev => prev.map((mapping, i) => (i === index ? { ...mapping, ...updates } : mapping)))
  }, [])

  // Remove column mapping
  const removeColumnMapping = useCallback((index: number) => {
    setColumnMappings(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Save automation
  const handleSave = useCallback(async () => {
    if (!validateCurrentStep()) return
    if (!automationType) return

    setIsSaving(true)
    try {
      const dynamicTemplate: AutomationFlowTemplate | undefined =
        workflowSteps.length > 0
          ? {
              type: 'TEMPLATE',
              name,
              description,
              version: 1,
              steps: workflowSteps
            }
          : undefined

      const approvalConfig: SheetApprovalConfig | undefined =
        (automationType === 'sheet_approval' || automationType === 'line_approval') && approvalSteps.length > 0
          ? {
              mode: automationType === 'sheet_approval' ? 'full_sheet' : 'line_item',
              approvalSteps,
              onApprove: 'notify',
              onReject: 'return_to_submitter'
            }
          : undefined

      // Build collection config for bulk_collection type
      const recipientType = approvalSteps[0]?.assignee as 'team' | 'department' | 'specific' | undefined
      const collectionConfig =
        automationType === 'bulk_collection'
          ? {
              recipientType: recipientType || 'specific',
              recipients: selectedRecipients.map(r => r.userId || r.id),
              trackingColumns, // Include selected tracking columns
              formFields: formFields.map(f => ({
                id: f.id,
                label: f.label,
                type: 'existing_column' as const,
                columnId: f.targetColumn,
                inputType: f.type.toUpperCase() as 'TEXT' | 'NUMBER' | 'DATE' | 'TEXTAREA' | 'SELECT',
                required: f.required
              })),
              rowIdentifier: 'assignee' as const,
              fieldMappings: formFields.map(f => ({
                workflowOutputPath: `step_0.formData.${f.targetColumn}`,
                targetColumnId: f.targetColumn
              })),
              deduplication: 'append' as const
            }
          : undefined

      // For bulk_collection, build columnMappings from formFields so response formData maps to sheet columns
      // Table renders with col.name so we need columnId (form key) -> columnName for correct cell keys
      const effectiveColumnMappings =
        automationType === 'bulk_collection' && formFields.length > 0
          ? formFields.map(f => {
              const col = columns.find(c => c.id === f.targetColumn)
              return {
                columnId: f.targetColumn,
                columnName: col?.name ?? f.targetColumn,
                workflowParameter: f.targetColumn,
                direction: 'fromWorkflow' as const
              }
            })
          : columnMappings

      const automation: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> = {
        name,
        description: description || undefined,
        type: automationType,
        trigger,
        isEnabled: true,
        workflowConfig: {
          columnMappings: effectiveColumnMappings,
          resultMappings: resultMappings.length > 0 ? resultMappings : undefined,
          statusColumn,
          dynamicTemplate
        },
        triggerConfig: {
          watchColumns: trigger === 'onFieldChange' ? watchColumns : undefined
        },
        approvalConfig,
        collectionConfig
      }

      // For bulk collection: update column labels to match form field labels (headers)
      if (automationType === 'bulk_collection' && formFields.length > 0 && onColumnLabelsUpdate) {
        const labelUpdates = formFields
          .map(field => {
            const col = columns.find(c => c.id === field.targetColumn)
            if (col && field.label.trim() && col.label !== field.label.trim()) {
              return { columnId: col.id, newLabel: field.label.trim() }
            }
            return null
          })
          .filter((u): u is { columnId: string; newLabel: string } => u !== null)
        if (labelUpdates.length > 0) {
          onColumnLabelsUpdate(labelUpdates)
        }
      }

      await onSave(automation)
      onClose()
    } catch (error) {
      console.error('Failed to save automation:', error)
      setValidationErrors(['Failed to save automation. Please try again.'])
    } finally {
      setIsSaving(false)
    }
  }, [
    automationType,
    name,
    description,
    trigger,
    watchColumns,
    columns,
    columnMappings,
    resultMappings,
    statusColumn,
    workflowSteps,
    approvalSteps,
    selectedRecipients,
    formFields,
    onColumnLabelsUpdate,
    validateCurrentStep,
    onSave,
    onClose
  ])

  const handleSelectAutomationType = useCallback(
    (type: AutomationType) => {
      setAutomationType(type)
      const validTriggers = getAvailableTriggersForType(type)
      if (!validTriggers.includes(trigger)) {
        setTrigger(validTriggers[0])
      }
    },
    [trigger]
  )

  const toggleWatchColumn = useCallback((columnId: string, checked: boolean) => {
    setWatchColumns(prev => (checked ? [...prev, columnId] : prev.filter(id => id !== columnId)))
  }, [])

  // Auto-select trigger when only one trigger option is available on the trigger step.
  useEffect(() => {
    if (currentStep !== 'trigger') return
    if (trigger) return

    const availableTriggers = getAvailableTriggersForType(automationType)
    const filteredOptions = TRIGGER_OPTIONS.filter(opt => availableTriggers.includes(opt.trigger))
    if (filteredOptions.length === 1) {
      setTrigger(filteredOptions[0].trigger)
    }
  }, [automationType, currentStep, trigger])

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div className="gba:space-y-4">
            <p className="gba:text-muted-foreground">Choose how this automation will process your spreadsheet data.</p>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {AUTOMATION_TYPES.map(option => {
                const Icon = option.icon
                const isSelected = automationType === option.type

                return (
                  <Card
                    key={option.type}
                    className={`gba:cursor-pointer gba:transition-all ${
                      isSelected ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : 'gba:hover:border-primary/50'
                    }`}
                    onClick={() => handleSelectAutomationType(option.type)}
                  >
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <div
                          className={`gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center ${
                            isSelected ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted'
                          }`}
                        >
                          <Icon className="gba:w-5 gba:h-5" />
                        </div>
                        <div className="gba:flex-1">
                          <h3 className="gba:font-semibold gba:text-foreground">{option.title}</h3>
                          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{option.description}</p>
                          <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2">
                            {option.useCases.map(useCase => (
                              <Badge key={useCase} variant="outline" className="gba:text-xs">
                                {useCase}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )

      case 'trigger': {
        const availableTriggers = getAvailableTriggersForType(automationType)
        const filteredOptions = TRIGGER_OPTIONS.filter(opt => availableTriggers.includes(opt.trigger))

        return (
          <div className="gba:space-y-4">
            <p className="gba:text-muted-foreground">{getTriggerStepDescription(automationType)}</p>
            <div className="gba:space-y-3">
              {filteredOptions.map(option => {
                const Icon = option.icon
                const isSelected = trigger === option.trigger

                return (
                  <Card
                    key={option.trigger}
                    className={`gba:cursor-pointer gba:transition-all ${
                      isSelected ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : 'gba:hover:border-primary/50'
                    }`}
                    onClick={() => setTrigger(option.trigger)}
                  >
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div
                          className={`gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center ${
                            isSelected ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted'
                          }`}
                        >
                          <Icon className="gba:w-5 gba:h-5" />
                        </div>
                        <div>
                          <h3 className="gba:font-semibold gba:text-foreground">{option.title}</h3>
                          <p className="gba:text-sm gba:text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {trigger === 'onFieldChange' && (
              <div className="gba:mt-4 gba:p-4 gba:bg-muted gba:rounded-lg">
                <Label className="gba:mb-2 gba:block">Select columns to watch</Label>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {columns.map(column => (
                    <label
                      key={column.id}
                      className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-background gba:rounded-md gba:cursor-pointer"
                    >
                      <Checkbox
                        checked={watchColumns.includes(column.id)}
                        onCheckedChange={checked => {
                          toggleWatchColumn(column.id, Boolean(checked))
                        }}
                      />
                      <span className="gba:text-sm">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      case 'workflow':
        return (
          <div className="gba:space-y-6">
            {/* Basic Info */}
            <div className="gba:space-y-4">
              <h4 className="gba:font-semibold gba:text-foreground">Basic Information</h4>
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div>
                  <Label htmlFor="automation-name">Automation Name *</Label>
                  <Input
                    id="automation-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={getPlaceholderName()}
                    className="gba:mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="status-column" className="gba:flex gba:items-center gba:gap-1">
                    Status Column
                    <span
                      className="gba:text-muted-foreground gba:cursor-help"
                      title="Select a column where the workflow status (Pending, In Progress, Completed, etc.) will be displayed for each row"
                    >
                      <Info className="gba:w-3.5 gba:h-3.5" />
                    </span>
                  </Label>
                  <Select
                    value={statusColumn || '__none__'}
                    onValueChange={value => setStatusColumn(value === '__none__' ? undefined : value)}
                  >
                    <SelectTrigger className="gba:mt-1">
                      <SelectValue placeholder="Select column to show status" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 1000003 }}>
                      <SelectItem value="__none__">None (don't track in spreadsheet)</SelectItem>
                      {columns.map(column => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    Shows workflow progress like "Pending Review", "Approved", etc. in this column
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="automation-description">Description (optional)</Label>
                <Textarea
                  id="automation-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={getPlaceholderDescription()}
                  className="gba:mt-1"
                  rows={2}
                />
              </div>
            </div>

            {/* Type-specific Workflow Configuration - with assignee selection */}
            <div className="gba:border-t gba:pt-6">
              <h4 className="gba:font-semibold gba:text-foreground gba:mb-4 gba:flex gba:items-center gba:gap-2">
                {automationType === 'row_workflow' && <FileSpreadsheet className="gba:w-4 gba:h-4" />}
                {automationType === 'sheet_approval' && <ClipboardCheck className="gba:w-4 gba:h-4" />}
                {automationType === 'line_approval' && <Zap className="gba:w-4 gba:h-4" />}
                {automationType === 'bulk_collection' && <Users className="gba:w-4 gba:h-4" />}
                Workflow Steps
              </h4>

              {automationType === 'row_workflow' && (
                <div className="gba:space-y-4">
                  <p className="gba:text-sm gba:text-muted-foreground">
                    Each row triggers a workflow with these steps. Configure who handles each step.
                  </p>

                  <Card>
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:text-primary gba:font-medium gba:text-sm">
                            1
                          </div>
                          <div>
                            <div className="gba:font-medium">Review Row Data</div>
                            <div className="gba:text-sm gba:text-muted-foreground">Task • 24h deadline</div>
                          </div>
                        </div>
                        <div className="gba:w-48">
                          <Label className="gba:text-xs gba:text-muted-foreground">Assigned to</Label>
                          <Select
                            value={approvalSteps[0]?.assignee || 'initiator'}
                            onValueChange={value => {
                              const newSteps = [...approvalSteps]
                              if (!newSteps[0]) newSteps[0] = { stepId: 'review', assignee: value }
                              else newSteps[0].assignee = value
                              setApprovalSteps(newSteps)
                            }}
                          >
                            <SelectTrigger className="gba:mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              <SelectItem value="initiator">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <User className="gba:w-3 gba:h-3" />
                                  Myself (initiator)
                                </div>
                              </SelectItem>
                              <SelectItem value="manager">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <UserCheck className="gba:w-3 gba:h-3" />
                                  My Manager
                                </div>
                              </SelectItem>
                              <SelectItem value="column">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <FileSpreadsheet className="gba:w-3 gba:h-3" />
                                  From Column...
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {approvalSteps[0]?.assignee === 'column' && (
                            <Select
                              value={approvalSteps[0]?.assigneeColumn || ''}
                              onValueChange={value => {
                                const newSteps = [...approvalSteps]
                                if (newSteps[0]) newSteps[0].assigneeColumn = value
                                setApprovalSteps(newSteps)
                              }}
                            >
                              <SelectTrigger className="gba:mt-2">
                                <SelectValue placeholder="Select column..." />
                              </SelectTrigger>
                              <SelectContent style={{ zIndex: 1000003 }}>
                                {columns
                                  .filter(c => c.type === 'user' || c.type === 'email' || c.type === 'text')
                                  .map(column => (
                                    <SelectItem key={column.id} value={column.id}>
                                      {column.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="gba:flex gba:justify-center">
                    <ArrowDown className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>

                  <Card>
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:text-primary gba:font-medium gba:text-sm">
                            2
                          </div>
                          <div>
                            <div className="gba:font-medium">Process Row</div>
                            <div className="gba:text-sm gba:text-muted-foreground">Task • 48h deadline</div>
                          </div>
                        </div>
                        <div className="gba:w-48">
                          <Label className="gba:text-xs gba:text-muted-foreground">Assigned to</Label>
                          <Select
                            value={approvalSteps[1]?.assignee || 'initiator'}
                            onValueChange={value => {
                              const newSteps = [...approvalSteps]
                              if (!newSteps[1]) newSteps[1] = { stepId: 'process', assignee: value }
                              else newSteps[1].assignee = value
                              setApprovalSteps(newSteps)
                            }}
                          >
                            <SelectTrigger className="gba:mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              <SelectItem value="initiator">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <User className="gba:w-3 gba:h-3" />
                                  Myself (initiator)
                                </div>
                              </SelectItem>
                              <SelectItem value="manager">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <UserCheck className="gba:w-3 gba:h-3" />
                                  My Manager
                                </div>
                              </SelectItem>
                              <SelectItem value="column">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <FileSpreadsheet className="gba:w-3 gba:h-3" />
                                  From Column...
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {approvalSteps[1]?.assignee === 'column' && (
                            <Select
                              value={approvalSteps[1]?.assigneeColumn || ''}
                              onValueChange={value => {
                                const newSteps = [...approvalSteps]
                                if (newSteps[1]) newSteps[1].assigneeColumn = value
                                setApprovalSteps(newSteps)
                              }}
                            >
                              <SelectTrigger className="gba:mt-2">
                                <SelectValue placeholder="Select column..." />
                              </SelectTrigger>
                              <SelectContent style={{ zIndex: 1000003 }}>
                                {columns
                                  .filter(c => c.type === 'user' || c.type === 'email' || c.type === 'text')
                                  .map(column => (
                                    <SelectItem key={column.id} value={column.id}>
                                      {column.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {automationType === 'sheet_approval' && (
                <div className="gba:space-y-4">
                  <p className="gba:text-sm gba:text-muted-foreground">
                    The entire spreadsheet will be submitted for approval. Configure who reviews it.
                  </p>

                  <Card>
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-info/10 gba:flex gba:items-center gba:justify-center gba:text-info gba:font-medium gba:text-sm">
                            1
                          </div>
                          <div>
                            <div className="gba:font-medium">Submission Notification</div>
                            <div className="gba:text-sm gba:text-muted-foreground">Info • Automatic</div>
                          </div>
                        </div>
                        <div className="gba:text-sm gba:text-muted-foreground gba:italic">Sent to submitter</div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="gba:flex gba:justify-center">
                    <ArrowDown className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>

                  <Card className="gba:border-primary/50">
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-warning/10 gba:flex gba:items-center gba:justify-center gba:text-warning gba:font-medium gba:text-sm">
                            2
                          </div>
                          <div>
                            <div className="gba:font-medium">Approve Spreadsheet</div>
                            <div className="gba:text-sm gba:text-muted-foreground">Approval • 3 day deadline</div>
                          </div>
                        </div>
                        <div className="gba:w-48">
                          <Label className="gba:text-xs gba:text-muted-foreground">Approver *</Label>
                          <Select
                            value={approvalSteps[0]?.assignee || ''}
                            onValueChange={value => {
                              const newSteps = [...approvalSteps]
                              if (!newSteps[0]) newSteps[0] = { stepId: 'approve', assignee: value }
                              else newSteps[0].assignee = value
                              setApprovalSteps(newSteps)
                            }}
                          >
                            <SelectTrigger className="gba:mt-1">
                              <SelectValue placeholder="Who approves?" />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              <SelectItem value="manager">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <UserCheck className="gba:w-3 gba:h-3" />
                                  My Manager
                                </div>
                              </SelectItem>
                              <SelectItem value="specific">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <User className="gba:w-3 gba:h-3" />
                                  Specific Person...
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {approvalSteps[0]?.assignee === 'specific' && (
                            <div className="gba:mt-2">
                              <UserSelect
                                accessToken={accessToken}
                                value={approvalSteps[0]?.assigneeUserId || null}
                                onValueChange={userId => {
                                  const newSteps = [...approvalSteps]
                                  if (!newSteps[0]) newSteps[0] = { stepId: 'approve', assignee: 'specific' }
                                  newSteps[0].assigneeUserId = userId || undefined
                                  setApprovalSteps(newSteps)
                                }}
                                placeholder="Search and select a person..."
                                data-testid="sheet-approval-user-select"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {automationType === 'line_approval' && (
                <div className="gba:space-y-4">
                  <p className="gba:text-sm gba:text-muted-foreground">
                    Each row is sent for individual approval. Configure who approves each line item.
                  </p>

                  <Card className="gba:border-primary/50">
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-warning/10 gba:flex gba:items-center gba:justify-center gba:text-warning gba:font-medium gba:text-sm">
                            <RefreshCw className="gba:w-4 gba:h-4" />
                          </div>
                          <div>
                            <div className="gba:font-medium">Approve Line Item</div>
                            <div className="gba:text-sm gba:text-muted-foreground">Per-row approval • 48h deadline</div>
                          </div>
                        </div>
                        <div className="gba:w-48">
                          <Label className="gba:text-xs gba:text-muted-foreground">Approver *</Label>
                          <Select
                            value={approvalSteps[0]?.assignee || ''}
                            onValueChange={value => {
                              const newSteps = [...approvalSteps]
                              if (!newSteps[0]) newSteps[0] = { stepId: 'approve_line', assignee: value }
                              else newSteps[0].assignee = value
                              setApprovalSteps(newSteps)
                            }}
                          >
                            <SelectTrigger className="gba:mt-1">
                              <SelectValue placeholder="Who approves?" />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              <SelectItem value="manager">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <UserCheck className="gba:w-3 gba:h-3" />
                                  My Manager
                                </div>
                              </SelectItem>
                              <SelectItem value="column">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <FileSpreadsheet className="gba:w-3 gba:h-3" />
                                  From Column (per row)...
                                </div>
                              </SelectItem>
                              <SelectItem value="specific">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <User className="gba:w-3 gba:h-3" />
                                  Specific Person...
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {approvalSteps[0]?.assignee === 'column' && (
                            <Select
                              value={approvalSteps[0]?.assigneeColumn || ''}
                              onValueChange={value => {
                                const newSteps = [...approvalSteps]
                                if (newSteps[0]) newSteps[0].assigneeColumn = value
                                setApprovalSteps(newSteps)
                              }}
                            >
                              <SelectTrigger className="gba:mt-2">
                                <SelectValue placeholder="Select approver column..." />
                              </SelectTrigger>
                              <SelectContent style={{ zIndex: 1000003 }}>
                                {columns
                                  .filter(c => c.type === 'user' || c.type === 'email' || c.type === 'text')
                                  .map(column => (
                                    <SelectItem key={column.id} value={column.id}>
                                      {column.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                          {approvalSteps[0]?.assignee === 'specific' && (
                            <div className="gba:mt-2">
                              <UserSelect
                                accessToken={accessToken}
                                value={approvalSteps[0]?.assigneeUserId || null}
                                onValueChange={userId => {
                                  const newSteps = [...approvalSteps]
                                  if (!newSteps[0]) newSteps[0] = { stepId: 'approve_line', assignee: 'specific' }
                                  newSteps[0].assigneeUserId = userId || undefined
                                  setApprovalSteps(newSteps)
                                }}
                                placeholder="Search and select a person..."
                                data-testid="line-approval-user-select"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:text-sm gba:text-muted-foreground">
                    <strong>Tip:</strong> Use "From Column" if each row has a different approver (e.g., department
                    manager stored in the row data).
                  </div>
                </div>
              )}

              {automationType === 'bulk_collection' && (
                <div className="gba:space-y-6">
                  {/* Section 1: Recipients */}
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                        1
                      </div>
                      <Label className="gba:text-sm gba:font-semibold">Who should receive this form?</Label>
                    </div>

                    <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                      {[
                        { value: 'team', icon: Users, label: 'My Team', desc: 'Direct reports' },
                        { value: 'department', icon: Building, label: 'Department', desc: 'All members' },
                        { value: 'specific', icon: User, label: 'Specific People', desc: 'Choose who' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const newSteps = [...approvalSteps]
                            if (!newSteps[0]) newSteps[0] = { stepId: 'collect', assignee: opt.value }
                            else newSteps[0].assignee = opt.value
                            setApprovalSteps(newSteps)
                          }}
                          className={`gba:p-3 gba:rounded-lg gba:border gba:text-left gba:transition-all ${
                            approvalSteps[0]?.assignee === opt.value
                              ? 'gba:border-primary gba:bg-primary/5 gba:ring-2 gba:ring-primary/20'
                              : 'gba:border-border hover:gba:border-primary/50'
                          }`}
                        >
                          <opt.icon className="gba:w-5 gba:h-5 gba:mb-1 gba:text-muted-foreground" />
                          <div className="gba:font-medium gba:text-sm">{opt.label}</div>
                          <div className="gba:text-xs gba:text-muted-foreground">{opt.desc}</div>
                        </button>
                      ))}
                    </div>

                    {approvalSteps[0]?.assignee === 'specific' && (
                      <Card>
                        <CardContent className="gba:p-4">
                          <MultiEmployeeSelect
                            accessToken={accessToken}
                            value={selectedRecipients.map(r => r.id)}
                            onValueChange={ids => setSelectedRecipients(prev => prev.filter(r => ids.includes(r.id)))}
                            onEmployeesChange={employees => {
                              setSelectedRecipients(
                                employees.map(emp => ({
                                  id: emp.id,
                                  userId: emp.userId,
                                  name: emp.displayName || 'Unknown',
                                  email: undefined
                                }))
                              )
                            }}
                            placeholder="Search employees to add..."
                            data-testid="bulk-collection-employee-select"
                          />
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Section 2: Form Builder */}
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                          2
                        </div>
                        <Label className="gba:text-sm gba:font-semibold">What data do you want to collect?</Label>
                      </div>
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {formFields.length} field{formFields.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <p className="gba:text-sm gba:text-muted-foreground gba:ml-8">
                      Each field becomes a question in the form. Responses will be added as new rows.
                    </p>

                    {/* Quick add from columns */}
                    {formFields.length === 0 && (
                      <Card className="gba:border-dashed">
                        <CardContent className="gba:p-4">
                          <div className="gba:text-center gba:space-y-3">
                            <FileSpreadsheet className="gba:w-8 gba:h-8 gba:mx-auto gba:text-muted-foreground" />
                            <div>
                              <p className="gba:font-medium">Start from your columns</p>
                              <p className="gba:text-sm gba:text-muted-foreground">
                                Select which columns you want people to fill in
                              </p>
                            </div>
                            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center gba:pt-2">
                              {columns.slice(0, 5).map(col => (
                                <Button
                                  key={col.id}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addFormFieldFromColumn(col)}
                                  disabled={formFields.some(f => f.targetColumn === col.id)}
                                >
                                  <Plus className="gba:w-3 gba:h-3 gba:mr-1" />
                                  {col.label}
                                </Button>
                              ))}
                              {columns.length > 5 && (
                                <span className="gba:text-xs gba:text-muted-foreground gba:self-center">
                                  +{columns.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Form fields list */}
                    {formFields.length > 0 && (
                      <div className="gba:space-y-2">
                        {formFields.map((field, index) => (
                          <Card key={field.id}>
                            <CardContent className="gba:p-3">
                              <div className="gba:flex gba:items-start gba:gap-3">
                                <div className="gba:flex-shrink-0 gba:w-6 gba:h-6 gba:rounded gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground gba:font-medium">
                                  {index + 1}
                                </div>
                                <div className="gba:flex-1 gba:grid gba:grid-cols-3 gba:gap-3">
                                  <div>
                                    <Label className="gba:text-xs gba:text-muted-foreground">Question Label</Label>
                                    <Input
                                      value={field.label}
                                      onChange={e => updateFormField(field.id, { label: e.target.value })}
                                      placeholder="e.g., Project Status"
                                      className="gba:mt-1 gba:h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="gba:text-xs gba:text-muted-foreground">Field Type</Label>
                                    <Select
                                      value={field.type}
                                      onValueChange={v => updateFormField(field.id, { type: v as typeof field.type })}
                                    >
                                      <SelectTrigger className="gba:mt-1 gba:h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent style={{ zIndex: 1000003 }}>
                                        <SelectItem value="text">Short Text</SelectItem>
                                        <SelectItem value="textarea">Long Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="select">Dropdown</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="gba:text-xs gba:text-muted-foreground">Save to Column</Label>
                                    <Select
                                      value={field.targetColumn}
                                      onValueChange={v => updateFormField(field.id, { targetColumn: v })}
                                    >
                                      <SelectTrigger className="gba:mt-1 gba:h-8">
                                        <SelectValue placeholder="Select column" />
                                      </SelectTrigger>
                                      <SelectContent style={{ zIndex: 1000003 }}>
                                        {columns.map(col => (
                                          <SelectItem key={col.id} value={col.id}>
                                            {col.label}
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="__new__">+ Create new column</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <Checkbox
                                    checked={field.required}
                                    onCheckedChange={checked => updateFormField(field.id, { required: !!checked })}
                                  />
                                  <span className="gba:text-xs gba:text-muted-foreground">Required</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="gba:h-6 gba:w-6 gba:text-muted-foreground hover:gba:text-destructive"
                                    onClick={() => removeFormField(field.id)}
                                  >
                                    <X className="gba:w-4 gba:h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Add more fields */}
                        <div className="gba:flex gba:gap-2 gba:pt-2">
                          <Select
                            value=""
                            onValueChange={colId => {
                              const col = columns.find(c => c.id === colId)
                              if (col) addFormFieldFromColumn(col)
                            }}
                          >
                            <SelectTrigger className="gba:w-48">
                              <SelectValue placeholder="Add from column..." />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              {columns
                                .filter(c => !formFields.some(f => f.targetColumn === c.id))
                                .map(col => (
                                  <SelectItem key={col.id} value={col.id}>
                                    {col.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormFields(prev => [
                                ...prev,
                                {
                                  id: `field_${Date.now()}`,
                                  label: 'New Field',
                                  type: 'text',
                                  required: false,
                                  targetColumn: '__new__'
                                }
                              ])
                            }
                          >
                            <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
                            Custom Field
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: EveryBox Preview */}
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                        3
                      </div>
                      <Label className="gba:text-sm gba:font-semibold">Preview: What recipients will see</Label>
                    </div>

                    <Card className="gba:bg-muted/30">
                      <CardContent className="gba:p-4">
                        <div className="gba:space-y-4">
                          {/* Mock EveryBox task header */}
                          <div className="gba:flex gba:items-center gba:gap-3 gba:pb-3 gba:border-b">
                            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-success/20 gba:flex gba:items-center gba:justify-center">
                              <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-success" />
                            </div>
                            <div>
                              <div className="gba:font-medium">{name || 'Form Request'}</div>
                              <div className="gba:text-xs gba:text-muted-foreground">
                                Task in EveryBox • Due in 7 days
                              </div>
                            </div>
                          </div>

                          {/* Mock form fields */}
                          {formFields.length > 0 ? (
                            <div className="gba:space-y-3">
                              {formFields.slice(0, 3).map(field => (
                                <div key={field.id}>
                                  <Label className="gba:text-xs gba:text-muted-foreground">
                                    {field.label} {field.required && <span className="gba:text-destructive">*</span>}
                                  </Label>
                                  <div className="gba:mt-1 gba:h-8 gba:rounded gba:border gba:border-dashed gba:border-border gba:bg-background/50"></div>
                                </div>
                              ))}
                              {formFields.length > 3 && (
                                <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
                                  +{formFields.length - 3} more fields...
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="gba:text-center gba:py-4 gba:text-sm gba:text-muted-foreground">
                              Add fields above to see preview
                            </div>
                          )}

                          {/* Mock submit button */}
                          <div className="gba:flex gba:justify-end gba:pt-2">
                            <div className="gba:px-4 gba:py-2 gba:rounded gba:bg-primary/20 gba:text-primary gba:text-sm gba:font-medium">
                              Submit Response
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Section 4: Tracking Columns Configuration */}
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                        4
                      </div>
                      <Label className="gba:text-sm gba:font-semibold">Tracking Columns</Label>
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground gba:ml-8">
                      Choose which auto-generated columns to include for tracking workflow progress.
                    </p>
                    <div className="gba:ml-8">
                      <TrackingColumnsConfig
                        selectedColumns={trackingColumns}
                        onSelectionChange={setTrackingColumns}
                        data-testid="bulk-collection-tracking-columns"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'mapping': {
        // Generate smart suggestions based on column names
        const getFormFieldSuggestion = (columnLabel: string): string => {
          const label = columnLabel.toLowerCase()
          if (label.includes('amount') || label.includes('price') || label.includes('cost')) return 'amount'
          if (label.includes('date') || label.includes('due')) return 'dueDate'
          if (label.includes('description') || label.includes('notes')) return 'description'
          if (label.includes('name')) return 'name'
          if (label.includes('status')) return 'status'
          if (label.includes('category') || label.includes('type')) return 'category'
          if (label.includes('email')) return 'email'
          if (label.includes('phone')) return 'phone'
          // Default: convert to camelCase
          return columnLabel
            .toLowerCase()
            .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
            .replace(/\s/g, '')
        }

        const getMappingDescription = () => {
          switch (automationType) {
            case 'bulk_collection':
              return 'Configure which form fields map to which spreadsheet columns. When people submit the form, their answers will fill these columns.'
            case 'row_workflow':
              return 'Specify which row data to include in the workflow. Recipients will see this data when reviewing.'
            case 'line_approval':
              return 'Choose which columns to show in the approval form. Approvers will see these values when reviewing each line.'
            case 'sheet_approval':
              return 'Select columns to include in the approval summary. These will be shown to the approver.'
            default:
              return 'Map spreadsheet columns to workflow data.'
          }
        }

        const columnLabel = 'Spreadsheet Column'

        const getFieldLabel = () => {
          switch (automationType) {
            case 'bulk_collection':
              return 'Form Field Label'
            case 'row_workflow':
            case 'line_approval':
              return 'Show as Label'
            case 'sheet_approval':
              return 'Summary Label'
            default:
              return 'Field Name'
          }
        }

        const getDirectionLabel = () => {
          switch (automationType) {
            case 'bulk_collection':
              return 'Collect responses into column'
            case 'row_workflow':
              return 'Send to workflow / Get result back'
            default:
              return 'Data Flow'
          }
        }

        return (
          <div className="gba:space-y-6">
            <div>
              <p className="gba:text-muted-foreground">{getMappingDescription()}</p>
            </div>

            {/* Quick setup: auto-map all columns */}
            {columnMappings.length === 0 && (
              <div className="gba:p-4 gba:bg-primary/5 gba:border gba:border-primary/20 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h4 className="gba:font-medium">Quick Setup</h4>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      Auto-create mappings for all {columns.length} columns
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newMappings = columns.map(col => ({
                        columnId: col.id,
                        columnName: col.name,
                        workflowParameter: getFormFieldSuggestion(col.label),
                        direction:
                          automationType === 'bulk_collection' ? ('fromWorkflow' as const) : ('toWorkflow' as const)
                      }))
                      setColumnMappings(newMappings)
                    }}
                  >
                    Auto-Map All
                  </Button>
                </div>
              </div>
            )}

            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-base gba:font-semibold">Column Mappings</Label>
              <Button size="sm" variant="outline" onClick={addColumnMapping}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
                Add Column
              </Button>
            </div>

            {columnMappings.length === 0 ? (
              <Card className="gba:border-dashed">
                <CardContent className="gba:py-8 gba:text-center">
                  <FileSpreadsheet className="gba:w-10 gba:h-10 gba:mx-auto gba:mb-3 gba:text-muted-foreground" />
                  <p className="gba:text-muted-foreground gba:mb-1">No columns mapped yet</p>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                    {automationType === 'bulk_collection'
                      ? 'Map columns to collect responses into your spreadsheet'
                      : "Optional: Skip if you don't need to pass data to the workflow"}
                  </p>
                  <div className="gba:flex gba:gap-2 gba:justify-center">
                    <Button variant="outline" onClick={addColumnMapping}>
                      <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                      Add Manually
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="gba:space-y-3">
                {/* Header row */}
                <div className="gba:grid gba:grid-cols-12 gba:gap-3 gba:px-4 gba:text-xs gba:text-muted-foreground gba:font-medium">
                  <div className="gba:col-span-4">{columnLabel}</div>
                  <div className="gba:col-span-1"></div>
                  <div className="gba:col-span-4">{getFieldLabel()}</div>
                  <div className="gba:col-span-2">{getDirectionLabel()}</div>
                  <div className="gba:col-span-1"></div>
                </div>

                {columnMappings.map((mapping, index) => (
                  <Card key={index}>
                    <CardContent className="gba:p-3">
                      <div className="gba:grid gba:grid-cols-12 gba:gap-3 gba:items-center">
                        <div className="gba:col-span-4">
                          <Select
                            value={mapping.columnId}
                            onValueChange={value => {
                              const column = columns.find(c => c.id === value)
                              updateColumnMapping(index, {
                                columnId: value,
                                columnName: column?.name || value,
                                // Auto-suggest field name
                                workflowParameter: getFormFieldSuggestion(column?.label || value)
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              {columns.map(column => (
                                <SelectItem key={column.id} value={column.id}>
                                  {column.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="gba:col-span-1 gba:flex gba:justify-center">
                          <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                        </div>

                        <div className="gba:col-span-4">
                          <Input
                            value={mapping.workflowParameter}
                            onChange={e => updateColumnMapping(index, { workflowParameter: e.target.value })}
                            placeholder={automationType === 'bulk_collection' ? 'e.g., Amount' : 'e.g., amount'}
                          />
                        </div>

                        <div className="gba:col-span-2">
                          <Select
                            value={mapping.direction}
                            onValueChange={(value: 'toWorkflow' | 'fromWorkflow' | 'bidirectional') =>
                              updateColumnMapping(index, { direction: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              <SelectItem value="toWorkflow">
                                <span className="gba:text-xs">→ Send</span>
                              </SelectItem>
                              <SelectItem value="fromWorkflow">
                                <span className="gba:text-xs">← Receive</span>
                              </SelectItem>
                              <SelectItem value="bidirectional">
                                <span className="gba:text-xs">↔ Both</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="gba:col-span-1 gba:flex gba:justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColumnMapping(index)}
                            className="gba:text-destructive gba:h-8 gba:w-8 gba:p-0"
                          >
                            <Trash2 className="gba:w-4 gba:h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Help text */}
            <div className="gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:text-sm">
              <div className="gba:flex gba:items-start gba:gap-2">
                <Info className="gba:w-4 gba:h-4 gba:mt-0.5 gba:text-muted-foreground gba:flex-shrink-0" />
                <div className="gba:text-muted-foreground">
                  <strong>Direction explained:</strong>
                  <ul className="gba:mt-1 gba:space-y-1 gba:list-disc gba:list-inside">
                    <li>
                      <strong>→ Send:</strong> Row data is included in the workflow task
                    </li>
                    <li>
                      <strong>← Receive:</strong> Workflow results update the spreadsheet column
                    </li>
                    <li>
                      <strong>↔ Both:</strong> Data flows both ways (for editable fields)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      }

      case 'review':
        return (
          <div className="gba:space-y-4">
            <p className="gba:text-muted-foreground">Review your automation configuration before saving.</p>

            <Card>
              <CardHeader className="gba:pb-3">
                <CardTitle className="gba:text-lg">{name || 'Untitled Automation'}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </CardHeader>
              <CardContent className="gba:space-y-4">
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">Type</Label>
                    <p className="gba:font-medium">{AUTOMATION_TYPES.find(t => t.type === automationType)?.title}</p>
                  </div>
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">Trigger</Label>
                    <p className="gba:font-medium">{TRIGGER_OPTIONS.find(t => t.trigger === trigger)?.title}</p>
                  </div>
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">Workflow Steps</Label>
                    <p className="gba:font-medium">{workflowSteps.length} steps</p>
                  </div>
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">Column Mappings</Label>
                    <p className="gba:font-medium">{columnMappings.length} mappings</p>
                  </div>
                </div>

                {trigger === 'onFieldChange' && watchColumns.length > 0 && (
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">Watched Columns</Label>
                    <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
                      {watchColumns.map(colId => {
                        const column = columns.find(c => c.id === colId)
                        return (
                          <Badge key={colId} variant="outline">
                            {column?.label || colId}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}

                {statusColumn && (
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">Status Column</Label>
                    <p className="gba:font-medium">{columns.find(c => c.id === statusColumn)?.label || statusColumn}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  // Build custom modal to ensure it appears above the automations drawer
  // (Design system Dialog creates its own portal with lower z-index)
  if (!isOpen) return null

  const modalContent = (
    <div className="gba:fixed gba:inset-0 gba:flex gba:items-center gba:justify-center" style={{ zIndex: 1000001 }}>
      {/* Override z-index for all portal-based components inside the modal */}
      <style>{`
        [data-slot='select-content'],
        [data-slot='popover-content'],
        [data-slot='combobox-content'],
        [data-radix-popper-content-wrapper] {
          z-index: 1000003 !important;
        }
      `}</style>
      {/* Backdrop */}
      <div
        className="gba:absolute gba:inset-0 gba:bg-black/50 gba:backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 1000001 }}
      />

      {/* Modal */}
      <div
        className="gba:relative gba:w-full gba:max-w-3xl gba:max-h-[90vh] gba:bg-background gba:rounded-xl gba:shadow-2xl gba:overflow-hidden gba:flex gba:flex-col gba:m-4"
        style={{ zIndex: 1000002 }}
        data-testid={testId}
      >
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b">
          <h2 className="gba:text-lg gba:font-semibold">{isEditing ? 'Edit Automation' : 'Create Automation'}</h2>
          <button
            onClick={onClose}
            className="gba:p-2 gba:rounded-lg gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground gba:transition-colors"
          >
            <X className="gba:w-5 gba:h-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
          {/* Step Indicators */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-4 gba:border-b gba:mb-6">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex

              return (
                <React.Fragment key={step}>
                  <div
                    className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-medium ${
                      isActive
                        ? 'gba:bg-primary gba:text-primary-foreground'
                        : isCompleted
                          ? 'gba:bg-success gba:text-success-foreground'
                          : 'gba:bg-muted gba:text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check className="gba:w-4 gba:h-4" /> : index + 1}
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`gba:w-12 gba:h-0.5 ${isCompleted ? 'gba:bg-success' : 'gba:bg-muted'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Step Title */}
          <div className="gba:text-center gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold gba:capitalize">{currentStep.replace('_', ' ')}</h3>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="gba:bg-destructive/10 gba:text-destructive gba:p-3 gba:rounded-lg gba:mb-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <AlertCircle className="gba:w-4 gba:h-4" />
                <ul className="gba:text-sm">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="gba:min-h-[300px]">{renderStepContent()}</div>
        </div>

        {/* Footer */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-t gba:bg-muted/30">
          <div>
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep === 'review' ? (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Spinner size="sm" className="gba:mr-2" /> : <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                {isEditing ? 'Save Changes' : 'Create Automation'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canGoNext}>
                Next
                <ChevronRight className="gba:w-4 gba:h-4 gba:ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default AutomationWizard
