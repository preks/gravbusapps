/**
 * Spreadsheet-inspired compact toolbar shell with an inline tab dropdown.
 */

import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
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

export interface EditorToolbarRibbonProps {
  editor: Editor | null
  onInsertPageBreak?: () => void
  onOpenLinkDialog?: () => void
  onOpenInsertImageDialog?: () => void
  onOpenInsertTableDialog?: () => void
  onOpenTableSidebar?: () => void
  onOpenPageNumbersDialog?: () => void
  onOpenFind?: () => void
  onOpenReplace?: () => void
  voiceProps?: {
    isSupported: boolean
    isListening: boolean
    volume: number
    error: string | null
    onStartListening: () => void
    onStopListening: () => void
  }
  'data-testid'?: string
}

export function EditorToolbarRibbon({
  editor,
  onInsertPageBreak,
  onOpenLinkDialog,
  onOpenInsertImageDialog,
  onOpenInsertTableDialog,
  onOpenTableSidebar,
  onOpenPageNumbersDialog,
  onOpenFind,
  onOpenReplace,
  voiceProps,
  'data-testid': testId = 'editor-toolbar'
}: Readonly<EditorToolbarRibbonProps>) {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<'home' | 'insert'>('home')

  if (!editor) {
    return null
  }

  const activeTabLabel = activeTab === 'home' ? t('editor-ribbon-tab-home') : t('editor-ribbon-tab-insert')

  return (
    <div
      className="gba:w-full gba:border-t gba:border-border/50 gba:bg-background"
      data-testid={testId ? `${testId}-surface` : undefined}
    >
      <section
        className="gba:flex gba:flex-wrap gba:items-center gba:gap-y-1 gba:bg-background gba:px-4 gba:py-2"
        aria-label={activeTabLabel}
        data-testid={testId ? `${testId}-compact-toolbar` : undefined}
      >
        <div
          className="gba:mr-3 gba:flex gba:items-center gba:self-stretch gba:pr-3 gba:border-r gba:border-border/60"
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
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => setActiveTab('home')}
                data-testid={testId ? `${testId}-tab-home` : undefined}
              >
                {activeTab === 'home' ? (
                  <Check className="gba:mr-2 gba:h-4 gba:w-4" />
                ) : (
                  <span className="gba:mr-2 gba:w-4" />
                )}
                {t('editor-ribbon-tab-home')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setActiveTab('insert')}
                data-testid={testId ? `${testId}-tab-insert` : undefined}
              >
                {activeTab === 'insert' ? (
                  <Check className="gba:mr-2 gba:h-4 gba:w-4" />
                ) : (
                  <span className="gba:mr-2 gba:w-4" />
                )}
                {t('editor-ribbon-tab-insert')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {activeTab === 'home' ? (
          <HomeTabContent
            editor={editor}
            voiceProps={voiceProps}
            onOpenFind={() => onOpenFind?.()}
            onOpenReplace={() => onOpenReplace?.()}
            testId={testId}
          />
        ) : (
          <InsertTabContent
            editor={editor}
            onOpenLinkDialog={onOpenLinkDialog}
            onOpenInsertImageDialog={onOpenInsertImageDialog}
            onOpenInsertTableDialog={onOpenInsertTableDialog}
            onOpenTableSidebar={onOpenTableSidebar}
            onOpenPageNumbersDialog={onOpenPageNumbersDialog}
            onInsertPageBreak={onInsertPageBreak}
            testId={testId}
          />
        )}
      </section>
    </div>
  )
}
