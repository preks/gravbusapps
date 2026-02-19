import React, { useCallback, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import {
  Type,
  Hash,
  CalendarDays,
  CheckSquare,
  ListChecks,
  Users,
  Link2,
  Mail,
  Phone,
  Globe,
  Copy,
  Calculator
} from 'lucide-react'
import type { BoardColumn, BoardColumnType } from '../../types'

export interface AddColumnPopoverProps {
  existingColumns: BoardColumn[]
  onAdd: (column: BoardColumn) => void
  children: React.ReactNode
  'data-testid'?: string
}

const COLUMN_TYPES: Array<{ type: BoardColumnType; label: string; icon: React.ReactNode }> = [
  { type: 'text', label: 'Text', icon: <Type className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'number', label: 'Number', icon: <Hash className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'status', label: 'Status', icon: <ListChecks className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'date', label: 'Date', icon: <CalendarDays className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'select', label: 'Select', icon: <CheckSquare className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'boolean', label: 'Checkbox', icon: <CheckSquare className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'people', label: 'People', icon: <Users className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'relation', label: 'Relation', icon: <Link2 className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'mirror', label: 'Mirror', icon: <Copy className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'rollup', label: 'Rollup', icon: <Calculator className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'email', label: 'Email', icon: <Mail className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'phone', label: 'Phone', icon: <Phone className="gba:w-3.5 gba:h-3.5" /> },
  { type: 'url', label: 'URL', icon: <Globe className="gba:w-3.5 gba:h-3.5" /> }
]

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
  onAdd,
  children,
  'data-testid': testId = 'add-column-popover'
}) => {
  const [open, setOpen] = React.useState(false)

  const nextOrder = useMemo(
    () => (existingColumns.length ? Math.max(...existingColumns.map(c => c.order || 0)) + 1 : 0),
    [existingColumns]
  )

  const handlePick = useCallback(
    (type: BoardColumnType) => {
      const { name, label } = nextColumnName(existingColumns)

      const column: BoardColumn = {
        id: createId(),
        name,
        label,
        type,
        isVisible: true,
        isEditable: type !== 'mirror' && type !== 'rollup',
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
        ...(type === 'select' || type === 'multiselect'
          ? {
              selectOptions: []
            }
          : null)
      }

      onAdd(column)
      setOpen(false)
    },
    [existingColumns, nextOrder, onAdd]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="gba:w-44 gba:p-1" data-testid={testId}>
        {COLUMN_TYPES.map(ct => (
          <button
            key={ct.type}
            onClick={() => handlePick(ct.type)}
            className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:text-xs gba:text-foreground gba:rounded gba:hover:bg-muted/60 gba:transition-colors"
            data-testid={`${testId}-${ct.type}`}
          >
            {ct.icon}
            {ct.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
