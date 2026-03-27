/**
 * Ribbon group: Undo, Redo, Paste dropdown.
 */

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
import translations from '../../_i18n'
import { ToolbarButton, RibbonGroup } from './editorToolbarShared'
import { pasteClipboardContent, pasteTextOnly, pasteWithMergeFormatting } from './documentClipboardActions'

interface ToolbarGroupClipboardProps {
  editor: Editor
  testId?: string
}

export function ToolbarGroupClipboard({ editor, testId = 'editor-toolbar' }: Readonly<ToolbarGroupClipboardProps>) {
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
            onSelect={() => void pasteClipboardContent(editor)}
            data-testid={testId ? `${testId}-paste-action` : undefined}
          >
            <Clipboard className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-toolbar-paste')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void pasteTextOnly(editor)}
            data-testid={testId ? `${testId}-paste-text-only-action` : undefined}
          >
            <Clipboard className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-toolbar-paste-text-only')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void pasteWithMergeFormatting(editor)}
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
