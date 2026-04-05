/**
 * Insert actions rendered inside the compact toolbar surface.
 */

import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { useTranslation } from '@newwork/nw-design-system'
import { Hash, Image, Link, ListTree, PenLine, SeparatorHorizontal, Table } from 'lucide-react'
import translations from '../../_i18n'
import type { PageLayoutPaginationConfig } from '../../utils/pageLayoutUtils'
import { buildInitialInsertedImageAttrs } from '../../utils/initialInsertedImageLayout'
import { ToolbarButton, RibbonGroup } from './editorToolbarShared'
import { TableToolsMenu } from './TableToolsMenu'

interface InsertTabContentProps {
  editor: Editor
  paginationConfig?: PageLayoutPaginationConfig | null
  onOpenLinkDialog?: () => void
  onOpenInsertImageDialog?: () => void
  onOpenInsertSignatureDialog?: () => void
  onOpenInsertTableDialog?: () => void
  onOpenTableSidebar?: () => void
  onOpenPageNumbersDialog?: () => void
  onInsertPageBreak?: () => void
  testId?: string
}

export function InsertTabContent({
  editor,
  paginationConfig = null,
  onOpenLinkDialog,
  onOpenInsertImageDialog,
  onOpenInsertSignatureDialog,
  onOpenInsertTableDialog,
  onOpenTableSidebar,
  onOpenPageNumbersDialog,
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
    if (!url) return
    void (async () => {
      try {
        const attrs = await buildInitialInsertedImageAttrs({
          src: url,
          paginationConfig: paginationConfig ?? null,
          editor,
          insertPos: editor.state.selection.from
        })
        editor.chain().focus().setImage(attrs).run()
      } catch {
        editor.chain().focus().setImage({ src: url }).run()
      }
    })()
  }, [editor, paginationConfig, t, onOpenInsertImageDialog])

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

  const insertTableOfContents = useCallback(() => {
    editor.chain().focus().insertDocumentTableOfContents().run()
  }, [editor])

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
      <ToolbarButton
        onClick={() => onOpenInsertSignatureDialog?.()}
        tooltip={t('editor-toolbar-insert-signature')}
        data-testid={`${testId}-insert-signature`}
      >
        <PenLine className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={insertTable} tooltip={t('editor-toolbar-insert-table')}>
        <Table className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <TableToolsMenu editor={editor} t={t} testId={testId} onOpenSidebar={onOpenTableSidebar} />
      <ToolbarButton
        onClick={insertTableOfContents}
        tooltip={t('editor-toolbar-insert-table-of-contents')}
        data-testid={`${testId}-insert-toc`}
      >
        <ListTree className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      {onOpenPageNumbersDialog && (
        <ToolbarButton onClick={onOpenPageNumbersDialog} tooltip={t('editor-toolbar-page-numbers')}>
          <Hash className="gba:h-4 gba:w-4" />
        </ToolbarButton>
      )}
      <ToolbarButton onClick={insertPageBreak} tooltip={t('editor-toolbar-page-break')}>
        <SeparatorHorizontal className="gba:h-4 gba:w-4" />
      </ToolbarButton>
    </RibbonGroup>
  )
}
