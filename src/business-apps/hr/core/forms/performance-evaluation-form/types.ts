export interface EvaluationTopic {
  id: string
  name: string
  category: 'skill' | 'value'
  rating?: number
  comment: string
}

export interface PerformanceEvaluationFormValues {
  employeeId?: string
  employeeName?: string
  topics: EvaluationTopic[]
}

export interface TextTransformationRequest {
  text: string
  transformationType: 'formalize' | 'translate' | 'shorten'
  targetLanguage?: string
}

export interface TextTransformationResponse {
  transformedText: string
  originalText: string
  transformationType: string
  targetLanguage?: string
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

export interface PerformanceEvaluationFormProps {
  initialValues?: Partial<PerformanceEvaluationFormValues>
  onSubmit?: (values: PerformanceEvaluationFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  preSelectedEmployeeId?: string
}
