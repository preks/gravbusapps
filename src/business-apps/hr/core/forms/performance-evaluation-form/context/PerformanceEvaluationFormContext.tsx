import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationFormValues, EmployeeOption, EvaluationTopic } from '../types'
import { useStructureEmployees } from '../hooks/useStructureEmployees'
import { useEmployeeDetails } from '../hooks/useEmployeeDetails'
import { useEmployeeByUserId } from '../hooks/useEmployeeByUserId'
import { useEmployeeSkills } from '../hooks/useEmployeeSkills'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

/** Rating scale value for UI: { label, value } */
const DEFAULT_RATING_SCALE_VALUES = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 }
]

/** Normalize ratingScaleValues from psi_taskPayload.evaluationFormData to UI shape. */
function normalizeEvaluationFormRatingScaleValues(raw: unknown): Array<{ label: string; value: number }> {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_RATING_SCALE_VALUES
  return raw.map((item: any, index: number) => ({
    label: item?.label ?? item?.name ?? String(index + 1),
    value: typeof item?.value === 'number' ? item.value : index + 1
  }))
}

/** Pick first non-empty string from possible display-name fields. */
function getDisplayName(item: any, ...keys: string[]): string {
  if (!item || typeof item !== 'object') return ''
  for (const key of keys) {
    const val = item[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  const nested = item?.skill ?? item?.companyValue ?? item?.skillName
  if (nested && typeof nested === 'object') {
    return getDisplayName(nested, 'name', 'title', 'label', 'skillName', 'displayName')
  }
  return ''
}

/** Normalize companyValues from psi_taskPayload.evaluationFormData for topic names. */
function normalizeEvaluationFormCompanyValues(raw: unknown): Array<{ id: string; title: string }> {
  if (!Array.isArray(raw)) return []
  return (raw as any[])
    .map((item: any) => {
      const id = item?.id ?? item?.companyValueId
      const title = getDisplayName(item, 'valueName', 'title', 'name', 'label', 'companyValueTitle', 'displayName')
      if (!id && !title) return null
      return { id: String(id ?? title), title: title || String(id) }
    })
    .filter((v): v is { id: string; title: string } => v !== null)
}

/** Normalize skills from psi_taskPayload.evaluationFormData to EvaluationTopic[]. */
function normalizeEvaluationFormSkills(raw: unknown): EvaluationTopic[] {
  if (!Array.isArray(raw)) return []
  const result: EvaluationTopic[] = []
  for (const item of raw as any[]) {
    const id = item?.id ?? item?.skillId
    const name = getDisplayName(item, 'name', 'title', 'label', 'skillName', 'displayName')
    if (!id && !name) continue
    result.push({
      id: `skill-${id ?? name}`,
      name: name || String(id ?? 'Skill'),
      category: 'skill',
      rating: undefined,
      comment: ''
    })
  }
  return result
}

interface PerformanceEvaluationFormContextType {
  formValues: PerformanceEvaluationFormValues
  setFormValues: (values: Partial<PerformanceEvaluationFormValues>) => void
  updateTopic: (topicId: string, updates: Partial<EvaluationTopic>) => void
  isLoading: boolean
  error: string | null
  clearError: () => void
  onSubmit: () => Promise<void>
  onCancel: () => Promise<void>
  businessAppContext: BusinessAppContextProps
  employees: EmployeeOption[]
  employeesLoading: boolean
  employeesError: string | null
  searchEmployees: (search: string) => Promise<void>
  getEmployeeById: (employeeId: string) => EmployeeOption | undefined
  preSelectedEmployee: EmployeeOption | null
  preSelectedEmployeeLoading: boolean
  preSelectedEmployeeError: string | null
  hasPreSelectedEmployee: boolean
  isPreSelectedEmployeeCurrentUser: boolean
  isRequestedEvaluationFlow: boolean
  ratingScaleValues: Array<{ label: string; value: number }>
  ratingScaleLoading: boolean
  employeeSkillsLoading: boolean
}

const PerformanceEvaluationFormContext = createContext<PerformanceEvaluationFormContextType | undefined>(undefined)

interface PerformanceEvaluationFormProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<PerformanceEvaluationFormValues>
  onSubmit?: (values: PerformanceEvaluationFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  preSelectedEmployeeId?: string
  preSelectedUserId?: string
}

export const PerformanceEvaluationFormProvider: React.FC<PerformanceEvaluationFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  preSelectedEmployeeId,
  preSelectedUserId
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract employee ID from task payload (for manager reviews - to show employee's skills, not manager's)
  const employeeIdFromTaskPayload = (businessAppContext?.additionalData as any)?.psi_taskPayload
    ?.employeePerformanceEvaluation?.employee

  // Track selected employee ID separately to avoid circular dependency
  // Priority: task payload employee (for reviews) > preSelectedEmployeeId > initialValues
  const [selectedEmployeeIdForJobProfile, setSelectedEmployeeIdForJobProfile] = useState<string | undefined>(
    employeeIdFromTaskPayload || preSelectedEmployeeId || initialValues.employeeId
  )

  const ad = businessAppContext?.additionalData as any
  const evaluationFormData = ad?.psi_taskPayload?.evaluationFormData

  // Rating scale values and company values from evaluationFormData (no GraphQL)
  const ratingScaleValues = useMemo(
    () => normalizeEvaluationFormRatingScaleValues(evaluationFormData?.ratingScaleValues),
    [evaluationFormData?.ratingScaleValues]
  )

  const evaluationFormCompanyValues = useMemo(
    () => normalizeEvaluationFormCompanyValues(evaluationFormData?.companyValues),
    [evaluationFormData?.companyValues]
  )

  const evaluationFormSkillsAsTopics = useMemo(
    () => normalizeEvaluationFormSkills(evaluationFormData?.skills),
    [evaluationFormData?.skills]
  )

  // Fetch employee's actual skills only when we don't have evaluationFormData.skills (fallback)
  const { skills: employeeSkills, loading: employeeSkillsLoading } = useEmployeeSkills({
    accessToken: businessAppContext.accessToken,
    employeeId: selectedEmployeeIdForJobProfile
  })

  // Build topics: prefer evaluationFormData (skills + company values), else employee skills only
  const topics = useMemo<EvaluationTopic[]>(() => {
    if (evaluationFormData) {
      const valueTopics: EvaluationTopic[] = evaluationFormCompanyValues.map(v => ({
        id: `value-${v.id}`,
        name: v.title,
        category: 'value' as const,
        rating: undefined,
        comment: ''
      }))
      return [...evaluationFormSkillsAsTopics, ...valueTopics]
    }
    const topicsFromSkills: EvaluationTopic[] = []
    if (employeeSkills?.length) {
      employeeSkills.forEach(employeeSkill => {
        if (employeeSkill.skill) {
          topicsFromSkills.push({
            id: `skill-${employeeSkill.skill.id}`,
            name: employeeSkill.skill.name,
            category: 'skill',
            rating: undefined,
            comment: ''
          })
        }
      })
    }
    return topicsFromSkills
  }, [evaluationFormData, evaluationFormSkillsAsTopics, evaluationFormCompanyValues, employeeSkills])

  // Initialize form values with dynamic topics
  const [formValues, setFormValues] = useState<PerformanceEvaluationFormValues>({
    employeeId: undefined,
    employeeName: undefined,
    topics: [],
    comments: '',
    ...initialValues
  })

  // Update form topics when they're loaded or when they change (e.g., skills loaded)
  useEffect(() => {
    if (topics.length > 0) {
      setFormValues(prev => {
        return { ...prev, topics }
      })
    }
  }, [topics])

  // Update selected employee ID for skills fetching when form employee changes
  // BUT: Don't override if employee came from task payload (for manager reviews)
  useEffect(() => {
    // If we have an employee from task payload, always use that (manager reviewing employee)
    if (employeeIdFromTaskPayload) {
      if (selectedEmployeeIdForJobProfile !== employeeIdFromTaskPayload) {
        setSelectedEmployeeIdForJobProfile(employeeIdFromTaskPayload)
      }
      return
    }

    // Otherwise, update when form employee changes (normal flow)
    if (formValues.employeeId && formValues.employeeId !== selectedEmployeeIdForJobProfile) {
      setSelectedEmployeeIdForJobProfile(formValues.employeeId)
    }
  }, [formValues.employeeId, selectedEmployeeIdForJobProfile, employeeIdFromTaskPayload])

  // Helper function to convert employee data to EmployeeOption format
  const convertToEmployeeOption = useCallback((emp: any): EmployeeOption | null => {
    if (!emp) return null

    // Handle EmployeeByUserIdData format (from useEmployeeByUserId)
    if ('employeeId' in emp && 'employee' in emp) {
      return {
        id: emp.employeeId,
        name: emp.employee?.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        jobTitle: emp.jobPosition?.name,
        department: emp.organizationalUnit?.name,
        pictureThumbnail: emp.employee?.pictureThumbnail,
        userId: emp.employee?.userId
      }
    }

    // Handle EmployeeOption format (from useEmployeeDetails)
    if ('id' in emp && 'name' in emp) {
      return {
        id: emp.id,
        name: emp.name,
        jobTitle: emp.jobTitle,
        department: emp.department,
        pictureThumbnail: emp.pictureThumbnail,
        userId: emp.userId
      }
    }

    return null
  }, [])

  // Use the existing useEmployeeById hook for pre-selected employee (by employeeId)
  const {
    employee: preSelectedEmployeeById,
    loading: preSelectedEmployeeByIdLoading,
    error: preSelectedEmployeeByIdError
  } = useEmployeeDetails(businessAppContext.accessToken, preSelectedEmployeeId)

  // Use the useEmployeeByUserId hook for pre-selected employee (by userId)
  const {
    employee: preSelectedEmployeeByUserId,
    loading: preSelectedEmployeeByUserIdLoading,
    error: preSelectedEmployeeByUserIdError
  } = useEmployeeByUserId({ accessToken: businessAppContext.accessToken, userId: preSelectedUserId })

  // Combine the results - prefer userId-based lookup if provided
  const preSelectedEmployee = preSelectedUserId ? preSelectedEmployeeByUserId : preSelectedEmployeeById
  const preSelectedEmployeeLoading = preSelectedUserId
    ? preSelectedEmployeeByUserIdLoading
    : preSelectedEmployeeByIdLoading
  const preSelectedEmployeeError = preSelectedUserId ? preSelectedEmployeeByUserIdError : preSelectedEmployeeByIdError

  // Get current user's employee ID
  const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

  // Check if the pre-selected employee is the current user
  const preSelectedEmployeeOption = convertToEmployeeOption(preSelectedEmployee)
  const isPreSelectedEmployeeCurrentUser = preSelectedEmployeeOption?.id === currentUserEmployeeId

  // Always treat as having a locked pre-selected employee when userId or employeeId is provided
  // The dropdown will be hidden and employee info shown in header (read-only)
  const hasPreSelectedEmployee = !!(preSelectedEmployeeId || preSelectedUserId)

  // Detect "Enter Requested Performance Evaluation" flow from process metadata
  const flowTaskName = (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.name || ''
  const screenKey =
    (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.screenKey ||
    (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.screen?.screenComponents
      ?.screenKey ||
    ''
  const receiverId = (businessAppContext?.additionalData as any)?.psi_taskPayload?.receiverId

  const isRequestedEvaluationFlow =
    String(flowTaskName).toLowerCase() === 'enterrequestedperformanceevaluation' ||
    String(screenKey).toLowerCase().includes('enterrequestedperformanceevaluation') ||
    !!receiverId

  const {
    employees: structureEmployees,
    isLoading: employeesLoading,
    error: employeesError,
    fetchStructureEmployees,
    getEmployeeById
  } = useStructureEmployees(businessAppContext.accessToken, !hasPreSelectedEmployee, currentUserEmployeeId)

  // Merge pre-selected employee into employees list if not already there
  // This ensures the employee is in the dropdown even if they're filtered out (e.g., current user)
  const employees = useMemo(() => {
    // Only add to list if we actually have a pre-selected employee via props
    if (!preSelectedEmployee || !(preSelectedEmployeeId || preSelectedUserId)) return structureEmployees

    // Convert pre-selected employee to EmployeeOption format
    const preSelectedEmployeeOption = convertToEmployeeOption(preSelectedEmployee)

    if (!preSelectedEmployeeOption) return structureEmployees

    // Check if pre-selected employee is already in the list
    const isAlreadyInList = structureEmployees.some(emp => emp.id === preSelectedEmployeeOption.id)

    if (isAlreadyInList) {
      return structureEmployees
    }

    // Add pre-selected employee to the beginning of the list
    return [preSelectedEmployeeOption, ...structureEmployees]
  }, [preSelectedEmployee, structureEmployees, convertToEmployeeOption, preSelectedEmployeeId, preSelectedUserId])

  const updateFormValues = useCallback((values: Partial<PerformanceEvaluationFormValues>) => {
    setFormValues(prev => ({ ...prev, ...values }))
  }, [])

  const updateTopic = useCallback((topicId: string, updates: Partial<EvaluationTopic>) => {
    setFormValues(prev => ({
      ...prev,
      topics: prev.topics.map(topic => (topic.id === topicId ? { ...topic, ...updates } : topic))
    }))
  }, [])

  // Handle pre-selected employee - always pre-populate when we have the data
  useEffect(() => {
    // Pre-populate if we have a pre-selected employee (whether current user or not)
    if (preSelectedEmployee && !formValues.employeeId && (preSelectedEmployeeId || preSelectedUserId)) {
      const employeeOption = convertToEmployeeOption(preSelectedEmployee)

      if (employeeOption) {
        updateFormValues({
          employeeId: employeeOption.id,
          employeeName: employeeOption.name
        })
      }
    }
  }, [
    preSelectedEmployee,
    formValues.employeeId,
    updateFormValues,
    convertToEmployeeOption,
    preSelectedEmployeeId,
    preSelectedUserId,
    hasPreSelectedEmployee,
    isPreSelectedEmployeeCurrentUser
  ])

  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  const searchEmployees = useCallback(
    async (search: string) => {
      if (!hasPreSelectedEmployee) {
        await fetchStructureEmployees(search)
      }
    },
    [hasPreSelectedEmployee, fetchStructureEmployees]
  )

  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true)

      const taskPayload = (businessAppContext?.additionalData as any)?.psi_taskPayload
      const evaluationFormDataPayload = taskPayload?.evaluationFormData
      const rawRatingScaleValues = evaluationFormDataPayload?.ratingScaleValues

      const getRatingScaleValueId = (rating: number | undefined): string => {
        if (rating == null || !Array.isArray(rawRatingScaleValues)) return ''
        const index = rating - 1
        const item = rawRatingScaleValues[index]
        return (item?.id ?? item?.ratingScaleValueId ?? '') as string
      }

      const evaluationId = evaluationFormDataPayload?.evaluationId ?? ''
      const nodeName = taskPayload?.NodeName
      const taskName = taskPayload?.TaskName
      const isManagerReview = nodeName === 'Manager Review' || nodeName === 'Manager Evaluation'
      const isPeerReview = taskName === 'peerEvaluation' || taskName === 'peerReview'
      const employeeId =
        isManagerReview || isPeerReview
          ? (businessAppContext?.userInfo?.employeeDetails?.employeeId ?? '')
          : (formValues.employeeId ?? preSelectedEmployeeId ?? '')

      const skillRatings = formValues.topics
        .filter(t => t.category === 'skill')
        .map(topic => ({
          skillId: topic.id.replace(/^skill-/, ''),
          ratingScaleValueId: getRatingScaleValueId(topic.rating),
          comments: topic.comment ?? ''
        }))

      const companyValueRatings = formValues.topics
        .filter(t => t.category === 'value')
        .map(topic => ({
          companyValueId: topic.id.replace(/^value-/, ''),
          ratingScaleValueId: getRatingScaleValueId(topic.rating),
          comments: topic.comment ?? ''
        }))

      const reviewSubmission = {
        evaluationId,
        employeeId,
        skillRatings,
        companyValueRatings,
        comments: formValues.comments ?? ''
      }

      let payload: Record<string, unknown>
      if (isPeerReview) {
        payload = { peerReviewSubmission: reviewSubmission }
      } else if (isManagerReview) {
        payload = { managerReviewSubmission: reviewSubmission }
      } else {
        payload = { reviewSubmission }
      }

      dispatchProcessContinueEvent('pse_submit', payload)

      if (onSubmit) {
        await onSubmit(formValues)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit performance evaluation')
    } finally {
      setIsLoading(false)
    }
  }, [formValues, onSubmit, setError, businessAppContext?.additionalData, preSelectedEmployeeId])

  const handleCancel = useCallback(async () => {
    try {
      // Dispatch the process pause event
      dispatchProcessContinueEvent('pse_abort', {})

      // Also call the original onCancel if provided (for backward compatibility)
      if (onCancel) {
        await onCancel()
      }
    } catch (err) {
      console.error('Error :', err)
    }
  }, [onCancel])

  const contextValue: PerformanceEvaluationFormContextType = {
    formValues,
    setFormValues: updateFormValues,
    updateTopic,
    isLoading,
    error,
    clearError,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    businessAppContext,
    employees,
    employeesLoading,
    employeesError,
    searchEmployees,
    getEmployeeById,
    preSelectedEmployee: preSelectedEmployeeOption,
    preSelectedEmployeeLoading,
    preSelectedEmployeeError,
    hasPreSelectedEmployee,
    isPreSelectedEmployeeCurrentUser,
    isRequestedEvaluationFlow,
    ratingScaleValues,
    ratingScaleLoading: false,
    employeeSkillsLoading
  }

  return (
    <PerformanceEvaluationFormContext.Provider value={contextValue}>
      {children}
    </PerformanceEvaluationFormContext.Provider>
  )
}

export const usePerformanceEvaluationForm = (): PerformanceEvaluationFormContextType => {
  const context = useContext(PerformanceEvaluationFormContext)
  if (!context) {
    throw new Error('usePerformanceEvaluationForm must be used within a PerformanceEvaluationFormProvider')
  }
  return context
}
