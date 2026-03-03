/**
 * Ribbon group: Undo, Redo.
 */

import React from 'react'
import type { Editor } from '@tiptap/react'
import { Undo, Redo } from 'lucide-react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { ToolbarButton, RibbonGroup } from './editorToolbarShared'

interface ToolbarGroupClipboardProps {
  editor: Editor
  testId?: string
}

export function ToolbarGroupClipboard({ editor, testId = 'editor-toolbar' }: ToolbarGroupClipboardProps) {
  const { t } = useTranslation(translations)
  return (
    <RibbonGroup
      label={t('editor-ribbon-group-clipboard')}
      data-testid={testId ? `${testId}-group-clipboard` : undefined}
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        tooltip={t('editor-toolbar-undo')}
      >
        <Undo className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        tooltip={t('editor-toolbar-redo')}
      >
        <Redo className="gba:h-4 gba:w-4" />
      </ToolbarButton>
    </RibbonGroup>
  )
}
