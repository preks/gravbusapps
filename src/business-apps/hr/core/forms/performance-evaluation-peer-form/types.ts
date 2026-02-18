export interface EmployeeOption {
  id: string
  name: string
  email?: string
  jobTitle?: string
  department?: string
  pictureThumbnail?: string
  userId?: string
}

export interface PerformanceEvaluationPeerFormValues {
  peerEmployeeIds: string[]
  peerEmployeeNames: string[]
}

export interface PerformanceEvaluationPeerFormProps {
  initialValues?: Partial<PerformanceEvaluationPeerFormValues>
  onSubmit?: (values: PerformanceEvaluationPeerFormValues) => Promise<void>
  onCancel?: () => Promise<void>
}
