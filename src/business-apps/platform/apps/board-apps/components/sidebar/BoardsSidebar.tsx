import React from 'react'
import {
  Button,
  Input,
  ScrollArea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { Plus, Search, PanelLeftClose, LayoutGrid, FolderPlus, Sparkles } from 'lucide-react'
import { BoardsSidebarQuickAccess, type QuickAccessSection } from './BoardsSidebarQuickAccess'
import { CollectionTree } from './CollectionTree'
import type { BoardHubSidebarSection } from '../../hooks/useBoardAppsHubFiltering'
import type { BoardCollection } from '../../types/collection'
import type { BoardSummary } from '../../types/board'

export interface BoardsSidebarProps {
  width: number
  isResizing: boolean
  activeSection: BoardHubSidebarSection
  activeCollectionId: string | null
  activeBoardId: string | null
  collections: BoardCollection[]
  collectionBoards: Map<string, BoardSummary[]>
  boardCounts: Partial<Record<QuickAccessSection, number>>
  searchQuery: string
  onSearchChange: (query: string) => void
  onSectionChange: (section: QuickAccessSection) => void
  onSelectCollection: (id: string) => void
  onSelectBoard: (boardId: string) => void
  onCreateBoard: () => void
  onCreateBoardAI: () => void
  onCreateCollection: () => void
  onShareCollection: (id: string) => void
  onRenameCollection: (id: string) => void
  onDeleteCollection: (id: string) => void
  onAddBoardToCollection: (collectionId: string) => void
  onCreateBoardInCollection: (collectionId: string) => void
  onLoadCollectionBoards: (id: string) => void
  onShareBoard?: (boardId: string) => void
  onRenameBoard?: (boardId: string) => void
  onDeleteBoard?: (boardId: string) => void
  onCollapse: () => void
  onResizeStart: (e: React.MouseEvent) => void
  'data-testid'?: string
}

export const BoardsSidebar: React.FC<BoardsSidebarProps> = ({
  width,
  isResizing,
  activeSection,
  activeCollectionId,
  activeBoardId,
  collections,
  collectionBoards,
  boardCounts,
  searchQuery,
  onSearchChange,
  onSectionChange,
  onSelectCollection,
  onSelectBoard,
  onCreateBoard,
  onCreateBoardAI,
  onCreateCollection,
  onShareCollection,
  onRenameCollection,
  onDeleteCollection,
  onAddBoardToCollection,
  onCreateBoardInCollection,
  onLoadCollectionBoards,
  onShareBoard,
  onRenameBoard,
  onDeleteBoard,
  onCollapse,
  onResizeStart,
  'data-testid': testId = 'boards-sidebar'
}) => (
  <div
    className="gba:relative gba:flex gba:flex-col gba:h-full gba:bg-card-decorative gba:border-r gba:border-white/10 gba:select-none"
    style={{ width, minWidth: width, maxWidth: width }}
    data-testid={testId}
  >
    {/* Header */}
    <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:h-12 gba:border-b gba:border-white/10">
      <div className="gba:flex gba:items-center gba:gap-2">
        <LayoutGrid className="gba:w-5 gba:h-5 gba:text-white/70" />
        <span className="gba:text-sm gba:font-semibold gba:text-white gba:tracking-tight">Boards</span>
      </div>
      <div className="gba:flex gba:items-center gba:gap-0.5">
        <DropdownMenu>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-6 gba:w-6 gba:p-0 gba:text-white/50 gba:hover:text-white gba:hover:bg-white/10"
                    data-testid={`${testId}-new-btn`}
                  >
                    <Plus className="gba:w-4 gba:h-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">New</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateBoard} data-testid={`${testId}-new-board`}>
              <LayoutGrid className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> New Board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateBoardAI} data-testid={`${testId}-new-board-ai`}>
              <Sparkles className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> New Board with AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateCollection} data-testid={`${testId}-new-collection`}>
              <FolderPlus className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> New Collection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-6 gba:w-6 gba:p-0 gba:text-white/50 gba:hover:text-white gba:hover:bg-white/10"
                onClick={onCollapse}
                data-testid={`${testId}-collapse`}
              >
                <PanelLeftClose className="gba:w-4 gba:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Collapse sidebar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    {/* Search */}
    <div className="gba:px-3 gba:py-2">
      <div className="gba:relative">
        <Search className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-white/40" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="gba:pl-8 gba:h-7 gba:text-xs gba:bg-white/10 gba:border-white/10 gba:text-white gba:placeholder:text-white/30 gba:focus:bg-white/15 gba:focus:border-white/20"
          data-testid={`${testId}-search`}
        />
      </div>
    </div>

    {/* Scrollable Content */}
    <ScrollArea className="gba:flex-1 gba:min-h-0">
      <div className="gba:py-1">
        {/* Quick Access */}
        <BoardsSidebarQuickAccess
          activeSection={activeSection}
          activeCollectionId={activeCollectionId}
          counts={boardCounts}
          onSectionChange={onSectionChange}
          data-testid={`${testId}-quick-access`}
        />

        {/* Divider */}
        <div className="gba:mx-3 gba:my-2 gba:border-t gba:border-white/10" />

        {/* Collections Label */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-1">
          <span className="gba:text-xs gba:font-medium gba:text-white/40 gba:uppercase gba:tracking-wider">
            Collections
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-5 gba:w-5 gba:p-0 gba:text-white/30 gba:hover:text-white/60 gba:hover:bg-white/10"
            onClick={onCreateCollection}
            data-testid={`${testId}-add-collection`}
          >
            <Plus className="gba:w-3.5 gba:h-3.5" />
          </Button>
        </div>

        {/* Collection Tree */}
        <div className="gba:px-1">
          <CollectionTree
            collections={collections}
            collectionBoards={collectionBoards}
            activeCollectionId={activeCollectionId}
            activeBoardId={activeBoardId}
            onSelectCollection={onSelectCollection}
            onSelectBoard={onSelectBoard}
            onShareCollection={onShareCollection}
            onRenameCollection={onRenameCollection}
            onDeleteCollection={onDeleteCollection}
            onAddBoardToCollection={onAddBoardToCollection}
            onCreateBoardInCollection={onCreateBoardInCollection}
            onLoadCollectionBoards={onLoadCollectionBoards}
            onShareBoard={onShareBoard}
            onRenameBoard={onRenameBoard}
            onDeleteBoard={onDeleteBoard}
            data-testid={`${testId}-tree`}
          />
        </div>
      </div>
    </ScrollArea>

    {/* Resize Handle */}
    <div
      className={`gba:absolute gba:top-0 gba:right-0 gba:w-1 gba:h-full gba:cursor-col-resize gba:transition-colors ${
        isResizing ? 'gba:bg-primary/50' : 'gba:hover:bg-white/20'
      }`}
      onMouseDown={onResizeStart}
      data-testid={`${testId}-resize`}
    />
  </div>
)
