/**
 * TaskAiSection Component
 *
 * Displays a compact AI-generated summary and predictions for a task.
 * Only renders when AI features are enabled via FeatureHub.
 */

import React, { useEffect } from 'react'
import { Button, Skeleton, Tooltip, TooltipContent, TooltipTrigger, useTranslation } from '@newwork/nw-design-system'
import { Sparkles, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useAiCapabilities, useTaskSummary, useTaskPrediction } from '../hooks/useAi'
import type { TaskSource } from '@/business-apps/core/every/apps/every-api/types/UnifiedTask'
import { AiPredictionBadge } from './AiPredictionBadge'
import { AiFeedbackCapture } from './AiFeedbackCapture'
import translations from '../_i18n'

interface TaskAiSectionProps {
  taskId: string
  source: TaskSource
  accessToken?: string
  /** Auto-fetch summary on mount */
  autoFetch?: boolean
  /** Current urgency score from the task */
  urgencyScore?: number | null
  /** Current user priority from the task */
  currentUserPriority?: number | null
  /** Callback when priority is applied */
  onPriorityApplied?: (newPriority: number) => void
  /** Task title for prediction context */
  taskTitle?: string
  /** Task description for prediction context */
  taskDescription?: string
  /** Contact ID for relationship context */
  contactId?: string
}

export const TaskAiSection: React.FC<TaskAiSectionProps> = ({
  taskId,
  source,
  accessToken,
  autoFetch = true,
  taskTitle,
  taskDescription,
  contactId
}) => {
  const { t } = useTranslation(translations)

  // Feature flag check (enabled by default in development when flag is undefined)
  const aiFeature = useFeature(Feature.EveryBox.AiEnabled.Key)
  const isAiFeatureEnabled = aiFeature === true || aiFeature === 'true' || aiFeature === undefined
  const { capabilities } = useAiCapabilities(accessToken)

  // AI summary hook
  const {
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    fetchSummary
  } = useTaskSummary(taskId, source, accessToken)

  // AI prediction hook
  const { prediction, fetchPrediction } = useTaskPrediction(taskId, source, accessToken)

  // Auto-fetch summary and prediction on mount if enabled
  useEffect(() => {
    if (autoFetch && isAiFeatureEnabled && capabilities?.aiEnabled && capabilities.summariesAvailable && taskId) {
      fetchSummary()
      // Fetch prediction with context if available
      fetchPrediction({
        title: taskTitle,
        description: taskDescription,
        contactId
      })
    }
  }, [
    autoFetch,
    isAiFeatureEnabled,
    capabilities,
    taskId,
    fetchSummary,
    fetchPrediction,
    taskTitle,
    taskDescription,
    contactId
  ])

  // Don't render if AI is disabled or summaries not available
  if (!isAiFeatureEnabled || !capabilities?.aiEnabled || !capabilities.summariesAvailable) {
    return null
  }

  return (
    <div className="gba:space-y-2" data-testid="task-ai-section">
      {/* Summary Section - Clean, professional styling */}
      <div className="gba:rounded-lg gba:bg-sky-50/60 gba:border gba:border-sky-100 gba:shadow-sm">
        <div className="gba:flex gba:items-start gba:gap-3 gba:px-4 gba:py-3">
          {/* AI Icon */}
          <div className="gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-md gba:bg-sky-100 gba:flex-shrink-0 gba:mt-0.5">
            <Sparkles className="gba:h-3.5 gba:w-3.5 gba:text-sky-600" />
          </div>

          {/* Summary Content */}
          <div className="gba:flex-1 gba:min-w-0">
            {isSummaryLoading && !summary ? (
              <div className="gba:space-y-2 gba:py-0.5">
                <Skeleton className="gba:h-4 gba:w-full gba:rounded" />
                <Skeleton className="gba:h-4 gba:w-2/3 gba:rounded" />
              </div>
            ) : summaryError ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <AlertCircle className="gba:h-4 gba:w-4" />
                <span>{t('ai-summary-error')}</span>
                <Button
                  variant="link"
                  size="sm"
                  className="gba:h-auto gba:p-0 gba:text-sm"
                  onClick={() => fetchSummary()}
                >
                  {t('ai-suggestions-retry')}
                </Button>
              </div>
            ) : summary?.summaryShort ? (
              <p className="gba:text-sm gba:text-foreground/90 gba:leading-relaxed">{summary.summaryShort}</p>
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground gba:italic">{t('ai-summary-loading')}</p>
            )}
          </div>

          {/* Actions */}
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-shrink-0">
            {/* Cached indicator */}
            {summary?.cached && (
              <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted">
                cached
              </span>
            )}

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-sky-100"
                  onClick={() => fetchSummary(true)}
                  disabled={isSummaryLoading}
                  aria-label={t('ai-summary-regenerate')}
                >
                  {isSummaryLoading ? (
                    <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                  ) : (
                    <RefreshCw className="gba:h-3.5 gba:w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{t('ai-summary-regenerate')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Prediction Section - only show if prediction has high confidence */}
      {prediction && (prediction.actionPrediction?.confidence ?? 0) >= 0.5 && (
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2.5 gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border">
          <AiPredictionBadge
            actionPrediction={prediction.actionPrediction}
            priorityPrediction={prediction.priorityPrediction}
            showReasoning
            size="sm"
          />

          <AiFeedbackCapture
            taskId={taskId}
            source={source}
            predictedAction={prediction.actionPrediction?.action}
            predictedPriority={prediction.priorityPrediction?.priority}
            accessToken={accessToken}
          />
        </div>
      )}
    </div>
  )
}
