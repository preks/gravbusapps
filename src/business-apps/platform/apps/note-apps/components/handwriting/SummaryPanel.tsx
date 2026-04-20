/**
 * SummaryPanel Component
 * Displays an AI-generated summary in a modern, collapsible panel with gradient styling.
 */

import React, { useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, Sparkles, Copy, Trash2, Check } from 'lucide-react'
import translations from '../../_i18n'

export interface SummaryPanelProps {
  summary: string
  onDismiss: () => void
  'data-testid'?: string
  defaultExpanded?: boolean
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  summary,
  onDismiss,
  defaultExpanded = true,
  'data-testid': testId = 'summary-panel'
}) => {
  const { t } = useTranslation(translations)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy summary:', error)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDismiss()
  }

  // Create a single-line preview for collapsed state
  const collapsedPreview = summary.trim().replace(/\s+/g, ' ')

  return (
    <div
      className="gba:relative gba:rounded-2xl gba:overflow-hidden gba:border gba:border-info/30"
      data-testid={testId}
    >
      {/* Vibrant gradient background */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-info/15 gba:via-primary/10 gba:to-success/15" />

      {/* Secondary accent layer */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-tr gba:from-transparent gba:via-card/50 gba:to-transparent" />

      {/* Content */}
      <div className="gba:relative">
        {/* Header - clickable to toggle */}
        <div
          className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:cursor-pointer gba:select-none"
          onClick={() => setIsExpanded(v => !v)}
          data-testid={`${testId}-header`}
        >
          {/* AI Icon with gradient */}
          <div className="gba:relative gba:shrink-0">
            <div className="gba:absolute gba:inset-0 gba:rounded-xl gba:bg-info/30 gba:blur-md" />
            <div className="gba:relative gba:flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-xl gba:bg-gradient-to-br gba:from-info gba:to-primary">
              <Sparkles className="gba:w-4 gba:h-4 gba:text-info-foreground" />
            </div>
          </div>

          {/* Title + collapsed preview */}
          <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">{t('summary-title')}</span>
            {!isExpanded && (
              <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground gba:truncate gba:leading-snug">
                {collapsedPreview}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="gba:flex gba:items-center gba:gap-0.5 gba:shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card/80"
              onClick={handleCopy}
              data-testid={`${testId}-copy`}
              aria-label={t('summary-copy-aria')}
            >
              {copied ? <Check className="gba:w-4 gba:h-4 gba:text-success" /> : <Copy className="gba:w-4 gba:h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-destructive/10"
              onClick={handleDelete}
              data-testid={`${testId}-delete`}
              aria-label={t('summary-delete-aria')}
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
              aria-label={isExpanded ? t('summary-collapse-aria') : t('summary-expand-aria')}
            >
              {isExpanded ? <ChevronUp className="gba:w-4 gba:h-4" /> : <ChevronDown className="gba:w-4 gba:h-4" />}
            </Button>
          </div>
        </div>

        {/* Expandable content */}
        <div
          className={`gba:overflow-hidden gba:transition-all gba:duration-300 gba:ease-out ${
            isExpanded ? 'gba:max-h-96 gba:opacity-100' : 'gba:max-h-0 gba:opacity-0'
          }`}
        >
          <div className="gba:mx-4 gba:h-px gba:bg-gradient-to-r gba:from-info/20 gba:via-primary/30 gba:to-success/20" />
          <div className="gba:px-4 gba:py-3">
            <p className="gba:text-sm gba:text-foreground gba:leading-relaxed gba:whitespace-pre-wrap gba:select-text">
              {summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SummaryPanel
