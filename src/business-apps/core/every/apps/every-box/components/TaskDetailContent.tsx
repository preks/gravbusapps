/**
 * TaskDetailContent Component
 * Reusable task detail content that can be used in both dialog and panel layouts
 */

import React from 'react'
import { Button, cn, toast, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle } from 'lucide-react'
import { UnifiedTask } from '../types'
import { useScreenManagementApi } from '../hooks/useScreenManagementApi'
import { RemoteScreenLoader } from './RemoteScreenLoader'
import { LowcoderScreenLoader } from './LowcoderScreenLoader'
import { useKogitoProcess } from '../hooks/useKogitoProcess'
import { getCflowEndpoint } from '../../every-api/utils/config'
import { storeCommunication } from '../../every-api/services/AiService'
import { UniversalCflowTaskDetails } from './UniversalCflowTaskDetails'
import { useFlowStepData } from '../hooks/useFlowStepData'
import { TaskAiSection } from './TaskAiSection'
import translations from '../_i18n'

const isExpenseTask = (task: UnifiedTask): boolean => {
  const parts: Array<string> = []

  const tagValues =
    task?.tags && typeof task.tags === 'object'
      ? Object.values(task.tags)
          .map(v => (typeof v === 'string' ? v : ''))
          .filter(Boolean)
      : []

  parts.push(
    String(task?.referenceTaskName || ''),
    String(task?.name || ''),
    String(task?.title || ''),
    String(task?.type || ''),
    String(task?.taskCategory || ''),
    String(task?.message || ''),
    ...tagValues
  )

  const haystack = parts.join(' ').toLowerCase()

  // Finance/Expenses-related task screens where the AI summary banner is noisy.
  return (
    haystack.includes('expense') ||
    haystack.includes('advance payment') ||
    haystack.includes('handout payment') ||
    haystack.includes('transfer payment')
  )
}

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
      toast.success(t('task-dialog-completed-success'))

      // Store kogito task completion for AI learning (fire and forget)
      if (task?.id) {
        storeCommunication(
          {
            taskId: task.id,
            source: task.source as 'cflow' | 'kogito',
            messageType: 'completion',
            content: `Task completed: ${task.title || task.name || task.id}`,
            recipientId: task.sourceMetadata?.creatorUserId as string | undefined,
            aiAssisted: false
          },
          accessToken
        ).catch(() => {
          // Silent failure - don't interrupt user flow
        })
      }

      // Call onTaskCompleted first for instant UI feedback (removes from local state)
      // Don't call onTaskUpdated - it triggers a slow full refetch that's not needed
      // handleTaskCompleted already calls onCompletedRefresh for background sync
      if (onTaskCompleted && task?.id) {
        onTaskCompleted(task.id)
      }
      onClose()
    },
    onError: (error: Error) => {
      console.error('Error continuing process:', error)
      toast.error(t('task-dialog-complete-error', { error: error.message || 'Unknown error' }))
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
          const base = getCflowEndpoint()
          const response = await fetch(`${base}/api/tasks/${task.id}/complete`, {
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
            toast.success(t('task-dialog-completed-success'))

            // Store cflow task completion via screen event for AI learning (fire and forget)
            storeCommunication(
              {
                taskId: task.id,
                source: 'cflow',
                messageType: 'completion',
                content: `Task completed: ${task.title || task.name || task.id}`,
                recipientId: task.sourceMetadata?.creatorUserId as string | undefined,
                aiAssisted: false
              },
              accessToken
            ).catch(() => {
              // Silent failure
            })

            // Call onTaskCompleted first for instant UI feedback
            if (onTaskCompleted && task.id) {
              onTaskCompleted(task.id)
            }
            onClose()
          } else {
            throw new Error('Failed to complete task')
          }
        } catch (error) {
          console.error('Failed to complete cFlow task:', error)
          toast.error(t('task-dialog-action-failed'))
        }
      } else {
        // Store task completion for AI learning (fire and forget)
        if (task?.id) {
          storeCommunication(
            {
              taskId: task.id,
              source: task.source as 'cflow' | 'kogito',
              messageType: 'completion',
              content: `Task completed: ${task.title || task.name || task.id}`,
              recipientId: task.sourceMetadata?.creatorUserId as string | undefined,
              aiAssisted: false
            },
            accessToken
          ).catch(() => {
            // Silent failure
          })
        }

        // Call onTaskCompleted first for instant UI feedback
        if (onTaskCompleted && task?.id) {
          onTaskCompleted(task.id)
        }
        onClose()
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
  const shouldShowAiSection = !isExpenseTask(task)

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
      psi_currentStep: currentStep,
      // AI context for screens
      psi_aiEnabled: true,
      psi_taskId: task?.id,
      psi_taskSource: task?.source
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
    currentStep,
    task?.id,
    task?.source
  ])

  const lowcoderScreenAdditionalData = React.useMemo(
    () => ({
      psi_taskPayload: taskInputs,
      psi_processMetadata: task?.sourceMetadata,
      psi_taskStatus: task?.status,
      psi_availableActions: task?.availableActions,
      psi_flowStepData: currentStepData,
      psi_flowOverview: flowOverview,
      psi_currentStep: currentStep,
      // AI context for screens
      psi_aiEnabled: true,
      psi_taskId: task?.id,
      psi_taskSource: task?.source
    }),
    [
      taskInputs,
      task?.sourceMetadata,
      task?.status,
      task?.availableActions,
      currentStepData,
      flowOverview,
      currentStep,
      task?.id,
      task?.source
    ]
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

    console.log(
      `[TaskDetailContent] Generated screenKey: "${screenKey}" (processName="${processName}", taskName="${taskName}", endpoint="${endpoint}")`
    )

    return screenKey
  }, [])

  // Stable identity for screen registry: avoids refetching metadata when the same task is replaced
  // by a new object reference (e.g. mark-as-read updating userState in the list).
  const screenRegistryKey = React.useMemo(
    () => (task.source === 'cflow' || task.source === 'kogito' ? generateScreenKey(task) : null),
    [task.id, task.source, task.tags?.app, task.sourceMetadata?.endpoint, generateScreenKey]
  )

  const [registryFetchSettled, setRegistryFetchSettled] = React.useState(false)
  const registryFetchGenRef = React.useRef(0)
  const fetchScreenByKeyRef = React.useRef(fetchScreenByKey)
  fetchScreenByKeyRef.current = fetchScreenByKey

  React.useLayoutEffect(() => {
    setScreenMetadata(null)
  }, [task.id, task.source, screenRegistryKey])

  React.useEffect(() => {
    if (!screenRegistryKey) {
      setRegistryFetchSettled(true)
      return
    }

    const gen = ++registryFetchGenRef.current
    setRegistryFetchSettled(false)

    let cancelled = false

    ;(async () => {
      try {
        const metadata = await fetchScreenByKeyRef.current(screenRegistryKey)
        if (cancelled || gen !== registryFetchGenRef.current) {
          return
        }
        setScreenMetadata(metadata)
      } catch {
        if (!cancelled && gen === registryFetchGenRef.current) {
          setScreenMetadata(null)
        }
      } finally {
        // Do not gate on `cancelled`: Strict Mode / fast remount cancels the effect while the
        // in-flight request still completes with cancelled=true, which previously left the UI
        // stuck on "loading". Only the latest generation may unblock the panel.
        if (gen === registryFetchGenRef.current) {
          setRegistryFetchSettled(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screenRegistryKey, task.id, task.source])

  const handleCompleteBlinkTask = async () => {
    if (!task?.id || !userId) {
      toast.error(t('task-dialog-missing-user-info'))
      return
    }

    setIsCompleting(true)

    try {
      const base = getCflowEndpoint()
      const response = await fetch(`${base}/api/tasks/${task.id}/complete`, {
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

      toast.success(t('task-dialog-blink-completed-success'))

      // Store task completion for AI learning (fire and forget)
      storeCommunication(
        {
          taskId: task.id,
          source: task.source as 'cflow' | 'kogito',
          messageType: 'completion',
          content: `Task completed: ${task.title || task.name || task.id}`,
          recipientId: task.sourceMetadata?.creatorUserId as string | undefined,
          aiAssisted: false
        },
        accessToken
      ).catch(() => {
        // Silent failure - don't interrupt user flow
      })

      // Call onTaskCompleted first for instant UI feedback (removes from local state)
      // Don't call onTaskUpdated - it triggers a slow full refetch that's not needed
      if (onTaskCompleted && task.id) {
        onTaskCompleted(task.id)
      }

      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(t('task-dialog-complete-error', { error: errorMessage }))
    } finally {
      setIsCompleting(false)
    }
  }

  const renderTaskContent = () => {
    if (screenRegistryKey && !registryFetchSettled) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
          <div className="gba:text-muted-foreground">{t('task-dialog-loading')}</div>
        </div>
      )
    }

    if (task.source === 'cflow' && (!screenRegistryKey || !screenMetadata)) {
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
        <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden gba:relative">
          {/* Screen content - AI summary will be injected below header */}
          <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
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
              belowHeaderSlot={
                shouldShowAiSection ? (
                  <TaskAiSection
                    taskId={task.id}
                    source={task.source}
                    accessToken={accessToken}
                    taskTitle={task.title || task.name}
                    taskDescription={task.description}
                    contactId={task.sourceMetadata?.creatorUserId as string | undefined}
                  />
                ) : null
              }
            />
          </div>
        </div>
      )
    }

    if (screenMetadata?.builderType === 'LOWCODER' && screenMetadata.appId) {
      return (
        <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden gba:relative">
          {/* AI Summary (cannot be injected into iframe) */}
          {shouldShowAiSection && (
            <div className="gba:px-6 gba:pt-4">
              <TaskAiSection
                taskId={task.id}
                source={task.source}
                accessToken={accessToken}
                taskTitle={task.title || task.name}
                taskDescription={task.description}
                contactId={task.sourceMetadata?.creatorUserId as string | undefined}
              />
            </div>
          )}

          {/* Screen content */}
          <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
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
          </div>
        </div>
      )
    }

    // Fallback for kogito tasks without custom screens
    if (task.source === 'kogito') {
      return (
        <div className="gba:px-6 gba:py-4 gba:space-y-6">
          {/* AI Summary at top */}
          {shouldShowAiSection && (
            <TaskAiSection
              taskId={task.id}
              source={task.source}
              accessToken={accessToken}
              taskTitle={task.title || task.name}
              taskDescription={task.description}
              contactId={task.sourceMetadata?.creatorUserId as string | undefined}
            />
          )}

          {/* Placeholder for tasks without screens */}
          <div className="gba:text-muted-foreground gba:text-center gba:py-4">
            {t('task-dialog-no-screen-available')}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className={cn('gba:flex-1 gba:flex gba:flex-col gba:min-h-0', className)} data-testid="task-detail-content">
      <div
        className={cn(
          'gba:flex-1 gba:min-h-0',
          screenMetadata?.builderType === 'NATIVE_SCREEN'
            ? 'gba:overflow-hidden gba:flex gba:flex-col'
            : task.source === 'cflow' && !screenMetadata && (registryFetchSettled || !screenRegistryKey)
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
