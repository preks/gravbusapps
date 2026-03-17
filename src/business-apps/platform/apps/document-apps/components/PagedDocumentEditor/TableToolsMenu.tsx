import React from 'react'
import { useCallback, useMemo } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { ChevronDown, Table } from 'lucide-react'

interface TableToolsMenuProps {
  editor: Editor
  t: (key: string) => string
  testId: string
}

type TableCanCommands = ReturnType<Editor['can']> & {
  duplicateRow: () => boolean
  duplicateColumn: () => boolean
  setTableLayout: (options: { width?: string; align?: 'left' | 'center' | 'right'; mode?: string }) => boolean
}

type TableChain = ReturnType<Editor['chain']> & {
  duplicateRow: () => TableChain
  duplicateColumn: () => TableChain
  setTableWidth: (width: string) => TableChain
  setTableWidthMode: (mode: string) => TableChain
  setTableLayout: (options: { width?: string; align?: 'left' | 'center' | 'right'; mode?: string }) => TableChain
  setTableAlign: (align: 'left' | 'center' | 'right') => TableChain
}

function isInsideTable(editor: Editor) {
  const { $from } = editor.state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const nodeName = $from.node(depth).type.name
    if (nodeName === 'table' || nodeName === 'tableRow' || nodeName === 'tableCell' || nodeName === 'tableHeader') {
      return true
    }
  }

  return false
}

function getCurrentCellAttributes(editor: Editor) {
  const tableCellAttrs = editor.getAttributes('tableCell')
  const tableHeaderAttrs = editor.getAttributes('tableHeader')

  return {
    backgroundColor: tableCellAttrs.backgroundColor ?? tableHeaderAttrs.backgroundColor ?? '',
    borderColor: tableCellAttrs.borderColor ?? tableHeaderAttrs.borderColor ?? ''
  }
}

export function TableToolsMenu({ editor, t, testId }: Readonly<TableToolsMenuProps>) {
  const tableToolsEnabled = useMemo(() => isInsideTable(editor), [editor, editor.state])
  const canCommands = editor.can() as TableCanCommands
  const runTableChain = () => editor.chain().focus() as TableChain

  const promptTableWidth = useCallback(() => {
    if (!tableToolsEnabled) return

    const currentWidth = String(editor.getAttributes('table').tableWidth ?? '100%')
    const nextWidth = globalThis.prompt(t('editor-toolbar-table-width-prompt'), currentWidth)

    if (nextWidth == null) return

    runTableChain().setTableWidth(nextWidth).run()
  }, [editor, t, tableToolsEnabled])

  const promptBackgroundColor = useCallback(() => {
    if (!tableToolsEnabled) return

    const currentColor = String(getCurrentCellAttributes(editor).backgroundColor)
    const nextColor = globalThis.prompt(t('editor-toolbar-table-fill-prompt'), currentColor)

    if (nextColor == null) return

    editor
      .chain()
      .focus()
      .setCellAttribute('backgroundColor', nextColor.trim() || null)
      .run()
  }, [editor, t, tableToolsEnabled])

  const promptBorderColor = useCallback(() => {
    if (!tableToolsEnabled) return

    const currentColor = String(getCurrentCellAttributes(editor).borderColor)
    const nextColor = globalThis.prompt(t('editor-toolbar-table-border-prompt'), currentColor)

    if (nextColor == null) return

    editor
      .chain()
      .focus()
      .setCellAttribute('borderColor', nextColor.trim() || null)
      .run()
  }, [editor, t, tableToolsEnabled])

  const canAddRowBefore = tableToolsEnabled && canCommands.addRowBefore()
  const canAddRowAfter = tableToolsEnabled && canCommands.addRowAfter()
  const canDeleteRow = tableToolsEnabled && canCommands.deleteRow()
  const canDuplicateRow = tableToolsEnabled && canCommands.duplicateRow()
  const canAddColumnBefore = tableToolsEnabled && canCommands.addColumnBefore()
  const canAddColumnAfter = tableToolsEnabled && canCommands.addColumnAfter()
  const canDeleteColumn = tableToolsEnabled && canCommands.deleteColumn()
  const canDuplicateColumn = tableToolsEnabled && canCommands.duplicateColumn()
  const canDeleteTable = tableToolsEnabled && canCommands.deleteTable()
  const canMergeCells = tableToolsEnabled && canCommands.mergeCells()
  const canSplitCell = tableToolsEnabled && canCommands.splitCell()
  const canToggleHeaderRow = tableToolsEnabled && canCommands.toggleHeaderRow()
  const canToggleHeaderColumn = tableToolsEnabled && canCommands.toggleHeaderColumn()
  const canToggleHeaderCell = tableToolsEnabled && canCommands.toggleHeaderCell()
  const canSetTableLayout =
    tableToolsEnabled && canCommands.setTableLayout({ width: '100%', align: 'left', mode: 'manual' })
  const canSetCellTextAlign = tableToolsEnabled && canCommands.setCellAttribute('cellTextAlign', 'center')
  const canSetCellVerticalAlign = tableToolsEnabled && canCommands.setCellAttribute('cellVerticalAlign', 'middle')
  const canSetCellBackground = tableToolsEnabled && canCommands.setCellAttribute('backgroundColor', '#FFF2CC')
  const canSetCellBorder = tableToolsEnabled && canCommands.setCellAttribute('borderColor', '#2563EB')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!tableToolsEnabled}
          className="gba:h-8 gba:gap-1 gba:rounded-md gba:px-2 gba:text-muted-foreground hover:gba:text-foreground"
          data-testid={`${testId}-table-tools-trigger`}
        >
          <Table className="gba:h-4 gba:w-4" />
          <ChevronDown className="gba:h-3 gba:w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().addRowBefore().run()}
          disabled={!canAddRowBefore}
          data-testid={`${testId}-table-row-before`}
        >
          {t('editor-toolbar-table-row-before')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().addRowAfter().run()}
          disabled={!canAddRowAfter}
          data-testid={`${testId}-table-row-after`}
        >
          {t('editor-toolbar-table-row-after')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().duplicateRow().run()}
          disabled={!canDuplicateRow}
          data-testid={`${testId}-table-duplicate-row`}
        >
          {t('editor-toolbar-table-duplicate-row')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().addColumnBefore().run()}
          disabled={!canAddColumnBefore}
          data-testid={`${testId}-table-column-before`}
        >
          {t('editor-toolbar-table-column-before')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!canAddColumnAfter}
          data-testid={`${testId}-table-column-after`}
        >
          {t('editor-toolbar-table-column-after')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().duplicateColumn().run()}
          disabled={!canDuplicateColumn}
          data-testid={`${testId}-table-duplicate-column`}
        >
          {t('editor-toolbar-table-duplicate-column')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().deleteRow().run()}
          disabled={!canDeleteRow}
          data-testid={`${testId}-table-delete-row`}
        >
          {t('editor-toolbar-table-delete-row')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().deleteColumn().run()}
          disabled={!canDeleteColumn}
          data-testid={`${testId}-table-delete-column`}
        >
          {t('editor-toolbar-table-delete-column')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().deleteTable().run()}
          disabled={!canDeleteTable}
          data-testid={`${testId}-table-delete-table`}
        >
          {t('editor-toolbar-table-delete-table')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().mergeCells().run()}
          disabled={!canMergeCells}
          data-testid={`${testId}-table-merge-cells`}
        >
          {t('editor-toolbar-table-merge-cells')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().splitCell().run()}
          disabled={!canSplitCell}
          data-testid={`${testId}-table-split-cell`}
        >
          {t('editor-toolbar-table-split-cell')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={!canToggleHeaderRow}
          data-testid={`${testId}-table-toggle-header-row`}
        >
          {t('editor-toolbar-table-toggle-header-row')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleHeaderColumn().run()}
          disabled={!canToggleHeaderColumn}
          data-testid={`${testId}-table-toggle-header-column`}
        >
          {t('editor-toolbar-table-toggle-header-column')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().toggleHeaderCell().run()}
          disabled={!canToggleHeaderCell}
          data-testid={`${testId}-table-toggle-header-cell`}
        >
          {t('editor-toolbar-table-toggle-header-cell')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableWidthMode('auto-fit-window').run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-width-autofit-window`}
        >
          {t('editor-toolbar-table-width-autofit-window')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableWidthMode('auto-fit-content').run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-width-autofit-content`}
        >
          {t('editor-toolbar-table-width-autofit-content')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableLayout({ width: '100%', mode: 'manual' }).run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-width-full`}
        >
          {t('editor-toolbar-table-width-full')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableLayout({ width: '50%', mode: 'manual' }).run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-width-half`}
        >
          {t('editor-toolbar-table-width-half')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableLayout({ width: '14cm', mode: 'manual' }).run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-width-fixed`}
        >
          {t('editor-toolbar-table-width-fixed')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={promptTableWidth}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-width-custom`}
        >
          {t('editor-toolbar-table-width-custom')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableAlign('left').run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-align-left`}
        >
          {t('editor-toolbar-table-align-left')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableAlign('center').run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-align-center`}
        >
          {t('editor-toolbar-table-align-center')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runTableChain().setTableAlign('right').run()}
          disabled={!canSetTableLayout}
          data-testid={`${testId}-table-align-right`}
        >
          {t('editor-toolbar-table-align-right')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('cellTextAlign', 'left').run()}
          disabled={!canSetCellTextAlign}
          data-testid={`${testId}-table-text-align-left`}
        >
          {t('editor-toolbar-table-text-align-left')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('cellTextAlign', 'center').run()}
          disabled={!canSetCellTextAlign}
          data-testid={`${testId}-table-text-align-center`}
        >
          {t('editor-toolbar-table-text-align-center')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('cellTextAlign', 'right').run()}
          disabled={!canSetCellTextAlign}
          data-testid={`${testId}-table-text-align-right`}
        >
          {t('editor-toolbar-table-text-align-right')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('cellVerticalAlign', 'top').run()}
          disabled={!canSetCellVerticalAlign}
          data-testid={`${testId}-table-vertical-align-top`}
        >
          {t('editor-toolbar-table-vertical-align-top')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('cellVerticalAlign', 'middle').run()}
          disabled={!canSetCellVerticalAlign}
          data-testid={`${testId}-table-vertical-align-middle`}
        >
          {t('editor-toolbar-table-vertical-align-middle')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('cellVerticalAlign', 'bottom').run()}
          disabled={!canSetCellVerticalAlign}
          data-testid={`${testId}-table-vertical-align-bottom`}
        >
          {t('editor-toolbar-table-vertical-align-bottom')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('backgroundColor', '#FFF2CC').run()}
          disabled={!canSetCellBackground}
          data-testid={`${testId}-table-fill-yellow`}
        >
          {t('editor-toolbar-table-fill-yellow')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('backgroundColor', null).run()}
          disabled={!canSetCellBackground}
          data-testid={`${testId}-table-fill-clear`}
        >
          {t('editor-toolbar-table-fill-clear')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={promptBackgroundColor}
          disabled={!canSetCellBackground}
          data-testid={`${testId}-table-fill-custom`}
        >
          {t('editor-toolbar-table-fill-custom')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('borderColor', '#2563EB').run()}
          disabled={!canSetCellBorder}
          data-testid={`${testId}-table-border-blue`}
        >
          {t('editor-toolbar-table-border-blue')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => editor.chain().focus().setCellAttribute('borderColor', null).run()}
          disabled={!canSetCellBorder}
          data-testid={`${testId}-table-border-clear`}
        >
          {t('editor-toolbar-table-border-clear')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={promptBorderColor}
          disabled={!canSetCellBorder}
          data-testid={`${testId}-table-border-custom`}
        >
          {t('editor-toolbar-table-border-custom')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
