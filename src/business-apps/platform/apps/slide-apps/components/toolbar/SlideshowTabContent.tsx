/**
 * SlideshowTabContent Component
 *
 * Content for the Slideshow tab of the ribbon toolbar.
 * Contains presentation, broadcast, view, and export controls.
 */

import React from 'react'
import { Button, Separator, useTranslation } from '@newwork/nw-design-system'
import { Play, StickyNote, ExternalLink, Cast, Save, FileDown, Sparkles } from 'lucide-react'
import translations from '../../_i18n'

export interface SlideshowTabContentProps {
  showNotesPanel: boolean
  isCastConnected: boolean
  isCastConnecting: boolean
  onPresent: () => void
  onPresenterView: () => void
  onPresentInWindow: () => void
  onCastToDisplay: () => void
  onToggleNotes: () => void
  onShowTransitions: () => void
  onSaveNow: () => void
  onExportPptx: () => void
  onExportPdf: () => void
  testId?: string
}

export function SlideshowTabContent({
  showNotesPanel,
  isCastConnected,
  isCastConnecting,
  onPresent,
  onPresenterView,
  onPresentInWindow,
  onCastToDisplay,
  onToggleNotes,
  onShowTransitions,
  onSaveNow,
  onExportPptx,
  onExportPdf,
  testId
}: SlideshowTabContentProps) {
  const { t } = useTranslation(translations)

  return (
    <>
      {/* Start Group */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('slideshow-start-group')}</span>
        <Button variant="default" size="sm" onClick={onPresent} data-testid={testId ? `${testId}-present` : undefined}>
          <Play className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-present')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPresenterView}
          data-testid={testId ? `${testId}-presenter-view` : undefined}
        >
          <StickyNote className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-presenter-view')}
        </Button>
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Broadcast Group */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('slideshow-broadcast-group')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPresentInWindow}
          disabled={isCastConnected || isCastConnecting}
          data-testid={testId ? `${testId}-present-window` : undefined}
        >
          <ExternalLink className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-present-window')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCastToDisplay}
          disabled={isCastConnected || isCastConnecting}
          data-testid={testId ? `${testId}-cast` : undefined}
        >
          <Cast className="gba:w-4 gba:h-4 gba:mr-1" />
          {isCastConnecting ? t('slideshow-cast-connecting') : t('slideshow-cast')}
        </Button>
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* View Group */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('slideshow-view-group')}</span>
        <Button
          variant={showNotesPanel ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleNotes}
          data-testid={testId ? `${testId}-notes` : undefined}
        >
          <StickyNote className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-speaker-notes')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowTransitions}
          data-testid={testId ? `${testId}-transitions` : undefined}
        >
          <Sparkles className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-transitions')}
        </Button>
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Export Group */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('slideshow-export-group')}</span>
        <Button variant="ghost" size="sm" onClick={onSaveNow} data-testid={testId ? `${testId}-save-now` : undefined}>
          <Save className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-save-now')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExportPptx}
          data-testid={testId ? `${testId}-export-pptx` : undefined}
        >
          <FileDown className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-export-pptx')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExportPdf}
          data-testid={testId ? `${testId}-export-pdf` : undefined}
        >
          <FileDown className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-export-pdf')}
        </Button>
      </div>
    </>
  )
}
