import React, { useMemo } from 'react'
import {
  Card,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@newwork/nw-design-system'
import { LayoutGrid, MoreHorizontal, Copy, Trash2, Plus } from 'lucide-react'
import type { BoardSummary } from '../../types'

interface BoardsHomeRecentProps {
  boards: BoardSummary[]
  onOpenBoard: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCreateBoard: () => void
  'data-testid'?: string
}

function formatRelative(dateString: string): string {
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

export const BoardsHomeRecent: React.FC<BoardsHomeRecentProps> = ({
  boards,
  onOpenBoard,
  onDuplicate,
  onDelete,
  onCreateBoard,
  'data-testid': testId = 'boards-home-recent'
}) => {
  const recentBoards = useMemo(
    () => [...boards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [boards]
  )

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        Recently updated
      </h3>

      {recentBoards.length === 0 ? (
        <Card className="gba:p-6">
          <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
            <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-3">
              <LayoutGrid className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">No boards yet</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Create your first board to get started.</p>
            <Button size="sm" onClick={onCreateBoard} data-testid={`${testId}-create`}>
              <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> New Board
            </Button>
          </div>
        </Card>
      ) : (
        <div className="gba:space-y-2">
          {recentBoards.map(board => (
            <Card
              key={board.id}
              className="gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors"
              onClick={() => onOpenBoard(board.id)}
              data-testid={`${testId}-board-${board.id}`}
            >
              <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
                <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                  <LayoutGrid className="gba:w-4.5 gba:h-4.5 gba:text-primary" />
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{board.name}</p>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    <span>{formatRelative(board.updatedAt)}</span>
                    <span>&middot;</span>
                    <span>{board.rowCount.toLocaleString()} rows</span>
                    {board.isShared && (
                      <>
                        <span>&middot;</span>
                        <Badge variant="outline" className="gba:text-xs gba:px-1.5 gba:py-0">
                          Shared
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-7 gba:w-7 gba:p-0"
                        data-testid={`${testId}-menu-${board.id}`}
                      >
                        <MoreHorizontal className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpenBoard(board.id)}>Open</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(board.id)}>
                        <Copy className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gba:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this board?')) onDelete(board.id)
                        }}
                      >
                        <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
