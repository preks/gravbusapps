export interface FeedbackRequestFormValues {
  // Legacy single-select fields (kept for backward compatibility)
  employeeId?: string
  employeeName?: string
  // New multi-select support
  employeeIds?: string[]
  employeeNames?: string[]
  requestMessage?: string
}

export interface FeedbackRequestFormProps {
  initialValues?: Partial<FeedbackRequestFormValues>
  onSubmit?: (values: FeedbackRequestFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  preSelectedEmployeeId?: string
}

export interface EmployeeOption {
  id: string // This is the actual employee ID (employee.id from EmployeePosition)
  name: string
  email?: string
  jobTitle?: string
  department?: string
  pictureThumbnail?: string
  userId?: string
}

export interface FeedbackRequestPayload {
  requestedFrom: string // userId of the person to request feedback from (first recipient for compatibility)
  // New multi-select: full list of userIds or employeeIds to request from
  requestedFromList?: string[]
  creatorUserId: string // employeeId of the logged in person (creator)
  requestMessage?: string // optional message to include with the request
  completeNotification?: {
    type: 'success' | 'error'
    message: string
  }
}
