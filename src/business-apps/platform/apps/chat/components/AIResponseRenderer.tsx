import React from 'react'
import type { ScheduledMeeting } from '../hooks/useEveryAIChat'
import { MeetingCard } from './MeetingCard'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'

interface AIResponseRendererProps {
  content: string
  scheduledMeeting?: ScheduledMeeting
  accessToken?: string
}

/**
 * Render AI response with clickable entity cards, markdown links, and optional meeting card
 * Now uses unified MarkdownWithChipsRenderer for consistent rendering
 */
export const AIResponseRenderer: React.FC<AIResponseRendererProps> = ({
  content,
  scheduledMeeting,
  accessToken = ''
}) => {
  const renderTextContent = () => {
    return (
      <MarkdownWithChipsRenderer
        content={content}
        accessToken={accessToken}
        variant="chat"
        renderHttpLinksAsChips={true}
        data-testid="ai-response-renderer"
      />
    )
  }

  // Render meeting card with error boundary
  const renderMeetingCard = () => {
    if (!scheduledMeeting) return null

    try {
      return <MeetingCard meeting={scheduledMeeting} />
    } catch (error) {
      console.error('❌ [AIResponseRenderer] Error rendering MeetingCard:', error)
      // Fail silently - show text response only
      return null
    }
  }

  return (
    <div className="gba:space-y-3">
      {renderTextContent()}
      {renderMeetingCard()}
    </div>
  )
}

/**
 * AI Thinking indicator component
 */
export const AIThinkingIndicator: React.FC = () => {
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:py-2">
      <div className="gba:flex gba:gap-1">
        <span
          className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>Every AI is thinking...</span>
    </div>
  )
}

export interface ExpertThinkingIndicatorProps {
  expertName: string
  expertColor?: string
}

/**
 * Expert Thinking indicator component - shows when an AI expert is processing
 */
export const ExpertThinkingIndicator: React.FC<ExpertThinkingIndicatorProps> = ({ expertName, expertColor }) => {
  const color = expertColor || 'var(--nw-primary)'

  return (
    <div
      className="gba:px-4 gba:py-3 gba:border-t gba:border-border/30 gba:bg-muted/30"
      data-testid="expert-thinking-indicator"
    >
      <div className="gba:flex gba:gap-3 gba:items-center">
        {/* Expert Avatar */}
        <div
          className="gba:w-8 gba:h-8 gba:flex-shrink-0 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-bold gba:text-xs"
          style={{ backgroundColor: color }}
        >
          {expertName?.charAt(0)?.toUpperCase() || '?'}
        </div>

        {/* Animated dots and status */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:flex gba:gap-1.5">
            <span
              className="gba:w-2 gba:h-2 gba:rounded-full gba:animate-bounce"
              style={{ backgroundColor: color, animationDelay: '0ms' }}
            />
            <span
              className="gba:w-2 gba:h-2 gba:rounded-full gba:animate-bounce"
              style={{ backgroundColor: color, animationDelay: '150ms' }}
            />
            <span
              className="gba:w-2 gba:h-2 gba:rounded-full gba:animate-bounce"
              style={{ backgroundColor: color, animationDelay: '300ms' }}
            />
          </div>

          <div className="gba:flex gba:flex-col gba:gap-0.5">
            <span className="gba:text-sm gba:font-medium" style={{ color }}>
              {expertName}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground">is analyzing your request...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
