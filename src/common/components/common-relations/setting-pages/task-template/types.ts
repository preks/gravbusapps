import { UseFormReturn } from 'react-hook-form'

// Base interface for all task templates (shared between SalesTaskTemplate and InvestmentTaskTemplate)
export interface BaseTaskTemplate {
  // Metadata
  id: string
  version: number
  businessKey: string
  recordState: string

  // Basic info
  code: string
  name: string
  description?: string
  displayOrder?: number

  // Lifecycle
  enabled: boolean
  isActive?: boolean
  activeFrom?: string // ISO date string
  activeTo?: string // ISO date string

  // Scheduling
  intervalDays?: number
  durationDays?: number

  // Recurring schedule (JSONB fields - stored flat in DB)
  daysOfWeek?: { [key: string]: boolean }
  daysOfMonth?: { [key: string]: boolean }
  monthsOfYear?: { [key: string]: boolean }

  // Recurring schedule (combined for form usage)
  recurringSchedule?: RecurringSchedule

  // Assignment and policy
  assigneeType?: string
  holidayPolicy?: string
  nextStartDate?: string // ISO date string

  // Catalog references
  typeRef?: string
  priorityRef?: string

  // Extensibility
  additionalProperties?: Record<string, any>
}

// Recurring schedule data structure
export interface RecurringSchedule {
  daysOfWeek?: { [key: string]: boolean }
  daysOfMonth?: { [key: string]: boolean }
  monthsOfYear?: { [key: string]: boolean }
  intervalDays?: number
  holidayPolicy?: string
}

// Form data interface for create/update operations
export interface TaskTemplateFormData {
  // Basic info
  code: string
  name: string
  description?: string

  // Lifecycle
  isActive: boolean
  activeFrom?: string
  activeTo?: string

  // Scheduling type selection (stored in additionalProperties on save)
  schedulingType?: 'ONCE' | 'BUSINESS_DAYS' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM' | 'EVENTS'

  // Recurring schedule
  recurringSchedule: RecurringSchedule
  nextStartDate?: string

  // Assignment
  assigneeType: string
  assigneeRef?: string
  assigneeEmployeeRef?: string
  assigneeRoleRef?: string
  assigneeTeamRef?: string

  // Catalog references
  typeRef?: string
  priorityRef?: string

  // Extensibility
  additionalProperties?: Record<string, any>

  // Investment-specific fields (optional for base form)
  investmentGroupRef?: string
  investmentTypeRef?: string
}

// State management interfaces
export interface TaskTemplateTabState {
  templates: BaseTaskTemplate[]
  isLoading?: boolean
  error?: string | null
}

export interface TaskTemplateHandlers {
  onCreate: (data: TaskTemplateFormData) => Promise<void>
  onUpdate: (id: string, data: TaskTemplateFormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRetry?: () => void
}

// Catalog configuration type
export interface CatalogConfig {
  id: string
  catalogIdentifier: string
  prefetch?: boolean
  pageSize?: number
  parentField?: string
  childField?: string
  filterField?: Array<{ from: string; on: string }>
}

// Props for the main settings component
export interface TaskTemplateSettingsProps {
  templates: BaseTaskTemplate[]
  isLoading?: boolean
  error?: string | null
  onCreate: (data: TaskTemplateFormData) => Promise<void>
  onUpdate: (id: string, data: TaskTemplateFormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRetry?: () => void
  renderAdditionalFields?: (form: UseFormReturn<TaskTemplateFormData>) => React.ReactNode
  prefixDataTestId?: string
  headerTitle?: string
  headerDescription?: string
  onBack?: () => void
  accessToken: string
  catalogConfigs?: CatalogConfig[]
  businessAppContext?: any
  taskTypeCatalogId?: string
  taskPriorityCatalogId?: string
  hasEventConfig?: boolean
  // Domain-specific enum configurations (due to backend inconsistencies)
  assigneeTypes?: EnumOption[]
  holidayPolicies?: EnumOption[]
}

// Props for the table component
export interface TaskTemplateTableProps {
  templates: BaseTaskTemplate[]
  isLoading?: boolean
  error?: string | null
  onEdit: (template: BaseTaskTemplate) => void
  onDelete: (id: string) => void
  onRetry?: () => void
  onSearchChange?: (value: string) => void
  dataTestId: string
}

// Props for the form modal component
export interface TaskTemplateFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TaskTemplateFormData) => Promise<void>
  editingTemplate?: BaseTaskTemplate | null
  renderAdditionalFields?: (form: UseFormReturn<TaskTemplateFormData>) => React.ReactNode
  dataTestId: string
  accessToken: string
  catalogConfigs?: CatalogConfig[]
  taskTypeCatalogId?: string
  taskPriorityCatalogId?: string
  // Domain-specific enum configurations (due to backend inconsistencies)
  assigneeTypes?: EnumOption[]
  holidayPolicies?: EnumOption[]
}

// Props for the recurring schedule fields component
export interface RecurringScheduleFieldsProps {
  value: RecurringSchedule
  onChange: (value: RecurringSchedule) => void
  dataTestId: string
}

// Day of week options
export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', value: 1 },
  { key: 'tuesday', label: 'Tuesday', value: 2 },
  { key: 'wednesday', label: 'Wednesday', value: 3 },
  { key: 'thursday', label: 'Thursday', value: 4 },
  { key: 'friday', label: 'Friday', value: 5 },
  { key: 'saturday', label: 'Saturday', value: 6 },
  { key: 'sunday', label: 'Sunday', value: 0 }
] as const

// Month options
export const MONTHS_OF_YEAR = [
  { key: 'january', label: 'January', value: 1 },
  { key: 'february', label: 'February', value: 2 },
  { key: 'march', label: 'March', value: 3 },
  { key: 'april', label: 'April', value: 4 },
  { key: 'may', label: 'May', value: 5 },
  { key: 'june', label: 'June', value: 6 },
  { key: 'july', label: 'July', value: 7 },
  { key: 'august', label: 'August', value: 8 },
  { key: 'september', label: 'September', value: 9 },
  { key: 'october', label: 'October', value: 10 },
  { key: 'november', label: 'November', value: 11 },
  { key: 'december', label: 'December', value: 12 }
] as const

// Day of month options (1-31)
export const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  key: `day-${i + 1}`,
  label: `${i + 1}`,
  value: i + 1
}))

// NOTE: Backend enums are NOT aligned between Sales and Investment domains
// Sales uses: SKIP_TASK, EXECUTE_NEXT_DAY, EXECUTE_PREV_DAY, OWNER_EMPLOYEE, ACCOUNT_USER
// Investment uses: HOLIDAY_POLICY_SKIP, HOLIDAY_POLICY_NEXT_DAY, HOLIDAY_POLICY_PREV_DAY, OWNER_EMPLOYEE_TASK_ASSIGNEE, CONTACT_TASK_ASSIGNEE
// These should be standardized across all domains to avoid confusion and bugs

// Enum option type for configuration
export interface EnumOption {
  value: string
  label: string
}
