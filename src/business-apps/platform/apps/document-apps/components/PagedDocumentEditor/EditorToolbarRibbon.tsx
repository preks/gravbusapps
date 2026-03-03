/**
 * Word-style ribbon shell with Home and Insert tabs.
 * Uses ToggleGroup as a segmented control for a clean ribbon tab look.
 */

import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ToggleGroup, ToggleGroupItem, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { HomeTabContent } from './HomeTabContent'
import { InsertTabContent } from './InsertTabContent'

export interface EditorToolbarRibbonProps {
  editor: Editor | null
  onInsertPageBreak?: () => void
  onOpenLinkDialog?: () => void
  onOpenInsertImageDialog?: () => void
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
  voiceProps,
  'data-testid': testId = 'editor-toolbar'
}: Readonly<EditorToolbarRibbonProps>) {
  const { t } = useTranslation(translations)

  const [activeTab, setActiveTab] = useState<'home' | 'insert'>('home')

  if (!editor) {
    return null
  }

  let ribbonTestId: string | undefined
  if (testId) {
    ribbonTestId = activeTab === 'home' ? `${testId}-ribbon-home` : `${testId}-ribbon-insert`
  } else {
    ribbonTestId = undefined
  }

  return (
    <div className="gba:flex gba:flex-col gba:border-b gba:border-border gba:bg-muted/30 gba:w-full">
      <div className="gba:flex gba:items-stretch gba:border-b gba:border-border gba:bg-background">
        <ToggleGroup
          type="single"
          variant="default"
          size="default"
          value={activeTab}
          onValueChange={value => value && setActiveTab(value as 'home' | 'insert')}
          className="gba:flex gba:rounded-none gba:border-0 gba:bg-transparent gba:p-0 gba:shadow-none"
          aria-label="Editor ribbon"
        >
          <ToggleGroupItem
            value="home"
            className="gba:rounded-none gba:border-0 gba:border-b-2 gba:border-transparent gba:bg-transparent gba:px-5 gba:py-2.5 gba:text-sm gba:font-medium gba:shadow-none gba:transition-colors gba:hover:bg-transparent gba:hover:text-foreground gba:data-[state=on]:border-primary gba:data-[state=on]:bg-transparent gba:data-[state=on]:text-foreground gba:data-[state=on]:shadow-none gba:first:rounded-none gba:last:rounded-none gba:-mb-px"
            data-testid={testId ? `${testId}-tab-home` : undefined}
          >
            {t('editor-ribbon-tab-home')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="insert"
            className="gba:rounded-none gba:border-0 gba:border-b-2 gba:border-transparent gba:bg-transparent gba:px-5 gba:py-2.5 gba:text-sm gba:font-medium gba:shadow-none gba:transition-colors gba:hover:bg-transparent gba:hover:text-foreground gba:data-[state=on]:border-primary gba:data-[state=on]:bg-transparent gba:data-[state=on]:text-foreground gba:data-[state=on]:shadow-none gba:first:rounded-none gba:last:rounded-none gba:-mb-px"
            data-testid={testId ? `${testId}-tab-insert` : undefined}
          >
            {t('editor-ribbon-tab-insert')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <section
        className="gba:flex gba:flex-wrap gba:items-center gba:gap-0 gba:p-2 gba:min-h-[40px]"
        aria-label={activeTab === 'home' ? t('editor-ribbon-tab-home') : t('editor-ribbon-tab-insert')}
        data-testid={ribbonTestId}
      >
        {activeTab === 'home' ? (
          <HomeTabContent editor={editor} voiceProps={voiceProps} testId={testId} />
        ) : (
          <InsertTabContent
            editor={editor}
            onOpenLinkDialog={onOpenLinkDialog}
            onOpenInsertImageDialog={onOpenInsertImageDialog}
            onInsertPageBreak={onInsertPageBreak}
            testId={testId}
          />
        )}
      </section>
    </div>
  )
}
