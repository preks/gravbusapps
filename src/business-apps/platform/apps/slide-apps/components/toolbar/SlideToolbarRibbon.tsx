/**
 * SlideToolbarRibbon Component
 *
 * Ribbon-style toolbar with Home, Insert, and Slideshow tabs.
 * Home tab shows contextual formatting tools based on element selection.
 * Insert tab shows element creation tools.
 * Slideshow tab shows presentation, broadcast, and export options.
 */

import React, { useState } from 'react'
import { ToggleGroup, ToggleGroupItem, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { HomeTabContent } from './HomeTabContent'
import { InsertTabContent } from './InsertTabContent'
import { SlideshowTabContent } from './SlideshowTabContent'
import type { ToolbarContext } from '../../hooks/useToolbarContext'
import type { AnySlideElement, SlideTheme, SlideData } from '../slideElements'

export interface SlideToolbarRibbonProps {
  context: ToolbarContext
  canUndo: boolean
  canRedo: boolean
  hasClipboardContent: boolean
  isSynced: boolean
  currentTheme: SlideTheme
  showSpellCheckPanel: boolean
  spellCheckIssueCount: number
  spellCheckIsChecking: boolean
  showNotesPanel?: boolean
  isCastConnected?: boolean
  isCastConnecting?: boolean
  slides?: SlideData[]
  currentSlide?: SlideData
  accessToken?: string
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPaste: () => void
  onAddElement: (element: AnySlideElement) => void
  onUpdateElement: (id: string, updates: Partial<AnySlideElement>) => void
  onShowBackgroundDialog: () => void
  onShowImageDialog: () => void
  onShowVideoDialog: () => void
  onShowLinkDialog: () => void
  onUpdateTheme: (themeId: string) => void
  onToggleSpellCheck: () => void
  onApplyTemplate: (slides: SlideData[], themeId: string) => void
  onPresent?: () => void
  onPresenterView?: () => void
  onPresentInWindow?: () => void
  onCastToDisplay?: () => void
  onToggleNotes?: () => void
  onShowTransitions?: () => void
  onSaveNow?: () => void
  onExportPptx?: () => void
  onExportPdf?: () => void
  onRefineSlide?: () => void
  onGenerateSlides?: () => void
  'data-testid'?: string
}

export function SlideToolbarRibbon({
  context,
  canUndo,
  canRedo,
  hasClipboardContent,
  isSynced,
  currentTheme,
  showSpellCheckPanel,
  spellCheckIssueCount,
  spellCheckIsChecking,
  showNotesPanel = false,
  isCastConnected = false,
  isCastConnecting = false,
  slides = [],
  currentSlide,
  accessToken,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onAddElement,
  onUpdateElement,
  onShowBackgroundDialog,
  onShowImageDialog,
  onShowVideoDialog,
  onShowLinkDialog,
  onUpdateTheme,
  onToggleSpellCheck,
  onApplyTemplate,
  onPresent,
  onPresenterView,
  onPresentInWindow,
  onCastToDisplay,
  onToggleNotes,
  onShowTransitions,
  onSaveNow,
  onExportPptx,
  onExportPdf,
  onRefineSlide,
  onGenerateSlides,
  'data-testid': testId = 'slide-toolbar'
}: Readonly<SlideToolbarRibbonProps>) {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'slideshow'>('home')

  const ribbonTestId = testId ? `${testId}-ribbon-${activeTab}` : undefined

  return (
    <div className="gba:flex gba:flex-col gba:border-b gba:border-border gba:bg-muted/30 gba:w-full">
      <div className="gba:flex gba:items-stretch gba:border-b gba:border-border gba:bg-background">
        <ToggleGroup
          type="single"
          variant="default"
          size="default"
          value={activeTab}
          onValueChange={value => value && setActiveTab(value as 'home' | 'insert' | 'slideshow')}
          className="gba:flex gba:rounded-none gba:border-0 gba:bg-transparent gba:p-0 gba:shadow-none"
          aria-label={t('ribbon-aria-label') || 'Slide editor ribbon'}
        >
          <ToggleGroupItem
            value="home"
            className="gba:rounded-none gba:border-0 gba:border-b-2 gba:border-transparent gba:bg-transparent gba:px-5 gba:py-2.5 gba:text-sm gba:font-medium gba:shadow-none gba:transition-colors gba:hover:bg-transparent gba:hover:text-foreground gba:data-[state=on]:border-primary gba:data-[state=on]:bg-transparent gba:data-[state=on]:text-foreground gba:data-[state=on]:shadow-none gba:first:rounded-none gba:last:rounded-none gba:-mb-px"
            data-testid={testId ? `${testId}-tab-home` : undefined}
          >
            {t('ribbon-tab-home')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="insert"
            className="gba:rounded-none gba:border-0 gba:border-b-2 gba:border-transparent gba:bg-transparent gba:px-5 gba:py-2.5 gba:text-sm gba:font-medium gba:shadow-none gba:transition-colors gba:hover:bg-transparent gba:hover:text-foreground gba:data-[state=on]:border-primary gba:data-[state=on]:bg-transparent gba:data-[state=on]:text-foreground gba:data-[state=on]:shadow-none gba:first:rounded-none gba:last:rounded-none gba:-mb-px"
            data-testid={testId ? `${testId}-tab-insert` : undefined}
          >
            {t('ribbon-tab-insert')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="slideshow"
            className="gba:rounded-none gba:border-0 gba:border-b-2 gba:border-transparent gba:bg-transparent gba:px-5 gba:py-2.5 gba:text-sm gba:font-medium gba:shadow-none gba:transition-colors gba:hover:bg-transparent gba:hover:text-foreground gba:data-[state=on]:border-primary gba:data-[state=on]:bg-transparent gba:data-[state=on]:text-foreground gba:data-[state=on]:shadow-none gba:first:rounded-none gba:last:rounded-none gba:-mb-px"
            data-testid={testId ? `${testId}-tab-slideshow` : undefined}
          >
            {t('ribbon-tab-slideshow')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <section
        className="gba:flex gba:flex-wrap gba:items-center gba:gap-0 gba:p-2 gba:min-h-[40px]"
        aria-label={t(`ribbon-tab-${activeTab}`)}
        data-testid={ribbonTestId}
      >
        {activeTab === 'home' && (
          <HomeTabContent
            context={context}
            canUndo={canUndo}
            canRedo={canRedo}
            hasClipboardContent={hasClipboardContent}
            isSynced={isSynced}
            currentTheme={currentTheme}
            showSpellCheckPanel={showSpellCheckPanel}
            spellCheckIssueCount={spellCheckIssueCount}
            spellCheckIsChecking={spellCheckIsChecking}
            onUndo={onUndo}
            onRedo={onRedo}
            onCopy={onCopy}
            onPaste={onPaste}
            onUpdateElement={onUpdateElement}
            onShowBackgroundDialog={onShowBackgroundDialog}
            onShowLinkDialog={onShowLinkDialog}
            onUpdateTheme={onUpdateTheme}
            onToggleSpellCheck={onToggleSpellCheck}
            testId={testId}
          />
        )}
        {activeTab === 'insert' && (
          <InsertTabContent
            isSynced={isSynced}
            slides={slides}
            currentSlide={currentSlide}
            accessToken={accessToken}
            currentTheme={currentTheme}
            onAddElement={onAddElement}
            onShowImageDialog={onShowImageDialog}
            onShowVideoDialog={onShowVideoDialog}
            onApplyTemplate={onApplyTemplate}
            onRefineSlide={onRefineSlide}
            onGenerateSlides={onGenerateSlides}
            testId={testId}
          />
        )}
        {activeTab === 'slideshow' && (
          <SlideshowTabContent
            showNotesPanel={showNotesPanel}
            isCastConnected={isCastConnected}
            isCastConnecting={isCastConnecting}
            onPresent={onPresent || (() => {})}
            onPresenterView={onPresenterView || (() => {})}
            onPresentInWindow={onPresentInWindow || (() => {})}
            onCastToDisplay={onCastToDisplay || (() => {})}
            onToggleNotes={onToggleNotes || (() => {})}
            onShowTransitions={onShowTransitions || (() => {})}
            onSaveNow={onSaveNow || (() => {})}
            onExportPptx={onExportPptx || (() => {})}
            onExportPdf={onExportPdf || (() => {})}
            testId={testId}
          />
        )}
      </section>
    </div>
  )
}
