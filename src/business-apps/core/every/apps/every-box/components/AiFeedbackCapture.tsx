import React, { useState } from 'react'
import { useTranslation, Button, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import translations from '../_i18n'
import type { DecisionType, TaskSource } from '@/business-apps/core/every/apps/every-api/services/AiService'
import * as AiService from '@/business-apps/core/every/apps/every-api/services/AiService'

interface AiFeedbackCaptureProps {
  taskId: string
  source: TaskSource
  predictedAction?: DecisionType | null
  predictedPriority?: string | null
  accessToken?: string
  onFeedbackSubmitted?: (wasHelpful: boolean) => void
  className?: string
}

export const AiFeedbackCapture: React.FC<AiFeedbackCaptureProps> = ({
  taskId,
  source,
  predictedAction,
  predictedPriority,
  accessToken,
  onFeedbackSubmitted,
  className = ''
}) => {
  const { t } = useTranslation(translations)
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!predictedAction && !predictedPriority) {
    return null
  }

  const handleFeedback = async (wasHelpful: boolean) => {
    if (feedbackGiven || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Submit feedback for action prediction
      if (predictedAction) {
        await AiService.recordFeedback(
          {
            taskId,
            source,
            feedbackType: wasHelpful ? 'prediction_correct' : 'prediction_incorrect',
            predictedValue: predictedAction,
            wasHelpful
          },
          accessToken
        )
      }

      // Submit feedback for priority prediction
      if (predictedPriority) {
        await AiService.recordFeedback(
          {
            taskId,
            source,
            feedbackType: 'priority_feedback',
            predictedValue: predictedPriority,
            wasHelpful
          },
          accessToken
        )
      }

      setFeedbackGiven(wasHelpful ? 'helpful' : 'not_helpful')
      onFeedbackSubmitted?.(wasHelpful)
    } catch (error) {
      console.error('[AiFeedbackCapture] Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show thank you message after feedback
  if (feedbackGiven) {
    return (
      <div className={`gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground ${className}`}>
        <Check className="gba:h-3.5 gba:w-3.5 gba:text-emerald-600" />
        <span>{t('ai-feedback-thanks')}</span>
      </div>
    )
  }

  return (
    <div className={`gba:flex gba:items-center gba:gap-1.5 ${className}`}>
      <span className="gba:text-[11px] gba:text-muted-foreground gba:mr-0.5">{t('ai-prediction-helpful')}</span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-6 gba:w-6 gba:text-muted-foreground hover:gba:text-emerald-600 hover:gba:bg-emerald-500/10"
            onClick={() => handleFeedback(true)}
            disabled={isSubmitting}
          >
            <ThumbsUp className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="gba:text-xs">{t('ai-feedback-helpful')}</span>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-6 gba:w-6 gba:text-muted-foreground hover:gba:text-red-600 hover:gba:bg-red-500/10"
            onClick={() => handleFeedback(false)}
            disabled={isSubmitting}
          >
            <ThumbsDown className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="gba:text-xs">{t('ai-feedback-not-helpful')}</span>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default AiFeedbackCapture
