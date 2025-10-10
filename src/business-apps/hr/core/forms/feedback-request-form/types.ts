export interface FeedbackRequestFormValues {
  employeeId?: string
  employeeName?: string
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
  requestedFrom: string // userId of the person to request feedback from
  creatorUserId: string // employeeId of the logged in person (creator)
  requestMessage?: string // optional message to include with the request
}
