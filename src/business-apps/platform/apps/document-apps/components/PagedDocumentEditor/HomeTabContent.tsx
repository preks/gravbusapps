/**
 * Home tab content: Clipboard, Font, Paragraph, Styles, Voice groups.
 */

import React from 'react'
import type { Editor } from '@tiptap/react'
import { ToolbarGroupClipboard } from './ToolbarGroupClipboard'
import { ToolbarGroupFont } from './ToolbarGroupFont'
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
  testId?: string
}

export function HomeTabContent({ editor, voiceProps, testId = 'editor-toolbar' }: Readonly<HomeTabContentProps>) {
  return (
    <>
      <ToolbarGroupClipboard editor={editor} testId={testId} />
      <ToolbarGroupFont editor={editor} testId={testId} />
      <ToolbarGroupParagraph editor={editor} testId={testId} />
      <ToolbarGroupStyles editor={editor} testId={testId} />
      {voiceProps?.isSupported && <ToolbarGroupVoice voiceProps={voiceProps} testId={testId} />}
    </>
  )
}
