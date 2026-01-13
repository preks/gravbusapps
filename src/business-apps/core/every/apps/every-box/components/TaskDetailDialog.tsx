/**
 * TaskDetailDialog Component
 * Minimal general task information view - specific task templates will have dedicated views
 */

import React from 'react'
import { Card, CardContent, Button, cn, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle } from 'lucide-react'
import { message } from 'antd'
import { UnifiedTask } from '../types'
import { useScreenManagementApi } from '../hooks/useScreenManagementApi'
import { RemoteScreenLoader } from './RemoteScreenLoader'
import { LowcoderScreenLoader } from './LowcoderScreenLoader'
import { useKogitoProcess } from '../hooks/useKogitoProcess'
import { env } from '@/common/env/EnvUtils'
import { UniversalCflowTaskDetails } from './UniversalCflowTaskDetails'
import { useFlowStepData } from '../hooks/useFlowStepData'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)
  const [isCompleting, setIsCompleting] = React.useState(false)
  const [screenMetadata, setScreenMetadata] = React.useState<any>(null)
  const [loadingScreen, setLoadingScreen] = React.useState(true)
  const { fetchScreenByKey } = useScreenManagementApi(accessToken)

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
        content: t('task-dialog-completed-success'),
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
        content: t('task-dialog-complete-error', { error: error.message || 'Unknown error' }),
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
      } else if (task?.source === 'cflow' && task?.id && userId) {
        // For cFlow tasks, complete via flow-engine API
        try {
          const flowEngineApi =
            env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

          const response = await fetch(`${flowEngineApi}/api/tasks/${task.id}/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              userId: userId,
              formData: payload || {}
            })
          })

          if (response.ok) {
            message.success(t('task-dialog-completed-success'))
            onClose()
            onTaskUpdated()
            if (onTaskCompleted && task.id) {
              onTaskCompleted(task.id)
            }
          } else {
            throw new Error('Failed to complete task')
          }
        } catch (error) {
          console.error('Failed to complete cFlow task:', error)
          message.error(t('task-dialog-action-failed'))
        }
      } else {
        // For other tasks or if no task ID, just close and refresh
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
  }, [
    task?.id,
    task?.source,
    task?.sourceMetadata?.endpoint,
    continueProcess,
    onClose,
    onTaskUpdated,
    onTaskCompleted,
    userId,
    accessToken,
    t
  ])

  // Note: processInfo and taskDetails removed - Screen Management API handles all rendering

  // Task inputs for passing to remote screen loaders
  const taskInputs = task?.sourceMetadata?.inputs || task?.inputs

  // Memoize additionalData to prevent unnecessary re-renders of RemoteScreenLoader
  // This prevents infinite GraphQL query loops in child components
  const nativeScreenAdditionalData = React.useMemo(() => {
    const data = {
      // Task-level data for forms like ScheduledTaskResult
      message: task?.message,
      title: task?.title || task?.name,
      tags: task?.tags,
      scheduledAt: task?.scheduledAt,
      dueDate: task?.dueDate,
      // Workflow metadata
      psi_taskPayload: taskInputs,
      psi_processMetadata: task?.sourceMetadata,
      psi_taskStatus: task?.status,
      psi_availableActions: task?.availableActions,
      psi_flowStepData: currentStepData,
      psi_flowOverview: flowOverview,
      psi_currentStep: currentStep
    }

    return data
  }, [
    task?.message,
    task?.title,
    task?.name,
    task?.tags,
    task?.scheduledAt,
    task?.dueDate,
    taskInputs,
    task?.sourceMetadata,
    task?.status,
    task?.availableActions,
    currentStepData,
    flowOverview,
    currentStep
  ])

  const lowcoderScreenAdditionalData = React.useMemo(
    () => ({
      psi_taskPayload: taskInputs,
      psi_processMetadata: task?.sourceMetadata,
      psi_taskStatus: task?.status,
      psi_availableActions: task?.availableActions,
      psi_flowStepData: currentStepData,
      psi_flowOverview: flowOverview,
      psi_currentStep: currentStep
    }),
    [taskInputs, task?.sourceMetadata, task?.status, task?.availableActions, currentStepData, flowOverview, currentStep]
  )

  // Check if this is a blink (quick-task) - MUST be before early return
  const isBlinkTask = task?.source === 'cflow' && task?.tags?.app === 'quick-task'

  // Map of CFlow task app tags to screen keys
  const CFLOW_APP_SCREEN_KEYS: Record<string, string> = {
    scheduled_task: 'frm_scheduledTaskResult'
    // Add more app tag -> screen key mappings here as needed
  }

  // Generate screen key identical to Cockpit inbox approach - MUST be before early return
  const generateScreenKey = React.useCallback((taskParam: UnifiedTask): string | null => {
    // For CFlow tasks, check if there's a screen key mapping based on tags.app
    if (taskParam.source === 'cflow' && taskParam.tags?.app) {
      const appTag = taskParam.tags.app as string
      const mappedScreenKey = CFLOW_APP_SCREEN_KEYS[appTag]
      if (mappedScreenKey) {
        return mappedScreenKey
      }
    }

    // For Kogito tasks, generate screen key from endpoint
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

  const handleCompleteKogitoTask = async () => {
    if (!task?.sourceMetadata?.endpoint) {
      message.error({
        content: t('task-dialog-complete-error', { error: 'Task endpoint missing' }),
        duration: 5
      })
      return
    }

    setIsCompleting(true)
    try {
      // Some Kogito tasks can be completed without payload (no form screen available).
      await continueProcess({ payload: {} })
    } catch {
      // Errors are handled in the hook's onError callback
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCompleteBlinkTask = async () => {
    if (!task.id || !task.flowId || !userId) {
      message.error(t('task-dialog-missing-user-info'))
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
        content: t('task-dialog-blink-completed-success'),
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      message.error({
        content: t('task-dialog-complete-error', { error: errorMessage }),
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
          <div className="gba:text-muted-foreground">{t('task-dialog-loading')}</div>
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
          additionalData={nativeScreenAdditionalData}
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
          appName={screenMetadata.appName || t('task-dialog-lowcoder-screen')}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={lowcoderScreenAdditionalData}
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
      {/* Scrollable Content - Route to Screen Management API for native screens */}
      <CardContent
        className={cn(
          'gba:flex-1 gba:min-h-0',
          // Remove padding for native screens and universal cFLOW tasks - they handle their own scrolling and padding
          // Native screens using TaskFormLayout handle their own scrolling via the layout's content area
          // Override default nw:px-6 and nw:py-6 from CardContent component
          screenMetadata?.builderType === 'NATIVE_SCREEN' ||
            (task.source === 'cflow' && !screenMetadata && !loadingScreen)
            ? 'nw:px-0 nw:py-0 gba:px-0 gba:py-0 gba:overflow-hidden gba:flex gba:flex-col'
            : 'gba:pt-4 gba:px-4 gba:overflow-y-auto'
        )}
      >
        {renderTaskContent()}
      </CardContent>

      {/* Action buttons - Fixed at bottom (hidden when native screen is loaded or universal cFLOW view is shown) */}
      {!screenMetadata && task.source !== 'cflow' && (
        <div className="gba:border-t gba:p-4 gba:flex gba:gap-2 gba:justify-end gba:bg-muted/30">
          <Button variant="outline" onClick={onClose} data-testid="task-detail-cancel-button">
            {t('task-dialog-close')}
          </Button>

          {/* Primary action for Kogito tasks without a screen: Complete directly */}
          {task.source === 'kogito' &&
            task.status !== 'COMPLETED' &&
            task.availableActions?.canComplete &&
            task.sourceMetadata?.endpoint && (
              <Button
                onClick={handleCompleteKogitoTask}
                disabled={isCompleting}
                data-testid="task-detail-complete-kogito-button"
              >
                {isCompleting ? t('task-dialog-completing') : t('task-footer-complete')}
              </Button>
            )}

          {/* Primary action for Blink tasks: Complete directly */}
          {isBlinkTask && task.status !== 'COMPLETED' && (
            <Button
              onClick={handleCompleteBlinkTask}
              disabled={isCompleting}
              data-testid="task-detail-complete-button"
              className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:text-white"
            >
              <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
              {isCompleting ? t('task-dialog-completing') : t('task-dialog-complete-task')}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
