/**
 * BoardListItem - single row in the boards list view.
 * Extracted from BoardsHub to keep under the 300-line limit.
 */

import React from 'react'
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@newwork/nw-design-system'
import { LayoutGrid, MoreHorizontal, Copy, Trash2, Star, Share2, Users } from 'lucide-react'
import type { BoardSummary } from '../types'

export interface BoardListItemProps {
  board: BoardSummary
  isFavorite?: boolean
  onToggleFavorite?: (id: string, e?: React.MouseEvent) => void
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onShare?: (id: string) => void
  onManageShares?: (id: string) => void
  testId: string
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const BoardListItem: React.FC<BoardListItemProps> = ({
  board,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onDuplicate,
  onDelete,
  onShare,
  onManageShares,
  testId
}) => {
  const isOwner = !board.isShared

  return (
    <div
      className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors"
      onClick={() => onOpen(board.id)}
      data-testid={`${testId}-board-${board.id}`}
    >
      <div className="gba:w-8 gba:flex-shrink-0 gba:flex gba:justify-center" onClick={e => e.stopPropagation()}>
        {onToggleFavorite && (
          <button
            className="gba:p-0.5 gba:rounded gba:hover:bg-muted/50 gba:transition-colors"
            onClick={e => onToggleFavorite(board.id, e)}
            data-testid={`${testId}-fav-${board.id}`}
          >
            <Star
              className={`gba:w-3.5 gba:h-3.5 ${isFavorite ? 'gba:fill-warning gba:text-warning' : 'gba:text-muted-foreground'}`}
            />
          </button>
        )}
      </div>
      <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-2.5">
        <div className="gba:w-8 gba:h-8 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
          <LayoutGrid className="gba:w-4 gba:h-4 gba:text-primary" />
        </div>
        <div className="gba:min-w-0">
          <span className="gba:font-medium gba:text-foreground gba:text-sm gba:truncate gba:block">{board.name}</span>
          {board.description && (
            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{board.description}</p>
          )}
        </div>
        {board.isShared && (
          <Badge variant="outline" className="gba:text-xs gba:px-1.5 gba:py-0">
            Shared
          </Badge>
        )}
      </div>
      <div className="gba:w-28 gba:flex-shrink-0 gba:text-xs gba:text-muted-foreground">
        {formatRelativeTime(board.updatedAt)}
      </div>
      <div className="gba:w-16 gba:flex-shrink-0 gba:text-xs gba:text-muted-foreground gba:text-right">
        {board.rowCount.toLocaleString()}
      </div>
      <div className="gba:w-8 gba:flex-shrink-0 gba:flex gba:justify-end" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-7 gba:w-7 gba:p-0"
              data-testid={`${testId}-board-menu-${board.id}`}
            >
              <MoreHorizontal className="gba:w-3.5 gba:h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpen(board.id)} data-testid={`${testId}-menu-open-${board.id}`}>
              Open
            </DropdownMenuItem>
            {isOwner && onShare && (
              <DropdownMenuItem onClick={() => onShare(board.id)} data-testid={`${testId}-menu-share-${board.id}`}>
                <Share2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Share
              </DropdownMenuItem>
            )}
            {isOwner && onManageShares && (
              <DropdownMenuItem
                onClick={() => onManageShares(board.id)}
                data-testid={`${testId}-menu-manage-${board.id}`}
              >
                <Users className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Manage sharing
              </DropdownMenuItem>
            )}
            {isOwner && (
              <DropdownMenuItem onClick={() => onDuplicate(board.id)} data-testid={`${testId}-menu-dup-${board.id}`}>
                <Copy className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Duplicate
              </DropdownMenuItem>
            )}
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gba:text-destructive"
                  onClick={() => {
                    if (confirm('Delete this board?')) onDelete(board.id)
                  }}
                  data-testid={`${testId}-menu-del-${board.id}`}
                >
                  <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
