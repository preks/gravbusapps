/**
 * Insert actions rendered inside the compact toolbar surface.
 */

import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { useTranslation } from '@newwork/nw-design-system'
import { Image, Link, SeparatorHorizontal, Table } from 'lucide-react'
import translations from '../../_i18n'
import { ToolbarButton, RibbonGroup } from './editorToolbarShared'
import { TableToolsMenu } from './TableToolsMenu'

interface InsertTabContentProps {
  editor: Editor
  onOpenLinkDialog?: () => void
  onOpenInsertImageDialog?: () => void
  onOpenInsertTableDialog?: () => void
  onInsertPageBreak?: () => void
  testId?: string
}

export function InsertTabContent({
  editor,
  onOpenLinkDialog,
  onOpenInsertImageDialog,
  onOpenInsertTableDialog,
  onInsertPageBreak,
  testId = 'editor-toolbar'
}: Readonly<InsertTabContentProps>) {
  const { t } = useTranslation(translations)

  const handleLinkClick = useCallback(() => {
    if (onOpenLinkDialog) {
      onOpenLinkDialog()
    } else {
      const previousUrl = editor.getAttributes('link').href
      const url = globalThis.prompt(t('editor-toolbar-link-prompt'), previousUrl)
      if (url === null) return
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor, t, onOpenLinkDialog])

  const addImage = useCallback(() => {
    if (onOpenInsertImageDialog) {
      onOpenInsertImageDialog()
      return
    }
    const url = globalThis.prompt(t('editor-toolbar-image-prompt'))
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor, t, onOpenInsertImageDialog])

  const insertTable = useCallback(() => {
    if (onOpenInsertTableDialog) {
      onOpenInsertTableDialog()
    } else {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }, [editor, onOpenInsertTableDialog])

  const insertPageBreak = useCallback(() => {
    editor.chain().focus().setPageBreak().run()
    onInsertPageBreak?.()
  }, [editor, onInsertPageBreak])

  return (
    <RibbonGroup label={t('editor-ribbon-group-insert')} data-testid={`${testId}-group-insert`}>
      <ToolbarButton
        onClick={handleLinkClick}
        isActive={editor.isActive('link')}
        tooltip={t('editor-toolbar-insert-link')}
      >
        <Link className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} tooltip={t('editor-toolbar-insert-image')}>
        <Image className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={insertTable} tooltip={t('editor-toolbar-insert-table')}>
        <Table className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <TableToolsMenu editor={editor} t={t} testId={testId} />
      <ToolbarButton onClick={insertPageBreak} tooltip={t('editor-toolbar-page-break')}>
        <SeparatorHorizontal className="gba:h-4 gba:w-4" />
      </ToolbarButton>
    </RibbonGroup>
  )
}
