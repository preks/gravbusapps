import { UseFormReturn } from 'react-hook-form'

/**
 * Assignee option for selection
 */
export interface AssigneeOption {
  value: string
  label: string
  displayName?: string
  avatar?: string
}

/**
 * Props for custom assignee selector component
 */
export interface AssigneeSelectorProps {
  value?: string | string[]
  onValueChange: (value: string | string[]) => void
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  className?: string
  multiple?: boolean
}

/**
 * Quick Task form data structure
 */
export interface QuickTaskFormData {
  title: string
  message: string
  documents: QuickTaskUploadFile[]
  assignedUserIds: string[] // Changed from assignedUserId to support multiple users
  dueDate: string
  // Entity reference fields
  entityType?: string
  entityId?: string
  entityName?: string
  entityDisplayUrl?: string
  entityMetadata?: Record<string, any>
}

/**
 * File upload structure
 */
export interface QuickTaskUploadFile {
  uid: string
  name: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  originFileObj?: File
  percent?: number
  size?: number
  errorMessage?: string
}

/**
 * Configuration for Quick Task form component
 */
export interface QuickTaskFormConfig {
  // Task Name (used in button text, e.g., "Create Blink")
  taskName?: string

  // Assignee Configuration
  assigneeSelector?: {
    mode: 'employee-search' | 'custom'
    customComponent?: React.ComponentType<AssigneeSelectorProps>
    searchFunction?: (query: string) => Promise<AssigneeOption[]>
    required?: boolean
  }

  // Feature Toggles
  enableFileUpload?: boolean
  enableDueDate?: boolean
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedFileTypes?: string[]

  // Styling - pass any Tailwind classes to control width/layout
  className?: string

  // Labels & Placeholders (i18n support)
  labels?: {
    title?: string
    titlePlaceholder?: string
    message?: string
    messagePlaceholder?: string
    assignee?: string
    assigneePlaceholder?: string
    assigneeSearchPlaceholder?: string
    assigneeEmptyText?: string
    assigneeHint?: string
    dueDate?: string
    dueDatePlaceholder?: string
    attachments?: string
    submitButton?: string
    cancelButton?: string
  }
}

/**
 * Props for QuickTaskForm component
 */
export interface QuickTaskFormProps {
  config?: QuickTaskFormConfig
  accessToken: string
  currentUserId?: string
  onSubmit: (data: QuickTaskFormData) => Promise<void>
  onCancel?: () => void
  defaultValues?: Partial<QuickTaskFormData>
  isSubmitting?: boolean
}

/**
 * Props for QuickTaskModal component
 */
export interface QuickTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: QuickTaskFormConfig
  accessToken: string
  currentUserId?: string
  onSubmit: (data: QuickTaskFormData) => Promise<void>
  title?: string
  description?: string
}

/**
 * Options for useQuickTaskForm hook
 */
export interface UseQuickTaskFormOptions {
  accessToken: string
  currentUserId?: string
  config?: QuickTaskFormConfig
  defaultValues?: Partial<QuickTaskFormData>
  onSubmit: (data: QuickTaskFormData) => Promise<void>
}

/**
 * Return type for useQuickTaskForm hook
 */
export interface UseQuickTaskFormResult {
  form: UseFormReturn<QuickTaskFormData>
  handleSubmit: (data: QuickTaskFormData) => Promise<void>
  isSubmitting: boolean
  employeeOptions: AssigneeOption[]
  employeesLoading: boolean
  handleEmployeeSearch: (query: string) => void
}

/**
 * Employee data structure
 */
export interface Employee {
  id: string
  userId: string
  firstName: string
  lastName: string
  fullName: string
  displayName: string
  pictureThumbnail?: string
  email?: string
  personnelCode?: string
}
