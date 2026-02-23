import React, { useCallback, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import type { BoardColumn, BoardColumnType } from '../../types'
import { QUICK_ADD_TYPES, CONFIG_REQUIRED_TYPES } from './columnTypeDefs'
import { ColumnTypeIcon } from '../table/ColumnTypeIcon'
import { AddColumnDialog } from './AddColumnDialog'

export interface AddColumnPopoverProps {
  existingColumns: BoardColumn[]
  boardId?: string
  sheetId?: string
  onAdd: (column: BoardColumn) => void
  children: React.ReactNode
  'data-testid'?: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

function nextColumnName(existing: BoardColumn[]): { name: string; label: string } {
  const usedNames = new Set(existing.map(c => c.name))
  for (let i = 1; i < 200; i++) {
    const name = `column_${i}`
    if (!usedNames.has(name)) return { name, label: `Column ${i}` }
  }
  const ts = Date.now()
  return { name: `column_${ts}`, label: `Column ${ts}` }
}

export const AddColumnPopover: React.FC<AddColumnPopoverProps> = ({
  existingColumns,
  boardId = '',
  sheetId = '',
  onAdd,
  children,
  'data-testid': testId = 'add-column-popover'
}) => {
  const [open, setOpen] = React.useState(false)
  const [dialogType, setDialogType] = useState<BoardColumnType | null>(null)

  const nextOrder = useMemo(
    () => (existingColumns.length ? Math.max(...existingColumns.map(c => c.order || 0)) + 1 : 0),
    [existingColumns]
  )

  const handlePick = useCallback(
    (type: BoardColumnType) => {
      if (CONFIG_REQUIRED_TYPES.has(type)) {
        setOpen(false)
        setDialogType(type)
        return
      }

      const { name, label } = nextColumnName(existingColumns)

      const column: BoardColumn = {
        id: createId(),
        name,
        label,
        type,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        order: nextOrder,
        ...(type === 'status'
          ? {
              selectOptions: [
                { value: 'todo', label: 'To Do', colorToken: 'muted' },
                { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
                { value: 'done', label: 'Done', colorToken: 'success' }
              ]
            }
          : null),
        ...(type === 'select' || type === 'multiselect' ? { selectOptions: [] } : null)
      }

      onAdd(column)
      setOpen(false)
    },
    [existingColumns, nextOrder, onAdd]
  )

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent align="start" className="gba:w-48 gba:p-1 gba:max-h-80 gba:overflow-auto" data-testid={testId}>
          {QUICK_ADD_TYPES.map(ct => (
            <button
              key={ct.type}
              onClick={() => handlePick(ct.type)}
              className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:text-xs gba:text-foreground gba:rounded gba:hover:bg-muted/60 gba:transition-colors"
              data-testid={`${testId}-${ct.type}`}
            >
              <ColumnTypeIcon type={ct.type} />
              {ct.label}
              {ct.needsConfig && <span className="gba:ml-auto gba:text-[9px] gba:text-muted-foreground">⚙</span>}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <AddColumnDialog
        open={dialogType !== null}
        onOpenChange={isOpen => {
          if (!isOpen) setDialogType(null)
        }}
        existingColumns={existingColumns}
        currentBoardId={boardId}
        currentSheetId={sheetId}
        preSelectedType={dialogType || undefined}
        onCreate={async col => {
          onAdd(col)
          setDialogType(null)
        }}
        data-testid={`${testId}-config-dialog`}
      />
    </>
  )
}
