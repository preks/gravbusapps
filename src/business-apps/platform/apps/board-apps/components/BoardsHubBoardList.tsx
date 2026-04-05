import React, { useState } from 'react'
import {
  Button,
  Card,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { LayoutGrid, Plus, List, Star, Users, Sparkles, FolderClosed } from 'lucide-react'
import type { BoardHubSidebarSection } from '../hooks/useBoardAppsHubFiltering'
import type { BoardSummary } from '../types'
import { BoardListItem, formatRelativeTime } from './BoardListItem'

export type CollectionInfo = { name: string; color?: string; icon?: string; memberCount?: number }

export interface BoardsHubBoardListProps {
  searchQuery: string
  activeSection: BoardHubSidebarSection
  isLoading: boolean
  error: string | null
  filteredBoards: BoardSummary[]
  favorites: Set<string>
  collectionNameMap?: Map<string, CollectionInfo>
  onOpenBoard: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCreateOpen: () => void
  onAIOpen: () => void
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void
  onShare: (boardId: string) => void
  onMoveToCollection: (boardId: string) => void
  testId: string
}

export const BoardsHubBoardList: React.FC<BoardsHubBoardListProps> = ({
  activeSection,
  isLoading,
  error,
  filteredBoards,
  favorites,
  collectionNameMap,
  onOpenBoard,
  onDuplicate,
  onDelete,
  onCreateOpen,
  onAIOpen,
  onToggleFavorite,
  onShare,
  onMoveToCollection,
  testId
}) => {
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list')

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
      {/* View toggle bar */}
      <div className="gba:shrink-0 gba:px-5 gba:py-2 gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-xs gba:text-muted-foreground">
          {filteredBoards.length} {filteredBoards.length === 1 ? 'board' : 'boards'}
        </span>
        <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:p-0.5">
          <button
            onClick={() => setViewLayout('list')}
            className={`gba:p-1 gba:rounded gba:transition-colors ${
              viewLayout === 'list'
                ? 'gba:bg-accent gba:text-accent-foreground'
                : 'gba:text-muted-foreground hover:gba:text-foreground'
            }`}
            data-testid={`${testId}-view-list`}
          >
            <List className="gba:w-3.5 gba:h-3.5" />
          </button>
          <button
            onClick={() => setViewLayout('grid')}
            className={`gba:p-1 gba:rounded gba:transition-colors ${
              viewLayout === 'grid'
                ? 'gba:bg-accent gba:text-accent-foreground'
                : 'gba:text-muted-foreground hover:gba:text-foreground'
            }`}
            data-testid={`${testId}-view-grid`}
          >
            <LayoutGrid className="gba:w-3.5 gba:h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-auto">
        {isLoading && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
            <Spinner size="lg" />
          </div>
        )}

        {error && !isLoading && (
          <div className="gba:p-6">
            <Card className="gba:p-6 gba:text-center">
              <p className="gba:text-destructive gba:text-sm">{error}</p>
            </Card>
          </div>
        )}

        {!isLoading && !error && filteredBoards.length === 0 && (
          <SectionEmptyState
            activeSection={activeSection}
            onCreateOpen={onCreateOpen}
            onAIOpen={onAIOpen}
            testId={testId}
          />
        )}

        {!isLoading && filteredBoards.length > 0 && viewLayout === 'list' && (
          <div className="gba:w-full">
            <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
              <div className="gba:flex gba:items-center gba:px-4 gba:py-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground">
                <div className="gba:w-8 gba:flex-shrink-0" />
                <div className="gba:flex-1 gba:min-w-0">Name</div>
                <div className="gba:w-36 gba:flex-shrink-0">Collection</div>
                <div className="gba:w-28 gba:flex-shrink-0">Modified</div>
                <div className="gba:w-16 gba:flex-shrink-0 gba:text-right">Rows</div>
                <div className="gba:w-8 gba:flex-shrink-0" />
              </div>
            </div>
            <div className="gba:divide-y gba:divide-border">
              {filteredBoards.map(board => (
                <BoardListItem
                  key={board.id}
                  board={board}
                  isFavorite={favorites.has(board.id)}
                  collectionInfo={board.spaceId ? collectionNameMap?.get(board.spaceId) : undefined}
                  onToggleFavorite={onToggleFavorite}
                  onOpen={onOpenBoard}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onShare={onShare}
                  onMoveToCollection={onMoveToCollection}
                  testId={testId}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && filteredBoards.length > 0 && viewLayout === 'grid' && (
          <div className="gba:p-4 gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3">
            {filteredBoards.map(board => (
              <Card
                key={board.id}
                className="gba:cursor-pointer gba:hover:ring-1 gba:hover:ring-primary/20 gba:transition-shadow"
                onClick={() => onOpenBoard(board.id)}
                data-testid={`${testId}-card-${board.id}`}
              >
                <div className="gba:aspect-video gba:bg-primary/5 gba:flex gba:items-center gba:justify-center gba:rounded-t-lg">
                  <LayoutGrid className="gba:w-10 gba:h-10 gba:text-primary/30" />
                </div>
                <div className="gba:p-2.5">
                  <h3 className="gba:font-medium gba:text-foreground gba:text-sm gba:truncate">{board.name}</h3>
                  {board.spaceId &&
                    collectionNameMap?.get(board.spaceId) &&
                    (() => {
                      const info = collectionNameMap.get(board.spaceId!)!
                      return (
                        <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
                          <FolderClosed className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                          <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{info.name}</span>
                          {(info.memberCount ?? 0) > 1 && (
                            <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-xs gba:text-muted-foreground gba:ml-auto">
                              <Users className="gba:w-3 gba:h-3" /> {info.memberCount}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    <span>{formatRelativeTime(board.updatedAt)}</span>
                    {board.rowCount > 0 && <span>{board.rowCount.toLocaleString()} rows</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type SidebarSection = BoardHubSidebarSection

const EMPTY_STATE_COPY: Record<SidebarSection, { title: string; description: string; showCreate: boolean }> = {
  home: { title: 'No boards yet', description: 'Create your first board to get started.', showCreate: true },
  'my-boards': { title: 'No boards yet', description: 'Create your first board to get started.', showCreate: true },
  shared: {
    title: 'Nothing shared with you',
    description: 'When someone shares a board with you, it will appear here.',
    showCreate: false
  },
  favorites: { title: 'No favorites', description: 'Star boards to see them here.', showCreate: false },
  recent: { title: 'No recent boards', description: 'Boards you work on will appear here.', showCreate: true }
}

function SectionEmptyState({
  activeSection,
  onCreateOpen,
  onAIOpen,
  testId
}: {
  activeSection: SidebarSection
  onCreateOpen: () => void
  onAIOpen: () => void
  testId: string
}) {
  const copy = EMPTY_STATE_COPY[activeSection] || EMPTY_STATE_COPY['my-boards']
  const SectionIcon = activeSection === 'shared' ? Users : activeSection === 'favorites' ? Star : LayoutGrid

  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
      <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-4">
        <SectionIcon className="gba:w-8 gba:h-8 gba:text-primary" />
      </div>
      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">{copy.title}</h3>
      <p className="gba:text-muted-foreground gba:text-sm gba:mb-5">{copy.description}</p>
      {copy.showCreate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" data-testid={`${testId}-empty-create`}>
              <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> New Board
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={onCreateOpen} data-testid={`${testId}-empty-create-manual`}>
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" /> Create manually
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAIOpen} data-testid={`${testId}-empty-create-ai`}>
              <Sparkles className="gba:h-4 gba:w-4 gba:mr-2" /> Create with AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
