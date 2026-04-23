/**
 * Compact ribbon toolbar with an inline dropdown tab selector.
 * Tabs: Home (contextual formatting), Insert (element creation), Slideshow (present/export).
 */

import { useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Check, ChevronDown } from 'lucide-react'
import translations from '../../_i18n'
import { HomeTabContent } from './HomeTabContent'
import { InsertTabContent } from './InsertTabContent'
import { SlideshowTabContent } from './SlideshowTabContent'
import type { ToolbarContext } from '../../hooks/useToolbarContext'
import type { AnySlideElement, SlideData } from '../slideElements'
import type { SlideTheme } from '../slideThemes'

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
  onApplyTemplate: (
    slides: SlideData[],
    themeId: string,
    masters?: import('../../types/slideMaster').SlideMaster[]
  ) => void
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
  onOpenMasterView?: () => void
  masters?: import('../../types/slideMaster').SlideMaster[]
  onChangeLayout?: (layoutId: string, masterId: string) => void
  'data-testid'?: string
}

type RibbonTab = 'home' | 'insert' | 'slideshow'

const TABS: { id: RibbonTab; labelKey: string; descKey: string }[] = [
  { id: 'home', labelKey: 'ribbon-tab-home', descKey: 'ribbon-tab-home-desc' },
  { id: 'insert', labelKey: 'ribbon-tab-insert', descKey: 'ribbon-tab-insert-desc' },
  { id: 'slideshow', labelKey: 'ribbon-tab-slideshow', descKey: 'ribbon-tab-slideshow-desc' }
]

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
  onOpenMasterView,
  masters,
  onChangeLayout,
  'data-testid': testId = 'slide-toolbar'
}: Readonly<SlideToolbarRibbonProps>) {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<RibbonTab>('home')

  const activeTabLabel = t(`ribbon-tab-${activeTab}`)

  return (
    <div
      className="gba:w-full gba:border-b gba:border-border gba:bg-background"
      data-testid={testId ? `${testId}-surface` : undefined}
    >
      <section
        className="gba:flex gba:items-stretch gba:bg-background gba:px-4 gba:min-h-[2.75rem]"
        aria-label={activeTabLabel}
        data-testid={testId ? `${testId}-ribbon-${activeTab}` : undefined}
      >
        <div
          className="gba:mr-3 gba:flex gba:items-center gba:pr-3 gba:border-r gba:border-border/60 gba:shrink-0"
          data-testid={testId ? `${testId}-tab-selector` : undefined}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-7 gba:gap-1 gba:rounded-md gba:border gba:border-foreground gba:bg-foreground gba:px-2.5 gba:text-xs gba:font-medium gba:text-background hover:gba:bg-foreground/90 hover:gba:text-background"
                data-testid={testId ? `${testId}-tab-trigger` : undefined}
              >
                {activeTabLabel}
                <ChevronDown className="gba:h-3 gba:w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-64">
              {TABS.map(tab => (
                <DropdownMenuItem
                  key={tab.id}
                  onSelect={() => setActiveTab(tab.id)}
                  data-testid={testId ? `${testId}-tab-${tab.id}` : undefined}
                  className="gba:flex gba:items-start gba:gap-2 gba:py-2"
                >
                  {activeTab === tab.id ? (
                    <Check className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0" />
                  ) : (
                    <span className="gba:mt-0.5 gba:w-4 gba:shrink-0" />
                  )}
                  <div className="gba:flex gba:flex-col">
                    <span className="gba:text-sm gba:font-medium">{t(tab.labelKey)}</span>
                    <span className="gba:text-xs gba:text-muted-foreground">{t(tab.descKey)}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="gba:flex-1 gba:min-w-0 gba:py-1.5">
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
              masters={masters}
              onChangeLayout={onChangeLayout}
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
              onOpenMasterView={onOpenMasterView}
              testId={testId}
            />
          )}
        </div>
      </section>
    </div>
  )
}
