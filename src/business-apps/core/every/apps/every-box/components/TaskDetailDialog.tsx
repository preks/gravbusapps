/**
 * TaskDetailDialog Component
 * Minimal general task information view - specific task templates will have dedicated views
 */

import React from 'react'
import { Card, CardContent, Button, cn } from '@newwork/nw-design-system'
import { CheckCircle } from 'lucide-react'
import { message } from 'antd'
import { UnifiedTask } from '../types'
import { useScreenManagementApi } from '../hooks/useScreenManagementApi'
import { RemoteScreenLoader } from './RemoteScreenLoader'
import { LowcoderScreenLoader } from './LowcoderScreenLoader'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useKogitoProcess } from '../hooks/useKogitoProcess'
import { env } from '@/common/env/EnvUtils'
import { UniversalCflowTaskDetails } from './UniversalCflowTaskDetails'
import { useFlowStepData } from '../hooks/useFlowStepData'

interface TaskDetailDialogProps {
  task: UnifiedTask | null
  onClose: () => void
  onTaskUpdated: () => void
  onTaskCompleted?: (taskId: string) => void
  accessToken: string
  userId?: string
  userInfo?: any
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskCompleted,
  accessToken,
  userId,
  userInfo
}) => {
  const [isCompleting, setIsCompleting] = React.useState(false)
  const [screenMetadata, setScreenMetadata] = React.useState<any>(null)
  const [loadingScreen, setLoadingScreen] = React.useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_generatedScreenKey, setGeneratedScreenKey] = React.useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_employeeData, setEmployeeData] = React.useState<{
    displayName: string
    firstName?: string
    lastName?: string
    avatarUrl?: string
    jobPosition?: string
    organizationalUnit?: string
  } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isLoadingEmployee, setIsLoadingEmployee] = React.useState(false)
  const { fetchScreenByKey } = useScreenManagementApi(accessToken)
  const graphqlClient = useGraphqlClient(accessToken)

  // Fetch flow step data for CFlow tasks
  const {
    flowOverview,
    currentStep,
    currentStepData,
    isLoading: isLoadingFlowData
  } = useFlowStepData({
    flowId: task?.flowId,
    taskId: task?.id,
    accessToken,
    userId: userId,
    enabled: task?.source === 'cflow' && !!task?.flowId,
    taskStatus: task?.status,
    taskTitle: task?.title || task?.name
  })

  // Create a stable empty task for the hook when task is null
  const emptyTask: UnifiedTask = React.useMemo(
    () => ({
      id: '',
      name: '',
      title: '',
      status: 'SCHEDULED' as const,
      source: 'kogito' as const,
      priority: 0,
      createdAt: new Date().toISOString()
    }),
    []
  )

  // Use Kogito process hook for proper API calls with query parameters
  const { continueProcess } = useKogitoProcess({
    task: task ?? emptyTask,
    accessToken,
    onSuccess: () => {
      // Show success message
      message.success({
        content: '✓ Task completed successfully!',
        duration: 3
      })
      // Close modal and refresh task list
      onClose()
      onTaskUpdated()
      // Notify parent if task was completed
      if (onTaskCompleted && task?.id) {
        onTaskCompleted(task.id)
      }
    },
    onError: (error: Error) => {
      console.error('Error continuing process:', error)
      message.error({
        content: `Failed to complete task: ${error.message || 'Unknown error'}`,
        duration: 5
      })
      // Don't close modal on error
    }
  })

  // Listen for process completion events from native screens
  React.useEffect(() => {
    const handleProcessContinue = async (event: Event) => {
      const customEvent = event as CustomEvent<{ event: string; payload: any }>
      const { payload } = customEvent.detail

      // If this is a Kogito task, use the hook to continue the process
      if (task?.source === 'kogito' && task?.sourceMetadata?.endpoint) {
        try {
          await continueProcess({ payload })
          // Success handling is done in onSuccess callback
        } catch {
          // Error handling is done in onError callback
        }
      } else {
        // For non-Kogito tasks or if no endpoint, just close and refresh
        onClose()
        onTaskUpdated()
        if (onTaskCompleted && task?.id) {
          onTaskCompleted(task.id)
        }
      }
    }

    globalThis.addEventListener('com.newwork.process.continue', handleProcessContinue)

    return () => {
      globalThis.removeEventListener('com.newwork.process.continue', handleProcessContinue)
    }
  }, [task?.id, task?.source, task?.sourceMetadata?.endpoint, continueProcess, onClose, onTaskUpdated, onTaskCompleted])

  // Note: processInfo and taskDetails removed - Screen Management API handles all rendering

  // Check if this is an approveEmployeeVacation task and extract employee info
  // NOTE: Must be called before any conditional returns to satisfy React hooks rules
  const isApproveVacationTask = React.useMemo(() => {
    if (!task) return false
    const processName = task.sourceMetadata?.endpoint
      ? task.sourceMetadata.endpoint.split('/').filter(Boolean)[2]
      : null
    return processName === 'approveEmployeeVacation'
  }, [task?.sourceMetadata?.endpoint, task])

  // Extract task data for employee fetching - needed before conditional return
  const taskInputsForEffect = task?.sourceMetadata?.inputs || task?.inputs
  const employeeAbsenceForEffect = taskInputsForEffect?.employeeAbsence as any
  const employeeIdForEffect = employeeAbsenceForEffect?.employeeId
  const creatorNameForEffect = taskInputsForEffect?.creatorName as string | undefined

  // Task inputs for passing to remote screen loaders
  const taskInputs = task?.sourceMetadata?.inputs || task?.inputs

  // Fetch employee data for approveEmployeeVacation tasks
  // NOTE: Must be called before any conditional returns to satisfy React hooks rules
  React.useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!isApproveVacationTask || !employeeIdForEffect || !accessToken) {
        setEmployeeData(null)
        return
      }

      setIsLoadingEmployee(true)
      try {
        const employeeQuery = `
          query GetEmployee($employeeId: uuid!) {
            Employee(where: {id: {_eq: $employeeId}}, limit: 1) {
              id
              firstName
              lastName
              displayName
              pictureThumbnail
              employeePosition {
                jobPosition {
                  name
                }
                organizationalUnit {
                  name
                }
              }
            }
          }
        `

        const response = await graphqlClient.request<{ Employee: any[] }>(employeeQuery, {
          employeeId: employeeIdForEffect
        })

        if (response.Employee && response.Employee.length > 0) {
          const employee = response.Employee[0]

          // Convert pictureThumbnail to data URL format
          const toDataUrl = (raw: string | null | undefined): string | undefined => {
            if (!raw) return undefined
            if (raw.startsWith('data:')) return raw
            try {
              JSON.parse(raw)
              return undefined // JSON metadata, cannot use directly
            } catch {
              // Not JSON, proceed with base64 conversion
            }
            if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}`
            if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}`
            if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}`
            return `data:image/gif;base64,${raw}` // Default to GIF
          }

          setEmployeeData({
            displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
            firstName: employee.firstName,
            lastName: employee.lastName,
            avatarUrl: toDataUrl(employee.pictureThumbnail),
            jobPosition: employee.employeePosition?.jobPosition?.name,
            organizationalUnit: employee.employeePosition?.organizationalUnit?.name
          })
        } else {
          // Fallback to creatorName if employee not found
          setEmployeeData(creatorNameForEffect ? { displayName: creatorNameForEffect } : null)
        }
      } catch (err) {
        console.error('Error fetching employee data:', err)
        // Fallback to creatorName on error
        setEmployeeData(creatorNameForEffect ? { displayName: creatorNameForEffect } : null)
      } finally {
        setIsLoadingEmployee(false)
      }
    }

    fetchEmployeeData()
  }, [isApproveVacationTask, employeeIdForEffect, accessToken, graphqlClient, creatorNameForEffect])

  // Check if this is a blink (quick-task) - MUST be before early return
  const isBlinkTask = task?.source === 'cflow' && task?.tags?.app === 'quick-task'

  // Generate screen key identical to Cockpit inbox approach - MUST be before early return
  const generateScreenKey = React.useCallback((taskParam: UnifiedTask): string | null => {
    if (taskParam.source !== 'kogito' || !taskParam.sourceMetadata?.endpoint) {
      return null
    }

    const endpoint = taskParam.sourceMetadata.endpoint as string

    // Extract pathname from URL (handle both full URLs and paths)
    let pathname: string
    try {
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        const url = new URL(endpoint)
        pathname = url.pathname
      } else {
        pathname = endpoint
      }
    } catch {
      return null
    }

    // Endpoint format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
    const parts = pathname.split('/').filter(Boolean)

    // parts[0] = 'processes', parts[1] = domain, parts[2] = processName,
    // parts[3] = processInstanceId, parts[4] = taskName, parts[5] = taskId
    if (parts.length < 5 || parts[0] !== 'processes') {
      return null
    }

    const processName = parts[2] // e.g., 'approveEmployeeVacation'
    const taskName = parts[4] // e.g., 'approveEmployeeVacation'

    const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
    const screenKey = `frm_${processName}${capitalizeFirst(taskName)}`

    return screenKey
  }, [])

  // Extract process name and task name from task (for dev overrides) - MUST be before early return
  const extractProcessAndTaskNames = React.useCallback(
    (taskParam: UnifiedTask): { processName?: string; taskName?: string } => {
      if (taskParam.source !== 'kogito' || !taskParam.sourceMetadata?.endpoint) {
        return {}
      }

      const endpoint = taskParam.sourceMetadata.endpoint as string

      try {
        let pathname: string
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
          const url = new URL(endpoint)
          pathname = url.pathname
        } else {
          pathname = endpoint
        }

        const parts = pathname.split('/').filter(Boolean)
        if (parts.length >= 5 && parts[0] === 'processes') {
          return {
            processName: parts[2],
            taskName: parts[4]
          }
        }
      } catch {
        // Ignore errors
      }

      return {}
    },
    []
  )

  // Fetch screen metadata from Screen Management API (or use dev override) - MUST be before early return
  React.useEffect(() => {
    const loadScreenMetadata = async () => {
      if (!task) {
        setLoadingScreen(false)
        return
      }

      // For cFLOW tasks, only try to load screen metadata if task has a specific screen key
      // Otherwise, use universal view
      if (task.source === 'cflow') {
        const screenKey = generateScreenKey(task)
        setGeneratedScreenKey(screenKey)

        if (!screenKey) {
          // No screen key for cFLOW task - use universal view
          setLoadingScreen(false)
          setScreenMetadata(null)
          return
        }

        // Fetch from Screen Management API
        setLoadingScreen(true)
        try {
          const metadata = await fetchScreenByKey(screenKey)
          setScreenMetadata(metadata)
        } catch {
          // If no screen found, use universal view
          setScreenMetadata(null)
        } finally {
          setLoadingScreen(false)
        }
        return
      }

      // For Kogito tasks, use existing logic
      const screenKey = generateScreenKey(task)
      setGeneratedScreenKey(screenKey)

      if (!screenKey) {
        setLoadingScreen(false)
        return
      }

      // Fetch from Screen Management API
      setLoadingScreen(true)
      try {
        const metadata = await fetchScreenByKey(screenKey)
        setScreenMetadata(metadata)
      } catch {
        setScreenMetadata(null)
      } finally {
        setLoadingScreen(false)
      }
    }

    loadScreenMetadata()
  }, [task?.id, task?.source, generateScreenKey, fetchScreenByKey, extractProcessAndTaskNames, task])

  if (!task) return null

  const handleCompleteBlinkTask = async () => {
    if (!task.id || !task.flowId || !userId) {
      alert('Unable to complete task: missing user information.')
      return
    }

    setIsCompleting(true)
    try {
      // Complete the CFlow task with userId
      const flowEngineApi =
        env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
      const response = await fetch(`${flowEngineApi}/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          outcome: 'COMPLETED',
          userId: userId, // Required by the API
          variables: {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to complete task')
      }

      // Show success message
      message.success({
        content: '✓ Blink completed successfully!',
        duration: 3
      })

      // Remove task from list immediately (if callback provided)
      if (onTaskCompleted && task.id) {
        onTaskCompleted(task.id)
      }

      // Refresh the task list in background
      onTaskUpdated()

      // Close the dialog
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task'
      message.error({
        content: `Failed to complete task: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsCompleting(false)
    }
  }

  // Note: handleOpenTask removed - Screen Management API handles all task navigation

  // Helper function to render the appropriate task content based on metadata
  const renderTaskContent = () => {
    // Loading state
    if (loadingScreen) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
          <div className="gba:text-muted-foreground">Loading task details...</div>
        </div>
      )
    }

    // Universal cFLOW view when no screen metadata
    if (task.source === 'cflow' && !screenMetadata) {
      return (
        <UniversalCflowTaskDetails
          task={task}
          accessToken={accessToken}
          userId={userId}
          onClose={onClose}
          onTaskCompleted={onTaskCompleted}
          onTaskUpdated={onTaskUpdated}
          flowStepData={currentStepData}
          isLoadingFlowData={isLoadingFlowData}
        />
      )
    }

    // Native screen loader
    if (screenMetadata?.builderType === 'NATIVE_SCREEN' && screenMetadata.componentPath) {
      return (
        <RemoteScreenLoader
          componentPath={screenMetadata.componentPath}
          version={screenMetadata.version}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={{
            psi_taskPayload: taskInputs,
            psi_processMetadata: task.sourceMetadata,
            psi_taskStatus: task.status,
            psi_availableActions: task.availableActions,
            psi_flowStepData: currentStepData,
            psi_flowOverview: flowOverview,
            psi_currentStep: currentStep
          }}
          onClose={onClose}
          onTaskCompleted={onTaskCompleted}
          onTaskUpdated={onTaskUpdated}
          isLoadingMetadata={false}
        />
      )
    }

    // Lowcoder screen loader
    if (screenMetadata?.builderType === 'LOWCODER' && screenMetadata.appId) {
      return (
        <LowcoderScreenLoader
          appId={screenMetadata.appId}
          appName={screenMetadata.appName || 'Lowcoder Screen'}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={{
            psi_taskPayload: taskInputs,
            psi_processMetadata: task.sourceMetadata,
            psi_taskStatus: task.status,
            psi_availableActions: task.availableActions,
            psi_flowStepData: currentStepData,
            psi_flowOverview: flowOverview,
            psi_currentStep: currentStep
          }}
          onClose={onClose}
          onTaskCompleted={onTaskCompleted}
          onTaskUpdated={onTaskUpdated}
        />
      )
    }

    return null
  }

  return (
    <Card className="gba:h-full gba:flex gba:flex-col gba:shadow-lg nw:pt-6 nw:pb-0" data-testid="task-detail-dialog">
      {/* 
        NOTE: Header is now handled by individual forms/components (e.g., ApproveEmployeeVacationV2.tsx)
        Forms use the reusable TaskDetailHeader component for consistent header display.
        This header section is commented out to avoid duplication - forms render their own headers.
        
        Commented out header code below (keeping for reference):
      */}
      {/*
      <CardHeader className="gba:border-b gba:pb-3 gba:pt-3">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          Employee Info Section (30% width) - Only for approveEmployeeVacation tasks
          {isApproveVacationTask && (employeeData || isLoadingEmployee || creatorName) && (
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-shrink-0" style={{ width: '30%', minWidth: '200px' }}>
              {isLoadingEmployee ? (
                <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted gba:animate-pulse" />
              ) : (
                <Avatar className="gba:h-10 gba:w-10 gba:flex-shrink-0">
                  {employeeData?.avatarUrl && (
                    <AvatarImage 
                      src={employeeData.avatarUrl} 
                      alt={employeeData.displayName || 'Employee avatar'} 
                    />
                  )}
                  <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                    {employeeData?.firstName || employeeData?.lastName
                      ? getInitials(employeeData.firstName, employeeData.lastName)
                      : employeeData?.displayName
                        ? getInitials(
                            employeeData.displayName.split(' ')[0],
                            employeeData.displayName.split(' ').slice(1).join(' ')
                          )
                        : creatorName
                          ? getInitials(
                              creatorName.split(' ')[0],
                              creatorName.split(' ').slice(1).join(' ')
                            )
                          : '?'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="gba:flex-1 gba:min-w-0">
                <p className="gba:font-medium gba:text-sm gba:leading-tight gba:line-clamp-2" style={{ wordBreak: 'break-word' }}>
                  {isLoadingEmployee ? (
                    <span className="gba:inline-block gba:h-4 gba:w-24 gba:bg-muted gba:rounded gba:animate-pulse" />
                  ) : (
                    employeeData?.displayName || creatorName || 'Employee'
                  )}
                </p>
              </div>
            </div>
          )}
          
          Title and Badges Section (70% width or 100% if no employee info)
          <div className={cn("gba:flex-1", isApproveVacationTask && (employeeData || isLoadingEmployee || creatorName) && "gba:ml-4")}>
            <h2 className="gba:text-xl gba:font-bold gba:mb-2 gba:leading-tight gba:line-clamp-2" style={{ wordBreak: 'break-word' }} data-testid="task-detail-title">
              {taskTitle}
            </h2>
            Badges
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              {isBlinkTask && (
                <Badge
                  variant="default"
                  className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600"
                  data-testid="task-detail-blink"
                >
                  <Zap className="gba:h-3 gba:w-3 gba:mr-1" />
                  Blink
                </Badge>
              )}
              <Badge variant={getPriorityBadgeVariant(task.priority)} data-testid="task-detail-priority">
                {formatPriority(task.priority)}
              </Badge>
              <Badge variant={getTaskStatusBadgeVariant(task.status)} data-testid="task-detail-status">
                {formatTaskStatus(task.status)}
              </Badge>
              <Badge variant="outline" data-testid="task-detail-source">
                {task.source === 'kogito' ? 'Kogito' : 'CFlow'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="gba:rounded-full gba:hover:bg-muted gba:flex-shrink-0"
            data-testid="task-detail-close-button"
          >
            <X className="gba:h-5 gba:w-5" />
          </Button>
        </div>
      </CardHeader>
      */}

      {/* Scrollable Content - Route to Screen Management API for native screens */}
      <CardContent
        className={cn(
          'gba:flex-1 gba:min-h-0',
          // Remove padding for native screens and universal cFLOW tasks - they handle their own scrolling and padding
          // Allow overflow so child components can scroll properly
          // Override default nw:px-6 and nw:py-6 from CardContent component
          screenMetadata?.builderType === 'NATIVE_SCREEN' ||
            (task.source === 'cflow' && !screenMetadata && !loadingScreen)
            ? 'nw:px-0 nw:py-0 gba:px-0 gba:py-0 gba:overflow-y-auto gba:flex gba:flex-col'
            : 'gba:pt-4 gba:px-4 gba:overflow-y-auto'
        )}
      >
        {renderTaskContent()}
      </CardContent>

      {/* Action buttons - Fixed at bottom (hidden when native screen is loaded or universal cFLOW view is shown) */}
      {!screenMetadata && task.source !== 'cflow' && (
        <div className="gba:border-t gba:p-4 gba:flex gba:gap-2 gba:justify-end gba:bg-muted/30">
          <Button variant="outline" onClick={onClose} data-testid="task-detail-cancel-button">
            Close
          </Button>

          {/* Primary action for Blink tasks: Complete directly */}
          {isBlinkTask && task.status !== 'COMPLETED' && (
            <Button
              onClick={handleCompleteBlinkTask}
              disabled={isCompleting}
              data-testid="task-detail-complete-button"
              className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:text-white"
            >
              <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
              {isCompleting ? 'Completing...' : 'Complete Task'}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
