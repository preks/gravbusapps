import React, { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Label,
  Switch,
  Textarea,
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation,
  useLocale,
  toast
} from '@newwork/nw-design-system'
import {
  ChevronDown,
  ChevronUp,
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
import { env } from '@/common/env/EnvUtils'
import { TaskDetailHeader } from './TaskDetailHeader'
import { TaskDetailFooter } from './TaskDetailFooter'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'
import { useMeetingParticipants } from '../hooks/useMeetingParticipants'
import { InputRenderer } from '@/business-apps/flow/apps/creator/components/shared/InputRenderer'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { MarkdownRenderer } from '@/business-apps/ai/forms/scheduled-task-result/components/MarkdownRenderer'
import { calculateDueDateCriticality, getCriticalityBadgeVariant } from '../utils/dueDateUtils'
import { getInitials } from '../utils/avatarUtils'
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

/** Number of participants to show before collapsing the list (expand to see more). */
const MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD = 10

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
  const [participantsExpanded, setParticipantsExpanded] = useState(false)

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

  // Meeting-invite: fetch current participants from chat-service when opening task (includes latest status)
  const meetingIdForFetch = task.tags?.app === 'meeting-invite' ? task.tags?.meetingId : undefined
  const { participants: apiMeetingParticipants, isLoading: meetingParticipantsLoading } = useMeetingParticipants(
    meetingIdForFetch,
    accessToken
  )
  // Avatar batch: use API participant userIds when available, else fall back to tag-based list
  const meetingParticipantUserIds = React.useMemo(() => {
    if (apiMeetingParticipants.length > 0) return apiMeetingParticipants.map(p => p.userId)
    if (task.tags?.app !== 'meeting-invite' || !task.tags?.participants) return []
    try {
      const raw = JSON.parse(task.tags.participants)
      if (!Array.isArray(raw) || raw.length === 0) return []
      if (typeof raw[0] === 'string') return []
      const list = raw as Array<{ userId?: string }>
      return list.map(p => p.userId).filter((id): id is string => !!id)
    } catch {
      return []
    }
  }, [apiMeetingParticipants, task.tags?.app, task.tags?.participants])
  const { employeeMap: meetingParticipantEmployeeMap } = useEmployeeAvatarsBatch(accessToken, meetingParticipantUserIds)
  // Resolve display list: API participants (with status) or fallback to tags; organizer first
  const sortOrganizerFirst = <T extends { isOrganizer?: boolean }>(list: T[]): T[] =>
    [...list].sort((a, b) => (a.isOrganizer ? 0 : 1) - (b.isOrganizer ? 0 : 1))

  const meetingParticipantsDisplayList = React.useMemo(() => {
    if (apiMeetingParticipants.length > 0) {
      const list = apiMeetingParticipants.map(p => ({
        userId: p.userId,
        displayName: p.displayName,
        status: p.status,
        isOrganizer: p.isOrganizer
      }))
      return sortOrganizerFirst(list)
    }
    if (task.tags?.app !== 'meeting-invite' || !task.tags?.participants) return null
    try {
      const raw = JSON.parse(task.tags.participants)
      if (!Array.isArray(raw) || raw.length === 0) return null
      const isLegacyNames = typeof raw[0] === 'string'
      const list = isLegacyNames
        ? (raw as string[]).map((name, i) => ({
            userId: `legacy-${i}`,
            displayName: name,
            status: undefined as undefined,
            isOrganizer: false
          }))
        : (raw as Array<{ userId: string; displayName: string }>).map(p => ({
            ...p,
            status: undefined as undefined,
            isOrganizer: task.tags?.organizer === p.userId
          }))
      return sortOrganizerFirst(list)
    } catch {
      return null
    }
  }, [apiMeetingParticipants, task.tags?.app, task.tags?.participants, task.tags?.organizer])

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
  const handleCompleteTask = async (flowEngineApi: string) => {
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

    const response = await fetch(`${flowEngineApi}/api/tasks/${task.id}/complete`, {
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
  const handleRejectTask = async (flowEngineApi: string, data?: any) => {
    const rejectRequestBody = {
      userId: userId,
      rejectionComment: comment || data?.comment || '',
      comment: comment || data?.comment || ''
    }

    const response = await fetch(`${flowEngineApi}/api/tasks/${task.id}/reject`, {
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
  const handleClaimTask = async (flowEngineApi: string) => {
    const response = await fetch(`${flowEngineApi}/api/tasks/${task.id}/claim`, {
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
  const handleUnclaimTask = async (flowEngineApi: string) => {
    const response = await fetch(`${flowEngineApi}/api/tasks/${task.id}/unclaim`, {
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

    const flowEngineApi = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

    setIsCompleting(true)
    try {
      switch (action) {
        case 'claim':
          await handleClaimTask(flowEngineApi)
          break
        case 'complete':
          await handleCompleteTask(flowEngineApi)
          break
        case 'reject':
          await handleRejectTask(flowEngineApi, data)
          break
        case 'reassign':
          toast.info(t('task-details-reassign-coming'))
          break
        case 'unclaim':
          await handleUnclaimTask(flowEngineApi)
          break
        default:
          toast.warning(t('task-details-unknown-action', { action }))
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
  // For meeting-invite: section titled "Meeting Links", but show all links (Join Meeting + any others)
  const linksSectionTitle =
    task.tags?.app === 'meeting-invite'
      ? t('task-details-meeting-links', { defaultValue: 'Meeting Links' })
      : t('task-details-related-links', { defaultValue: 'Related Links' })
  const displayLinks = otherLinks

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
          {/* Due Date & Starting Date - hidden for meeting-invite (Blink view) */}
          {(task.dueDate || task.scheduledAt) && task.tags?.app !== 'meeting-invite' && (
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:pb-4 gba:border-b">
              {task.scheduledAt && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Calendar className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('task-start-date-label')}:</span>
                  <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.scheduledAt)}</span>
                </div>
              )}
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
                      <span className="gba:text-sm gba:font-medium gba:text-foreground">
                        {t('task-due-date-label')}:
                      </span>
                      <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.dueDate)}</span>
                      <Badge variant={getCriticalityBadgeVariant(criticality.status)}>{criticality.label}</Badge>
                    </div>
                  )
                })()}
            </div>
          )}

          {/* Meeting invite: meeting name, date, time, Please respond - Blink view */}
          {task.tags?.app === 'meeting-invite' && (task.tags?.meetingDateStr || task.tags?.meetingTimeStr) && (
            <div
              className="gba:space-y-4 gba:pb-4 gba:border-b gba:border-border"
              data-testid="task-details-meeting-invite-body"
            >
              <div className="gba:flex gba:flex-col gba:gap-2 gba:text-sm">
                {task.tags?.meetingDateStr && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
                    <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
                    <span>{task.tags.meetingDateStr}</span>
                  </div>
                )}
                {task.tags?.meetingTimeStr && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
                    <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
                    <span>{task.tags.meetingTimeStr}</span>
                  </div>
                )}
              </div>
              <p className="gba:text-sm gba:text-muted-foreground">
                {t('task-details-meeting-please-respond', { defaultValue: 'Please respond to this invitation.' })}
              </p>
              {task.tags?.transcriptionEnabled === 'true' && (
                <div
                  className="gba:flex gba:items-center gba:gap-2 gba:mt-4 gba:pt-4 gba:border-t gba:border-border"
                  data-testid="task-details-meeting-recording-notice"
                >
                  <span
                    className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse gba:flex-shrink-0"
                    aria-hidden
                  />
                  <p className="gba:text-xs gba:text-muted-foreground gba:italic">
                    {t('task-details-meeting-recording-notice', {
                      defaultValue: 'Recording and transcription. By joining, you consent to being included.'
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

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

          {/* Entity Reference (if linked to an entity) */}
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

          {/* Document Attachments (if any) */}
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

          {/* Other Links / Meeting Links (meeting-invite: only external:meeting) */}
          {displayLinks.length > 0 && (
            <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
              <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">{linksSectionTitle}</div>
              <div className="gba:space-y-2">
                {displayLinks.map(link => (
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

          {/* Meeting participants - separate block for meeting-invite (Blink); uses API when open, with status */}
          {task.tags?.app === 'meeting-invite' &&
            ((meetingParticipantsLoading && meetingIdForFetch) ||
              (meetingParticipantsDisplayList && meetingParticipantsDisplayList.length > 0)) &&
            (() => {
              if (meetingParticipantsLoading && meetingIdForFetch) {
                return (
                  <div
                    className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30"
                    data-testid="task-details-meeting-participants"
                  >
                    <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
                      {t('task-details-meeting-participants', { defaultValue: 'Participants' })}
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {t('task-details-form-loading', { defaultValue: 'Loading...' })}
                    </p>
                  </div>
                )
              }
              const list = meetingParticipantsDisplayList
              if (!list || list.length === 0) return null
              const hasStatus = list.some((p: { status?: string }) => p.status != null)
              const showCollapse = list.length > MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD
              const visibleList =
                showCollapse && !participantsExpanded ? list.slice(0, MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD) : list
              const hiddenCount = list.length - MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD
              return (
                <div
                  className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30"
                  data-testid="task-details-meeting-participants"
                >
                  <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
                    {t('task-details-meeting-participants-with-count', {
                      count: list.length,
                      defaultValue: `Participants (${list.length})`
                    })}
                  </div>
                  <ul className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-2 gba:text-sm gba:text-foreground">
                    {visibleList.map(
                      (
                        p: { userId: string; displayName: string; status?: string; isOrganizer: boolean },
                        idx: number
                      ) => {
                        const isLegacy = p.userId.startsWith('legacy-')
                        const emp = isLegacy ? null : meetingParticipantEmployeeMap.get(p.userId)
                        const employeeId = emp?.id
                        const avatarUrl = emp?.avatarUrl ?? formatAvatarUrl(emp?.pictureThumbnail)
                        const parts = p.displayName.trim().split(/\s+/)
                        const initials =
                          emp && (emp.firstName || emp.lastName)
                            ? getInitials(emp.firstName, emp.lastName)
                            : parts.length >= 2
                              ? getInitials(parts[0], parts.slice(1).join(' '))
                              : parts[0]?.slice(0, 2).toUpperCase() || '?'
                        const statusKey = p.status ? `task-details-meeting-status-${p.status}` : null
                        const statusLabel = statusKey ? t(statusKey, { defaultValue: p.status }) : null
                        return (
                          <li key={p.userId || idx} className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
                            {employeeId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId }))
                                }
                                className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:ring-2 gba:ring-transparent hover:gba:ring-primary focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary"
                                aria-label={t('task-details-meeting-participant-view-profile', {
                                  defaultValue: 'View profile'
                                })}
                                data-testid={`task-details-meeting-participant-avatar-${idx}`}
                              >
                                <Avatar className="gba:h-8 gba:w-8">
                                  <AvatarImage src={avatarUrl} alt={p.displayName} />
                                  <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                                </Avatar>
                              </button>
                            ) : (
                              <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                                <AvatarImage src={avatarUrl} alt={p.displayName} />
                                <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                              </Avatar>
                            )}
                            <span className="gba:flex gba:items-center gba:gap-2">
                              {p.displayName}
                              {p.isOrganizer && (
                                <span className="gba:text-muted-foreground gba:font-normal">
                                  ({t('task-details-meeting-organiser', { defaultValue: 'Organiser' })})
                                </span>
                              )}
                              {hasStatus && statusLabel && (
                                <Badge
                                  variant={
                                    p.status === 'accepted'
                                      ? 'success'
                                      : p.status === 'declined'
                                        ? 'destructive'
                                        : p.status === 'tentative'
                                          ? 'warning'
                                          : 'secondary'
                                  }
                                  className="gba:text-xs"
                                >
                                  {statusLabel}
                                </Badge>
                              )}
                            </span>
                          </li>
                        )
                      }
                    )}
                  </ul>
                  {showCollapse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setParticipantsExpanded(prev => !prev)}
                      className="gba:mt-2 gba:text-muted-foreground hover:gba:text-foreground"
                      data-testid="task-details-meeting-participants-toggle"
                    >
                      {participantsExpanded ? (
                        <>
                          <ChevronUp className="gba:h-4 gba:w-4 gba:mr-1" />
                          {t('task-details-meeting-participants-show-less', { defaultValue: 'Show less' })}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="gba:h-4 gba:w-4 gba:mr-1" />
                          {t('task-details-meeting-participants-show-more', {
                            defaultValue: 'Show {{count}} more',
                            count: hiddenCount
                          })}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })()}

          {/* Brief description - skip redundant "Complete Meeting Invitation: ..." for meeting-invite */}
          {(task.message || task.description) &&
            (() => {
              const content = (task.message || task.description || '').trim()
              const isRedundantMeetingTitle =
                task.tags?.app === 'meeting-invite' &&
                (/^\s*\*\*Complete Meeting Invitation:.*\*\*\s*$/s.test(content) ||
                  /^\s*Complete Meeting Invitation:.*\s*$/s.test(content))
              if (isRedundantMeetingTitle) return null
              return task.tags?.app === 'scheduled_task' ? (
                <MarkdownRenderer content={task.message || task.description || ''} accessToken={accessToken} />
              ) : task.tags?.app === 'meeting-invite' && (task.tags?.meetingDateStr || task.tags?.meetingTimeStr) ? (
                task.message || task.description ? (
                  <div className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
                    <MarkdownRenderer content={task.message || task.description || ''} accessToken={accessToken} />
                  </div>
                ) : null
              ) : (
                <p className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
                  {task.message || task.description}
                </p>
              )
            })()}

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
        {/* Due Date & Starting Date Section - hidden for meeting-invite */}
        {(task.dueDate || task.scheduledAt) && task.tags?.app !== 'meeting-invite' && (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:pb-4 gba:border-b">
            {task.scheduledAt && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('task-start-date-label')}:</span>
                <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.scheduledAt)}</span>
              </div>
            )}

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
          </div>
        )}

        {/* Meeting invite: meeting name, date, time, Please respond */}
        {task.tags?.app === 'meeting-invite' && (task.tags?.meetingDateStr || task.tags?.meetingTimeStr) && (
          <div
            className="gba:space-y-4 gba:pb-4 gba:border-b gba:border-border"
            data-testid="task-details-meeting-invite-body"
          >
            <div className="gba:flex gba:flex-col gba:gap-2 gba:text-sm">
              {task.tags?.meetingDateStr && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
                  <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
                  <span>{task.tags.meetingDateStr}</span>
                </div>
              )}
              {task.tags?.meetingTimeStr && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
                  <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
                  <span>{task.tags.meetingTimeStr}</span>
                </div>
              )}
            </div>
            <p className="gba:text-sm gba:text-muted-foreground">
              {t('task-details-meeting-please-respond', { defaultValue: 'Please respond to this invitation.' })}
            </p>
            {task.tags?.transcriptionEnabled === 'true' && (
              <div
                className="gba:flex gba:items-center gba:gap-2 gba:mt-4 gba:pt-4 gba:border-t gba:border-border"
                data-testid="task-details-meeting-recording-notice"
              >
                <span
                  className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse gba:flex-shrink-0"
                  aria-hidden
                />
                <p className="gba:text-xs gba:text-muted-foreground gba:italic">
                  {t('task-details-meeting-recording-notice', {
                    defaultValue: 'Recording and transcription. By joining, you consent to being included.'
                  })}
                </p>
              </div>
            )}
          </div>
        )}

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

        {/* For meeting-invite: Form first, then Related Links. Otherwise: Related Links then Form. */}
        {task.tags?.app === 'meeting-invite' && task.form && Array.isArray(task.form) && task.form.length > 0 && (
          <>
            <Card>
              <CardContent>
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

                <div className="gba:space-y-4">
                  {task.form.map((input: any, index: number) => {
                    const fieldName = input.name || input.id || `field_${index}`
                    const fieldValue = formValues[fieldName]
                    const fieldError = fieldErrors[fieldName]
                    const isLoadingData = !formInitialized
                    const displayValue = getFieldDisplayValue(
                      isLoadingData,
                      fieldValue,
                      input.value,
                      input.defaultValue
                    )
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
                              if (fieldError) {
                                setFieldErrors(prev => {
                                  const next = { ...prev }
                                  delete next[fieldName]
                                  return next
                                })
                              }
                              setFormValues(prev => ({ ...prev, [fieldName]: value }))
                            }
                          }}
                        />
                        {fieldError && <p className="gba:text-sm gba:text-destructive gba:mt-1">{fieldError}</p>}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Other Links / Meeting Links (meeting-invite: only external:meeting) */}
        {displayLinks.length > 0 && (
          <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">{linksSectionTitle}</div>
            <div className="gba:space-y-2">
              {displayLinks.map(link => (
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

        {/* Form Section - for non-meeting-invite (or when meeting-invite has no form); no "Form" title */}
        {task.tags?.app !== 'meeting-invite' && task.form && Array.isArray(task.form) && task.form.length > 0 && (
          <Card>
            <CardContent>
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

              <div className="gba:space-y-4">
                {task.form.map((input: any, index: number) => {
                  const fieldName = input.name || input.id || `field_${index}`
                  const fieldValue = formValues[fieldName]
                  const fieldError = fieldErrors[fieldName]
                  const isLoadingData = !formInitialized
                  const displayValue = getFieldDisplayValue(isLoadingData, fieldValue, input.value, input.defaultValue)
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
                      {fieldError && <p className="gba:text-sm gba:text-destructive gba:mt-1">{fieldError}</p>}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meeting participants - after Form; uses API when open, with latest status */}
        {task.tags?.app === 'meeting-invite' &&
          ((meetingParticipantsLoading && meetingIdForFetch) ||
            (meetingParticipantsDisplayList && meetingParticipantsDisplayList.length > 0)) &&
          (() => {
            if (meetingParticipantsLoading && meetingIdForFetch) {
              return (
                <div
                  className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30"
                  data-testid="task-details-meeting-participants"
                >
                  <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
                    {t('task-details-meeting-participants', { defaultValue: 'Participants' })}
                  </div>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {t('task-details-form-loading', { defaultValue: 'Loading...' })}
                  </p>
                </div>
              )
            }
            const list = meetingParticipantsDisplayList
            if (!list || list.length === 0) return null
            const hasStatus = list.some((p: { status?: string }) => p.status != null)
            const showCollapse = list.length > MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD
            const visibleList =
              showCollapse && !participantsExpanded ? list.slice(0, MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD) : list
            const hiddenCount = list.length - MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD
            return (
              <div
                className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30"
                data-testid="task-details-meeting-participants"
              >
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
                  {t('task-details-meeting-participants-with-count', {
                    count: list.length,
                    defaultValue: `Participants (${list.length})`
                  })}
                </div>
                <ul className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-2 gba:text-sm gba:text-foreground">
                  {visibleList.map(
                    (
                      p: { userId: string; displayName: string; status?: string; isOrganizer: boolean },
                      idx: number
                    ) => {
                      const isLegacy = p.userId.startsWith('legacy-')
                      const emp = isLegacy ? null : meetingParticipantEmployeeMap.get(p.userId)
                      const employeeId = emp?.id
                      const avatarUrl = emp?.avatarUrl ?? formatAvatarUrl(emp?.pictureThumbnail)
                      const parts = p.displayName.trim().split(/\s+/)
                      const initials =
                        emp && (emp.firstName || emp.lastName)
                          ? getInitials(emp.firstName, emp.lastName)
                          : parts.length >= 2
                            ? getInitials(parts[0], parts.slice(1).join(' '))
                            : parts[0]?.slice(0, 2).toUpperCase() || '?'
                      const statusKey = p.status ? `task-details-meeting-status-${p.status}` : null
                      const statusLabel = statusKey ? t(statusKey, { defaultValue: p.status }) : null
                      return (
                        <li key={p.userId || idx} className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
                          {employeeId ? (
                            <button
                              type="button"
                              onClick={() => navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId }))}
                              className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:ring-2 gba:ring-transparent hover:gba:ring-primary focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary"
                              aria-label={t('task-details-meeting-participant-view-profile', {
                                defaultValue: 'View profile'
                              })}
                              data-testid={`task-details-meeting-participant-avatar-${idx}`}
                            >
                              <Avatar className="gba:h-8 gba:w-8">
                                <AvatarImage src={avatarUrl} alt={p.displayName} />
                                <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                              </Avatar>
                            </button>
                          ) : (
                            <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                              <AvatarImage src={avatarUrl} alt={p.displayName} />
                              <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                            </Avatar>
                          )}
                          <span className="gba:flex gba:items-center gba:gap-2">
                            {p.displayName}
                            {p.isOrganizer && (
                              <span className="gba:text-muted-foreground gba:font-normal">
                                ({t('task-details-meeting-organiser', { defaultValue: 'Organiser' })})
                              </span>
                            )}
                            {hasStatus && statusLabel && (
                              <Badge
                                variant={
                                  p.status === 'accepted'
                                    ? 'success'
                                    : p.status === 'declined'
                                      ? 'destructive'
                                      : p.status === 'tentative'
                                        ? 'warning'
                                        : 'secondary'
                                }
                                className="gba:text-xs"
                              >
                                {statusLabel}
                              </Badge>
                            )}
                          </span>
                        </li>
                      )
                    }
                  )}
                </ul>
                {showCollapse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setParticipantsExpanded(prev => !prev)}
                    className="gba:mt-2 gba:text-muted-foreground hover:gba:text-foreground"
                    data-testid="task-details-meeting-participants-toggle"
                  >
                    {participantsExpanded ? (
                      <>
                        <ChevronUp className="gba:h-4 gba:w-4 gba:mr-1" />
                        {t('task-details-meeting-participants-show-less', { defaultValue: 'Show less' })}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="gba:h-4 gba:w-4 gba:mr-1" />
                        {t('task-details-meeting-participants-show-more', {
                          defaultValue: 'Show {{count}} more',
                          count: hiddenCount
                        })}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )
          })()}

        {/* Description - scheduled task markdown; meeting-invite: only location/description (skip redundant "Complete Meeting Invitation: ...") */}
        {(task.message || task.description) &&
          (() => {
            const content = (task.message || task.description || '').trim()
            const isRedundantMeetingTitle =
              task.tags?.app === 'meeting-invite' &&
              (/^\s*\*\*Complete Meeting Invitation:.*\*\*\s*$/s.test(content) ||
                /^\s*Complete Meeting Invitation:.*\s*$/s.test(content))
            if (isRedundantMeetingTitle) return null
            return task.tags?.app === 'scheduled_task' ? (
              <MarkdownRenderer content={task.message || task.description || ''} accessToken={accessToken} />
            ) : task.tags?.app === 'meeting-invite' && (task.tags?.meetingDateStr || task.tags?.meetingTimeStr) ? (
              task.message || task.description ? (
                <div className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
                  <MarkdownRenderer content={task.message || task.description || ''} accessToken={accessToken} />
                </div>
              ) : null
            ) : (
              <p className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
                {task.message || task.description}
              </p>
            )
          })()}

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
