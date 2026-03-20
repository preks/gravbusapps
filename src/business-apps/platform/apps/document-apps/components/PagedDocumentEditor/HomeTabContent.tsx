/**
 * Main compact toolbar content: quick actions, styles, font, paragraph, voice.
 */

import React from 'react'
import type { Editor } from '@tiptap/react'
import { ToolbarGroupClipboard } from './ToolbarGroupClipboard'
import { ToolbarGroupFont } from './ToolbarGroupFont'
import { ToolbarGroupFind } from './ToolbarGroupFind'
import { ToolbarGroupParagraph } from './ToolbarGroupParagraph'
import { ToolbarGroupStyles } from './ToolbarGroupStyles'
import { ToolbarGroupVoice } from './ToolbarGroupVoice'

interface HomeTabContentProps {
  editor: Editor
  voiceProps?: {
    isSupported: boolean
    isListening: boolean
    volume: number
    error: string | null
    onStartListening: () => void
    onStopListening: () => void
  }
  onOpenFind: () => void
  onOpenReplace: () => void
  testId?: string
}

export function HomeTabContent({
  editor,
  voiceProps,
  onOpenFind,
  onOpenReplace,
  testId = 'editor-toolbar'
}: Readonly<HomeTabContentProps>) {
  return (
    <>
      <ToolbarGroupClipboard editor={editor} testId={testId} />
      <ToolbarGroupStyles editor={editor} testId={testId} />
      <ToolbarGroupFont editor={editor} testId={testId} />
      <ToolbarGroupParagraph editor={editor} testId={testId} />
      <ToolbarGroupFind editor={editor} onOpenFind={onOpenFind} onOpenReplace={onOpenReplace} testId={testId} />
      {voiceProps?.isSupported && <ToolbarGroupVoice voiceProps={voiceProps} testId={testId} />}
    </>
  )
}
