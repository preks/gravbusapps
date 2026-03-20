import React from 'react'
import {
  Button,
  Card,
  Badge,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { LayoutGrid, Plus, Users, Share2, FolderOpen, ArrowRight, ChevronDown, ExternalLink } from 'lucide-react'
import type { BoardCollection } from '../../types/collection'
import type { BoardSummary } from '../../types/board'
import { formatRelativeTime } from '../BoardListItem'

export interface CollectionDashboardProps {
  collection: BoardCollection
  boards: BoardSummary[]
  isLoading?: boolean
  onOpenBoard: (id: string) => void
  onCreateBoard: () => void
  onAddExistingBoard: () => void
  onShareCollection: () => void
  onManageMembers: () => void
  onOpenInSpaces?: () => void
  'data-testid'?: string
}

export const CollectionDashboard: React.FC<CollectionDashboardProps> = ({
  collection,
  boards,
  isLoading,
  onOpenBoard,
  onCreateBoard,
  onAddExistingBoard,
  onShareCollection,
  onManageMembers,
  onOpenInSpaces,
  'data-testid': testId = 'collection-dashboard'
}) => (
  <div className="gba:flex-1 gba:overflow-auto" data-testid={testId}>
    {/* Collection Header */}
    <div className="gba:border-b gba:border-border gba:bg-gradient-to-r gba:from-primary/5 gba:to-transparent">
      <div className="gba:max-w-5xl gba:mx-auto gba:px-6 gba:py-6">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div
              className="gba:w-12 gba:h-12 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:text-xl"
              style={{
                backgroundColor: collection.color ? `${collection.color}20` : undefined,
                color: collection.color || undefined
              }}
            >
              {collection.icon || <FolderOpen className="gba:w-6 gba:h-6" />}
            </div>
            <div>
              <h1 className="gba:text-xl gba:font-bold gba:text-foreground">{collection.name}</h1>
              {collection.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-0.5">{collection.description}</p>
              )}
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" size="sm" onClick={onShareCollection} data-testid={`${testId}-share`}>
              <Share2 className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" /> Share
            </Button>
            <Button variant="outline" size="sm" onClick={onManageMembers} data-testid={`${testId}-members`}>
              <Users className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" /> Members
              {collection.memberCount > 0 && (
                <Badge variant="secondary" className="gba:ml-1 gba:text-xs gba:px-1.5">
                  {collection.memberCount}
                </Badge>
              )}
            </Button>
            {onOpenInSpaces && (
              <Button variant="outline" size="sm" onClick={onOpenInSpaces} data-testid={`${testId}-open-in-spaces`}>
                <ExternalLink className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" /> Open in Spaces
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="gba:flex gba:items-center gba:gap-6 gba:mt-4">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground">
            <LayoutGrid className="gba:w-4 gba:h-4" />
            <span>
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground">
            <Users className="gba:w-4 gba:h-4" />
            <span>
              {collection.memberCount} {collection.memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Content */}
    <div className="gba:max-w-5xl gba:mx-auto gba:px-6 gba:py-6">
      {/* Board list header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">Boards</h2>
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <Button size="sm" onClick={onCreateBoard} data-testid={`${testId}-create-board`}>
            <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" /> New Board
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gba:px-1.5" data-testid={`${testId}-add-board-menu`}>
                <ChevronDown className="gba:w-3.5 gba:h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCreateBoard} data-testid={`${testId}-add-new`}>
                <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Create new board
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddExistingBoard} data-testid={`${testId}-add-existing`}>
                <ArrowRight className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Add existing board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <Spinner size="lg" />
        </div>
      ) : boards.length === 0 ? (
        <CollectionEmptyState onCreateBoard={onCreateBoard} onAddExisting={onAddExistingBoard} testId={testId} />
      ) : (
        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-3">
          {boards.map(board => (
            <Card
              key={board.id}
              className="gba:cursor-pointer gba:hover:ring-1 gba:hover:ring-primary/20 gba:transition-all gba:hover:shadow-md"
              onClick={() => onOpenBoard(board.id)}
              data-testid={`${testId}-board-card-${board.id}`}
            >
              <div className="gba:aspect-[16/9] gba:bg-primary/5 gba:flex gba:items-center gba:justify-center gba:rounded-t-lg">
                <LayoutGrid className="gba:w-8 gba:h-8 gba:text-primary/25" />
              </div>
              <div className="gba:p-3">
                <h3 className="gba:font-medium gba:text-foreground gba:text-sm gba:truncate">{board.name}</h3>
                {board.description && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-0.5">{board.description}</p>
                )}
                <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:mt-2">
                  <span>{formatRelativeTime(board.updatedAt)}</span>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {collection.memberCount > 1 && (
                      <span className="gba:inline-flex gba:items-center gba:gap-0.5">
                        <Users className="gba:w-3 gba:h-3" /> {collection.memberCount}
                      </span>
                    )}
                    {board.rowCount > 0 && <span>{board.rowCount.toLocaleString()} rows</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  </div>
)

function CollectionEmptyState({
  onCreateBoard,
  onAddExisting,
  testId
}: {
  onCreateBoard: () => void
  onAddExisting: () => void
  testId: string
}) {
  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:px-4">
      <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-4">
        <LayoutGrid className="gba:w-8 gba:h-8 gba:text-primary" />
      </div>
      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">No boards yet</h3>
      <p className="gba:text-muted-foreground gba:text-sm gba:mb-5 gba:text-center gba:max-w-xs">
        Create a new board directly in this space, or move an existing one here.
      </p>
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button onClick={onCreateBoard} data-testid={`${testId}-empty-create`}>
          <Plus className="gba:w-4 gba:h-4 gba:mr-1.5" /> Create Board
        </Button>
        <Button variant="outline" onClick={onAddExisting} data-testid={`${testId}-empty-add-existing`}>
          <ArrowRight className="gba:w-4 gba:h-4 gba:mr-1.5" /> Add Existing
        </Button>
      </div>
    </div>
  )
}
