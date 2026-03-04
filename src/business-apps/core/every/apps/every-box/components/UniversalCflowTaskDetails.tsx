import React, { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Label,
  Switch,
  Textarea,
  Alert,
  AlertDescription,
  AlertTitle,
  useTranslation,
  useLocale,
  toast
} from '@newwork/nw-design-system'
import {
  Clock,
  MessageSquare,
  Info,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import isToday from 'dayjs/plugin/isToday'
import isYesterday from 'dayjs/plugin/isYesterday'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/it'
import { UnifiedTask } from '../types'
import { getCflowEndpoint } from '../../every-api/utils/config'
import { TaskDetailHeader } from './TaskDetailHeader'
import { TaskDetailFooter } from './TaskDetailFooter'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { InputRenderer } from '@/business-apps/flow/apps/creator/components/shared/InputRenderer'
import { navigateTo } from '@/common/utils/navigationUtils'
import { MarkdownRenderer } from '@/business-apps/ai/forms/scheduled-task-result/components/MarkdownRenderer'
import { calculateDueDateCriticality, getCriticalityBadgeVariant } from '../utils/dueDateUtils'
import { TaskAiSection } from './TaskAiSection'
import { AiToolbar } from './AiToolbar'
import { useAiAssistant, useAiCapabilities } from '../hooks/useAi'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import translations from '../_i18n'

dayjs.extend(localizedFormat)
dayjs.extend(isToday)
dayjs.extend(isYesterday)
import GlossaryEntryTaskForm from '@/business-apps/core/content/forms/glossary-entry-task-form'

/**
 * Converts a picture thumbnail to a data URL format
 */
const formatAvatarUrl = (pictureThumbnail: string | undefined): string | undefined => {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:')) return pictureThumbnail
  return `data:image/jpeg;base64,${pictureThumbnail}`
}

/**
 * Gets the display value for a form field during loading or with data
 */
const getFieldDisplayValue = (isLoadingData: boolean, fieldValue: any, inputValue: any, defaultValue: any): any => {
  if (isLoadingData) return ''
  if (fieldValue !== undefined) return fieldValue
  if (inputValue !== undefined) return inputValue
  return defaultValue || ''
}

interface UniversalCflowTaskDetailsProps {
  task: UnifiedTask
  accessToken: string
  userId?: string
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
  flowStepData?: any // Additional data from flow-engine API /flows/{flowId}/steps/{stepNo}/data
  isLoadingFlowData?: boolean
}

export const UniversalCflowTaskDetails: React.FC<UniversalCflowTaskDetailsProps> = ({
  task,
  accessToken,
  userId,
  onClose,
  onTaskCompleted,
  onTaskUpdated,
  flowStepData,
  isLoadingFlowData = false
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [isCompleting, setIsCompleting] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [formInitialized, setFormInitialized] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [aiUsedForComment, setAiUsedForComment] = useState(false)

  // AI feature check
  const aiFeature = useFeature(Feature.EveryBox.AiEnabled.Key)
  const isAiFeatureEnabled = aiFeature === true || aiFeature === 'true' || aiFeature === undefined
  const { capabilities } = useAiCapabilities(accessToken)
  const isAiAvailable = isAiFeatureEnabled && capabilities?.aiEnabled

  // AI Assistant hook for comment editing
  const {
    suggestedReply,
    isLoading: isAiLoading,
    error: aiError,
    lastAction,
    getSuggestedReply,
    improve,
    changeTone,
    expand,
    shorten,
    applyCustom,
    saveCommunication,
    clearSuggestion
  } = useAiAssistant(task.id, task.source, accessToken)

  // Handle AI suggestion applied to comment
  const handleAiResultApplied = useCallback(
    (result: string) => {
      setComment(result)
      setAiUsedForComment(true)
      clearSuggestion()
    },
    [clearSuggestion]
  )

  // AI toolbar handlers
  const handleAiSuggest = useCallback(async () => {
    const result = await getSuggestedReply(task.sourceMetadata?.creatorUserId)
    if (result) {
      handleAiResultApplied(result)
      toast.success(t('ai-assistant-applied'))
    }
  }, [getSuggestedReply, task.sourceMetadata?.creatorUserId, handleAiResultApplied, t])

  const handleAiImprove = useCallback(
    async (text: string) => {
      const result = await improve(text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [improve, handleAiResultApplied, t]
  )

  const handleAiTone = useCallback(
    async (text: string, tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'concise') => {
      const result = await changeTone(text, tone)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [changeTone, handleAiResultApplied, t]
  )

  const handleAiExpand = useCallback(
    async (text: string) => {
      const result = await expand(text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [expand, handleAiResultApplied, t]
  )

  const handleAiShorten = useCallback(
    async (text: string) => {
      const result = await shorten(text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [shorten, handleAiResultApplied, t]
  )

  const handleAiCustom = useCallback(
    async (instruction: string, text?: string) => {
      const result = await applyCustom(instruction, text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [applyCustom, handleAiResultApplied, t]
  )

  // Format date with Today/Yesterday support
  const formatDateTime = (date: string | Date): string => {
    const d = dayjs(date)
    const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
    const time = d.locale(baseLocale).format('LT')

    if (d.isToday()) {
      return `${t('formatter-today')}, ${time}`
    }
    if (d.isYesterday()) {
      return `${t('formatter-yesterday')}, ${time}`
    }

    return d.locale(baseLocale).format('L LT')
  }

  // Derive isCompleted FIRST before using it
  const isCompleted = task.status === 'COMPLETED'

  // Determine task type (approval, acknowledge, or regular)
  const isApprovalTask = task.availableActions?.canReject === true
  const isAcknowledgeTask = task.name?.toLowerCase().includes('acknowledge')

  // Get completion details title based on task type
  const getCompletionDetailsTitle = () => {
    if (isApprovalTask) {
      return t('task-approval-details-title')
    }
    if (isAcknowledgeTask) {
      return t('task-acknowledge-details-title')
    }
    return t('task-completion-details-title')
  }

  // Reset state when task changes - clear everything immediately to prevent stale data
  React.useEffect(() => {
    if (task.id !== currentTaskId) {
      // Reset all form-related state when switching to a new task
      setFormValues({})
      setFormInitialized(false)
      setShowComment(false)
      setComment('')
      setFieldErrors({})
      setCurrentTaskId(task.id)
    }
  }, [task.id, currentTaskId])

  // Check if form fields have values directly (cFlow sends values in form definition)
  const formHasDirectValues = React.useMemo(() => {
    if (!task.form || !Array.isArray(task.form)) return false
    return task.form.some((field: any) => field.value !== undefined)
  }, [task.form])

  // Helper: Get field initial value based on priority
  const getFieldInitialValue = React.useCallback(
    (field: any, fieldName: string): any => {
      // Priority 1: Use flowStepData if available (for completed tasks)
      if (isCompleted && flowStepData?.[fieldName] !== undefined) {
        return flowStepData[fieldName]
      }
      // Priority 2: Use task.inputs if available
      if (
        task.inputs &&
        typeof fieldName === 'string' &&
        Object.prototype.hasOwnProperty.call(task.inputs, fieldName)
      ) {
        return (task.inputs as Record<string, any>)[fieldName]
      }
      // Priority 3: Use field.value if available
      if (field.value !== undefined) {
        return field.value
      }
      // Priority 4: Use field default value
      if (field.defaultValue !== undefined) {
        return field.defaultValue
      }
      return undefined
    },
    [isCompleted, flowStepData, task.inputs]
  )

  // Helper: Check if we should wait for data before initializing
  const shouldWaitForData = React.useCallback((): boolean => {
    if (task.id !== currentTaskId) return true
    if (isCompleted && !formHasDirectValues) {
      return isLoadingFlowData || flowStepData === null
    }
    return false
  }, [task.id, currentTaskId, isCompleted, formHasDirectValues, isLoadingFlowData, flowStepData])

  // Initialize formValues from task.inputs, field.value, or flowStepData (for completed tasks)
  React.useEffect(() => {
    if (shouldWaitForData()) return
    if (formInitialized || !task.form || !Array.isArray(task.form)) return

    const initialValues: Record<string, any> = {}
    task.form.forEach((field: any) => {
      const fieldName = field.name || field.id
      const value = getFieldInitialValue(field, fieldName)
      if (value !== undefined) {
        initialValues[fieldName] = value
      }
    })

    setFormValues(initialValues)
    setFormInitialized(true)
  }, [
    task.id,
    task.form,
    task.inputs,
    flowStepData,
    isCompleted,
    currentTaskId,
    formInitialized,
    isLoadingFlowData,
    formHasDirectValues,
    shouldWaitForData,
    getFieldInitialValue
  ])

  const isBlinkTask = task.source === 'cflow' && task.tags?.app === 'quick-task'
  const taskAppTag =
    task.tags?.app ||
    task.sourceMetadata?.tags?.app ||
    task.workflowMeta?.tags?.app ||
    (task.sourceMetadata as any)?.app
  const isMarkdownMessageTask = taskAppTag === 'scheduled_task' || taskAppTag === 'spreadsheet-automation'
  // Check both task.tags and sourceMetadata.tags for glossary request detection
  const isGlossaryRequestTask =
    task.source === 'cflow' &&
    (task.tags?.app === 'glossary-entry-request' || task.sourceMetadata?.tags?.app === 'glossary-entry-request')

  // Debug logging gated behind dev mode only
  if (
    process.env.NODE_ENV === 'development' &&
    task.source === 'cflow' &&
    task.title?.includes('Glossary Term Request')
  ) {
    console.log('[Glossary Request Detection]', { title: task.title, isGlossaryRequestTask })
  }

  const taskTitle = task.title || task.name || task.referenceTaskName || t('task-details-untitled')

  // Fetch employee data for creator if userId is available
  const creatorUserId = task.sourceMetadata?.creatorUserId
  const { employeeData: creatorEmployeeData, isLoading: isLoadingCreator } = useEmployeeAvatar(
    accessToken,
    creatorUserId
  )

  // Use employee data for creator name if available, otherwise fallback to sourceMetadata
  const creatorName = React.useMemo(() => {
    if (creatorEmployeeData?.displayName) return creatorEmployeeData.displayName
    if (creatorEmployeeData?.firstName && creatorEmployeeData?.lastName) {
      return `${creatorEmployeeData.firstName} ${creatorEmployeeData.lastName}`
    }
    return task.sourceMetadata?.creatorName || task.sourceMetadata?.flowInitiatedByName || t('task-details-unknown')
  }, [creatorEmployeeData, task.sourceMetadata, t])

  // Helper: Process number type field value
  // For required fields with invalid input, preserve the raw value so validation can catch it.
  // For optional fields, return undefined to allow empty submission.
  const processNumberValue = (field: any, value: any): any => {
    if (value === '' || value === null) {
      return field.required ? null : undefined
    }
    const numValue = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    if (!Number.isNaN(numValue)) {
      return numValue
    }
    // Preserve invalid input for required fields so validation can detect and reject it
    return field.required ? value : undefined
  }

  // Helper: Check if field is number type
  const isNumberType = (field: any): boolean => {
    return field.type === 'NUMBER' || field.type === 'number'
  }

  // Helper: Get default value if required
  const getDefaultValue = (field: any): any => {
    return field.defaultValue
  }

  // Helper: Process form field value based on type
  const processFieldValue = (field: any, value: any): any => {
    // Return early if no value provided
    if (value === undefined || value === null) {
      return getDefaultValue(field)
    }

    // Process number fields
    if (isNumberType(field)) {
      return processNumberValue(field, value)
    }

    // All other types (including file) return value as-is
    return value
  }

  // Helper: Validate form data before submission
  const validateFormData = (): { isValid: boolean; errors: string[]; fieldErrors: Record<string, string> } => {
    const errors: string[] = []
    const fieldErrorsMap: Record<string, string> = {}

    if (task.form && Array.isArray(task.form)) {
      task.form.forEach((field: any) => {
        const fieldName = field.name || field.id
        const fieldLabel = field.label || fieldName
        const value = formValues[fieldName]

        // Check required fields
        if (field.required) {
          if (value === null || value === undefined || value === '') {
            const errorMsg = t('validation-field-required', { field: fieldLabel })
            errors.push(errorMsg)
            fieldErrorsMap[fieldName] = errorMsg
            return
          }

          // For number fields, check if the value is a valid number
          if (isNumberType(field)) {
            const numValue = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
            if (Number.isNaN(numValue)) {
              const errorMsg = t('validation-field-number-invalid', { field: fieldLabel })
              errors.push(errorMsg)
              fieldErrorsMap[fieldName] = errorMsg
            }
          }
        }
      })
    }

    return { isValid: errors.length === 0, errors, fieldErrors: fieldErrorsMap }
  }

  // Helper: Process all form data
  const processFormData = (): Record<string, any> => {
    const processedFormData: Record<string, any> = {}

    if (task.form && Array.isArray(task.form)) {
      task.form.forEach((field: any) => {
        const fieldName = field.name || field.id
        const processedValue = processFieldValue(field, formValues[fieldName])
        if (processedValue !== undefined) {
          processedFormData[fieldName] = processedValue
        }
      })
    } else {
      Object.assign(processedFormData, formValues)
    }

    return processedFormData
  }

  // Helper: Complete task action
  const handleCompleteTask = async () => {
    // Validate form data before submission
    const validation = validateFormData()
    if (!validation.isValid) {
      // Set field errors to show visual feedback
      setFieldErrors(validation.fieldErrors)

      // Show error message with list of missing fields
      const errorMessage = validation.errors.join('\n')
      toast.error(errorMessage)
      return
    }

    // Clear any previous field errors
    setFieldErrors({})

    const processedFormData = processFormData()
    const completeRequestBody = {
      userId: userId,
      formData: processedFormData,
      ...(showComment && comment?.trim() ? { comment: comment.trim() } : {})
    }

    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(completeRequestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to complete task')
    }

    toast.success(t('task-dialog-completed-success'))

    // Always store task completion for AI learning (fire and forget)
    // Records even without a comment so insights track all task activity
    saveCommunication({
      messageType: 'completion',
      content: showComment && comment?.trim() ? comment.trim() : `Task completed: ${task.title || task.id}`,
      recipientId: task.sourceMetadata?.creatorUserId,
      aiAssisted: aiUsedForComment,
      aiAction: aiUsedForComment ? lastAction || undefined : undefined
    })

    // Call onTaskCompleted for instant UI feedback (removes from local state)
    // Don't call onTaskUpdated - it triggers a slow full refetch that's not needed
    if (onTaskCompleted && task.id) {
      onTaskCompleted(task.id)
    }
    onClose()
  }

  // Helper: Reject task action
  const handleRejectTask = async (data?: any) => {
    const rejectRequestBody = {
      userId: userId,
      rejectionComment: comment || data?.comment || '',
      comment: comment || data?.comment || ''
    }

    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(rejectRequestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to reject task')
    }

    toast.success(t('task-details-task-rejected'))

    // Always store task rejection for AI learning (fire and forget)
    // Records even without a comment so insights track all task activity
    const rejectionContent = comment || data?.comment || ''
    saveCommunication({
      messageType: 'rejection',
      content: rejectionContent.trim() || `Task rejected: ${task.title || task.id}`,
      recipientId: task.sourceMetadata?.creatorUserId,
      aiAssisted: aiUsedForComment,
      aiAction: aiUsedForComment ? lastAction || undefined : undefined
    })

    // Call onTaskCompleted for instant UI feedback (removes from local state)
    // Don't call onTaskUpdated - it triggers a slow full refetch that's not needed
    if (onTaskCompleted && task.id) {
      onTaskCompleted(task.id)
    }
    onClose()
  }

  // Helper: Claim task action
  const handleClaimTask = async () => {
    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to claim task')
    }

    toast.success(t('task-details-task-claimed'))

    onTaskUpdated()
    onClose()
  }

  // Helper: Unclaim task action
  const handleUnclaimTask = async () => {
    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/unclaim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to unclaim task')
    }

    toast.success(t('task-details-task-unclaimed'))

    onTaskUpdated()
    onClose()
  }

  // Unified handler for all task actions
  const handleTaskAction = async (action: string, data?: any) => {
    if (!task.id || !userId) {
      toast.error(t('task-details-action-error'))
      return
    }

    setIsCompleting(true)
    try {
      const actionHandlers: Record<string, () => Promise<void>> = {
        claim: handleClaimTask,
        complete: handleCompleteTask,
        reject: () => handleRejectTask(data),
        reassign: async () => {
          toast.info(t('task-details-reassign-coming'))
        },
        unclaim: handleUnclaimTask
      }
      const handler = actionHandlers[action]
      if (!handler) {
        toast.warning(t('task-details-unknown-action', { action }))
      } else {
        await handler()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('task-details-action-failed', { action })
      toast.error(errorMessage)
    } finally {
      setIsCompleting(false)
    }
  }

  // Extract links from task (direct property for all tasks)
  const allLinks = (task.links as Array<{ name: string; url: string; type?: string; metadata?: any }>) || []

  // Separate entity reference link from document links
  const entityLink = allLinks.find(link => link.type?.startsWith('entity:'))
  const documentLinks = allLinks.filter(link => link.type?.startsWith('document:'))
  // All other links (internal:*, external:*, or any other type) - generic fallback
  const otherLinks = allLinks.filter(link => !link.type?.startsWith('entity:') && !link.type?.startsWith('document:'))

  // Extract entity reference data from the entity link
  const entityType = entityLink?.metadata?.entityType || entityLink?.type?.split(':')[1]
  const entityId = entityLink?.metadata?.entityId
  const entityName = entityLink?.name
  const entityDisplayUrl = entityLink?.url

  // For Glossary Request tasks, load the static task form
  // Also check workflowMeta and other possible locations for tags
  const hasGlossaryTag =
    task.tags?.app === 'glossary-entry-request' ||
    task.sourceMetadata?.tags?.app === 'glossary-entry-request' ||
    task.workflowMeta?.tags?.app === 'glossary-entry-request' ||
    (task.sourceMetadata as any)?.app === 'glossary-entry-request'

  if (isGlossaryRequestTask || (task.source === 'cflow' && hasGlossaryTag)) {
    // Extract term and contextDescription from task tags, sourceMetadata tags, workflowMeta, or initial parameters
    const allTags = {
      ...task.tags,
      ...task.sourceMetadata?.tags,
      ...task.workflowMeta?.tags,
      ...((task.sourceMetadata as any)?.tags || {})
    }
    const term =
      allTags?.term || task.sourceMetadata?.initialParameters?.term || (task.sourceMetadata as any)?.term || ''
    const contextDescription =
      allTags?.context || task.sourceMetadata?.initialParameters?.context || (task.sourceMetadata as any)?.context || ''

    // Get userInfo from task if available
    const userInfo = userId
      ? {
          id: userId,
          userName: task.sourceMetadata?.flowInitiatedByName || '',
          givenName: task.sourceMetadata?.flowInitiatedByName?.split(' ')[0] || '',
          familyName: task.sourceMetadata?.flowInitiatedByName?.split(' ').slice(1).join(' ') || ''
        }
      : undefined

    return (
      <GlossaryEntryTaskForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={{
          psi_taskPayload: {
            term,
            context: contextDescription,
            requesterUserId: task.sourceMetadata?.flowInitiatedBy
          },
          psi_processMetadata: task.sourceMetadata,
          psi_taskStatus: task.status,
          psi_availableActions: task.availableActions,
          psi_taskId: task.id,
          taskId: task.id
        }}
      />
    )
  }

  // For Blink tasks, use the simple view from every-box
  if (isBlinkTask) {
    return (
      <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0" data-testid="universal-cflow-task-details">
        {/* Task Header */}
        <TaskDetailHeader
          title={taskTitle}
          creatorName={creatorName}
          showEmployeeInfo={!!creatorUserId}
          employeeData={
            creatorEmployeeData
              ? {
                  displayName: creatorEmployeeData.displayName,
                  firstName: creatorEmployeeData.firstName,
                  lastName: creatorEmployeeData.lastName,
                  avatarUrl: formatAvatarUrl(creatorEmployeeData.pictureThumbnail),
                  position: creatorEmployeeData.position
                }
              : undefined
          }
          isLoadingEmployee={isLoadingCreator}
          onClose={onClose}
        />

        {/* Scrollable Content - Simple Blink Task View */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0 gba:px-6">
          {/* AI Summary & Suggestions */}
          <TaskAiSection
            taskId={task.id}
            source={task.source}
            accessToken={accessToken}
            urgencyScore={task.ai?.urgencyScore}
            currentUserPriority={task.userState?.userPriority}
            onPriorityApplied={() => onTaskUpdated()}
          />

          {/* Completion Details - Only show for completed tasks */}
          {isCompleted && (
            <Card className="gba:border-success/50 gba:bg-success/5">
              <CardHeader>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
                  <CardTitle className="gba:text-base">{getCompletionDetailsTitle()}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="gba:space-y-4">
                {/* Completed At */}
                {task.completedAt && (
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                      {t('task-completion-completed-at')}:
                    </div>
                    <div className="gba:text-sm gba:font-medium">{formatDateTime(task.completedAt)}</div>
                  </div>
                )}

                {/* Outcome */}
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                    {t('task-completion-outcome')}:
                  </div>
                  <div>
                    <Badge variant="secondary" className="gba:bg-success/10 gba:text-success gba:border-success/20">
                      {t('task-completion-outcome-completed')}
                    </Badge>
                  </div>
                </div>

                {/* Comment (if available) */}
                {task.sourceMetadata?.completionComment && (
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                      {t('task-completion-comment')}:
                    </div>
                    <div className="gba:text-sm gba:italic gba:text-muted-foreground">
                      "{task.sourceMetadata.completionComment}"
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Task instruction message - above links, dark and prominent */}
          {(task.message || task.description) && (
            <div className="gba:space-y-3">
              {isMarkdownMessageTask ? (
                <MarkdownRenderer content={task.message || task.description || ''} accessToken={accessToken} />
              ) : (
                <p className="gba:text-base gba:leading-relaxed gba:font-medium gba:text-foreground">
                  {task.message || task.description}
                </p>
              )}
              {/* Blue hint explaining what to do */}
              {!isCompleted && (otherLinks.length > 0 || documentLinks.length > 0) && (
                <div className="gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-primary/30 gba:bg-info-secondary gba:p-4">
                  <Info className="gba:h-5 gba:w-5 gba:text-primary gba:flex-shrink-0 gba:mt-0.5" />
                  <p className="gba:text-sm gba:leading-relaxed gba:text-info-secondary-foreground">
                    {t('task-details-blink-instruction-hint', {
                      defaultValue:
                        'Open the link below to access your assigned copy, complete it, and return here to submit.'
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Entity Reference (if linked to an entity) */}
          {entityType && entityId && entityName && (
            <Card variant="outlined" className="gba:border-primary/20 gba:bg-muted/20">
              <CardContent className="gba:pt-4">
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
                  {t('task-details-related-to')}
                </div>
                <a
                  href={entityDisplayUrl || '#'}
                  onClick={e => {
                    e.preventDefault()
                    if (entityDisplayUrl) {
                      navigateTo(entityDisplayUrl)
                    }
                  }}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline"
                  data-testid="task-entity-reference-link"
                >
                  <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary" />
                  <Badge variant="outline" className="gba:text-xs">
                    {entityType}
                  </Badge>
                  <span className="gba:font-medium gba:text-sm gba:text-primary hover:gba:underline">{entityName}</span>
                  <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Document Attachments (if any) */}
          {documentLinks.length > 0 && (
            <Card variant="outlined" className="gba:border-primary/20 gba:bg-muted/30">
              <CardContent className="gba:pt-4">
                <div className="gba:text-xs gba:text-primary gba:mb-3 gba:font-semibold">
                  {t('task-details-attachments', { count: documentLinks.length })}
                </div>
                <div className="gba:space-y-2">
                  {documentLinks.map(link => (
                    <a
                      key={link.url || link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline gba:group"
                      data-testid={`task-document-link-${link.name}`}
                    >
                      <FileText className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
                      <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                        {link.name}
                      </span>
                      <Download className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Links (internal:*, external:*, etc.) - "Open your copy" */}
          {otherLinks.length > 0 && (
            <Card variant="outlined" className="gba:border-primary/30 gba:bg-primary/5">
              <CardContent className="gba:pt-4">
                <div className="gba:text-xs gba:text-primary gba:mb-3 gba:font-semibold">
                  {t('task-details-related-links', { defaultValue: 'Related Links' })}
                </div>
                <div className="gba:space-y-2">
                  {otherLinks.map(link => (
                    <a
                      key={link.url || link.name}
                      href={link.url}
                      onClick={e => {
                        // For internal links, use navigateTo instead of opening new tab
                        if (link.type?.startsWith('internal:')) {
                          e.preventDefault()
                          navigateTo(link.url)
                        }
                      }}
                      target={link.type?.startsWith('internal:') ? undefined : '_blank'}
                      rel={link.type?.startsWith('internal:') ? undefined : 'noopener noreferrer'}
                      className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline gba:group"
                      data-testid={`task-other-link-${link.name}`}
                    >
                      <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
                      <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                        {link.name}
                      </span>
                      <ExternalLink className="gba:h-3 gba:w-3 gba:text-primary gba:shrink-0" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Comment (Optional) */}
          {!isCompleted && (
            <Card variant="outlined" className="gba:border-muted gba:bg-muted/20">
              <CardContent className="gba:pt-4 gba:space-y-3">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <MessageSquare className="gba:h-4 gba:w-4 gba:text-primary" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">
                    {t('task-details-add-comment')} {t('task-details-optional')}
                  </span>
                  <Switch
                    checked={showComment}
                    onCheckedChange={checked => {
                      setShowComment(checked)
                      if (!checked) setComment('')
                    }}
                    data-testid="blink-task-show-comment"
                  />
                </div>
                {showComment && (
                  <Textarea
                    placeholder={t('task-details-comment-placeholder', { defaultValue: 'Enter your comment...' })}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    className="gba:resize-none"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Alert for Blink tasks - only show when not completed */}
          {!isCompleted && (
            <Alert>
              <Info className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:text-sm">{t('task-details-blink-info')}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer with Complete button for active Blink tasks */}
        <TaskDetailFooter task={task} onTaskAction={handleTaskAction} isLoading={isCompleting} />
      </div>
    )
  }

  // For non-Blink cFlow tasks, use the full form view
  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0" data-testid="universal-cflow-task-details">
      {/* Task Header - Using shared TaskDetailHeader component */}
      <TaskDetailHeader
        title={taskTitle}
        creatorName={creatorName}
        showEmployeeInfo={!!creatorUserId}
        employeeData={
          creatorEmployeeData
            ? {
                displayName: creatorEmployeeData.displayName,
                firstName: creatorEmployeeData.firstName,
                lastName: creatorEmployeeData.lastName,
                avatarUrl: formatAvatarUrl(creatorEmployeeData.pictureThumbnail),
                position: creatorEmployeeData.position
              }
            : undefined
        }
        isLoadingEmployee={isLoadingCreator}
        onClose={onClose}
      />

      <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0 gba:px-6">
        {/* AI Summary & Suggestions */}
        <TaskAiSection
          taskId={task.id}
          source={task.source}
          accessToken={accessToken}
          urgencyScore={task.ai?.urgencyScore}
          currentUserPriority={task.userState?.userPriority}
          onPriorityApplied={() => onTaskUpdated()}
        />

        {/* Due Date & Starting Date Section */}
        {(task.dueDate || task.scheduledAt) && (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:pb-4 gba:border-b">
            {/* Due Date with Criticality */}
            {task.dueDate &&
              (() => {
                const criticality = calculateDueDateCriticality(task.dueDate, t)
                if (!criticality) return null

                const Icon =
                  criticality.status === 'overdue'
                    ? AlertCircle
                    : criticality.status === 'warning'
                      ? Clock
                      : CheckCircle

                return (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Icon
                      className={`gba:w-4 gba:h-4 ${
                        criticality.status === 'overdue'
                          ? 'gba:text-destructive'
                          : criticality.status === 'warning'
                            ? 'gba:text-warning'
                            : 'gba:text-success'
                      }`}
                    />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('task-due-date-label')}:</span>
                    <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.dueDate)}</span>
                    <Badge variant={getCriticalityBadgeVariant(criticality.status)}>{criticality.label}</Badge>
                  </div>
                )
              })()}

            {/* Starting Date - use scheduledAt as the start date */}
            {task.scheduledAt && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('task-start-date-label')}:</span>
                <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.scheduledAt)}</span>
              </div>
            )}
          </div>
        )}
        {/* Completion Details - Only show for completed tasks */}
        {isCompleted && (
          <Card className="gba:border-success/50 gba:bg-success/5">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-2">
                {task.sourceMetadata?.outcome === 'REJECTED' ? (
                  <XCircle className="gba:h-5 gba:w-5 gba:text-destructive" />
                ) : (
                  <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
                )}
                <CardTitle className="gba:text-base">{getCompletionDetailsTitle()}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              {/* Completed At */}
              {task.completedAt && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                    {t('task-completion-completed-at')}:
                  </div>
                  <div className="gba:text-sm gba:font-medium">{formatDateTime(task.completedAt)}</div>
                </div>
              )}

              {/* Outcome - Show based on actual outcome */}
              <div className="gba:flex gba:items-start gba:gap-3">
                <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                  {t('task-completion-outcome')}:
                </div>
                <div>
                  {(() => {
                    const successBadgeClass = 'gba:bg-success/10 gba:text-success gba:border-success/20'
                    const destructiveBadgeClass = 'gba:bg-destructive/10 gba:text-destructive gba:border-destructive/20'

                    if (task.sourceMetadata?.outcome === 'REJECTED') {
                      return (
                        <Badge variant="secondary" className={destructiveBadgeClass}>
                          {t('task-completion-outcome-rejected')}
                        </Badge>
                      )
                    }

                    if (isApprovalTask) {
                      return (
                        <Badge variant="secondary" className={successBadgeClass}>
                          {t('task-completion-outcome-approved')}
                        </Badge>
                      )
                    }

                    if (isAcknowledgeTask) {
                      return (
                        <Badge variant="secondary" className={successBadgeClass}>
                          {t('task-completion-outcome-acknowledged')}
                        </Badge>
                      )
                    }

                    return (
                      <Badge variant="secondary" className={successBadgeClass}>
                        {t('task-completion-outcome-completed')}
                      </Badge>
                    )
                  })()}
                </div>
              </div>

              {/* Comment (if available) */}
              {task.sourceMetadata?.completionComment && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                    {t('task-completion-comment')}:
                  </div>
                  <div className="gba:text-sm gba:italic gba:text-muted-foreground">
                    "{task.sourceMetadata.completionComment}"
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Entity Reference (if linked to an entity) - Same for all cFlow tasks */}
        {entityType && entityId && entityName && (
          <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
              {t('task-details-related-to')}
            </div>
            <a
              href={entityDisplayUrl || '#'}
              onClick={e => {
                e.preventDefault()
                if (entityDisplayUrl) {
                  navigateTo(entityDisplayUrl)
                }
              }}
              className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline"
              data-testid="task-entity-reference-link"
            >
              <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary" />
              <Badge variant="outline" className="gba:text-xs">
                {entityType}
              </Badge>
              <span className="gba:font-medium gba:text-sm gba:text-primary hover:gba:underline">{entityName}</span>
              <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
            </a>
          </div>
        )}

        {/* Document Attachments (if any) - Same for all cFlow tasks */}
        {documentLinks.length > 0 && (
          <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">
              {t('task-details-attachments', { count: documentLinks.length })}
            </div>
            <div className="gba:space-y-2">
              {documentLinks.map(link => (
                <a
                  key={link.url || link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline gba:group"
                  data-testid={`task-document-link-${link.name}`}
                >
                  <FileText className="gba:h-4 gba:w-4 gba:text-blue-500 gba:shrink-0" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                    {link.name}
                  </span>
                  <Download className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Other Links (internal:*, external:*, etc.) - Same for all cFlow tasks */}
        {otherLinks.length > 0 && (
          <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">
              {t('task-details-related-links', { defaultValue: 'Related Links' })}
            </div>
            <div className="gba:space-y-2">
              {otherLinks.map(link => (
                <a
                  key={link.url || link.name}
                  href={link.url}
                  onClick={e => {
                    // For internal links, use navigateTo instead of opening new tab
                    if (link.type?.startsWith('internal:')) {
                      e.preventDefault()
                      navigateTo(link.url)
                    }
                  }}
                  target={link.type?.startsWith('internal:') ? undefined : '_blank'}
                  rel={link.type?.startsWith('internal:') ? undefined : 'noopener noreferrer'}
                  className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline gba:group"
                  data-testid={`task-other-link-${link.name}`}
                >
                  <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                    {link.name}
                  </span>
                  <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Description - use markdown for scheduled tasks */}
        {(task.message || task.description) &&
          (isMarkdownMessageTask ? (
            <MarkdownRenderer content={task.message || task.description || ''} accessToken={accessToken} />
          ) : (
            <p className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
              {task.message || task.description}
            </p>
          ))}

        {/* Form Section - Editable for active tasks, read-only for completed */}
        {task.form && Array.isArray(task.form) && task.form.length > 0 && (
          <Card>
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-lg">{t('task-details-form')}</CardTitle>
                {isCompleted && <Badge variant="secondary">{t('task-details-read-only')}</Badge>}
                {!formInitialized && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                    <Clock className="gba:h-4 gba:w-4 gba:animate-spin" />
                    <span>{t('task-details-form-loading')}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Show validation errors summary if any */}
              {Object.keys(fieldErrors).length > 0 && (
                <Alert variant="destructive" className="gba:mb-4">
                  <AlertTitle>
                    {t('task-details-validation-error-title', { defaultValue: 'Validation Error' })}
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="gba:list-disc gba:list-inside gba:space-y-1">
                      {Object.values(fieldErrors).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Always show form fields - with empty values while loading for better UX */}
              <div className="gba:space-y-4">
                {task.form.map((input: any, index: number) => {
                  const fieldName = input.name || input.id || `field_${index}`
                  const fieldValue = formValues[fieldName]
                  const fieldError = fieldErrors[fieldName]

                  // Check if we're still loading data for this form
                  // For completed tasks without direct values, we need flowStepData to be loaded
                  const isLoadingData = !formInitialized

                  // While loading, show empty values; once loaded, show the actual values
                  const displayValue = getFieldDisplayValue(isLoadingData, fieldValue, input.value, input.defaultValue)

                  // Determine if this field should be read-only (loading, completed tasks, OR field marked as readOnly)
                  const isFieldReadOnly = isLoadingData || isCompleted || input.readOnly === true

                  return (
                    <div key={fieldName}>
                      <InputRenderer
                        input={input}
                        index={index}
                        readOnly={isFieldReadOnly}
                        value={displayValue}
                        onChange={value => {
                          if (!isFieldReadOnly) {
                            // Clear field error when user starts typing
                            if (fieldError) {
                              setFieldErrors(prev => {
                                const next = { ...prev }
                                delete next[fieldName]
                                return next
                              })
                            }
                            setFormValues({
                              ...formValues,
                              [fieldName]: value
                            })
                          }
                        }}
                      />
                      {/* Show field-level error message */}
                      {fieldError && <p className="gba:text-sm gba:text-destructive gba:mt-1">{fieldError}</p>}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comment Section - Only for active tasks with complete/reject actions */}
        {!isCompleted && (task.availableActions?.canComplete || task.availableActions?.canReject) && (
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Switch
                id="show-comment"
                checked={showComment}
                onCheckedChange={setShowComment}
                data-testid="comment-toggle"
              />
              <Label
                htmlFor="show-comment"
                className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex gba:items-center gba:gap-2"
              >
                <MessageSquare className="gba:h-4 gba:w-4" />
                {t('task-details-add-comment')} {!showComment && t('task-details-optional')}
              </Label>
            </div>

            {showComment && (
              <div className="gba:space-y-2">
                {/* AI Error display */}
                {aiError && (
                  <div className="gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:px-3 gba:py-2 gba:rounded-md">
                    {aiError}
                  </div>
                )}

                <Textarea
                  id="comment"
                  placeholder={t('task-details-comment-placeholder')}
                  value={comment}
                  onChange={e => {
                    setComment(e.target.value)
                    // Clear AI used flag when user manually edits after AI
                    if (aiUsedForComment && e.target.value !== suggestedReply) {
                      // User modified the AI suggestion - still counts as AI-assisted
                    }
                  }}
                  rows={4}
                  className="gba:w-full"
                  data-testid="task-comment-input"
                />

                {/* AI Toolbar */}
                {isAiAvailable && (
                  <AiToolbar
                    currentText={comment}
                    isLoading={isAiLoading}
                    onSuggest={handleAiSuggest}
                    onImprove={handleAiImprove}
                    onTone={handleAiTone}
                    onExpand={handleAiExpand}
                    onShorten={handleAiShorten}
                    onCustom={handleAiCustom}
                    hasText={comment.trim().length > 0}
                    disabled={isCompleting}
                  />
                )}

                {/* AI assisted indicator */}
                {aiUsedForComment && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                    <Sparkles className="gba:h-3 gba:w-3" />
                    <span>{t('ai-assistant-ai-assisted')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer with Actions - Auto-generated from task.availableActions */}
      <TaskDetailFooter task={task} onTaskAction={handleTaskAction} isLoading={isCompleting} />
    </div>
  )
}
