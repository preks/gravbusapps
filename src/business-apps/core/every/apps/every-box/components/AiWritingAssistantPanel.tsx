/**
 * AiWritingAssistantPanel Component
 * Side panel for AI writing assistance
 */

import React, { useState } from 'react'
import { Button, useTranslation, Textarea, toast } from '@newwork/nw-design-system'
import { WandSparkles } from 'lucide-react'
import { AiToolbar } from './AiToolbar'
import { useAiAssistant, useAiCapabilities } from '../hooks/useAi'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import type { ToneOption } from '@/business-apps/core/every/apps/every-api/services/AiService'
import type { UnifiedTask } from '../types'
import translations from '../_i18n'

interface AiWritingAssistantPanelProps {
  taskId: string
  source: 'cflow' | 'kogito'
  accessToken?: string
  task: UnifiedTask
}

export const AiWritingAssistantPanel: React.FC<AiWritingAssistantPanelProps> = ({
  taskId,
  source,
  accessToken,
  task
}) => {
  const { t } = useTranslation(translations)
  const [draftText, setDraftText] = useState('')
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
    clearSuggestion
  } = useAiAssistant(taskId, source, accessToken)

  // Apply suggestions to draft
  React.useEffect(() => {
    if (suggestedReply && lastAction) {
      setDraftText(suggestedReply)
      setAiUsed(true)
      clearSuggestion()
      toast.success(t('ai-assistant-applied'))
    }
  }, [suggestedReply, lastAction, clearSuggestion, t])

  const handleCopy = () => {
    if (draftText) {
      navigator.clipboard.writeText(draftText)
      toast.success(t('ai-assistant-copied'))
    }
  }

  if (!isAiAvailable) {
    return (
      <div className="gba:p-4 gba:text-sm gba:text-muted-foreground gba:text-center">AI features are not available</div>
    )
  }

  return (
    <div className="gba:p-4 gba:space-y-3 gba:h-full gba:overflow-auto">
      <div>
        <h3 className="gba:font-semibold gba:text-sm gba:mb-2">{t('ai-assistant-draft-helper')}</h3>
        <p className="gba:text-xs gba:text-muted-foreground">
          Use AI to help draft your response, then copy it to the comment field.
        </p>
      </div>

      {/* Show task context the AI will use */}
      <div className="gba:text-xs gba:bg-muted/50 gba:p-3 gba:rounded gba:space-y-2 gba:max-h-96 gba:overflow-y-auto">
        <div className="gba:font-semibold gba:text-foreground">Task Context:</div>
        <div className="gba:text-muted-foreground gba:space-y-2">
          <div>
            <strong>Task:</strong> {task.title || task.name}
          </div>

          {task.message && (
            <div className="gba:border-l-2 gba:border-primary/30 gba:pl-2">
              <strong>Message:</strong>
              <div className="gba:whitespace-pre-wrap gba:mt-1">{task.message}</div>
            </div>
          )}

          {task.description && task.description !== task.message && (
            <div className="gba:border-l-2 gba:border-primary/30 gba:pl-2">
              <strong>Description:</strong>
              <div className="gba:whitespace-pre-wrap gba:mt-1">{task.description}</div>
            </div>
          )}

          {task.sourceMetadata?.creatorName && (
            <div>
              <strong>From:</strong> {task.sourceMetadata.creatorName as string}
            </div>
          )}

          {task.type && (
            <div>
              <strong>Type:</strong> {task.type}
            </div>
          )}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:italic gba:pt-1 gba:border-t gba:mt-2">
          💡 The AI also has access to your writing style and communication history with{' '}
          {task.sourceMetadata?.creatorName ? `${task.sourceMetadata.creatorName}` : 'this person'}
        </div>
      </div>

      {error && (
        <div className="gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:px-3 gba:py-2 gba:rounded-md">
          {error}
        </div>
      )}

      <Textarea
        placeholder={t('ai-assistant-draft-placeholder')}
        value={draftText}
        onChange={e => setDraftText(e.target.value)}
        rows={8}
        className="gba:w-full"
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

      {aiUsed && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
          <WandSparkles className="gba:h-3 gba:w-3" />
          <span>{t('ai-assistant-ai-assisted')}</span>
        </div>
      )}

      {draftText.trim() && (
        <Button onClick={handleCopy} className="gba:w-full" size="sm" variant="outline">
          {t('ai-assistant-copy')}
        </Button>
      )}
    </div>
  )
}
