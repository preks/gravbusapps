/**
 * AiReplyComposer Component
 *
 * An AI-powered reply composition interface that provides:
 * - Suggested reply display with accept/dismiss actions
 * - Text area for manual editing
 * - AI toolbar for writing assistance (improve, tone, expand, shorten, custom)
 * - Integration with existing comment submission flow
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Button, Textarea, toast, useTranslation } from '@newwork/nw-design-system'
import { Sparkles, Check, X, Loader2, Send } from 'lucide-react'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useAiAssistant, useAiCapabilities, useAiFeedback } from '../hooks/useAi'
import { AiToolbar } from './AiToolbar'
import type { TaskSource } from '@/business-apps/core/every/apps/every-api/types/UnifiedTask'
import type { ToneOption } from '@/business-apps/core/every/apps/every-api/services/AiService'
import translations from '../_i18n'

interface AiReplyComposerProps {
  taskId: string
  source: TaskSource
  accessToken?: string
  /** ID of the person being replied to (for context) */
  recipientId?: string
  /** Placeholder text for the textarea */
  placeholder?: string
  /** Called when the user submits their reply */
  onSubmit: (text: string, aiAssisted: boolean) => Promise<void>
  /** Whether submission is in progress */
  isSubmitting?: boolean
  /** Initial text for the composer */
  initialText?: string
  /** Whether to auto-fetch a suggestion on mount */
  autoSuggest?: boolean
  /** Submit button label */
  submitLabel?: string
  /** Whether to show the cancel button */
  showCancel?: boolean
  /** Called when cancel is pressed */
  onCancel?: () => void
}

export const AiReplyComposer: React.FC<AiReplyComposerProps> = ({
  taskId,
  source,
  accessToken,
  recipientId,
  placeholder,
  onSubmit,
  isSubmitting = false,
  initialText = '',
  autoSuggest = false,
  submitLabel,
  showCancel = false,
  onCancel
}) => {
  const { t } = useTranslation(translations)
  const [text, setText] = useState(initialText)
  const [showSuggestion, setShowSuggestion] = useState(false)
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
    error,
    lastAction,
    getSuggestedReply,
    improve,
    changeTone,
    expand,
    shorten,
    applyCustom,
    saveCommunication,
    clearSuggestion
  } = useAiAssistant(taskId, source, accessToken)

  // AI Feedback hook for learning
  const { submitCommunication } = useAiFeedback(accessToken)

  // Auto-suggest on mount if enabled
  useEffect(() => {
    if (autoSuggest && isAiAvailable && !initialText) {
      handleSuggest()
    }
  }, [autoSuggest, isAiAvailable, handleSuggest, initialText])

  // When a suggestion is received, show it
  useEffect(() => {
    if (suggestedReply && lastAction) {
      if (lastAction === 'suggested') {
        // For suggestions, show the suggestion banner
        setShowSuggestion(true)
      } else {
        // For other actions (improve, tone, etc.), directly apply to text
        setText(suggestedReply)
        setAiUsed(true)
        toast.success(t('ai-assistant-applied'))
      }
    }
  }, [suggestedReply, lastAction, t])

  const handleSuggest = useCallback(async () => {
    await getSuggestedReply(recipientId)
  }, [getSuggestedReply, recipientId])

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestedReply) {
      setText(suggestedReply)
      setAiUsed(true)
      setShowSuggestion(false)
      clearSuggestion()
    }
  }, [suggestedReply, clearSuggestion])

  const handleDismissSuggestion = useCallback(() => {
    setShowSuggestion(false)
    clearSuggestion()
  }, [clearSuggestion])

  const handleImprove = useCallback(
    async (draft: string) => {
      await improve(draft)
    },
    [improve]
  )

  const handleTone = useCallback(
    async (textToChange: string, tone: ToneOption) => {
      await changeTone(textToChange, tone)
    },
    [changeTone]
  )

  const handleExpand = useCallback(
    async (textToExpand: string) => {
      await expand(textToExpand)
    },
    [expand]
  )

  const handleShorten = useCallback(
    async (textToShorten: string) => {
      await shorten(textToShorten)
    },
    [shorten]
  )

  const handleCustom = useCallback(
    async (instruction: string, currentText?: string) => {
      await applyCustom(instruction, currentText)
    },
    [applyCustom]
  )

  const handleSubmit = useCallback(async () => {
    const trimmedText = text.trim()
    if (!trimmedText) return

    try {
      await onSubmit(trimmedText, aiUsed)

      // Store communication for AI learning (fire and forget)
      saveCommunication({
        messageType: 'comment',
        content: trimmedText,
        recipientId,
        aiAssisted: aiUsed,
        aiAction: lastAction || undefined
      })

      // Also submit to the feedback learning system
      submitCommunication({
        taskId,
        source,
        recipientId,
        messageContent: trimmedText,
        aiAssisted: aiUsed,
        aiAction: lastAction || undefined
      })

      setText('')
      setAiUsed(false)
      setShowSuggestion(false)
      clearSuggestion()
    } catch {
      // Error handling is done in the parent component
    }
  }, [
    text,
    aiUsed,
    onSubmit,
    saveCommunication,
    submitCommunication,
    taskId,
    source,
    recipientId,
    lastAction,
    clearSuggestion
  ])

  const hasText = text.trim().length > 0

  return (
    <div className="gba:space-y-3" data-testid="ai-reply-composer">
      {/* AI Suggestion Banner */}
      {showSuggestion && suggestedReply && (
        <div
          className="gba:p-4 gba:rounded-lg gba:border gba:border-sky-100 gba:bg-sky-50/60 gba:shadow-sm"
          data-testid="ai-suggestion-banner"
        >
          <div className="gba:flex gba:items-center gba:gap-2.5 gba:mb-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:bg-sky-100">
              <Sparkles className="gba:h-3.5 gba:w-3.5 gba:text-sky-600" />
            </div>
            <span className="gba:text-xs gba:font-semibold gba:text-sky-700 gba:uppercase gba:tracking-wider">
              {t('ai-assistant-suggested-reply')}
            </span>
          </div>
          <p className="gba:text-sm gba:text-foreground/90 gba:leading-relaxed gba:mb-4 gba:whitespace-pre-wrap gba:pl-8">
            {suggestedReply}
          </p>
          <div className="gba:flex gba:items-center gba:gap-2 gba:pl-8">
            <Button
              variant="default"
              size="sm"
              className="gba:h-8 gba:text-xs gba:gap-1.5 gba:font-medium"
              onClick={handleAcceptSuggestion}
            >
              <Check className="gba:h-3.5 gba:w-3.5" />
              {t('ai-assistant-use-this')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-8 gba:text-xs gba:gap-1.5 gba:text-muted-foreground hover:gba:text-foreground"
              onClick={handleDismissSuggestion}
            >
              <X className="gba:h-3.5 gba:w-3.5" />
              {t('ai-assistant-dismiss')}
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:px-3 gba:py-2 gba:rounded-md">
          {error}
        </div>
      )}

      {/* Text area */}
      <div className="gba:relative">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder || t('ai-assistant-placeholder')}
          className="gba:min-h-[100px] gba:resize-none gba:pr-10"
          disabled={isSubmitting}
        />

        {/* Loading indicator in corner when AI is processing */}
        {isLoading && (
          <div className="gba:absolute gba:top-2 gba:right-2">
            <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin gba:text-primary" />
          </div>
        )}
      </div>

      {/* AI Toolbar (only when AI is available) */}
      {isAiAvailable && (
        <AiToolbar
          currentText={text}
          isLoading={isLoading}
          onSuggest={handleSuggest}
          onImprove={handleImprove}
          onTone={handleTone}
          onExpand={handleExpand}
          onShorten={handleShorten}
          onCustom={handleCustom}
          hasText={hasText}
          disabled={isSubmitting}
        />
      )}

      {/* Action buttons */}
      <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
        {showCancel && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            {t('ai-assistant-cancel')}
          </Button>
        )}
        <Button variant="default" size="sm" onClick={handleSubmit} disabled={!hasText || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin gba:mr-1" />
          ) : (
            <Send className="gba:h-4 gba:w-4 gba:mr-1" />
          )}
          {submitLabel || t('ai-assistant-send')}
        </Button>
      </div>

      {/* AI assisted indicator */}
      {aiUsed && (
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground">
          <div className="gba:flex gba:items-center gba:justify-center gba:h-4 gba:w-4 gba:rounded gba:bg-sky-100">
            <Sparkles className="gba:h-2.5 gba:w-2.5 gba:text-sky-600" />
          </div>
          <span className="gba:font-medium">{t('ai-assistant-ai-assisted')}</span>
        </div>
      )}
    </div>
  )
}
