/**
 * TaskDetailContent Component
 * Reusable task detail content that can be used in both dialog and panel layouts
 */

import React from 'react'
import { Button, cn, useTranslation } from '@newwork/nw-design-system'
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

interface TaskDetailContentProps {
  task: UnifiedTask
  onClose: () => void
  onTaskUpdated: () => void
  onTaskCompleted?: (taskId: string) => void
  accessToken: string
  userId?: string
  userInfo?: any
  /** Whether to show action buttons at the bottom */
  showActions?: boolean
  /** Additional className for the container */
  className?: string
}

export const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskCompleted,
  accessToken,
  userId,
  userInfo,
  showActions = true,
  className
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
      message.success({
        content: t('task-dialog-completed-success'),
        duration: 3
      })
      onClose()
      onTaskUpdated()
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
    }
  })

  // Listen for process completion events from native screens
  React.useEffect(() => {
    const handleProcessContinue = async (event: Event) => {
      const customEvent = event as CustomEvent<{ event: string; payload: any }>
      const { payload } = customEvent.detail

      if (task?.source === 'kogito' && task?.sourceMetadata?.endpoint) {
        try {
          await continueProcess({ payload })
        } catch {
          // Error handling is done in onError callback
        }
      } else if (task?.source === 'cflow' && task?.id && userId) {
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

  const taskInputs = task?.sourceMetadata?.inputs || task?.inputs

  const nativeScreenAdditionalData = React.useMemo(() => {
    const data = {
      message: task?.message,
      title: task?.title || task?.name,
      tags: task?.tags,
      scheduledAt: task?.scheduledAt,
      dueDate: task?.dueDate,
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

  const isBlinkTask = task?.source === 'cflow' && task?.tags?.app === 'quick-task'

  const CFLOW_APP_SCREEN_KEYS: Record<string, string> = {
    scheduled_task: 'frm_scheduledTaskResult'
  }

  const generateScreenKey = React.useCallback((taskParam: UnifiedTask): string | null => {
    if (taskParam.source === 'cflow' && taskParam.tags?.app) {
      const appTag = taskParam.tags.app as string
      const mappedScreenKey = CFLOW_APP_SCREEN_KEYS[appTag]
      if (mappedScreenKey) {
        return mappedScreenKey
      }
    }

    if (taskParam.source !== 'kogito' || !taskParam.sourceMetadata?.endpoint) {
      return null
    }

    const endpoint = taskParam.sourceMetadata.endpoint as string

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

    const parts = pathname.split('/').filter(Boolean)

    if (parts.length < 5 || parts[0] !== 'processes') {
      return null
    }

    const processName = parts[2]
    const taskName = parts[4]

    const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
    const screenKey = `frm_${processName}${capitalizeFirst(taskName)}`

    return screenKey
  }, [])

  React.useEffect(() => {
    const loadScreenMetadata = async () => {
      if (!task) {
        setLoadingScreen(false)
        return
      }

      if (task.source === 'cflow') {
        const screenKey = generateScreenKey(task)

        if (!screenKey) {
          setLoadingScreen(false)
          setScreenMetadata(null)
          return
        }

        setLoadingScreen(true)
        try {
          const metadata = await fetchScreenByKey(screenKey)
          setScreenMetadata(metadata)
        } catch {
          setScreenMetadata(null)
        } finally {
          setLoadingScreen(false)
        }
        return
      }

      if (task.source === 'kogito') {
        const screenKey = generateScreenKey(task)

        if (!screenKey) {
          setLoadingScreen(false)
          setScreenMetadata(null)
          return
        }

        setLoadingScreen(true)
        try {
          const metadata = await fetchScreenByKey(screenKey)
          setScreenMetadata(metadata)
        } catch {
          setScreenMetadata(null)
        } finally {
          setLoadingScreen(false)
        }
        return
      }

      setLoadingScreen(false)
      setScreenMetadata(null)
    }

    loadScreenMetadata()
  }, [task, fetchScreenByKey, generateScreenKey])

  const handleCompleteBlinkTask = async () => {
    if (!task?.id || !userId) {
      message.error(t('task-dialog-missing-user-info'))
      return
    }

    setIsCompleting(true)

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
          outcome: 'COMPLETED',
          userId: userId,
          variables: {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to complete task')
      }

      message.success({
        content: t('task-dialog-blink-completed-success'),
        duration: 3
      })

      if (onTaskCompleted && task.id) {
        onTaskCompleted(task.id)
      }

      onTaskUpdated()
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

  const renderTaskContent = () => {
    if (loadingScreen) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
          <div className="gba:text-muted-foreground">{t('task-dialog-loading')}</div>
        </div>
      )
    }

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
    <div className={cn('gba:h-full gba:flex gba:flex-col', className)} data-testid="task-detail-content">
      <div
        className={cn(
          'gba:flex-1 gba:min-h-0',
          screenMetadata?.builderType === 'NATIVE_SCREEN'
            ? 'gba:overflow-y-auto'
            : task.source === 'cflow' && !screenMetadata && !loadingScreen
              ? 'gba:overflow-hidden gba:flex gba:flex-col'
              : 'gba:overflow-y-auto'
        )}
      >
        {renderTaskContent()}
      </div>

      {showActions && !screenMetadata && task.source !== 'cflow' && (
        <div className="gba:border-t gba:p-4 gba:flex gba:gap-2 gba:justify-end gba:bg-muted/30">
          <Button variant="outline" onClick={onClose} data-testid="task-detail-cancel-button">
            {t('task-dialog-close')}
          </Button>

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
    </div>
  )
}
