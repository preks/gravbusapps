/**
 * Flow Template Types
 * Types for dynamic templates from custom-flow-engine
 */

// Field types supported by the workflow engine
export type DynamicFormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'DATE'
  | 'DATETIME'
  | 'CHECKBOX'
  | 'NUMBER'
  | 'EMAIL'
  | 'URL'
  | 'MULTISELECT'
  | 'FILE'

// Validation rule types
export interface ValidationRule {
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'min'
    | 'max'
    | 'email'
    | 'url'
    | 'minDate'
    | 'maxDate'
    | 'dateRange'
  value?: string | number | Date
  message?: string
}

// Data source configuration for dynamic SELECT/MULTISELECT fields
export type DataSourceType = 'CATALOG' | 'ENTITY' | 'API' | 'STATIC'

export interface DataSourceConfig {
  type: DataSourceType
  // For ENTITY type - fetches from /api/datasource/:entity
  entity?: string // Entity type: 'employee', 'costCenter', 'lead', 'account', 'contact', etc.
  // For CATALOG type
  catalog?: string // Catalog identifier
  catalogIdentifier?: string // Alternative catalog identifier (new format)
  version?: string // Catalog version (default: 'v1')
  // Field mapping
  valueField: string // Field to use as option value (e.g., 'id', 'code')
  labelField: string // Field to use as option label (e.g., 'displayName', 'value')
  // Optional filters
  filters?: Record<string, any>
  // Pagination defaults
  limit?: number // Default limit for results
}

// Dynamic form field definition from workflow template
export interface DynamicFormField {
  type: DynamicFormFieldType
  name: string
  label: string
  required: boolean
  placeholder?: string
  description?: string
  value?: any // Default value for the field
  readonly?: boolean // Whether the field is read-only (non-editable)
  validation?: ValidationRule[]
  options?: Array<{
    value: string
    label: string
  }>
  // Data source for dynamic SELECT/MULTISELECT options
  dataSource?: DataSourceConfig
  // Conditional fields
  dependsOn?: string
  showWhen?: string | string[]
  // UI hints
  colspan?: number
  order?: number
  // File upload specific options
  fileUpload?: {
    maxFiles?: number
    allowedFileTypes?: string[]
    maxFileSize?: number // in MB
  }
}

// Step definition from workflow template
export interface FlowTemplateStep {
  type: 'TASK' | 'GATEWAY' | 'SUBPROCESS'
  title: string
  message?: string
  dueInMinutes?: number
  form?: DynamicFormField[]
  links?: Array<{
    name: string
    url: string
    type: string
  }>
  assignment?: {
    targets: any
    assignmentMode: string
    allowReassignment: boolean
  }
}

// Flow template from custom-flow-engine
export interface FlowTemplate {
  id?: string // May not have ID initially
  type: 'TEMPLATE'
  name: string
  description: string
  version: number
  steps: FlowTemplateStep[]

  // Future enhancements for categorization
  category?: string
  tags?: Record<string, any>
  metadata?: {
    icon?: string
    estimatedTime?: string
    difficulty?: 'simple' | 'standard' | 'complex'
  }

  // Computed properties for UI
  formSchema?: DynamicFormField[] // Extracted from step_0.form
  step0Message?: string // Message from step_0 to display in the form
  estimatedDuration?: string
  stepCount?: number
}

// Form values for dynamic forms
export type DynamicFormValues = Record<string, any>

// Form submission result
export interface DynamicFormSubmission {
  templateId: string
  stepData: DynamicFormValues
  runtimeAssignments?: Record<string, any>
}

// Template loading state
export interface FlowTemplateState {
  templates: FlowTemplate[]
  isLoading: boolean
  error: string | null
  totalCount: number
}
