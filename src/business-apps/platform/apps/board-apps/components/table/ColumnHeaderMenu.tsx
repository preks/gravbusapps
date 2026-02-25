import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input
} from '@newwork/nw-design-system'
import { Pencil, Settings2, EyeOff, Trash2 } from 'lucide-react'
import type { BoardColumn } from '../../types'
import { ColumnTypeIcon } from './ColumnTypeIcon'

export interface ColumnHeaderMenuProps {
  column: BoardColumn
  onRename: (columnId: string, newLabel: string) => void
  onOpenSettings: (column: BoardColumn) => void
  onHide: (columnId: string) => void
  onDelete: (columnId: string) => void
  'data-testid'?: string
}

export const ColumnHeaderMenu: React.FC<ColumnHeaderMenuProps> = ({
  column,
  onRename,
  onOpenSettings,
  onHide,
  onDelete,
  'data-testid': testId = 'col-header-menu'
}) => {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(column.label)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isRenaming, column.label])

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== column.label) {
      onRename(column.id, trimmed)
    }
    setIsRenaming(false)
  }, [renameValue, column.id, column.label, onRename])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitRename()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsRenaming(false)
      }
    },
    [commitRename]
  )

  if (isRenaming) {
    return (
      <span className="gba:flex gba:items-center gba:gap-1.5">
        <ColumnTypeIcon type={column.type} />
        <Input
          ref={inputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleRenameKeyDown}
          className="gba:h-5 gba:text-xs gba:px-1 gba:py-0 gba:w-28"
          data-testid={`${testId}-rename-input`}
        />
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-pointer gba:hover:text-foreground gba:transition-colors gba:w-full gba:text-left"
          data-testid={`${testId}-trigger`}
        >
          <ColumnTypeIcon type={column.type} />
          <span className="gba:truncate">{column.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="gba:w-44" data-testid={`${testId}-content`}>
        <DropdownMenuItem onClick={() => setIsRenaming(true)} data-testid={`${testId}-rename`}>
          <Pencil className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenSettings(column)} data-testid={`${testId}-settings`}>
          <Settings2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          Column settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onHide(column.id)} data-testid={`${testId}-hide`}>
          <EyeOff className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          Hide column
        </DropdownMenuItem>
        {!column.isPrimary && (
          <DropdownMenuItem
            onClick={() => onDelete(column.id)}
            className="gba:text-destructive"
            data-testid={`${testId}-delete`}
          >
            <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
            Delete column
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
