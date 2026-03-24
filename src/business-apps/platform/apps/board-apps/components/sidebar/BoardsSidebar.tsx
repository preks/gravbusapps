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
  onOpenInSpaces?: (collectionId: string) => void
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
  onOpenInSpaces,
  onCollapse,
  onResizeStart,
  'data-testid': testId = 'boards-sidebar'
}) => (
  <div
    className="gba:relative gba:flex gba:flex-col gba:h-full gba:bg-secondary/40 gba:border-r gba:border-primary/15 gba:shadow-sm gba:select-none"
    style={{ width, minWidth: width, maxWidth: width }}
    data-testid={testId}
  >
    {/* Header — slightly elevated frosted strip so the rail feels intentional, not flat gray */}
    <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:h-12 gba:border-b gba:border-border/80 gba:bg-card/55 gba:backdrop-blur-sm">
      <div className="gba:flex gba:items-center gba:gap-2">
        <LayoutGrid className="gba:w-5 gba:h-5 gba:text-primary" />
        <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:tracking-tight">Boards</span>
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
                    className="gba:h-6 gba:w-6 gba:p-0 gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60"
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
              <FolderPlus className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> New Space
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-6 gba:w-6 gba:p-0 gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60"
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
        <Search className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="gba:pl-8 gba:h-7 gba:text-xs gba:bg-background/90 gba:border-border gba:border-primary/10 gba:text-foreground gba:placeholder:text-muted-foreground gba:focus:border-ring"
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
        <div className="gba:mx-3 gba:my-2 gba:border-t gba:border-primary/10" />

        {/* Collections Label */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-1">
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground/70 gba:uppercase gba:tracking-wider">
            Spaces
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-5 gba:w-5 gba:p-0 gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60"
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
            onOpenInSpaces={onOpenInSpaces}
            data-testid={`${testId}-tree`}
          />
        </div>
      </div>
    </ScrollArea>

    {/* Resize Handle */}
    <div
      className={`gba:absolute gba:top-0 gba:right-0 gba:w-1 gba:h-full gba:cursor-col-resize gba:transition-colors ${
        isResizing ? 'gba:bg-primary/50' : 'gba:hover:bg-border'
      }`}
      onMouseDown={onResizeStart}
      data-testid={`${testId}-resize`}
    />
  </div>
)
