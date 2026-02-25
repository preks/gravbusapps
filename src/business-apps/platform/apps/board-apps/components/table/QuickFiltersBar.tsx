/**
 * QuickFiltersBar - renders saved quick filter chips that can be toggled on/off.
 * Supports rename and delete via a context menu on each chip.
 */

import React, { useCallback, useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input
} from '@newwork/nw-design-system'
import { Zap, MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react'
import type { BoardQuickFilter } from '../../types'

export interface QuickFiltersBarProps {
  quickFilters: BoardQuickFilter[]
  activeIds: string[]
  onToggle: (id: string) => void
  onRename?: (id: string, name: string) => void
  onDelete?: (id: string) => void
  'data-testid'?: string
}

export const QuickFiltersBar: React.FC<QuickFiltersBarProps> = ({
  quickFilters,
  activeIds,
  onToggle,
  onRename,
  onDelete,
  'data-testid': testId = 'quick-filters-bar'
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const startRename = useCallback((qf: BoardQuickFilter) => {
    setRenamingId(qf.id)
    setRenameValue(qf.name)
  }, [])

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim() && onRename) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }, [renamingId, renameValue, onRename])

  const cancelRename = useCallback(() => {
    setRenamingId(null)
    setRenameValue('')
  }, [])

  if (quickFilters.length === 0) return null

  const activeSet = new Set(activeIds)

  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:flex-wrap" data-testid={testId}>
      <Zap className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
      {quickFilters.map(qf => {
        const isActive = activeSet.has(qf.id)
        const isRenaming = renamingId === qf.id

        if (isRenaming) {
          return (
            <div key={qf.id} className="gba:flex gba:items-center gba:gap-0.5">
              <Input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') cancelRename()
                }}
                className="gba:h-6 gba:text-xs gba:w-24 gba:px-1.5"
                autoFocus
                data-testid={`${testId}-rename-input-${qf.id}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-5 gba:w-5"
                onClick={commitRename}
                data-testid={`${testId}-rename-confirm-${qf.id}`}
              >
                <Check className="gba:w-3 gba:h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-5 gba:w-5"
                onClick={cancelRename}
                data-testid={`${testId}-rename-cancel-${qf.id}`}
              >
                <X className="gba:w-3 gba:h-3" />
              </Button>
            </div>
          )
        }

        return (
          <div key={qf.id} className="gba:flex gba:items-center gba:gap-0">
            <Button
              variant={isActive ? 'secondary' : 'outline'}
              size="sm"
              className="gba:h-6 gba:text-[11px] gba:px-2 gba:rounded-r-none"
              onClick={() => onToggle(qf.id)}
              data-testid={`${testId}-chip-${qf.id}`}
            >
              {qf.name}
            </Button>
            {(onRename || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive ? 'secondary' : 'outline'}
                    size="icon"
                    className="gba:h-6 gba:w-5 gba:rounded-l-none gba:border-l-0"
                    data-testid={`${testId}-menu-${qf.id}`}
                  >
                    <MoreHorizontal className="gba:w-3 gba:h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {onRename && (
                    <DropdownMenuItem onClick={() => startRename(qf)} data-testid={`${testId}-rename-${qf.id}`}>
                      <Pencil className="gba:w-3 gba:h-3 gba:mr-2" />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(qf.id)}
                      className="gba:text-destructive"
                      data-testid={`${testId}-delete-${qf.id}`}
                    >
                      <Trash2 className="gba:w-3 gba:h-3 gba:mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}
    </div>
  )
}
