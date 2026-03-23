/**
 * ColumnHeader Component - Handles inline column name editing and drag-drop reordering
 * Extracted to prevent full column re-creation when editing state changes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { MoreVertical, Trash2, GripVertical, Activity, Database } from 'lucide-react'
import type { SpreadsheetColumn } from '../types/spreadsheet'

export interface ColumnHeaderProps {
  col: SpreadsheetColumn
  isTrackingCol: boolean
  isEditing: boolean
  editingLabel: string
  onStartEditing: () => void
  onLabelChange: (label: string) => void
  onFinishEditing: (save: boolean) => void
  onRenameColumn: (columnId: string, newLabel: string) => void
  canEdit: boolean
  hasEntityDataSource: boolean
  columnsCount: number
  onDeleteColumn: (columnId: string) => void
  onReorderColumn?: (draggedId: string, targetId: string) => void
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = React.memo(
  ({
    col,
    isTrackingCol,
    isEditing,
    editingLabel,
    onStartEditing,
    onLabelChange,
    onFinishEditing,
    onRenameColumn,
    canEdit,
    hasEntityDataSource,
    columnsCount,
    onDeleteColumn,
    onReorderColumn
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    // Track if we're in the middle of committing to prevent double-actions
    const isCommittingRef = useRef(false)
    // Track if this is an intentional blur (from save/cancel) vs accidental (from re-render)
    const intentionalBlurRef = useRef(false)
    // Keep track of the latest label value to avoid stale closures
    const latestLabelRef = useRef(editingLabel)
    latestLabelRef.current = editingLabel

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)

    // Focus input when editing starts
    useEffect(() => {
      if (isEditing && inputRef.current) {
        // Reset flags when editing starts
        isCommittingRef.current = false
        intentionalBlurRef.current = false
        // Use multiple frames to ensure DOM is fully ready after potential re-renders
        const focusInput = () => {
          if (inputRef.current && document.activeElement !== inputRef.current) {
            inputRef.current.focus()
            // Place cursor at the end of the text instead of selecting all
            const len = inputRef.current.value.length
            inputRef.current.setSelectionRange(len, len)
          }
        }
        // Try immediately
        focusInput()
        // Then retry after a frame
        requestAnimationFrame(focusInput)
        // And once more after a short delay for extra reliability
        const timeoutId = setTimeout(focusInput, 50)
        return () => clearTimeout(timeoutId)
      }
    }, [isEditing])

    const handleSave = useCallback(() => {
      if (isCommittingRef.current) {
        return
      }
      isCommittingRef.current = true
      intentionalBlurRef.current = true
      // Get the CURRENT value from the input element directly to avoid stale closures
      const currentValue = inputRef.current?.value ?? latestLabelRef.current
      if (currentValue.trim()) {
        onRenameColumn(col.id, currentValue.trim())
      } else {
        onFinishEditing(false)
      }
    }, [col.id, onRenameColumn, onFinishEditing])

    const handleCancel = useCallback(() => {
      if (isCommittingRef.current) return
      isCommittingRef.current = true
      intentionalBlurRef.current = true
      onFinishEditing(false)
    }, [onFinishEditing])

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        // Only handle blur if it's not from an intentional action and we're not in the middle of committing
        if (isCommittingRef.current || intentionalBlurRef.current) return

        // Check if focus is moving to another element inside the header (like the dropdown)
        const relatedTarget = e.relatedTarget as HTMLElement
        if (relatedTarget && e.currentTarget.closest('.gba\\:group')?.contains(relatedTarget)) {
          return
        }

        // Delay the blur handling slightly to allow for re-focus during re-renders
        setTimeout(() => {
          // If we're still editing and the input still exists, this was likely an accidental blur from re-render
          if (inputRef.current && document.activeElement !== inputRef.current && !isCommittingRef.current) {
            handleSave()
          }
        }, 100)
      },
      [handleSave]
    )

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent) => {
      if (isTrackingCol || !canEdit || !onReorderColumn) return
      e.dataTransfer.setData('text/plain', col.id)
      e.dataTransfer.effectAllowed = 'move'
      setIsDragging(true)
    }

    const handleDragEnd = () => {
      setIsDragging(false)
      setIsDragOver(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
      if (isTrackingCol || !canEdit || !onReorderColumn) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsDragOver(true)
    }

    const handleDragLeave = () => {
      setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      if (isTrackingCol || !canEdit || !onReorderColumn) return
      e.preventDefault()
      const draggedId = e.dataTransfer.getData('text/plain')
      if (draggedId && draggedId !== col.id) {
        onReorderColumn(draggedId, col.id)
      }
      setIsDragOver(false)
    }

    return (
      <div
        className={`gba:flex gba:items-center gba:justify-between gba:w-full gba:group gba:px-2 gba:py-2 gba:transition-all gba:duration-150 ${
          isTrackingCol ? 'gba:bg-gradient-to-r gba:from-info/15 gba:to-transparent' : ''
        } ${isDragging ? 'gba:opacity-50' : ''} ${isDragOver ? 'gba:bg-primary/10 gba:border-l-2 gba:border-primary' : ''} ${
          canEdit && !isTrackingCol && !isEditing ? 'gba:cursor-grab active:gba:cursor-grabbing' : ''
        }`}
        draggable={canEdit && !isTrackingCol && !isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="gba:flex gba:items-center gba:gap-1 gba:flex-1 gba:min-w-0">
          {/* Drag handle indicator - only shows on hover, very compact */}
          {canEdit && !isTrackingCol && !isEditing && (
            <div className="gba:w-0 gba:overflow-hidden group-hover:gba:w-4 gba:transition-all gba:duration-150 gba:flex-shrink-0">
              <GripVertical className="gba:w-3 gba:h-3 gba:text-muted-foreground/50" />
            </div>
          )}
          {isTrackingCol && (
            <div className="gba:flex gba:items-center gba:justify-center gba:w-4 gba:h-4 gba:rounded gba:bg-info/20 gba:flex-shrink-0">
              <Activity className="gba:w-2.5 gba:h-2.5 gba:text-info" />
            </div>
          )}
          {hasEntityDataSource && !isTrackingCol && (
            <div className="gba:flex gba:items-center gba:justify-center gba:w-4 gba:h-4 gba:rounded gba:bg-success/15 gba:flex-shrink-0">
              <Database className="gba:w-2.5 gba:h-2.5 gba:text-success" />
            </div>
          )}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editingLabel}
              onChange={e => onLabelChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSave()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCancel()
                }
              }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onFocus={e => e.stopPropagation()}
              className="gba:h-7 gba:px-2 gba:py-0 gba:text-[13px] gba:font-medium gba:min-w-[80px] gba:w-full gba:border gba:border-primary/40 gba:rounded-md gba:bg-background gba:outline-none gba:ring-2 gba:ring-primary/20 gba:shadow-sm"
            />
          ) : (
            <span
              className={`gba:truncate gba:text-[13px] gba:transition-all gba:duration-150 ${
                isTrackingCol
                  ? 'gba:text-info gba:font-semibold gba:text-[11px] gba:uppercase gba:tracking-widest'
                  : 'gba:font-medium gba:text-foreground/80'
              } ${
                canEdit && !isTrackingCol
                  ? 'gba:cursor-text hover:gba:text-foreground gba:rounded-md gba:px-1.5 gba:py-0.5 gba:-mx-1.5 hover:gba:bg-accent/50'
                  : ''
              }`}
              onClick={e => {
                if (canEdit && !isTrackingCol) {
                  e.stopPropagation()
                  e.preventDefault()
                  onStartEditing()
                }
              }}
              onMouseDown={e => {
                if (canEdit && !isTrackingCol) {
                  e.stopPropagation()
                }
              }}
              title={canEdit && !isTrackingCol ? 'Click to rename' : undefined}
            >
              {col.label}
            </span>
          )}
        </div>
        {canEdit && columnsCount > 1 && !isTrackingCol && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-5 gba:w-5 gba:p-0 gba:rounded gba:opacity-0 group-hover:gba:opacity-100 gba:flex-shrink-0 gba:transition-opacity gba:duration-150 hover:gba:bg-accent gba:ml-1"
              >
                <MoreVertical className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="gba:min-w-[140px]">
              <DropdownMenuItem onClick={() => onDeleteColumn(col.id)} className="gba:text-destructive gba:gap-2">
                <Trash2 className="gba:w-4 gba:h-4" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }
)

ColumnHeader.displayName = 'ColumnHeader'

export default ColumnHeader
