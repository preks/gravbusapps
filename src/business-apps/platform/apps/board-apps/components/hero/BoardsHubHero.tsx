import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Plus, Sparkles, Search, PanelLeft } from 'lucide-react'
import { BoardsHeroOverviewCard } from './BoardsHeroOverviewCard'
import { BoardsHeroActivityCard } from './BoardsHeroActivityCard'
import { BoardsHeroInsightCards } from './BoardsHeroInsightCards'
import type { BoardStatsResponse, BoardSummary, MyWorkResponse } from '../../types'

export interface BoardsHubHeroProps {
  stats: BoardStatsResponse | null
  boards: BoardSummary[]
  myWork: MyWorkResponse | null
  isLoading?: boolean
  onOpenBoard?: (id: string) => void
  onNavigateToItem?: (boardId: string, sheetId: string, rowId: string) => void
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  onCreateOpen?: () => void
  onAIOpen?: () => void
  onSearchOpen?: () => void
  'data-testid'?: string
}

export const BoardsHubHero: React.FC<BoardsHubHeroProps> = ({
  stats,
  boards,
  myWork,
  isLoading,
  onOpenBoard,
  onNavigateToItem,
  isSidebarCollapsed,
  onToggleSidebar,
  onCreateOpen,
  onAIOpen,
  onSearchOpen,
  'data-testid': testId = 'boards-hub-hero'
}) => (
  <div className="gba:bg-background gba:w-full gba:shrink-0" data-testid={`${testId}-shell`}>
    <div className="gba:max-w-7xl gba:mx-auto gba:px-8 gba:flex gba:flex-col">
      {/* Title row + action buttons */}
      <div className="gba:flex gba:items-center gba:justify-between gba:pt-7 gba:pb-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          {isSidebarCollapsed && onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:text-muted-foreground gba:hover:text-foreground"
              onClick={onToggleSidebar}
              data-testid={`${testId}-expand-sidebar`}
            >
              <PanelLeft className="gba:w-4 gba:h-4" />
            </Button>
          )}
          <h1
            className="gba:font-funnel-display gba:font-light gba:text-foreground gba:tracking-tight gba:text-4xl"
            data-testid={`${testId}-label`}
          >
            Boards Hub
          </h1>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {onSearchOpen && (
            <Button variant="outline" size="sm" onClick={onSearchOpen} data-testid={`${testId}-search-btn`}>
              <Search className="gba:w-4 gba:h-4 gba:mr-1.5" />
              Search
            </Button>
          )}
          {onAIOpen && (
            <Button variant="outline" size="sm" onClick={onAIOpen} data-testid={`${testId}-ai-btn`}>
              <Sparkles className="gba:w-4 gba:h-4 gba:mr-1.5" />
              AI Board
            </Button>
          )}
          {onCreateOpen && (
            <Button size="sm" onClick={onCreateOpen} data-testid={`${testId}-create-btn`}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-1.5" />
              New Board
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="gba:grid gba:grid-cols-12 gba:gap-4 gba:items-stretch gba:pb-6" data-testid={`${testId}-grid`}>
        <div className="gba:col-span-4 gba:overflow-hidden gba:rounded-xl">
          <BoardsHeroOverviewCard
            stats={stats}
            boards={boards}
            isLoading={isLoading}
            data-testid={`${testId}-overview`}
          />
        </div>
        <div className="gba:col-span-4 gba:overflow-hidden gba:rounded-xl">
          <BoardsHeroActivityCard
            boards={boards}
            isLoading={isLoading}
            onOpenBoard={onOpenBoard}
            data-testid={`${testId}-activity`}
          />
        </div>
        <div className="gba:col-span-4 gba:overflow-hidden gba:rounded-xl">
          <BoardsHeroInsightCards
            stats={stats}
            myWork={myWork}
            boards={boards}
            isLoading={isLoading}
            onNavigateToItem={onNavigateToItem}
            data-testid={`${testId}-insights`}
          />
        </div>
      </div>
    </div>
  </div>
)

export default BoardsHubHero
