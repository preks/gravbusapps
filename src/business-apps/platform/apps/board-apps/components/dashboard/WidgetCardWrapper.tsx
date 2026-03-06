/**
 * WidgetCardWrapper - shared card wrapper with hover toolbar for edit/delete/resize.
 * Supports drag-and-drop reordering via a drag handle.
 */

import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@newwork/nw-design-system'
import { Pencil, Trash2, Maximize2, GripVertical } from 'lucide-react'
import type { DashboardWidget } from '../../types'

export interface WidgetCardWrapperProps {
  widget: DashboardWidget
  onEdit?: (widget: DashboardWidget) => void
  onDelete?: (widgetId: string) => void
  onResize?: (widgetId: string, w: number) => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragEnter?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  children: React.ReactNode
  testId: string
}

export const WidgetCardWrapper: React.FC<WidgetCardWrapperProps> = ({
  widget,
  onEdit,
  onDelete,
  onResize,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
  testId
}) => {
  const [showResize, setShowResize] = useState(false)

  return (
    <Card
      className={`gba:relative gba:group gba:overflow-hidden gba:transition-all gba:duration-150 ${isDragging ? 'gba:opacity-40 gba:scale-[0.97]' : ''} ${isDragOver ? 'gba:ring-2 gba:ring-primary gba:ring-offset-1' : ''}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-testid={testId}
    >
      {/* Hover toolbar */}
      <div className="gba:absolute gba:top-1 gba:right-1 gba:z-10 gba:flex gba:items-center gba:gap-0.5 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity">
        {onDragStart && (
          <div
            className="gba:h-6 gba:w-6 gba:flex gba:items-center gba:justify-center gba:cursor-grab gba:active:cursor-grabbing gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
            data-testid={`${testId}-drag-handle`}
          >
            <GripVertical className="gba:w-3 gba:h-3" />
          </div>
        )}
        {onResize && (
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-6 gba:w-6"
            onClick={() => setShowResize(!showResize)}
            data-testid={`${testId}-resize`}
          >
            <Maximize2 className="gba:w-3 gba:h-3" />
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-6 gba:w-6"
            onClick={() => onEdit(widget)}
            data-testid={`${testId}-edit`}
          >
            <Pencil className="gba:w-3 gba:h-3" />
          </Button>
        )}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-6 gba:w-6 gba:text-destructive"
                data-testid={`${testId}-delete`}
              >
                <Trash2 className="gba:w-3 gba:h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete widget</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove &quot;{widget.title}&quot; from the dashboard? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(widget.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Resize selector */}
      {showResize && onResize && (
        <div className="gba:absolute gba:top-8 gba:right-1 gba:z-10 gba:bg-popover gba:rounded gba:p-1">
          <Select
            value={String(widget.position.w)}
            onValueChange={v => {
              onResize(widget.id, Number(v))
              setShowResize(false)
            }}
          >
            <SelectTrigger className="gba:h-7 gba:text-xs gba:w-20" data-testid={`${testId}-size-select`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 col</SelectItem>
              <SelectItem value="2">2 cols</SelectItem>
              <SelectItem value="3">3 cols</SelectItem>
              <SelectItem value="4">4 cols</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <CardHeader className="gba:pb-1 gba:pt-3.5">
        <CardTitle className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:pr-16 gba:tracking-wide">
          {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:pb-4">{children}</CardContent>
    </Card>
  )
}
