/**
 * Table insert + contextual row/column actions for the notes TipTap editor.
 */

import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ChevronDown,
  Table,
  Trash2
} from 'lucide-react'

const ITEM_ICON_CLASS = 'gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground'

function isInsideTable(editor: Editor): boolean {
  const { $from } = editor.state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const nodeName = $from.node(depth).type.name
    if (nodeName === 'table' || nodeName === 'tableRow' || nodeName === 'tableCell' || nodeName === 'tableHeader') {
      return true
    }
  }

  return false
}

export interface NoteTableMenuProps {
  editor: Editor
  t: (key: string) => string
}

export function NoteTableMenu({ editor, t }: Readonly<NoteTableMenuProps>) {
  const tableUi = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) {
        return {
          inTable: false,
          canAddRowBefore: false,
          canAddRowAfter: false,
          canAddColumnBefore: false,
          canAddColumnAfter: false,
          canDeleteRow: false,
          canDeleteColumn: false,
          canDeleteTable: false
        }
      }
      const inside = isInsideTable(ed)
      const can = ed.can()
      return {
        inTable: inside,
        canAddRowBefore: inside && can.addRowBefore(),
        canAddRowAfter: inside && can.addRowAfter(),
        canAddColumnBefore: inside && can.addColumnBefore(),
        canAddColumnAfter: inside && can.addColumnAfter(),
        canDeleteRow: inside && can.deleteRow(),
        canDeleteColumn: inside && can.deleteColumn(),
        canDeleteTable: inside && can.deleteTable()
      }
    }
  })

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-7 gba:w-7"
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()}
            data-testid="note-editor-insert-table"
          >
            <Table className="gba:w-3.5 gba:h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('editor-format-insert-table')}</TooltipContent>
      </Tooltip>

      {tableUi.inTable ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gba:h-7 gba:gap-0.5 gba:rounded-md gba:px-1.5 gba:text-muted-foreground hover:gba:text-foreground"
              data-testid="note-editor-table-tools-trigger"
              aria-label={t('editor-table-tools-menu')}
            >
              <Table className="gba:h-3.5 gba:w-3.5" />
              <ChevronDown className="gba:h-3 gba:w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addRowBefore().run()}
              disabled={!tableUi.canAddRowBefore}
              data-testid="note-editor-table-row-before"
            >
              <ArrowUpToLine className={ITEM_ICON_CLASS} />
              {t('editor-table-row-before')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addRowAfter().run()}
              disabled={!tableUi.canAddRowAfter}
              data-testid="note-editor-table-row-after"
            >
              <ArrowDownToLine className={ITEM_ICON_CLASS} />
              {t('editor-table-row-after')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!tableUi.canAddColumnBefore}
              data-testid="note-editor-table-column-before"
            >
              <ArrowLeftToLine className={ITEM_ICON_CLASS} />
              {t('editor-table-column-before')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!tableUi.canAddColumnAfter}
              data-testid="note-editor-table-column-after"
            >
              <ArrowRightToLine className={ITEM_ICON_CLASS} />
              {t('editor-table-column-after')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().deleteRow().run()}
              disabled={!tableUi.canDeleteRow}
              data-testid="note-editor-table-delete-row"
            >
              <Trash2 className={ITEM_ICON_CLASS} />
              {t('editor-table-delete-row')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().deleteColumn().run()}
              disabled={!tableUi.canDeleteColumn}
              data-testid="note-editor-table-delete-column"
            >
              <Trash2 className={ITEM_ICON_CLASS} />
              {t('editor-table-delete-column')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().deleteTable().run()}
              disabled={!tableUi.canDeleteTable}
              data-testid="note-editor-table-delete-table"
            >
              <Trash2 className={ITEM_ICON_CLASS} />
              {t('editor-table-delete-table')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </>
  )
}
