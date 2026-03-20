import React, { useCallback } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@newwork/nw-design-system'
import { Pencil, Eraser, Copy, FileText, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from '@newwork/nw-design-system'

export interface CellContextMenuProps {
  children: React.ReactNode
  value: unknown
  onEdit: () => void
  onClear: () => void
  onOpenRowPage?: () => void
  onDeleteRow?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  'data-testid'?: string
}

export const CellContextMenu: React.FC<CellContextMenuProps> = ({
  children,
  value,
  onEdit,
  onClear,
  onOpenRowPage,
  onDeleteRow,
  onMoveUp,
  onMoveDown,
  'data-testid': testId = 'cell-ctx-menu'
}) => {
  const handleCopy = useCallback(() => {
    const text = value != null ? String(value) : ''
    void navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Failed to copy')
    )
  }, [value])

  const hasReorder = onMoveUp || onMoveDown

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="gba:w-40" data-testid={testId}>
        <ContextMenuItem onClick={onEdit} data-testid={`${testId}-edit`}>
          <Pencil className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopy} data-testid={`${testId}-copy`}>
          <Copy className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          Copy value
        </ContextMenuItem>
        <ContextMenuItem onClick={onClear} data-testid={`${testId}-clear`}>
          <Eraser className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          Clear
        </ContextMenuItem>
        {hasReorder && (
          <>
            <ContextMenuSeparator />
            {onMoveUp && (
              <ContextMenuItem onClick={onMoveUp} data-testid={`${testId}-move-up`}>
                <ArrowUp className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
                Move up
              </ContextMenuItem>
            )}
            {onMoveDown && (
              <ContextMenuItem onClick={onMoveDown} data-testid={`${testId}-move-down`}>
                <ArrowDown className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
                Move down
              </ContextMenuItem>
            )}
          </>
        )}
        {onOpenRowPage && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onOpenRowPage} data-testid={`${testId}-open-page`}>
              <FileText className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
              Open row page
            </ContextMenuItem>
          </>
        )}
        {onDeleteRow && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDeleteRow}
              className="gba:text-destructive"
              data-testid={`${testId}-delete-row`}
            >
              <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
              Delete row
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
