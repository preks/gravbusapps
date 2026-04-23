/**
 * SlideshowTabContent Component
 *
 * Content for the Slideshow tab of the ribbon toolbar.
 * Contains presentation, broadcast, view, and export controls.
 */

import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Play,
  StickyNote,
  ExternalLink,
  Cast,
  Save,
  FileDown,
  Sparkles,
  LayoutTemplate,
  ChevronDown
} from 'lucide-react'
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
  onOpenMasterView?: () => void
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
  onOpenMasterView,
  testId
}: SlideshowTabContentProps) {
  const { t } = useTranslation(translations)

  const groupClass =
    'gba:flex gba:items-center gba:gap-1 gba:pr-3 gba:mr-1 gba:border-r gba:border-border/40 gba:border-t gba:border-t-border/40 gba:pt-1.5'
  const lastGroupClass = 'gba:flex gba:items-center gba:gap-1 gba:border-t gba:border-t-border/40 gba:pt-1.5'

  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:-mt-1.5 gba:overflow-hidden">
      {/* Start Group */}
      <div className={groupClass}>
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

      {/* Broadcast Group */}
      <div className={groupClass}>
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

      {/* View Group */}
      <div className={groupClass}>
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
        {onOpenMasterView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenMasterView}
            data-testid={testId ? `${testId}-master-view` : undefined}
          >
            <LayoutTemplate className="gba:w-4 gba:h-4 gba:mr-1" />
            {t('slideshow-slide-master') || 'Slide Master'}
          </Button>
        )}
      </div>

      {/* Export Group */}
      <div className={lastGroupClass}>
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('slideshow-export-group')}</span>
        <Button variant="ghost" size="sm" onClick={onSaveNow} data-testid={testId ? `${testId}-save-now` : undefined}>
          <Save className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('slideshow-save-now')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" data-testid={testId ? `${testId}-export` : undefined}>
              <FileDown className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('slideshow-export-group')}
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onExportPptx} data-testid={testId ? `${testId}-export-pptx` : undefined}>
              <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('slideshow-export-pptx')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPdf} data-testid={testId ? `${testId}-export-pdf` : undefined}>
              <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('slideshow-export-pdf')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
