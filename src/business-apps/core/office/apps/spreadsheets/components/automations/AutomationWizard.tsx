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
  Spinner,
  useTranslation
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
  X,
  FileDown,
  MessageSquare
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
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import translations from '../../_i18n'

function getTriggerStepDescription(automationType: AutomationType): string {
  if (automationType === 'sheet_approval') {
    return 'Sheet approval is triggered manually when you submit the spreadsheet for review.'
  }
  if (automationType === 'bulk_collection' || automationType === 'excel_collection') {
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
  /** Access token for API calls (user selection) */
  accessToken?: string
  /** Optional: Update column labels to match form field labels (for bulk collection headers) */
  onColumnLabelsUpdate?: (updates: Array<{ columnId: string; newLabel: string }>) => void
  /** Data test ID */
  'data-testid'?: string
}

type WizardStep = 'type' | 'trigger' | 'workflow' | 'mapping' | 'review' | 'setup' | 'configure'

const STANDARD_WIZARD_STEPS: WizardStep[] = ['type', 'trigger', 'workflow', 'mapping', 'review']
const BULK_COLLECTION_WIZARD_STEPS: WizardStep[] = ['type', 'setup', 'configure', 'review']

/**
 * Get wizard steps based on automation type. Step count matches the flow:
 * - Default / bulk / excel collection: 4 steps (type -> setup -> configure -> review)
 * - Other types (editing existing): 5 steps (type -> trigger -> workflow -> mapping -> review)
 */
function getWizardStepsForType(type: AutomationType | null): WizardStep[] {
  if (type === 'row_workflow' || type === 'sheet_approval' || type === 'line_approval') {
    return STANDARD_WIZARD_STEPS
  }
  return BULK_COLLECTION_WIZARD_STEPS
}

/** Local wizard state for step assignment configuration */
interface WizardStepAssignment {
  stepId: string
  assignee?: string // 'initiator' | 'manager' | 'column' | 'specific' | 'team' | 'department'
  assigneeColumn?: string
  assigneeUserId?: string
}

const COLLECTION_DELIVERY_OPTIONS: {
  type: 'bulk_collection' | 'excel_collection'
  title: string
  description: string
  icon: React.FC<{ className?: string }>
}[] = [
  {
    type: 'bulk_collection',
    title: 'Form',
    description: 'Send a form with custom fields. Recipients fill and submit; responses appear as rows.',
    icon: Users
  },
  {
    type: 'excel_collection',
    title: 'Spreadsheet template',
    description: 'Send a copy of a spreadsheet template. Recipients fill their copy and submit.',
    icon: FileDown
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
    case 'excel_collection':
      // Bulk/Excel collection is about sending to users - only manual or scheduled makes sense
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

interface SpreadsheetTemplateItem {
  id: string
  name: string
  settings?: { excel_collection_copy?: boolean }
}

function toTemplateOptions(
  items: SpreadsheetTemplateItem[],
  spreadsheetId: string
): Array<{ id: string; name: string }> {
  return items
    .filter(item => !item.settings?.excel_collection_copy)
    .map(item => ({
      id: item.id,
      name: item.id === spreadsheetId ? `${item.name || 'Untitled'} (this sheet)` : item.name || 'Untitled'
    }))
}

function mapExistingFormFields(existingAutomation?: SpreadsheetAutomation): Array<{
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'textarea' | 'select'
  required: boolean
  targetColumn: string
}> {
  const formFields = existingAutomation?.collectionConfig?.formFields
  if (!formFields) return []

  return formFields.map(field => ({
    id: field.id,
    label: field.label,
    type: (field.inputType?.toLowerCase() || 'text') as 'text' | 'number' | 'date' | 'textarea' | 'select',
    required: field.required || false,
    targetColumn: field.columnId || field.id
  }))
}

function getFieldTypeForColumn(colType: string): 'text' | 'number' | 'date' {
  if (colType === 'number') return 'number'
  if (colType === 'date') return 'date'
  return 'text'
}

function getFormFieldSuggestion(columnLabel: string): string {
  const label = columnLabel.toLowerCase()
  if (label.includes('amount') || label.includes('price') || label.includes('cost')) return 'amount'
  if (label.includes('date') || label.includes('due')) return 'dueDate'
  if (label.includes('description') || label.includes('notes')) return 'description'
  if (label.includes('name')) return 'name'
  if (label.includes('status')) return 'status'
  if (label.includes('category') || label.includes('type')) return 'category'
  if (label.includes('email')) return 'email'
  if (label.includes('phone')) return 'phone'
  return columnLabel
    .toLowerCase()
    .replaceAll(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replaceAll(/\s/g, '')
}

function getMappingDescription(automationType: AutomationType | null): string {
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

function getMappingFieldLabel(automationType: AutomationType | null): string {
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

function getMappingDirectionLabel(automationType: AutomationType | null): string {
  switch (automationType) {
    case 'bulk_collection':
      return 'Collect responses into column'
    case 'row_workflow':
      return 'Send to workflow / Get result back'
    default:
      return 'Data Flow'
  }
}

function getRecipientLabel(assignee: string | undefined, recipientCount: number): string {
  if (assignee === 'specific') return `${recipientCount} people selected`
  if (assignee === 'team') return 'My Team'
  if (assignee === 'department') return 'Department'
  return '—'
}

function getStepIndicatorStyle(isActive: boolean, isCompleted: boolean): string {
  if (isActive) return 'gba:bg-primary gba:text-primary-foreground'
  if (isCompleted) return 'gba:bg-success gba:text-success-foreground'
  return 'gba:bg-muted gba:text-muted-foreground'
}

function getStepTitle(step: WizardStep): string {
  if (step === 'type') return 'Collection Method'
  if (step === 'setup') return 'Setup'
  if (step === 'configure') return 'Configure Collection'
  return step.replaceAll('_', ' ').replaceAll(/\b\w/g, c => c.toUpperCase())
}

function getAutomationTypeTitle(type: AutomationType | null): string {
  const titles: Record<AutomationType, string> = {
    row_workflow: 'Row Workflow',
    bulk_collection: 'Form',
    excel_collection: 'Spreadsheet template',
    sheet_approval: 'Sheet Approval',
    line_approval: 'Line Approval'
  }

  if (!type) return 'Not selected'
  return titles[type] || type
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
  spreadsheetId,
  accessToken,
  onColumnLabelsUpdate,
  'data-testid': testId = 'automation-wizard'
}) => {
  const { t } = useTranslation(translations)
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

  // Excel collection: selected template spreadsheet (the one to duplicate and send to team)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Message from manager to recipients (bulk_collection and excel_collection)
  const [collectionMessage, setCollectionMessage] = useState<string>('')
  const [availableTemplates, setAvailableTemplates] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Helper to add a form field from a column
  const addFormFieldFromColumn = useCallback((col: SpreadsheetColumn) => {
    const fieldType = getFieldTypeForColumn(col.type)
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
  }, [])

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
    if (!existingAutomation) return

    setName(existingAutomation.name)
    setDescription(existingAutomation.description || '')
    setAutomationType(existingAutomation.type)
    setTrigger(existingAutomation.trigger)
    setWatchColumns(existingAutomation.triggerConfig.watchColumns || [])
    setColumnMappings(existingAutomation.workflowConfig.columnMappings || [])
    setResultMappings(existingAutomation.workflowConfig.resultMappings || [])
    setStatusColumn(existingAutomation.workflowConfig.statusColumn)
    setWorkflowSteps(existingAutomation.workflowConfig.dynamicTemplate?.steps || [])

    const recipientType = existingAutomation.collectionConfig?.recipientType
    const explicitApprovalSteps = existingAutomation.approvalConfig?.approvalSteps
    setApprovalSteps(recipientType ? [{ stepId: 'collect', assignee: recipientType }] : explicitApprovalSteps || [])
    setTrackingColumns(existingAutomation.collectionConfig?.trackingColumns || getDefaultTrackingColumns())
    setFormFields(mapExistingFormFields(existingAutomation))
    setSelectedTemplateId(
      existingAutomation.type === 'excel_collection'
        ? existingAutomation.collectionConfig?.templateSpreadsheetId || null
        : null
    )
    setCollectionMessage(existingAutomation.collectionConfig?.message || '')
    setCurrentStep(
      existingAutomation.type === 'bulk_collection' || existingAutomation.type === 'excel_collection'
        ? 'configure'
        : 'workflow'
    )
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
        setSelectedTemplateId(null)
        setAvailableTemplates([])
        setCollectionMessage('')
      }
    }
  }, [isOpen, existingAutomation])

  // Fetch available spreadsheet templates when configuring excel_collection
  useEffect(() => {
    if (!isOpen || automationType !== 'excel_collection' || currentStep !== 'configure') return
    if (!accessToken) return

    let cancelled = false
    const fetchTemplates = async () => {
      setIsLoadingTemplates(true)
      const docBase = getDocumentServiceApiUrl().replace(/\/+$/, '')
      try {
        const response = await fetch(`${docBase}/spreadsheets?limit=100`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (!response.ok) throw new Error('Failed to fetch')

        const data = (await response.json()) as { items?: SpreadsheetTemplateItem[] }
        if (cancelled) return
        setAvailableTemplates(toTemplateOptions(data.items || [], spreadsheetId))
      } catch {
        if (!cancelled) setAvailableTemplates([])
      } finally {
        if (!cancelled) setIsLoadingTemplates(false)
      }
    }

    void fetchTemplates()

    return () => {
      cancelled = true
    }
  }, [isOpen, automationType, currentStep, accessToken, spreadsheetId])

  // Wizard steps depend on automation type (bulk: 4 steps, others: 5 steps)
  const wizardSteps = useMemo(() => getWizardStepsForType(automationType), [automationType])

  // Current step index (relative to current wizard flow)
  const currentStepIndex = wizardSteps.indexOf(currentStep)

  // Helper: Get placeholder name based on automation type
  const getPlaceholderName = (): string => {
    switch (automationType) {
      case 'row_workflow':
        return 'e.g., Process Customer Requests'
      case 'bulk_collection':
        return 'e.g., Q4 Employee Survey'
      case 'excel_collection':
        return 'e.g., Q4 Status Report'
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
      case 'excel_collection':
        return 'Send a copy of this spreadsheet to your team. They fill it and submit.'
      case 'sheet_approval':
        return 'Submit the entire sheet for manager approval...'
      case 'line_approval':
        return 'Each line item will be reviewed and approved separately...'
      default:
        return 'Describe what this automation does...'
    }
  }

  const hasConfiguredRecipients = useCallback((): boolean => {
    const assignee = approvalSteps[0]?.assignee
    if (assignee === 'specific') return selectedRecipients.length > 0
    return Boolean(assignee)
  }, [approvalSteps, selectedRecipients])

  const validateReviewStep = useCallback(
    (errors: string[]) => {
      if (!name.trim()) errors.push('Automation name is required')
      if (!automationType) errors.push('Automation type is required')

      if (automationType === 'bulk_collection') {
        if (!hasConfiguredRecipients()) errors.push('Please select who should receive this form')
        if (formFields.length === 0) errors.push('Please add at least one form field')
      }

      if (automationType === 'excel_collection') {
        if (!selectedTemplateId) errors.push('Please select a template spreadsheet')
        if (!hasConfiguredRecipients()) errors.push('Please select who should receive this')
      }
    },
    [name, automationType, hasConfiguredRecipients, formFields.length, selectedTemplateId]
  )

  const validateTypeStep = useCallback(
    (errors: string[]) => {
      if (!automationType) {
        errors.push('Please select a collection method')
      }
    },
    [automationType]
  )

  const validateSetupStep = useCallback(
    (errors: string[]) => {
      if (!name.trim()) {
        errors.push('Please enter an automation name')
      }
    },
    [name]
  )

  const validateTriggerStep = useCallback(
    (errors: string[]) => {
      if (trigger === 'onFieldChange' && watchColumns.length === 0) {
        errors.push('Please select at least one column to watch')
      }
    },
    [trigger, watchColumns]
  )

  const validateWorkflowStep = useCallback(
    (errors: string[]) => {
      if (!name.trim()) {
        errors.push('Please enter an automation name')
      }
      if (workflowSteps.length === 0 && approvalSteps.length === 0) {
        errors.push('Please add at least one workflow step')
      }
    },
    [name, workflowSteps.length, approvalSteps.length]
  )

  const validateConfigureStep = useCallback(
    (errors: string[]) => {
      if (!hasConfiguredRecipients()) errors.push('Please select who should receive this')
      if (automationType === 'excel_collection' && !selectedTemplateId) {
        errors.push('Please select a template spreadsheet')
      }
      if (automationType === 'bulk_collection' && formFields.length === 0) {
        errors.push('Please add at least one form field to collect')
      }
    },
    [hasConfiguredRecipients, automationType, selectedTemplateId, formFields.length]
  )

  const stepValidationHandlers: Partial<Record<WizardStep, (errors: string[]) => void>> = useMemo(
    () => ({
      type: validateTypeStep,
      setup: validateSetupStep,
      trigger: validateTriggerStep,
      workflow: validateWorkflowStep,
      configure: validateConfigureStep,
      review: validateReviewStep
    }),
    [
      validateTypeStep,
      validateSetupStep,
      validateTriggerStep,
      validateWorkflowStep,
      validateConfigureStep,
      validateReviewStep
    ]
  )

  // Validation
  const validateCurrentStep = useCallback((): boolean => {
    const errors: string[] = []
    const validateStep = stepValidationHandlers[currentStep]
    validateStep?.(errors)

    setValidationErrors(errors)
    return errors.length === 0
  }, [currentStep, stepValidationHandlers])

  // Navigation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 'type':
        return !!automationType
      case 'setup':
        return name.trim().length > 0
      case 'trigger':
        return trigger !== 'onFieldChange' || watchColumns.length > 0
      case 'workflow':
        return name.trim().length > 0
      case 'configure': {
        if (automationType === 'excel_collection') {
          return !!selectedTemplateId && hasConfiguredRecipients()
        }
        return hasConfiguredRecipients() && formFields.length > 0
      }
      case 'mapping':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }, [
    currentStep,
    automationType,
    trigger,
    watchColumns,
    name,
    hasConfiguredRecipients,
    formFields,
    selectedTemplateId
  ])

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return

    const nextIndex = currentStepIndex + 1
    if (nextIndex < wizardSteps.length) {
      setCurrentStep(wizardSteps[nextIndex])
    }
  }, [currentStepIndex, wizardSteps, validateCurrentStep])

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(wizardSteps[prevIndex])
      setValidationErrors([])
    }
  }, [currentStepIndex, wizardSteps])

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

  const buildDynamicTemplate = useCallback((): AutomationFlowTemplate | undefined => {
    if (workflowSteps.length === 0) return undefined
    return {
      type: 'TEMPLATE',
      name,
      description,
      version: 1,
      steps: workflowSteps
    }
  }, [workflowSteps, name, description])

  const buildApprovalConfig = useCallback(
    (type: AutomationType): SheetApprovalConfig | undefined => {
      const isApprovalType = type === 'sheet_approval' || type === 'line_approval'
      if (!isApprovalType || approvalSteps.length === 0) return undefined

      return {
        mode: type === 'sheet_approval' ? 'full_sheet' : 'line_item',
        approvalSteps,
        onApprove: 'notify',
        onReject: 'return_to_submitter'
      }
    },
    [approvalSteps]
  )

  const buildCollectionConfig = useCallback(
    (type: AutomationType) => {
      const recipientType = approvalSteps[0]?.assignee as 'team' | 'department' | 'specific' | undefined
      const recipients = selectedRecipients.map(r => r.userId || r.id)
      const message = collectionMessage.trim() || undefined

      if (type === 'bulk_collection') {
        return {
          recipientType: recipientType || 'specific',
          recipients,
          trackingColumns,
          message,
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
      }

      if (type === 'excel_collection') {
        return {
          recipientType: recipientType || 'specific',
          recipients,
          trackingColumns,
          templateSpreadsheetId: selectedTemplateId || undefined,
          message,
          rowIdentifier: 'assignee' as const,
          fieldMappings: [] as ResultMapping[],
          deduplication: 'append' as const
        }
      }

      return undefined
    },
    [approvalSteps, selectedRecipients, collectionMessage, trackingColumns, formFields, selectedTemplateId]
  )

  const getEffectiveColumnMappings = useCallback(
    (type: AutomationType): ColumnWorkflowMapping[] => {
      if (type === 'bulk_collection' && formFields.length > 0) {
        return formFields.map(f => {
          const col = columns.find(c => c.id === f.targetColumn)
          return {
            columnId: f.targetColumn,
            columnName: col?.name ?? f.targetColumn,
            workflowParameter: f.targetColumn,
            direction: 'fromWorkflow' as const
          }
        })
      }
      if (type === 'excel_collection') return []
      return columnMappings
    },
    [formFields, columns, columnMappings]
  )

  const syncBulkCollectionColumnLabels = useCallback(() => {
    if (automationType !== 'bulk_collection' || formFields.length === 0 || !onColumnLabelsUpdate) return

    const labelUpdates = formFields
      .map(field => {
        const col = columns.find(c => c.id === field.targetColumn)
        if (col && field.label.trim() && col.label !== field.label.trim()) {
          return { columnId: col.id, newLabel: field.label.trim() }
        }
        return undefined
      })
      .filter((u): u is { columnId: string; newLabel: string } => u !== undefined)

    if (labelUpdates.length > 0) {
      onColumnLabelsUpdate(labelUpdates)
    }
  }, [automationType, formFields, onColumnLabelsUpdate, columns])

  // Save automation
  const handleSave = useCallback(async () => {
    if (!validateCurrentStep()) return
    if (!automationType) return

    setIsSaving(true)
    try {
      const dynamicTemplate = buildDynamicTemplate()
      const approvalConfig = buildApprovalConfig(automationType)
      const collectionConfig = buildCollectionConfig(automationType)
      const effectiveColumnMappings = getEffectiveColumnMappings(automationType)

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

      syncBulkCollectionColumnLabels()

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
    resultMappings,
    statusColumn,
    validateCurrentStep,
    buildDynamicTemplate,
    buildApprovalConfig,
    buildCollectionConfig,
    getEffectiveColumnMappings,
    syncBulkCollectionColumnLabels,
    onSave,
    onClose
  ])

  const toggleWatchColumn = useCallback((columnId: string, checked: boolean) => {
    setWatchColumns(prev => (checked ? [...prev, columnId] : prev.filter(id => id !== columnId)))
  }, [])

  const additionalFormColumns = useMemo(
    () => columns.slice(5).filter(column => !formFields.some(field => field.targetColumn === column.id)),
    [columns, formFields]
  )

  const handleAddAdditionalFormColumn = useCallback(
    (columnId: string) => {
      const column = columns.find(col => col.id === columnId)
      if (column) addFormFieldFromColumn(column)
    },
    [columns, addFormFieldFromColumn]
  )

  // Auto-select trigger when only one trigger option is available (trigger or setup step).
  useEffect(() => {
    if (currentStep !== 'trigger' && currentStep !== 'setup') return
    if (trigger) return

    const availableTriggers = getAvailableTriggersForType(automationType ?? 'bulk_collection')
    const filteredOptions = TRIGGER_OPTIONS.filter(opt => availableTriggers.includes(opt.trigger))
    if (filteredOptions.length === 1) {
      setTrigger(filteredOptions[0].trigger)
    }
  }, [automationType, currentStep, trigger])

  const handleChooseCollectionDeliveryType = useCallback(
    (type: 'bulk_collection' | 'excel_collection') => {
      setAutomationType(type)
      const validTriggers = getAvailableTriggersForType(type)
      if (!validTriggers.includes(trigger)) {
        setTrigger(validTriggers[0])
      }
    },
    [trigger]
  )

  const handleRecipientsValueChange = useCallback((ids: string[]) => {
    setSelectedRecipients(prev => prev.filter(recipient => ids.includes(recipient.id)))
  }, [])

  const handleRecipientsEmployeesChange = useCallback(
    (employees: Array<{ id: string; userId?: string; displayName?: string }>) => {
      setSelectedRecipients(
        employees.map(emp => ({
          id: emp.id,
          userId: emp.userId,
          name: emp.displayName || 'Unknown',
          email: undefined
        }))
      )
    },
    []
  )

  const handleColumnMappingColumnChange = useCallback(
    (index: number, value: string) => {
      const column = columns.find(c => c.id === value)
      updateColumnMapping(index, {
        columnId: value,
        columnName: column?.name || value,
        workflowParameter: getFormFieldSuggestion(column?.label || value)
      })
    },
    [columns, updateColumnMapping]
  )

  const renderWorkflowTypeSpecificConfiguration = () => (
    <div className="gba:border-t gba:pt-6">
      <h4 className="gba:font-semibold gba:text-foreground gba:mb-4 gba:flex gba:items-center gba:gap-2">
        {automationType === 'row_workflow' && <FileSpreadsheet className="gba:w-4 gba:h-4" />}
        {automationType === 'sheet_approval' && <ClipboardCheck className="gba:w-4 gba:h-4" />}
        {automationType === 'line_approval' && <Zap className="gba:w-4 gba:h-4" />}
        {automationType === 'bulk_collection' && <Users className="gba:w-4 gba:h-4" />}
        {t('wizard-workflow-steps')}
      </h4>

      {automationType === 'row_workflow' && (
        <div className="gba:space-y-4">
          <p className="gba:text-sm gba:text-muted-foreground">{t('wizard-row-workflow-description')}</p>

          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:flex gba:items-start gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:text-primary gba:font-medium gba:text-sm">
                    1
                  </div>
                  <div>
                    <div className="gba:font-medium">{t('wizard-review-row-data')}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('wizard-task-24h-deadline')}</div>
                  </div>
                </div>
                <div className="gba:w-48">
                  <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-assigned-to')}</Label>
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
                          {t('wizard-myself-initiator')}
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <UserCheck className="gba:w-3 gba:h-3" />
                          {t('wizard-my-manager')}
                        </div>
                      </SelectItem>
                      <SelectItem value="column">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <FileSpreadsheet className="gba:w-3 gba:h-3" />
                          {t('wizard-from-column')}
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
                        <SelectValue placeholder={t('wizard-select-column')} />
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
                    <div className="gba:font-medium">{t('wizard-process-row')}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('wizard-task-48h-deadline')}</div>
                  </div>
                </div>
                <div className="gba:w-48">
                  <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-assigned-to')}</Label>
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
                          {t('wizard-myself-initiator')}
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <UserCheck className="gba:w-3 gba:h-3" />
                          {t('wizard-my-manager')}
                        </div>
                      </SelectItem>
                      <SelectItem value="column">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <FileSpreadsheet className="gba:w-3 gba:h-3" />
                          {t('wizard-from-column')}
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
                        <SelectValue placeholder={t('wizard-select-column')} />
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
          <p className="gba:text-sm gba:text-muted-foreground">{t('wizard-sheet-approval-description')}</p>

          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:flex gba:items-start gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-info/10 gba:flex gba:items-center gba:justify-center gba:text-info gba:font-medium gba:text-sm">
                    1
                  </div>
                  <div>
                    <div className="gba:font-medium">{t('wizard-submission-notification')}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('wizard-info-automatic')}</div>
                  </div>
                </div>
                <div className="gba:text-sm gba:text-muted-foreground gba:italic">{t('wizard-sent-to-submitter')}</div>
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
                    <div className="gba:font-medium">{t('wizard-approve-spreadsheet')}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('wizard-approval-3-day-deadline')}</div>
                  </div>
                </div>
                <div className="gba:w-48">
                  <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-approver-required')}</Label>
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
                      <SelectValue placeholder={t('wizard-who-approves')} />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 1000003 }}>
                      <SelectItem value="manager">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <UserCheck className="gba:w-3 gba:h-3" />
                          {t('wizard-my-manager')}
                        </div>
                      </SelectItem>
                      <SelectItem value="specific">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <User className="gba:w-3 gba:h-3" />
                          {t('wizard-specific-person')}
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
                        placeholder={t('wizard-search-select-person')}
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
          <p className="gba:text-sm gba:text-muted-foreground">{t('wizard-line-approval-description')}</p>

          <Card className="gba:border-primary/50">
            <CardContent className="gba:p-4">
              <div className="gba:flex gba:items-start gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-warning/10 gba:flex gba:items-center gba:justify-center gba:text-warning gba:font-medium gba:text-sm">
                    <RefreshCw className="gba:w-4 gba:h-4" />
                  </div>
                  <div>
                    <div className="gba:font-medium">{t('wizard-approve-line-item')}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('wizard-per-row-approval-48h')}</div>
                  </div>
                </div>
                <div className="gba:w-48">
                  <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-approver-required')}</Label>
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
                      <SelectValue placeholder={t('wizard-who-approves')} />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 1000003 }}>
                      <SelectItem value="manager">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <UserCheck className="gba:w-3 gba:h-3" />
                          {t('wizard-my-manager')}
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
                          {t('wizard-specific-person')}
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
                        <SelectValue placeholder={t('wizard-select-approver-column')} />
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
                        placeholder={t('wizard-search-select-person')}
                        data-testid="line-approval-user-select"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:text-sm gba:text-muted-foreground">
            <strong>{t('wizard-tip-label')}:</strong> {t('wizard-tip-from-column')}
          </div>
        </div>
      )}
    </div>
  )

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div className="gba:space-y-4">
            <p className="gba:text-muted-foreground">{t('wizard-what-send-to-recipients')}</p>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {COLLECTION_DELIVERY_OPTIONS.map(opt => {
                const Icon = opt.icon
                const isSelected = automationType === opt.type
                return (
                  <Card
                    key={opt.type}
                    className={`gba:cursor-pointer gba:transition-all ${
                      isSelected ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : 'gba:hover:border-primary/50'
                    }`}
                    onClick={() => handleChooseCollectionDeliveryType(opt.type)}
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
                          <h3 className="gba:font-semibold gba:text-foreground">{opt.title}</h3>
                          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{opt.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )

      case 'setup': {
        // Bulk / Excel collection setup: Name + Trigger
        const collectionType = automationType === 'excel_collection' ? 'excel_collection' : 'bulk_collection'
        const availableTriggers = getAvailableTriggersForType(collectionType)
        const filteredOptions = TRIGGER_OPTIONS.filter(opt => availableTriggers.includes(opt.trigger))
        const isExcelCollection = automationType === 'excel_collection'

        return (
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-primary/5 gba:rounded-lg gba:border gba:border-primary/20">
              {isExcelCollection ? (
                <FileDown className="gba:w-5 gba:h-5 gba:text-primary" />
              ) : (
                <Users className="gba:w-5 gba:h-5 gba:text-primary" />
              )}
              <span className="gba:font-medium">{t('wizard-data-collection')}</span>
              <Badge variant="secondary">
                {isExcelCollection
                  ? t('wizard-data-collection-badge-spreadsheet')
                  : t('wizard-data-collection-badge-form')}
              </Badge>
            </div>

            <div>
              <Label htmlFor="bulk-automation-name">{t('wizard-automation-name-required')}</Label>
              <Input
                id="bulk-automation-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={getPlaceholderName()}
                className="gba:mt-1"
              />
            </div>

            <div>
              <Label className="gba:mb-2 gba:block">{t('wizard-when-to-send')}</Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">{t('wizard-when-to-send-description')}</p>
              <div className="gba:space-y-2">
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
            </div>
          </div>
        )
      }

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
                <Label className="gba:mb-2 gba:block">{t('wizard-select-columns-to-watch')}</Label>
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
              <h4 className="gba:font-semibold gba:text-foreground">{t('wizard-basic-information')}</h4>
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div>
                  <Label htmlFor="automation-name">{t('wizard-automation-name-required')}</Label>
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
                    {t('wizard-status-column')}
                    <span
                      className="gba:text-muted-foreground gba:cursor-help"
                      title={t('wizard-status-column-tooltip')}
                    >
                      <Info className="gba:w-3.5 gba:h-3.5" />
                    </span>
                  </Label>
                  <Select
                    value={statusColumn || '__none__'}
                    onValueChange={value => setStatusColumn(value === '__none__' ? undefined : value)}
                  >
                    <SelectTrigger className="gba:mt-1">
                      <SelectValue placeholder={t('wizard-select-status-column')} />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 1000003 }}>
                      <SelectItem value="__none__">{t('wizard-status-column-none')}</SelectItem>
                      {columns.map(column => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('wizard-status-column-help')}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="automation-description">{t('wizard-description-optional')}</Label>
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
            {renderWorkflowTypeSpecificConfiguration()}
          </div>
        )

      case 'configure':
        // Bulk collection: Recipients + Form Fields + Tracking
        // Excel collection: Template + Recipients + Tracking (no form fields)
        const isExcelConfigure = automationType === 'excel_collection'
        return (
          <div className="gba:space-y-6">
            {/* Section 0 (excel only): Template picker */}
            {isExcelConfigure && (
              <div className="gba:space-y-3">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                    1
                  </div>
                  <Label className="gba:text-sm gba:font-semibold">{t('wizard-which-spreadsheet-send')}</Label>
                </div>
                <p className="gba:text-sm gba:text-muted-foreground gba:ml-8">
                  {t('wizard-which-spreadsheet-send-help')}
                </p>
                {isLoadingTemplates ? (
                  <div className="gba:ml-8 gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
                    <Spinner size="sm" />
                    <span className="gba:text-sm">{t('wizard-loading-spreadsheets')}</span>
                  </div>
                ) : (
                  <Select value={selectedTemplateId || ''} onValueChange={v => setSelectedTemplateId(v || null)}>
                    <SelectTrigger className="gba:ml-8 gba:max-w-md">
                      <SelectValue placeholder={t('wizard-select-spreadsheet-template')} />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 1000003 }}>
                      {availableTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                      {availableTemplates.length === 0 && !isLoadingTemplates && (
                        <SelectItem value="__none__" disabled>
                          {t('wizard-no-other-spreadsheets')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Section 1 (excel) / 1 (bulk): Recipients */}
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                  {isExcelConfigure ? 2 : 1}
                </div>
                <Label className="gba:text-sm gba:font-semibold">
                  {isExcelConfigure ? 'Who should receive this spreadsheet copy?' : 'Who should receive this form?'}
                </Label>
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
                      onValueChange={handleRecipientsValueChange}
                      onEmployeesChange={handleRecipientsEmployeesChange}
                      placeholder={t('wizard-search-employees-to-add')}
                      data-testid="bulk-collection-employee-select"
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section 2: Message (optional) */}
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                  {isExcelConfigure ? 3 : 2}
                </div>
                <MessageSquare className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Label className="gba:text-sm gba:font-semibold">{t('wizard-message-to-recipients-optional')}</Label>
              </div>
              <p className="gba:text-sm gba:text-muted-foreground gba:ml-8">
                {isExcelConfigure ? t('wizard-message-help-excel') : t('wizard-message-help-bulk')}
              </p>
              <div className="gba:ml-8 gba:max-w-lg">
                <Textarea
                  value={collectionMessage}
                  onChange={e => setCollectionMessage(e.target.value)}
                  placeholder={
                    isExcelConfigure ? t('wizard-message-placeholder-excel') : t('wizard-message-placeholder-bulk')
                  }
                  rows={3}
                  className="gba:resize-none"
                  data-testid="collection-message-input"
                />
              </div>
            </div>

            {/* Section 3: Form Builder (bulk_collection only) */}
            {!isExcelConfigure && (
              <div className="gba:space-y-3">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                      3
                    </div>
                    <Label className="gba:text-sm gba:font-semibold">{t('wizard-what-data-collect')}</Label>
                  </div>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {t('wizard-fields-count', { count: formFields.length })}
                  </span>
                </div>

                <p className="gba:text-sm gba:text-muted-foreground gba:ml-8">{t('wizard-fields-help')}</p>

                {/* Quick-add from columns - always visible so users can add multiple fields */}
                <Card className={formFields.length === 0 ? 'gba:border-dashed' : ''}>
                  <CardContent className="gba:p-4">
                    <div className="gba:text-center gba:space-y-3">
                      <FileSpreadsheet className="gba:w-8 gba:h-8 gba:mx-auto gba:text-muted-foreground" />
                      <div>
                        <p className="gba:font-medium">
                          {formFields.length === 0 ? t('wizard-start-from-columns') : t('wizard-add-more-fields')}
                        </p>
                        <p className="gba:text-sm gba:text-muted-foreground">
                          {formFields.length === 0
                            ? t('wizard-start-from-columns-help')
                            : t('wizard-add-more-fields-help')}
                        </p>
                      </div>
                      <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center gba:pt-2">
                        {columns.slice(0, 5).map(col => {
                          const isAlreadyAdded = formFields.some(f => f.targetColumn === col.id)
                          return (
                            <Button
                              key={col.id}
                              size="sm"
                              variant="outline"
                              onClick={() => !isAlreadyAdded && addFormFieldFromColumn(col)}
                              disabled={isAlreadyAdded}
                            >
                              <Plus className="gba:w-3 gba:h-3 gba:mr-1" />
                              {col.label}
                            </Button>
                          )
                        })}
                        {additionalFormColumns.length > 0 && (
                          <Select value="" onValueChange={handleAddAdditionalFormColumn}>
                            <SelectTrigger className="gba:w-auto gba:min-w-[120px]">
                              <SelectValue
                                placeholder={t('wizard-additional-columns-more', {
                                  count: additionalFormColumns.length
                                })}
                              />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 1000003 }}>
                              {additionalFormColumns.map(col => (
                                <SelectItem key={col.id} value={col.id}>
                                  + {col.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                                <Label className="gba:text-xs gba:text-muted-foreground">
                                  {t('wizard-question-label')}
                                </Label>
                                <Input
                                  value={field.label}
                                  onChange={e => updateFormField(field.id, { label: e.target.value })}
                                  placeholder={t('wizard-question-label-placeholder')}
                                  className="gba:mt-1 gba:h-8"
                                />
                              </div>
                              <div>
                                <Label className="gba:text-xs gba:text-muted-foreground">
                                  {t('wizard-field-type')}
                                </Label>
                                <Select
                                  value={field.type}
                                  onValueChange={v => updateFormField(field.id, { type: v as typeof field.type })}
                                >
                                  <SelectTrigger className="gba:mt-1 gba:h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent style={{ zIndex: 1000003 }}>
                                    <SelectItem value="text">{t('wizard-field-type-text')}</SelectItem>
                                    <SelectItem value="textarea">{t('wizard-field-type-textarea')}</SelectItem>
                                    <SelectItem value="number">{t('wizard-field-type-number')}</SelectItem>
                                    <SelectItem value="date">{t('wizard-field-type-date')}</SelectItem>
                                    <SelectItem value="select">{t('wizard-field-type-select')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="gba:text-xs gba:text-muted-foreground">
                                  {t('wizard-save-to-column')}
                                </Label>
                                <Select
                                  value={field.targetColumn}
                                  onValueChange={v => updateFormField(field.id, { targetColumn: v })}
                                >
                                  <SelectTrigger className="gba:mt-1 gba:h-8">
                                    <SelectValue placeholder={t('entity-ds-select-field')} />
                                  </SelectTrigger>
                                  <SelectContent style={{ zIndex: 1000003 }}>
                                    {columns.map(col => (
                                      <SelectItem key={col.id} value={col.id}>
                                        {col.label}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="__new__">{t('wizard-create-new-column')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Checkbox
                                checked={field.required}
                                onCheckedChange={checked => updateFormField(field.id, { required: !!checked })}
                              />
                              <span className="gba:text-xs gba:text-muted-foreground">{t('wizard-required')}</span>
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

                    <div className="gba:flex gba:gap-2 gba:pt-2">
                      <Select
                        value=""
                        onValueChange={colId => {
                          const col = columns.find(c => c.id === colId)
                          if (col) addFormFieldFromColumn(col)
                        }}
                      >
                        <SelectTrigger className="gba:w-48">
                          <SelectValue placeholder={t('wizard-add-from-column')} />
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
                              label: t('wizard-new-field'),
                              type: 'text',
                              required: false,
                              targetColumn: '__new__'
                            }
                          ])
                        }
                      >
                        <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
                        {t('wizard-custom-field')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Note (bulk only: form task; excel: spreadsheet copy) */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-muted/30 gba:rounded-lg">
              <Info className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
              <p className="gba:text-sm gba:text-muted-foreground">
                {isExcelConfigure ? t('wizard-note-excel') : t('wizard-note-bulk')}
              </p>
            </div>

            {/* Section 4: Tracking Columns */}
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                  4
                </div>
                <Label className="gba:text-sm gba:font-semibold">{t('wizard-tracking-columns')}</Label>
              </div>
              <p className="gba:text-sm gba:text-muted-foreground gba:ml-8">{t('wizard-tracking-columns-help')}</p>
              <div className="gba:ml-8">
                <TrackingColumnsConfig
                  selectedColumns={trackingColumns}
                  onSelectionChange={setTrackingColumns}
                  data-testid="bulk-collection-tracking-columns"
                />
              </div>
            </div>
          </div>
        )

      case 'mapping': {
        const columnLabel = 'Spreadsheet Column'

        return (
          <div className="gba:space-y-6">
            <div>
              <p className="gba:text-muted-foreground">{getMappingDescription(automationType)}</p>
            </div>

            {/* Quick setup: auto-map all columns */}
            {columnMappings.length === 0 && (
              <div className="gba:p-4 gba:bg-primary/5 gba:border gba:border-primary/20 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h4 className="gba:font-medium">{t('wizard-quick-setup')}</h4>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {t('wizard-auto-create-mappings', { count: columns.length })}
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
                    {t('wizard-auto-map-all')}
                  </Button>
                </div>
              </div>
            )}

            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-base gba:font-semibold">{t('wizard-column-mappings')}</Label>
              <Button size="sm" variant="outline" onClick={addColumnMapping}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('add-column-title')}
              </Button>
            </div>

            {columnMappings.length === 0 ? (
              <Card className="gba:border-dashed">
                <CardContent className="gba:py-8 gba:text-center">
                  <FileSpreadsheet className="gba:w-10 gba:h-10 gba:mx-auto gba:mb-3 gba:text-muted-foreground" />
                  <p className="gba:text-muted-foreground gba:mb-1">{t('wizard-no-columns-mapped')}</p>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                    {automationType === 'bulk_collection'
                      ? t('wizard-no-columns-mapped-help-bulk')
                      : t('wizard-no-columns-mapped-help-workflow')}
                  </p>
                  <div className="gba:flex gba:gap-2 gba:justify-center">
                    <Button variant="outline" onClick={addColumnMapping}>
                      <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('wizard-add-manually')}
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
                  <div className="gba:col-span-4">{getMappingFieldLabel(automationType)}</div>
                  <div className="gba:col-span-2">{getMappingDirectionLabel(automationType)}</div>
                  <div className="gba:col-span-1"></div>
                </div>

                {columnMappings.map((mapping, index) => (
                  <Card key={index}>
                    <CardContent className="gba:p-3">
                      <div className="gba:grid gba:grid-cols-12 gba:gap-3 gba:items-center">
                        <div className="gba:col-span-4">
                          <Select
                            value={mapping.columnId}
                            onValueChange={value => handleColumnMappingColumnChange(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('wizard-select-column')} />
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
                            placeholder={
                              automationType === 'bulk_collection'
                                ? t('wizard-parameter-placeholder-bulk')
                                : t('wizard-parameter-placeholder-workflow')
                            }
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
                                <span className="gba:text-xs">{t('wizard-direction-send')}</span>
                              </SelectItem>
                              <SelectItem value="fromWorkflow">
                                <span className="gba:text-xs">{t('wizard-direction-receive')}</span>
                              </SelectItem>
                              <SelectItem value="bidirectional">
                                <span className="gba:text-xs">{t('wizard-direction-both')}</span>
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
                  <strong>{t('wizard-direction-explained')}:</strong>
                  <ul className="gba:mt-1 gba:space-y-1 gba:list-disc gba:list-inside">
                    <li>
                      <strong>{t('wizard-direction-send')}</strong> {t('wizard-direction-send-help')}
                    </li>
                    <li>
                      <strong>{t('wizard-direction-receive')}</strong> {t('wizard-direction-receive-help')}
                    </li>
                    <li>
                      <strong>{t('wizard-direction-both')}</strong> {t('wizard-direction-both-help')}
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
            <p className="gba:text-muted-foreground">{t('wizard-review-configuration')}</p>

            <Card>
              <CardHeader className="gba:pb-3">
                <CardTitle className="gba:text-lg">{name || t('wizard-untitled-automation')}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </CardHeader>
              <CardContent className="gba:space-y-4">
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-review-type')}</Label>
                    <p className="gba:font-medium">{getAutomationTypeTitle(automationType)}</p>
                  </div>
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-review-trigger')}</Label>
                    <p className="gba:font-medium">{TRIGGER_OPTIONS.find(t => t.trigger === trigger)?.title}</p>
                  </div>
                  {automationType === 'bulk_collection' ? (
                    <>
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-review-recipients')}</Label>
                        <p className="gba:font-medium">
                          {getRecipientLabel(approvalSteps[0]?.assignee, selectedRecipients.length)}
                        </p>
                      </div>
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">
                          {t('wizard-review-form-fields')}
                        </Label>
                        <p className="gba:font-medium">{t('wizard-fields-count', { count: formFields.length })}</p>
                      </div>
                    </>
                  ) : automationType === 'excel_collection' ? (
                    <>
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-review-recipients')}</Label>
                        <p className="gba:font-medium">
                          {getRecipientLabel(approvalSteps[0]?.assignee, selectedRecipients.length)}
                        </p>
                      </div>
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-review-template')}</Label>
                        <p className="gba:font-medium">
                          {selectedTemplateId
                            ? availableTemplates.find(t => t.id === selectedTemplateId)?.name ||
                              t('wizard-selected-spreadsheet')
                            : t('wizard-empty-dash')}
                        </p>
                      </div>
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">
                          {t('wizard-review-tracking-columns')}
                        </Label>
                        <p className="gba:font-medium">
                          {t('wizard-columns-count', { count: trackingColumns.length })}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">
                          {t('wizard-review-workflow-steps')}
                        </Label>
                        <p className="gba:font-medium">{t('wizard-steps-count', { count: workflowSteps.length })}</p>
                      </div>
                      <div>
                        <Label className="gba:text-xs gba:text-muted-foreground">
                          {t('wizard-review-column-mappings')}
                        </Label>
                        <p className="gba:font-medium">
                          {t('wizard-mappings-count', { count: columnMappings.length })}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {trigger === 'onFieldChange' && watchColumns.length > 0 && (
                  <div>
                    <Label className="gba:text-xs gba:text-muted-foreground">
                      {t('wizard-review-watched-columns')}
                    </Label>
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
                    <Label className="gba:text-xs gba:text-muted-foreground">{t('wizard-status-column')}</Label>
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
          <h2 className="gba:text-lg gba:font-semibold">
            {isEditing ? t('wizard-edit-automation') : t('wizard-create-automation')}
          </h2>
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
            {wizardSteps.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex

              return (
                <React.Fragment key={step}>
                  <div
                    className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-medium ${getStepIndicatorStyle(isActive, isCompleted)}`}
                  >
                    {isCompleted ? <Check className="gba:w-4 gba:h-4" /> : index + 1}
                  </div>
                  {index < wizardSteps.length - 1 && (
                    <div className={`gba:w-12 gba:h-0.5 ${isCompleted ? 'gba:bg-success' : 'gba:bg-muted'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Step Title */}
          <div className="gba:text-center gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold">{getStepTitle(currentStep)}</h3>
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
