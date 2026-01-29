/**
 * useFlowStepData Hook
 * Fetches flow overview and step data from flow-engine API
 *
 * Flow data retrieval process:
 * 1. GET /flow-engine/api/flows/{flowId} → get flow overview with steps array
 * 2. GET /flow-engine/api/tasks/{taskId} → get task details with formData (contains form values)
 *
 * Note: formData is returned directly from task details, no need for separate step data call
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getCflowEndpoint } from '../../every-api/utils/config'

const FLOW_ENGINE_API = getCflowEndpoint()

interface FlowStep {
  stepIndex: number
  title: string
  type: string
  status: string
  assignmentMode: string
  allowReassignment: boolean
  totalTasks?: number
  completedTasks?: number
  // Computed property for API calls
  stepNo?: string // Generated as `step_{stepIndex}`
  data?: any
}

interface FlowOverview {
  id: string
  templateId: string
  name: string
  status: string
  createdAt: string
  progress: {
    currentStep: number
    completedSteps: number
    totalSteps: number
    percentage: number
  }
  steps: FlowStep[]
}

interface FlowStepDataResult {
  flowOverview: FlowOverview | null
  currentStep: FlowStep | null
  currentStepData: any
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseFlowStepDataOptions {
  flowId: string | null | undefined
  taskId: string | null | undefined
  accessToken: string
  userId?: string
  enabled?: boolean
  taskStatus?: string // To determine fallback step logic (COMPLETED vs IN_PROGRESS)
  taskTitle?: string // Task title to match with step titles for finding correct step
}

/**
 * Hook to fetch flow overview and step data
 */
export const useFlowStepData = ({
  flowId,
  taskId,
  accessToken,
  userId,
  enabled = true,
  taskStatus,
  taskTitle
}: UseFlowStepDataOptions): FlowStepDataResult => {
  // Initialize loading state based on whether we need to fetch data
  // This ensures consumers see isLoading=true from the very first render when data will be fetched
  const shouldFetch = !!(flowId && accessToken && enabled)

  const [flowOverview, setFlowOverview] = useState<FlowOverview | null>(null)
  const [currentStep, setCurrentStep] = useState<FlowStep | null>(null)
  const [currentStepData, setCurrentStepData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(shouldFetch) // Start loading if we need to fetch
  const [error, setError] = useState<string | null>(null)

  // Track previous task to detect changes and reset state
  const [prevTaskId, setPrevTaskId] = useState<string | null | undefined>(taskId)

  // Use a ref to track the task ID for the current request
  // This allows us to detect and ignore stale API responses
  const currentRequestTaskIdRef = useRef<string | null | undefined>(taskId)

  // Reset state when task changes to prevent showing stale data from previous task
  useEffect(() => {
    if (taskId !== prevTaskId) {
      // Update the request task ID ref immediately
      currentRequestTaskIdRef.current = taskId
      // Clear all state immediately when task changes
      setFlowOverview(null)
      setCurrentStep(null)
      setCurrentStepData(null)
      setError(null)
      setIsLoading(shouldFetch) // Set loading if we need to fetch data
      setPrevTaskId(taskId)
    }
  }, [taskId, prevTaskId, shouldFetch])

  /**
   * Fetch task details to get stepReference and formData
   * The formData contains the form values submitted for this task
   */
  const fetchTaskDetails = useCallback(
    async (taskId: string): Promise<{ stepReference: string | null; formData: Record<string, any> | null } | null> => {
      const userIdParam = userId ? `?userId=${userId}` : ''
      const response = await fetch(`${FLOW_ENGINE_API}/api/tasks/${taskId}${userIdParam}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })

      if (!response.ok) {
        return null
      }

      const taskData = await response.json()
      return {
        stepReference: taskData.stepReference || null,
        formData: taskData.formData || null
      }
    },
    [accessToken, userId]
  )

  /**
   * Fetch flow overview with steps
   */
  const fetchFlowOverview = useCallback(
    async (flowId: string): Promise<FlowOverview> => {
      const response = await fetch(`${FLOW_ENGINE_API}/api/flows/${flowId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flow overview: ${response.status}`)
      }

      const data = await response.json()
      return data as FlowOverview
    },
    [accessToken]
  )

  /**
   * Find step by stepReference (e.g., "step_0", "step_1")
   */
  const findStepByReference = useCallback((steps: FlowStep[], stepReference: string): FlowStep | null => {
    const stepIndexRegex = /step_(\d+)/
    const stepIndexMatch = stepIndexRegex.exec(stepReference)
    if (!stepIndexMatch) {
      return null
    }

    const stepIndex = Number.parseInt(stepIndexMatch[1], 10)
    const step = steps.find(s => s.stepIndex === stepIndex)

    if (step) {
      return {
        ...step,
        stepNo: stepReference
      }
    }
    return null
  }, [])

  /**
   * Load flow data
   */
  const loadFlowData = useCallback(async () => {
    if (!flowId || !accessToken || !enabled) {
      return
    }

    // Capture the task ID for this request to detect stale responses
    const requestTaskId = taskId
    currentRequestTaskIdRef.current = taskId

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Get flow overview with steps (ALWAYS needed for step info)
      const overview = await fetchFlowOverview(flowId)

      // Check if this request is still valid (task hasn't changed)
      if (currentRequestTaskIdRef.current !== requestTaskId) {
        return // Ignore stale response
      }

      setFlowOverview(overview)

      // Step 2: Get task details (includes stepReference and formData with form values)
      let stepReferenceFromTask: string | null = null
      let formDataFromTask: Record<string, any> | null = null

      if (taskId) {
        const taskDetails = await fetchTaskDetails(taskId)

        // Check if this request is still valid (task hasn't changed)
        if (currentRequestTaskIdRef.current !== requestTaskId) {
          return // Ignore stale response
        }

        stepReferenceFromTask = taskDetails?.stepReference || null
        formDataFromTask = taskDetails?.formData || null
      }

      // Step 3: Find current step
      let current: FlowStep | null = null

      if (stepReferenceFromTask) {
        current = findStepByReference(overview.steps, stepReferenceFromTask)
      }

      // Fallback: find step by matching task title with step title
      if (!current && taskTitle) {
        const matchingStep = overview.steps.find(s => s.title === taskTitle)
        if (matchingStep) {
          current = {
            ...matchingStep,
            stepNo: `step_${matchingStep.stepIndex}`
          }
        }
      }

      // Fallback: find appropriate step based on task status (last resort)
      if (!current) {
        if (taskStatus === 'COMPLETED') {
          const completedStep = overview.steps.find(s => s.status === 'COMPLETED' && (s.completedTasks || 0) > 0)
          if (completedStep) {
            current = {
              ...completedStep,
              stepNo: `step_${completedStep.stepIndex}`
            }
          }
        } else {
          const inProgressStep = overview.steps.find(s => s.status === 'IN_PROGRESS')
          if (inProgressStep) {
            current = {
              ...inProgressStep,
              stepNo: `step_${inProgressStep.stepIndex}`
            }
          }
        }
      }

      setCurrentStep(current)

      // Step 4: Use formData from task details (no need for separate API call)
      // formData contains the form values submitted for this task
      setCurrentStepData(formDataFromTask)
    } catch (err) {
      // Only set error if this request is still valid
      if (currentRequestTaskIdRef.current === requestTaskId) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load flow data'
        setError(errorMessage)
      }
    } finally {
      // Only set loading to false if this request is still valid
      if (currentRequestTaskIdRef.current === requestTaskId) {
        setIsLoading(false)
      }
    }
  }, [
    flowId,
    taskId,
    accessToken,
    enabled,
    taskStatus,
    taskTitle,
    fetchTaskDetails,
    fetchFlowOverview,
    findStepByReference
  ])

  /**
   * Refetch data
   */
  const refetch = useCallback(async () => {
    await loadFlowData()
  }, [loadFlowData])

  /**
   * Initial load
   */
  useEffect(() => {
    if (flowId && accessToken && enabled) {
      loadFlowData()
    }
  }, [flowId, taskId, accessToken, enabled, taskStatus, loadFlowData])

  return {
    flowOverview,
    currentStep,
    currentStepData,
    isLoading,
    error,
    refetch
  }
}
