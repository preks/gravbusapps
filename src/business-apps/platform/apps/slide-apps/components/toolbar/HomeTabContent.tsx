/**
 * HomeTabContent Component
 *
 * Content for the Home tab of the ribbon toolbar.
 * Shows core tools (undo/redo, clipboard) plus contextual formatting tools
 * based on the selected element type.
 */

import React from 'react'
import {
  Button,
  Separator,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Undo2, Redo2, Copy, ClipboardPaste, Palette, Grid3X3, SpellCheck, ChevronDown } from 'lucide-react'
import translations from '../../_i18n'
import type { ToolbarContext } from '../../hooks/useToolbarContext'
import type { AnySlideElement, SlideTheme } from '../slideElements'
import type { SlideMaster } from '../../types/slideMaster'
import { SLIDE_THEMES } from '../slideThemes'
import { SlideLayoutPicker } from '../SlideLayoutPicker'
import { TextFormattingTools } from './TextFormattingTools'
import { ShapeFormattingTools } from './ShapeFormattingTools'
import { ImageFormattingTools } from './ImageFormattingTools'
import { ChartFormattingTools } from './ChartFormattingTools'

export interface HomeTabContentProps {
  context: ToolbarContext
  canUndo: boolean
  canRedo: boolean
  hasClipboardContent: boolean
  isSynced: boolean
  currentTheme: SlideTheme
  showSpellCheckPanel: boolean
  spellCheckIssueCount: number
  spellCheckIsChecking: boolean
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPaste: () => void
  onUpdateElement: (id: string, updates: Partial<AnySlideElement>) => void
  onShowBackgroundDialog: () => void
  onShowLinkDialog: () => void
  onUpdateTheme: (themeId: string) => void
  onToggleSpellCheck: () => void
  masters?: SlideMaster[]
  onChangeLayout?: (layoutId: string, masterId: string) => void
  testId?: string
}

export function HomeTabContent({
  context,
  canUndo,
  canRedo,
  hasClipboardContent,
  isSynced,
  currentTheme,
  showSpellCheckPanel,
  spellCheckIssueCount,
  spellCheckIsChecking,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onUpdateElement,
  onShowBackgroundDialog,
  onShowLinkDialog,
  onUpdateTheme,
  onToggleSpellCheck,
  masters,
  onChangeLayout,
  testId
}: HomeTabContentProps) {
  const { t } = useTranslation(translations)

  return (
    <>
      {/* Clipboard Group - Always visible */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title={`${t('editor-undo') || 'Undo'} (Ctrl+Z)`}
          data-testid={testId ? `${testId}-undo` : undefined}
        >
          <Undo2 className="gba:w-4 gba:h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title={`${t('editor-redo') || 'Redo'} (Ctrl+Y)`}
          data-testid={testId ? `${testId}-redo` : undefined}
        >
          <Redo2 className="gba:w-4 gba:h-4" />
        </Button>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          title={`${t('editor-copy') || 'Copy'} (Ctrl+C)`}
          data-testid={testId ? `${testId}-copy` : undefined}
        >
          <Copy className="gba:w-4 gba:h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPaste}
          disabled={!hasClipboardContent}
          title={`${t('editor-paste') || 'Paste'} (Ctrl+V)`}
          data-testid={testId ? `${testId}-paste` : undefined}
        >
          <ClipboardPaste className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Contextual Format Tools - Changes based on selection */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:transition-opacity gba:duration-150">
        {context.type === 'text' && (
          <TextFormattingTools
            element={context.element}
            onUpdateElement={onUpdateElement}
            onShowLinkDialog={onShowLinkDialog}
            testId={testId}
          />
        )}
        {context.type === 'shape' && (
          <ShapeFormattingTools element={context.element} onUpdateElement={onUpdateElement} testId={testId} />
        )}
        {context.type === 'image' && (
          <ImageFormattingTools element={context.element} onUpdateElement={onUpdateElement} testId={testId} />
        )}
        {context.type === 'chart' && (
          <ChartFormattingTools element={context.element} onUpdateElement={onUpdateElement} testId={testId} />
        )}
        {context.type === 'video' && (
          <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:px-2">
            {t('toolbar-video-hint') || 'Use property panel to edit video'}
          </span>
        )}
        {context.type === 'code' && (
          <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:px-2">
            {t('toolbar-code-hint') || 'Use property panel to edit code'}
          </span>
        )}
        {context.type === 'multi' && (
          <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:px-2">
            {t('toolbar-multi-hint', { count: context.count }) || `${context.count} elements selected`}
          </span>
        )}
        {context.type === 'none' && (
          <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:px-2">
            {t('toolbar-select-element-hint') || 'Select an element to format'}
          </span>
        )}
      </div>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

      {/* Design Group - Always visible */}
      <div className="gba:flex gba:items-center gba:gap-1">
        {onChangeLayout && (
          <SlideLayoutPicker
            masters={masters}
            currentTheme={currentTheme}
            onSelectLayout={onChangeLayout}
            mode="change-layout"
            data-testid={testId ? `${testId}-change-layout` : undefined}
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowBackgroundDialog}
          data-testid={testId ? `${testId}-background` : undefined}
        >
          <Palette className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-background')}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" data-testid={testId ? `${testId}-theme` : undefined}>
              <Grid3X3 className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('editor-theme')}
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:w-56">
            {SLIDE_THEMES.map(theme => (
              <DropdownMenuItem
                key={theme.id}
                onClick={() => isSynced && onUpdateTheme(theme.id)}
                data-testid={testId ? `${testId}-theme-${theme.id}` : undefined}
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                  <div className="gba:flex gba:gap-1">
                    <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: theme.preview.primary }} />
                    <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: theme.preview.secondary }} />
                  </div>
                  <span>{t(`theme-${theme.id}`)}</span>
                </div>
                {currentTheme.id === theme.id && (
                  <Badge variant="secondary" className="gba:text-xs">
                    {t('editor-theme-active')}
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={showSpellCheckPanel ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleSpellCheck}
          disabled={spellCheckIsChecking}
          data-testid={testId ? `${testId}-spell-check` : undefined}
        >
          <SpellCheck className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('spell-check-button')}
          {spellCheckIssueCount > 0 && (
            <Badge variant="destructive" className="gba:ml-1 gba:text-xs gba:px-1.5 gba:min-w-[18px]">
              {spellCheckIssueCount}
            </Badge>
          )}
        </Button>
      </div>
    </>
  )
}
