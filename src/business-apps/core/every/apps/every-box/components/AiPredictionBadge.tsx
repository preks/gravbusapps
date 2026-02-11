import React from 'react'
import { useTranslation, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import { Sparkles, ThumbsUp, ThumbsDown, Users, Clock, HelpCircle } from 'lucide-react'
import type { ActionPrediction, PriorityPrediction } from '@/business-apps/core/every/apps/every-api/services/AiService'
import translations from '../_i18n'

interface AiPredictionBadgeProps {
  actionPrediction?: ActionPrediction | null
  priorityPrediction?: PriorityPrediction | null
  showReasoning?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const actionIcons: Record<string, React.ReactNode> = {
  approve: <ThumbsUp className="gba:h-3 gba:w-3" />,
  reject: <ThumbsDown className="gba:h-3 gba:w-3" />,
  delegate: <Users className="gba:h-3 gba:w-3" />,
  defer: <Clock className="gba:h-3 gba:w-3" />,
  custom: <HelpCircle className="gba:h-3 gba:w-3" />
}

const actionLabels: Record<string, string> = {
  approve: 'Likely approve',
  reject: 'Likely reject',
  delegate: 'Likely delegate',
  defer: 'Likely defer',
  custom: 'Needs review'
}

const priorityColors: Record<string, string> = {
  high: 'gba:bg-red-500/10 gba:text-red-700 gba:border gba:border-red-500/20',
  medium: 'gba:bg-amber-500/10 gba:text-amber-700 gba:border gba:border-amber-500/20',
  low: 'gba:bg-emerald-500/10 gba:text-emerald-700 gba:border gba:border-emerald-500/20'
}

export const AiPredictionBadge: React.FC<AiPredictionBadgeProps> = ({
  actionPrediction,
  priorityPrediction,
  showReasoning = false,
  size = 'sm',
  className = ''
}) => {
  useTranslation(translations)

  if (!actionPrediction && !priorityPrediction) {
    return null
  }

  const hasHighConfidenceAction = actionPrediction && actionPrediction.confidence >= 0.6
  const confidencePercent = actionPrediction ? Math.round(actionPrediction.confidence * 100) : 0

  // Only show badge if confidence is above threshold
  if (!hasHighConfidenceAction && !priorityPrediction) {
    return null
  }

  const badgeContent = (
    <div className={`gba:flex gba:items-center gba:gap-2 ${className}`}>
      {/* AI indicator */}
      <div className="gba:flex gba:items-center gba:justify-center gba:h-5 gba:w-5 gba:rounded gba:bg-sky-100">
        <Sparkles className="gba:h-3 gba:w-3 gba:text-sky-600" />
      </div>

      {/* Action prediction */}
      {hasHighConfidenceAction && (
        <div
          className={`gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded gba:text-[11px] gba:font-medium gba:bg-muted gba:text-foreground/80 ${
            size === 'md' ? 'gba:text-xs gba:px-2.5 gba:py-1.5' : ''
          }`}
        >
          {actionIcons[actionPrediction.action]}
          <span>{actionLabels[actionPrediction.action]}</span>
          <span className="gba:text-muted-foreground">({confidencePercent}%)</span>
        </div>
      )}

      {/* Priority prediction */}
      {priorityPrediction && (
        <div
          className={`gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded gba:text-[11px] gba:font-medium ${
            priorityColors[priorityPrediction.priority]
          } ${size === 'md' ? 'gba:text-xs gba:px-2.5 gba:py-1.5' : ''}`}
        >
          <span className="gba:uppercase gba:tracking-wide">{priorityPrediction.priority}</span>
        </div>
      )}
    </div>
  )

  // If no reasoning to show, just return the badge
  if (!showReasoning) {
    return badgeContent
  }

  // Wrap in tooltip with reasoning
  const reasoning = [actionPrediction?.reasoning, priorityPrediction?.reasoning].filter(Boolean).join(' ')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="gba:cursor-help">{badgeContent}</div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="gba:max-w-xs">
        <div className="gba:flex gba:items-start gba:gap-2">
          <Sparkles className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:mt-0.5 gba:flex-shrink-0" />
          <p className="gba:text-xs gba:leading-relaxed">{reasoning}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default AiPredictionBadge
