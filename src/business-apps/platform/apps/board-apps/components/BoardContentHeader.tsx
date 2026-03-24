/**
 * BoardContentHeader – slim sticky toolbar for the boards list view.
 * Follows the Notes app NoteContentHeader pattern: breadcrumb + actions bar.
 */

import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { Plus, ChevronRight, PanelLeft, Search, LayoutGrid, Sparkles, FolderPlus } from 'lucide-react'
import type { BoardHubSidebarSection } from '../hooks/useBoardAppsHubFiltering'

export interface BoardContentHeaderProps {
  activeSection: BoardHubSidebarSection
  collectionName?: string | null
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onSectionReset: () => void
  onGlobalSearch: () => void
  onCreateBoard: () => void
  onCreateBoardAI: () => void
  onCreateCollection: () => void
  'data-testid'?: string
}

const SECTION_LABELS: Record<string, string> = {
  home: 'Home',
  'my-boards': 'All Boards',
  shared: 'Shared with me',
  favorites: 'Favorites',
  recent: 'Recent'
}

export const BoardContentHeader: React.FC<BoardContentHeaderProps> = ({
  activeSection,
  collectionName,
  isSidebarCollapsed,
  onToggleSidebar,
  onSectionReset,
  onGlobalSearch,
  onCreateBoard,
  onCreateBoardAI,
  onCreateCollection,
  'data-testid': testId = 'board-content-header'
}) => (
  <div
    className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:h-12 gba:border-b gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:sticky gba:top-0 gba:z-10 gba:shrink-0"
    data-testid={testId}
  >
    {isSidebarCollapsed && (
      <Button variant="ghost" size="icon" className="gba:h-6 gba:w-6" onClick={onToggleSidebar}>
        <PanelLeft className="gba:w-4 gba:h-4" />
      </Button>
    )}

    <nav className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:flex-1 gba:min-w-0" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={onSectionReset}
        className={`gba:transition-colors gba:truncate gba:max-w-[140px] ${
          collectionName ? 'gba:text-muted-foreground hover:gba:text-foreground' : 'gba:text-foreground gba:font-medium'
        }`}
      >
        {SECTION_LABELS[activeSection] || 'Boards'}
      </button>
      {collectionName && (
        <>
          <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/50 gba:flex-shrink-0" />
          <span className="gba:text-foreground gba:font-medium gba:truncate">{collectionName}</span>
        </>
      )}
    </nav>

    <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={onGlobalSearch}
        className="gba:h-6 gba:gap-1.5 gba:px-2 gba:text-xs gba:text-muted-foreground hover:gba:text-foreground"
        data-testid={`${testId}-search`}
      >
        <Search className="gba:w-3.5 gba:h-3.5" />
        <span className="gba:hidden gba:sm:inline">Search</span>
        <kbd className="gba:hidden gba:sm:inline gba:ml-1 gba:text-[10px] gba:text-muted-foreground/60 gba:bg-muted gba:rounded gba:px-1 gba:py-0.5 gba:font-mono">
          ⌘K
        </kbd>
      </Button>

      <div className="gba:w-px gba:h-4 gba:bg-border/50" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gba:h-7 gba:gap-1.5" data-testid={`${testId}-new-btn`}>
            <Plus className="gba:w-3.5 gba:h-3.5" />
            New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="gba:w-52">
          <DropdownMenuItem onClick={onCreateBoard}>
            <LayoutGrid className="gba:w-4 gba:h-4 gba:mr-2 gba:text-primary" />
            <div>
              <div className="gba:font-medium gba:text-sm">Board</div>
              <div className="gba:text-xs gba:text-muted-foreground">Create a new board</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateBoardAI}>
            <Sparkles className="gba:w-4 gba:h-4 gba:mr-2 gba:text-warning" />
            <div>
              <div className="gba:font-medium gba:text-sm">Board with AI</div>
              <div className="gba:text-xs gba:text-muted-foreground">Generate with AI assistance</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCreateCollection}>
            <FolderPlus className="gba:w-4 gba:h-4 gba:mr-2" />
            <div>
              <div className="gba:font-medium gba:text-sm">Space</div>
              <div className="gba:text-xs gba:text-muted-foreground">Organize boards together</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
)
