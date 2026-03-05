/**
 * AiEditPanel Component
 *
 * AI-powered editing sidebar for document apps.
 * Mirrors the CommentPanel layout and is mutually exclusive with it.
 * Auto-detects editor selection on open. No tabs -- mode is inferred automatically.
 */

import React, { useEffect, useRef, useCallback } from 'react'
import {
  Button,
  ScrollArea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { Sparkles, X, Brain, Zap, Loader2, Check, Undo2 } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import translations from '../../_i18n'
import { useAiEditProvider } from './useAiEditProvider'
import { useAiEdit } from './useAiEdit'
import { AiEditPreview } from './AiEditPreview'

export interface AiEditPanelProps {
  editor: Editor | null
  documentId: string
  documentTitle: string
  onClose: () => void
  currentUserId?: string
  headerHeight?: number
  'data-testid'?: string
}

export const AiEditPanel: React.FC<AiEditPanelProps> = ({
  editor,
  documentId,
  documentTitle,
  onClose,
  currentUserId,
  headerHeight = 120,
  'data-testid': testId = 'ai-edit-panel'
}) => {
  const { t } = useTranslation(translations)
  const { llmProvider, setLlmProvider } = useAiEditProvider(currentUserId)
  const ai = useAiEdit({ editor, documentId, documentTitle, llmProvider })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 200)
  }, [])

  // Submit on Ctrl/Cmd+Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !ai.isProcessing && ai.instruction.trim()) {
        e.preventDefault()
        ai.generate()
      }
    },
    [ai]
  )

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col"
      style={{ top: `${headerHeight}px`, width: 480, zIndex: 50 }}
      data-testid={testId}
    >
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <Sparkles className="gba:h-4 gba:w-4 gba:text-primary" />
          </div>
          <div>
            <h3 className="gba:font-semibold gba:text-sm">{t('ai-edit-title')}</h3>
            <p className="gba:text-xs gba:text-muted-foreground">
              {ai.mode === 'selection' ? t('ai-edit-mode-selection') : t('ai-edit-mode-document')}
            </p>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Provider picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                  llmProvider === 'groq'
                    ? 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
                    : 'gba:bg-info-secondary gba:text-info-secondary-foreground'
                }`}
                data-testid="ai-edit-llm-toggle"
                title={llmProvider === 'groq' ? t('ai-edit-fast-mode') : t('ai-edit-smart-mode')}
              >
                {llmProvider === 'groq' ? (
                  <Zap className="gba:h-3.5 gba:w-3.5" />
                ) : (
                  <Brain className="gba:h-3.5 gba:w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLlmProvider('openai')} data-testid="ai-edit-llm-smart">
                <Brain className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-info" />
                {t('ai-edit-smart')} {llmProvider === 'openai' ? t('ai-edit-active') : ''}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLlmProvider('groq')} data-testid="ai-edit-llm-fast">
                <Zap className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-warning" />
                {t('ai-edit-fast')} {llmProvider === 'groq' ? t('ai-edit-active') : ''}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="ai-edit-panel-close"
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-muted"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>

      {/* Selection indicator with clear button */}
      {ai.mode === 'selection' && ai.capturedSelection && (
        <div className="gba:flex gba:items-start gba:gap-2 gba:px-4 gba:py-3 gba:bg-info-secondary/30 gba:border-b gba:border-border/50">
          <div className="gba:flex-1 gba:min-w-0">
            <p className="gba:text-xs gba:font-medium gba:text-info-secondary-foreground gba:mb-0.5">
              {t('ai-edit-selected-text')}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">
              &ldquo;{ai.capturedSelection.plainText.slice(0, 150)}
              {ai.capturedSelection.plainText.length > 150 ? '...' : ''}&rdquo;
            </p>
          </div>
          <button
            onClick={ai.clearSelection}
            className="gba:flex-shrink-0 gba:mt-0.5 gba:p-1 gba:rounded gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/50 gba:transition-colors"
            title={t('ai-edit-clear-selection-title')}
            data-testid="ai-edit-clear-selection"
          >
            <X className="gba:h-3.5 gba:w-3.5" />
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="gba:flex-1 gba:overflow-hidden gba:flex gba:flex-col">
        <ScrollArea className="gba:flex-1">
          <div className="gba:px-4 gba:py-4 gba:space-y-4">
            {/* Instruction input */}
            <div className="gba:space-y-2">
              <label className="gba:text-xs gba:font-medium gba:text-foreground">
                {t('ai-edit-instruction-label')}
              </label>
              <Textarea
                ref={textareaRef}
                value={ai.instruction}
                onChange={e => ai.setInstruction(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('ai-edit-placeholder')}
                className="gba:min-h-[80px] gba:resize-none gba:text-sm"
                disabled={ai.isProcessing}
                data-testid="ai-edit-instruction"
              />
              <p className="gba:text-[10px] gba:text-muted-foreground">{t('ai-edit-ctrl-enter-hint')}</p>
            </div>

            {/* Error */}
            {ai.error && (
              <div className="gba:rounded-lg gba:bg-destructive-secondary gba:p-3" data-testid="ai-edit-error">
                <p className="gba:text-xs gba:text-destructive-secondary-foreground">{ai.error}</p>
              </div>
            )}

            {/* Preview */}
            {ai.previewHtml && (
              <AiEditPreview
                html={ai.previewHtml}
                mode={ai.mode}
                changeSummary={ai.changeSummary}
                isApplied={ai.isApplied}
                data-testid="ai-edit-preview"
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Action buttons */}
      <div className="gba:p-4 gba:border-t gba:border-border/50 gba:bg-muted/20 gba:space-y-2">
        {!ai.previewHtml && !ai.isApplied && (
          <Button
            onClick={ai.generate}
            disabled={ai.isProcessing || !ai.instruction.trim()}
            className="gba:w-full"
            data-testid="ai-edit-generate"
          >
            {ai.isProcessing ? (
              <>
                <Loader2 className="gba:h-4 gba:w-4 gba:mr-2 gba:animate-spin" />
                {t('ai-edit-generating')}
              </>
            ) : (
              <>
                <Sparkles className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('ai-edit-generate-preview')}
              </>
            )}
          </Button>
        )}

        {ai.previewHtml && !ai.isApplied && (
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={ai.reset} className="gba:flex-1" data-testid="ai-edit-discard">
              {t('ai-edit-discard')}
            </Button>
            <Button onClick={ai.apply} className="gba:flex-1" data-testid="ai-edit-apply">
              <Check className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('ai-edit-apply')}
            </Button>
          </div>
        )}

        {ai.isApplied && (
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={ai.undo} className="gba:flex-1" data-testid="ai-edit-undo">
              <Undo2 className="gba:h-4 gba:w-4 gba:mr-2" />
              Undo
            </Button>
            <Button onClick={ai.reset} className="gba:flex-1" data-testid="ai-edit-new">
              <Sparkles className="gba:h-4 gba:w-4 gba:mr-2" />
              New Edit
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
