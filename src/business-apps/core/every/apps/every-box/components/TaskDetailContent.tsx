/**
 * TaskDetailContent Component
 * Reusable task detail content that can be used in both dialog and panel layouts
 */

import React, { useState } from 'react'
import {
  Button,
  cn,
  toast,
  useTranslation,
  Textarea,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@newwork/nw-design-system'
import { CheckCircle, ChevronDown, Copy, Sparkles } from 'lucide-react'
import { UnifiedTask } from '../types'
import { useScreenManagementApi } from '../hooks/useScreenManagementApi'
import { RemoteScreenLoader } from './RemoteScreenLoader'
import { LowcoderScreenLoader } from './LowcoderScreenLoader'
import { useKogitoProcess } from '../hooks/useKogitoProcess'
import { env } from '@/common/env/EnvUtils'
import { UniversalCflowTaskDetails } from './UniversalCflowTaskDetails'
import { useFlowStepData } from '../hooks/useFlowStepData'
import { TaskAiSection } from './TaskAiSection'
import { AiToolbar } from './AiToolbar'
import { useAiAssistant, useAiCapabilities } from '../hooks/useAi'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import type { ToneOption } from '@/business-apps/core/every/apps/every-api/services/AiService'
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

// AI Draft Assistant for Kogito tasks
const AiDraftAssistant: React.FC<{
  taskId: string
  source: 'cflow' | 'kogito'
  accessToken?: string
}> = ({ taskId, source, accessToken }) => {
  const { t } = useTranslation(translations)
  const [draftText, setDraftText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [aiUsed, setAiUsed] = useState(false)

  // Feature flag check
  const aiFeature = useFeature(Feature.EveryBox.AiEnabled.Key)
  const isAiFeatureEnabled = aiFeature === true || aiFeature === 'true' || aiFeature === undefined
  const { capabilities } = useAiCapabilities(accessToken)
  const isAiAvailable = isAiFeatureEnabled && capabilities?.aiEnabled

  // AI Assistant hook
  const {
    suggestedReply,
    isLoading,
    lastAction,
    getSuggestedReply,
    improve,
    changeTone,
    expand,
    shorten,
    applyCustom,
    clearSuggestion
  } = useAiAssistant(taskId, source, accessToken)

  // Apply suggestions to draft
  React.useEffect(() => {
    if (suggestedReply && lastAction) {
      setDraftText(suggestedReply)
      setAiUsed(true)
      clearSuggestion()
    }
  }, [suggestedReply, lastAction, clearSuggestion])

  const handleCopy = () => {
    if (draftText) {
      navigator.clipboard.writeText(draftText)
      toast.success(t('ai-assistant-copied'))
    }
  }

  if (!isAiAvailable) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gba:w-full gba:justify-between gba:h-9 gba:text-sm gba:font-medium gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted/50"
        >
          <span className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:h-4 gba:w-4 gba:text-sky-600" />
            {t('ai-assistant-draft-helper')}
          </span>
          <ChevronDown className={cn('gba:h-4 gba:w-4 gba:transition-transform', isOpen && 'gba:rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="gba:pt-3 gba:space-y-3">
        <Textarea
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          placeholder={t('ai-assistant-draft-placeholder')}
          className="gba:min-h-[80px] gba:resize-none"
        />

        <AiToolbar
          currentText={draftText}
          isLoading={isLoading}
          onSuggest={() => getSuggestedReply()}
          onImprove={text => improve(text)}
          onTone={(text, tone) => changeTone(text, tone as ToneOption)}
          onExpand={text => expand(text)}
          onShorten={text => shorten(text)}
          onCustom={(instruction, text) => applyCustom(instruction, text)}
          hasText={draftText.trim().length > 0}
        />

        {draftText && (
          <div className="gba:flex gba:items-center gba:justify-between">
            {aiUsed && (
              <span className="gba:text-[11px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                <Sparkles className="gba:h-3 gba:w-3 gba:text-sky-600" />
                {t('ai-assistant-ai-assisted')}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy} className="gba:ml-auto">
              <Copy className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
              {t('ai-assistant-copy')}
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
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
      toast.success(t('task-dialog-completed-success'))
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
            toast.success(t('task-dialog-completed-success'))
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
      toast.error(t('task-dialog-missing-user-info'))
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

      toast.success(t('task-dialog-blink-completed-success'))

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
        <div className="gba:flex gba:flex-col gba:h-full">
          {/* AI Section for tasks with custom screens */}
          <div className="gba:p-4 gba:space-y-3">
            <TaskAiSection
              taskId={task.id}
              source={task.source}
              accessToken={accessToken}
              taskTitle={task.title || task.name}
              taskDescription={task.description}
              contactId={task.sourceMetadata?.creatorUserId as string | undefined}
            />
            {/* AI Draft Assistant for composing responses */}
            <AiDraftAssistant taskId={task.id} source={task.source} accessToken={accessToken} />
          </div>
          <div className="gba:flex-1 gba:min-h-0">
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
          </div>
        </div>
      )
    }

    if (screenMetadata?.builderType === 'LOWCODER' && screenMetadata.appId) {
      return (
        <div className="gba:flex gba:flex-col gba:h-full">
          {/* AI Section for tasks with custom screens */}
          <div className="gba:p-4 gba:space-y-3">
            <TaskAiSection
              taskId={task.id}
              source={task.source}
              accessToken={accessToken}
              taskTitle={task.title || task.name}
              taskDescription={task.description}
              contactId={task.sourceMetadata?.creatorUserId as string | undefined}
            />
            {/* AI Draft Assistant for composing responses */}
            <AiDraftAssistant taskId={task.id} source={task.source} accessToken={accessToken} />
          </div>
          <div className="gba:flex-1 gba:min-h-0">
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
        <div className="gba:p-4 gba:space-y-4">
          <TaskAiSection
            taskId={task.id}
            source={task.source}
            accessToken={accessToken}
            taskTitle={task.title || task.name}
            taskDescription={task.description}
            contactId={task.sourceMetadata?.creatorUserId as string | undefined}
          />
          {/* AI Draft Assistant for composing responses */}
          <AiDraftAssistant taskId={task.id} source={task.source} accessToken={accessToken} />
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
