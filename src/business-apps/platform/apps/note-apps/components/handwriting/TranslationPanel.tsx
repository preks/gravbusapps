/**
 * TranslationPanel Component
 * Displays one translation result (persisted) in a modern, collapsible panel.
 */

import React, { useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, Languages, Copy, Trash2, Check } from 'lucide-react'
import type { NoteTranslation } from '../../types'
import translations from '../../_i18n'

export interface TranslationPanelProps {
  translation: NoteTranslation
  onDelete: (id: string) => void
  'data-testid'?: string
  defaultExpanded?: boolean
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  translation,
  onDelete,
  defaultExpanded = false,
  'data-testid': testId = 'translation-panel'
}) => {
  const { t } = useTranslation(translations)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const collapsedPreview = translation.text.trim().replace(/\s+/g, ' ')

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(translation.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy translation:', error)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(translation.id)
  }

  return (
    <div
      className="gba:relative gba:rounded-2xl gba:overflow-hidden gba:border gba:border-primary/20"
      data-testid={testId}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/10 gba:via-accent/10 gba:to-secondary/10" />
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-tr gba:from-transparent gba:via-card/60 gba:to-transparent" />

      <div className="gba:relative">
        <div
          className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:cursor-pointer gba:select-none"
          onClick={() => setIsExpanded(v => !v)}
          data-testid={`${testId}-header`}
        >
          <div className="gba:relative gba:shrink-0">
            <div className="gba:absolute gba:inset-0 gba:rounded-xl gba:bg-primary/25 gba:blur-md" />
            <div className="gba:relative gba:flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-xl gba:bg-gradient-to-br gba:from-primary gba:to-accent">
              <Languages className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
            </div>
          </div>

          <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">{t('translation-title')}</span>
              <span className="gba:text-xs gba:text-muted-foreground gba:truncate">
                {t('translation-to', { language: translation.targetLanguageName })}
              </span>
            </div>
            {!isExpanded && (
              <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground gba:truncate gba:leading-snug">
                {collapsedPreview}
              </p>
            )}
          </div>

          <div className="gba:flex gba:items-center gba:gap-0.5 gba:shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card/80"
              onClick={handleCopy}
              data-testid={`${testId}-copy`}
              aria-label={t('translation-copy-aria')}
            >
              {copied ? <Check className="gba:w-4 gba:h-4 gba:text-success" /> : <Copy className="gba:w-4 gba:h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-destructive/10"
              onClick={handleDelete}
              data-testid={`${testId}-delete`}
              aria-label={t('translation-delete-aria')}
            >
              <Trash2 className="gba:w-4 gba:h-4" />
            </Button>
            <div className="gba:w-px gba:h-5 gba:bg-border/50 gba:mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card/80"
              onClick={e => {
                e.stopPropagation()
                setIsExpanded(v => !v)
              }}
              data-testid={`${testId}-toggle`}
              aria-label={isExpanded ? t('translation-collapse-aria') : t('translation-expand-aria')}
            >
              {isExpanded ? <ChevronUp className="gba:w-4 gba:h-4" /> : <ChevronDown className="gba:w-4 gba:h-4" />}
            </Button>
          </div>
        </div>

        <div
          className={`gba:overflow-hidden gba:transition-all gba:duration-300 gba:ease-out ${
            isExpanded ? 'gba:max-h-96 gba:opacity-100' : 'gba:max-h-0 gba:opacity-0'
          }`}
        >
          <div className="gba:mx-4 gba:h-px gba:bg-gradient-to-r gba:from-primary/20 gba:via-accent/30 gba:to-secondary/20" />
          <div className="gba:px-4 gba:py-3">
            <div className="gba:max-h-64 gba:overflow-y-auto gba:pr-2 gba:overscroll-contain">
              <p className="gba:text-sm gba:text-foreground gba:leading-relaxed gba:whitespace-pre-wrap gba:select-text">
                {translation.text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TranslationPanel
