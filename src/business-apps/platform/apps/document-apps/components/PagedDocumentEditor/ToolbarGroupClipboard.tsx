/**
 * Ribbon group: Undo, Redo, Paste dropdown.
 */

import React from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown, Clipboard, Redo, Undo } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import DOMPurify from 'dompurify'
import translations from '../../_i18n'
import { ToolbarButton, RibbonGroup } from './editorToolbarShared'

interface ToolbarGroupClipboardProps {
  editor: Editor
  testId?: string
}

export function ToolbarGroupClipboard({ editor, testId = 'editor-toolbar' }: Readonly<ToolbarGroupClipboardProps>) {
  const { t } = useTranslation(translations)

  const pasteClipboardContent = async () => {
    if (globalThis.navigator?.clipboard?.read) {
      const items = await globalThis.navigator.clipboard.read()
      for (const item of items) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html')
          const html = await blob.text()
          const sanitized = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }) || ''
          if (sanitized) {
            editor.chain().focus().insertContent(sanitized).run()
            return
          }
        }
      }
    }

    if (globalThis.navigator?.clipboard?.readText) {
      const text = await globalThis.navigator.clipboard.readText()
      if (text) {
        editor.chain().focus().insertContent(text).run()
      }
    }
  }

  const pasteTextOnly = async () => {
    const text = await globalThis.navigator?.clipboard?.readText?.()
    if (text) {
      editor.chain().focus().insertContent(text).run()
    }
  }

  const pasteWithMergeFormatting = async () => {
    const text = await globalThis.navigator?.clipboard?.readText?.()
    if (text) {
      editor.chain().focus().insertText(text).run()
    }
  }

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-8 gba:px-2 gba:gap-1 gba:text-muted-foreground hover:gba:text-foreground"
            data-testid={testId ? `${testId}-paste-trigger` : undefined}
            title={t('editor-toolbar-paste')}
          >
            <Clipboard className="gba:h-4 gba:w-4" />
            <ChevronDown className="gba:h-3 gba:w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => void pasteClipboardContent()}
            data-testid={testId ? `${testId}-paste-action` : undefined}
          >
            <Clipboard className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-toolbar-paste')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void pasteTextOnly()}
            data-testid={testId ? `${testId}-paste-text-only-action` : undefined}
          >
            <Clipboard className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-toolbar-paste-text-only')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void pasteWithMergeFormatting()}
            data-testid={testId ? `${testId}-paste-merge-formatting-action` : undefined}
          >
            <Clipboard className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-toolbar-paste-merge-formatting')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </RibbonGroup>
  )
}
