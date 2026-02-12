import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationFormValues, EmployeeOption, EvaluationTopic } from '../types'
import { useStructureEmployees } from '../hooks/useStructureEmployees'
import { useEmployeeDetails } from '../hooks/useEmployeeDetails'
import { useEmployeeByUserId } from '../hooks/useEmployeeByUserId'
import { usePerformanceCycleById } from '../hooks/usePerformanceCycleById'
import { useEmployeeSkills } from '../hooks/useEmployeeSkills'
import { useRatingScales } from '../../../apps/performance-evaluation/hooks/useRatingScales'
import { useCompanyValues } from '../../../apps/performance-evaluation/hooks/useCompanyValues'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

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

  // Extract performance cycle ID from additionalData
  const performanceCycleId = (businessAppContext?.additionalData as any)?.psi_taskPayload?.employeePerformanceEvaluation
    ?.performanceCycle

  console.log('[Context] Performance Cycle ID from additionalData:', performanceCycleId)
  console.log('[Context] Employee ID from task payload:', employeeIdFromTaskPayload)
  console.log('[Context] Selected Employee ID for skills:', selectedEmployeeIdForJobProfile)

  // Fetch performance cycle details
  const { cycle: performanceCycle, loading: cycleLoading } = usePerformanceCycleById({
    accessToken: businessAppContext.accessToken,
    cycleId: performanceCycleId
  })

  // Fetch all rating scales and company values
  const { ratingScales, loading: ratingScalesLoading } = useRatingScales(businessAppContext.accessToken)
  const { values: companyValues, loading: companyValuesLoading } = useCompanyValues(businessAppContext.accessToken)

  // Fetch employee's actual skills (from employee_skill table)
  const { skills: employeeSkills, loading: employeeSkillsLoading } = useEmployeeSkills({
    accessToken: businessAppContext.accessToken,
    employeeId: selectedEmployeeIdForJobProfile
  })

  console.log('[Context] Performance Cycle:', performanceCycle)
  console.log('[Context] Rating Scales:', ratingScales)
  console.log('[Context] Company Values:', companyValues)
  console.log('[Context] Employee Skills:', employeeSkills)
  console.log('[Context] Employee Skills Length:', employeeSkills?.length)
  console.log('[Context] Employee Skills Loading:', employeeSkillsLoading)

  // Get the rating scale for this cycle
  const ratingScale = useMemo(() => {
    if (!performanceCycle?.ratingScaleId || ratingScalesLoading) {
      return null
    }
    return ratingScales.find(scale => scale.id === performanceCycle.ratingScaleId)
  }, [performanceCycle, ratingScales, ratingScalesLoading])

  console.log('[Context] Selected Rating Scale:', ratingScale)

  // Extract rating scale values for UI
  const ratingScaleValues = useMemo(() => {
    if (!ratingScale || !ratingScale.values || ratingScale.values.length === 0) {
      // Default to 1-5 scale if no rating scale found
      return [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
        { label: '5', value: 5 }
      ]
    }

    // Map rating scale values to UI format
    return ratingScale.values.map((label, index) => ({
      label: label,
      value: index + 1 // Use 1-based indexing
    }))
  }, [ratingScale])

  console.log('[Context] Rating Scale Values:', ratingScaleValues)

  // Build topics from the performance cycle configuration and employee skills
  const topics = useMemo<EvaluationTopic[]>(() => {
    // Wait for initial loading to complete
    if (ratingScalesLoading || companyValuesLoading) {
      console.log('[Context] Still loading rating scales or company values')
      return []
    }

    const topicsFromCycle: EvaluationTopic[] = []

    // Add employee's actual skills as topics (independent of performance cycle)
    console.log('[Context] Building topics - employeeSkills:', employeeSkills)
    if (employeeSkills && employeeSkills.length > 0) {
      console.log('[Context] Adding', employeeSkills.length, 'skills to topics')
      employeeSkills.forEach(employeeSkill => {
        if (employeeSkill.skill) {
          const skillTopic: EvaluationTopic = {
            id: `skill-${employeeSkill.skill.id}`,
            name: employeeSkill.skill.name,
            category: 'skill',
            rating: undefined,
            comment: ''
          }
          console.log('[Context] Adding skill topic:', skillTopic)
          topicsFromCycle.push(skillTopic)
        }
      })
    } else {
      console.log('[Context] No employee skills to add:', { employeeSkills, length: employeeSkills?.length })
    }

    // Add company values as topics (only if performance cycle exists)
    if ((performanceCycle?.companyValueIds?.length ?? 0) > 0) {
      console.log('[Context] Adding company values from performance cycle')
      performanceCycle!.companyValueIds!.forEach(valueId => {
        const value = companyValues.find(v => v.id === valueId)
        if (value) {
          topicsFromCycle.push({
            id: `value-${value.id}`,
            name: value.title,
            category: 'value',
            rating: undefined,
            comment: ''
          })
        }
      })
    } else {
      console.log('[Context] No performance cycle or company values to add')
    }

    console.log('[Context] Built topics:', topicsFromCycle)
    return topicsFromCycle
  }, [performanceCycle, companyValues, ratingScales, ratingScalesLoading, companyValuesLoading, employeeSkills])

  // Initialize form values with dynamic topics
  const [formValues, setFormValues] = useState<PerformanceEvaluationFormValues>({
    employeeId: undefined,
    employeeName: undefined,
    topics: [],
    ...initialValues
  })

  // Update form topics when they're loaded or when they change (e.g., skills loaded)
  useEffect(() => {
    console.log('[Context] Topics changed, length:', topics.length, 'topics:', topics)
    if (topics.length > 0) {
      console.log('[Context] Updating form values with topics:', topics)
      setFormValues(prev => {
        console.log('[Context] Previous formValues.topics:', prev.topics)
        console.log('[Context] New topics:', topics)
        return { ...prev, topics }
      })
    } else {
      console.log('[Context] Topics array is empty, not updating formValues')
    }
  }, [topics])

  // Update selected employee ID for skills fetching when form employee changes
  // BUT: Don't override if employee came from task payload (for manager reviews)
  useEffect(() => {
    // If we have an employee from task payload, always use that (manager reviewing employee)
    if (employeeIdFromTaskPayload) {
      if (selectedEmployeeIdForJobProfile !== employeeIdFromTaskPayload) {
        console.log('[Context] Using employee from task payload for skills:', employeeIdFromTaskPayload)
        setSelectedEmployeeIdForJobProfile(employeeIdFromTaskPayload)
      }
      return
    }

    // Otherwise, update when form employee changes (normal flow)
    if (formValues.employeeId && formValues.employeeId !== selectedEmployeeIdForJobProfile) {
      console.log('[Context] Employee changed, updating skills fetch for:', formValues.employeeId)
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

  console.log('[Context] preSelectedUserId:', preSelectedUserId)
  console.log('[Context] preSelectedEmployeeId:', preSelectedEmployeeId)
  console.log('[Context] preSelectedEmployee:', preSelectedEmployee)
  console.log('[Context] preSelectedEmployeeLoading:', preSelectedEmployeeLoading)
  console.log('[Context] preSelectedEmployeeError:', preSelectedEmployeeError)

  // Get current user's employee ID
  const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

  // Check if the pre-selected employee is the current user
  const preSelectedEmployeeOption = convertToEmployeeOption(preSelectedEmployee)
  const isPreSelectedEmployeeCurrentUser = preSelectedEmployeeOption?.id === currentUserEmployeeId

  console.log('[Context] currentUserEmployeeId:', currentUserEmployeeId)
  console.log('[Context] isPreSelectedEmployeeCurrentUser:', isPreSelectedEmployeeCurrentUser)

  // Always treat as having a locked pre-selected employee when userId or employeeId is provided
  // The dropdown will be hidden and employee info shown in header (read-only)
  const hasPreSelectedEmployee = !!(preSelectedEmployeeId || preSelectedUserId)

  console.log('[Context] hasPreSelectedEmployee:', hasPreSelectedEmployee)

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
    console.log('[Context] Adding pre-selected employee to list:', preSelectedEmployeeOption)
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
    console.log('[useEffect] Checking pre-selected employee:', {
      preSelectedEmployee,
      hasEmployeeId: !!formValues.employeeId,
      hasPreSelectedEmployee,
      isPreSelectedEmployeeCurrentUser
    })

    // Pre-populate if we have a pre-selected employee (whether current user or not)
    if (preSelectedEmployee && !formValues.employeeId && (preSelectedEmployeeId || preSelectedUserId)) {
      const employeeOption = convertToEmployeeOption(preSelectedEmployee)

      if (employeeOption) {
        console.log('[useEffect] Setting form values:', {
          employeeId: employeeOption.id,
          employeeName: employeeOption.name
        })

        updateFormValues({
          employeeId: employeeOption.id,
          employeeName: employeeOption.name
        })
      }
    } else {
      console.log('[useEffect] NOT setting form values because:', {
        hasPreSelectedEmployee: !!preSelectedEmployee,
        hasFormEmployeeId: !!formValues.employeeId,
        hasPreSelectedProp: !!(preSelectedEmployeeId || preSelectedUserId)
      })
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

      // Format topics (skills and values) with their ratings as a string
      // Format: "topicName:rating;topicName:rating;..."
      const formattedComments = formValues.topics
        .map(topic => {
          const ratingValue = topic.rating !== undefined ? topic.rating : 'N/A'
          return `${topic.name}:${ratingValue}`
        })
        .join(';')

      // Check if this is a manager review by looking at NodeName in taskPayload
      const nodeName = (businessAppContext?.additionalData as any)?.psi_taskPayload?.NodeName
      const isManagerReview = nodeName === 'Manager Review'

      console.log('[Context] NodeName:', nodeName)
      console.log('[Context] Is Manager Review:', isManagerReview)
      console.log('[Context] Formatted comments:', formattedComments)

      // Create payload with appropriate field name based on review type
      const payload = isManagerReview ? { managerComments: formattedComments } : { employeeComments: formattedComments }

      // Dispatch the process continue event
      dispatchProcessContinueEvent('pse_submit', payload)

      // Also call the original onSubmit if provided (for backward compatibility)
      if (onSubmit) {
        await onSubmit(formValues)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit performance evaluation')
    } finally {
      setIsLoading(false)
    }
  }, [formValues, onSubmit, setError, businessAppContext.userInfo, preSelectedEmployee, getEmployeeById])

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
    ratingScaleLoading: ratingScalesLoading || cycleLoading,
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
