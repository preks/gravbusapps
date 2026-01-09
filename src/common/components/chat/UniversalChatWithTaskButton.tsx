import { MessageCircle, Sparkles } from 'lucide-react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { useTaskSummary } from '@/common/hooks/useTaskSummary'
import { extractTaskInfo } from '@/common/utils/taskDataExtractor'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useState } from 'react'
import { formatDate, formatNumberFunction } from '@/common/utils/windowUtils'
import translations from './_i18n'

interface UniversalChatWithTaskButtonProps {
  context: BusinessAppContextProps
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  buttonText?: string
  customTaskData?: Record<string, any> // Optional override
  customTaskType?: string // Optional override
  onError?: (error: string) => void
}

/**
 * Universal button that works with ANY Every Box form
 * Automatically extracts task info and generates AI summary
 */
export const UniversalChatWithTaskButton: React.FC<UniversalChatWithTaskButtonProps> = ({
  context,
  variant = 'outline',
  size = 'sm',
  buttonText,
  customTaskData,
  customTaskType,
  onError
}) => {
  const { t } = useTranslation(translations)
  const { generateSummary, isGenerating } = useTaskSummary()
  const [useFallback, setUseFallback] = useState(false)

  // Use provided buttonText or fall back to translated default
  const displayButtonText = buttonText ?? t('chat-button-ask-question')

  // Extract task information automatically
  const taskInfo = extractTaskInfo(context.additionalData)

  // Handle case where no task info can be extracted
  if (!taskInfo || !taskInfo.requesterId) {
    return null // Don't show button if no requester found
  }

  const handleClick = async () => {
    const { requesterId, requesterName, taskType: extractedTaskType, taskData: extractedTaskData } = taskInfo

    // Use custom overrides if provided
    const taskType = customTaskType || extractedTaskType
    const taskData = customTaskData || extractedTaskData

    let contextMessage: string

    // Try AI-generated summary first
    if (!useFallback) {
      const aiSummary = await generateSummary({
        accessToken: context.accessToken,
        taskType,
        taskData
      })

      if (aiSummary) {
        // Use AI-generated summary
        contextMessage =
          `Hi ${requesterName || 'there'}, I have a question about your ${taskType.toLowerCase()}:\n\n` +
          `${aiSummary}\n\n`
      } else {
        // Fallback to manual formatting
        setUseFallback(true)
        contextMessage = buildManualSummary(requesterName, taskType, taskData)

        if (onError) {
          onError('AI summary generation failed, using fallback format')
        }
      }
    } else {
      // Use fallback if AI failed before
      contextMessage = buildManualSummary(requesterName, taskType, taskData)
    }

    const payload = {
      userId: requesterId!,
      userName: requesterName,
      prefilledMessage: contextMessage,
      metadata: {
        source: 'every-box',
        taskType: taskType.toLowerCase().replace(/\s+/g, '-'),
        taskId: taskInfo.taskId,
        aiGenerated: !useFallback
      }
    }

    // Dispatch postMessage - the platform (gravity-platform) will handle opening
    // the sidebar and dispatching the chat:open-with-user event after Chat is mounted
    window.postMessage(
      {
        type: 'OPEN_CHAT_WITH_USER',
        payload
      },
      '*'
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isGenerating}
      className="gba:gap-2"
      data-testid="universal-chat-task-button"
    >
      {isGenerating ? (
        <>
          <Sparkles className="gba:h-4 gba:w-4 gba:animate-pulse" />
          {t('chat-button-generating')}
        </>
      ) : (
        <>
          <MessageCircle className="gba:h-4 gba:w-4" />
          {displayButtonText}
        </>
      )}
    </Button>
  )
}

/**
 * Fallback manual summary builder
 */
const buildManualSummary = (
  requesterName: string | undefined,
  taskType: string,
  taskData: Record<string, any>
): string => {
  const details = Object.entries(taskData)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, 8) // Limit to 8 most important fields
    .map(([key, value]) => {
      const label = formatFieldLabel(key)
      const displayValue = formatDisplayValue(value)
      return `• ${label}: ${displayValue}`
    })
    .join('\n')

  return `Hi ${requesterName || 'there'}, I have a question about your ${taskType.toLowerCase()}:\n\n${details}\n\n`
}

/**
 * Format field label for display
 */
const formatFieldLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/Id$/, '')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format display value for various data types
 */
const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined) return 'N/A'

  if (typeof value === 'object' && !Array.isArray(value)) {
    // Extract meaningful data from objects
    if ('name' in value) return value.name
    if ('value' in value) return value.value
    if ('displayName' in value) return value.displayName
    if ('title' in value) return value.title
    return JSON.stringify(value).slice(0, 50)
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length !== 1 ? 's' : ''}`
  }

  // Format dates nicely if it looks like a date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return formatDate(value) || value
    } catch {
      return value
    }
  }

  // Format numbers with commas
  if (typeof value === 'number') {
    return formatNumberFunction(value)
  }

  return String(value)
}
