import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Plus, Sparkles, Search } from 'lucide-react'
import { PremiumHeroShell } from '@/common/components/premium-hero'
import { BoardsHeroOverviewCard } from './BoardsHeroOverviewCard'
import { BoardsHeroActivityCard } from './BoardsHeroActivityCard'
import { BoardsHeroInsightCards } from './BoardsHeroInsightCards'
import type { BoardStatsResponse, BoardSummary, MyWorkResponse } from '../../types'

export interface HeroNavTab {
  key: string
  label: string
  icon?: React.ReactNode
}

export interface BoardsHubHeroProps {
  stats: BoardStatsResponse | null
  boards: BoardSummary[]
  myWork: MyWorkResponse | null
  isLoading?: boolean
  onOpenBoard?: (id: string) => void
  onNavigateToItem?: (boardId: string, sheetId: string, rowId: string) => void
  tabs: HeroNavTab[]
  activeTab: string
  onTabChange: (key: string) => void
  onCreateOpen?: () => void
  onAIOpen?: () => void
  onSearchOpen?: () => void
  'data-testid'?: string
}

const FULL_HEIGHT = '600px'
const COMPACT_HEIGHT = '120px'
const HERO_BTN = 'gba:bg-inverse/10 gba:border-inverse/20 gba:text-inverse gba:hover:bg-inverse/15'

/**
 * Boards Hub Hero with smooth animated transition between expanded
 * (Home — 3 card columns) and compact (other tabs — title + tab bar).
 */
export const BoardsHubHero: React.FC<BoardsHubHeroProps> = ({
  stats,
  boards,
  myWork,
  isLoading,
  onOpenBoard,
  onNavigateToItem,
  tabs,
  activeTab,
  onTabChange,
  onCreateOpen,
  onAIOpen,
  onSearchOpen,
  'data-testid': testId = 'boards-hub-hero'
}) => {
  const isHome = activeTab === 'home'

  return (
    <PremiumHeroShell height={isHome ? FULL_HEIGHT : COMPACT_HEIGHT} animated data-testid={`${testId}-shell`}>
      <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-8 gba:flex gba:flex-col gba:h-full">
        {/* Title row + action buttons */}
        <div className="gba:flex gba:items-center gba:justify-between gba:pt-7 gba:pb-4">
          <h1
            className="gba:font-funnel-display gba:font-light gba:text-inverse gba:tracking-tight gba:transition-all gba:duration-500 gba:ease-in-out"
            style={{ fontSize: isHome ? '2.25rem' : '1.5rem', lineHeight: 1.2 }}
            data-testid={`${testId}-label`}
          >
            Boards Hub
          </h1>

          <div className="gba:flex gba:items-center gba:gap-2">
            {onSearchOpen && (
              <Button
                variant="outline"
                size="sm"
                className={HERO_BTN}
                onClick={onSearchOpen}
                data-testid={`${testId}-search-btn`}
              >
                <Search className="gba:w-4 gba:h-4 gba:mr-1.5" />
                Search
              </Button>
            )}
            {onAIOpen && (
              <Button
                variant="outline"
                size="sm"
                className={HERO_BTN}
                onClick={onAIOpen}
                data-testid={`${testId}-ai-btn`}
              >
                <Sparkles className="gba:w-4 gba:h-4 gba:mr-1.5" />
                AI Board
              </Button>
            )}
            {onCreateOpen && (
              <Button
                variant="outline"
                size="sm"
                className={HERO_BTN}
                onClick={onCreateOpen}
                data-testid={`${testId}-create-btn`}
              >
                <Plus className="gba:w-4 gba:h-4 gba:mr-1.5" />
                New Board
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard cards — always in DOM, animated visibility */}
        <div
          className={`gba:grid gba:grid-cols-12 gba:gap-4 gba:items-stretch gba:overflow-hidden ${
            isHome ? 'gba:opacity-100 gba:pb-4' : 'gba:opacity-0 gba:pointer-events-none'
          }`}
          style={{
            maxHeight: isHome ? '480px' : '0px',
            transition:
              'max-height 450ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease, padding 450ms cubic-bezier(0.4,0,0.2,1)'
          }}
          data-testid={`${testId}-grid`}
        >
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

        {/* Horizontal tab bar — always visible at bottom */}
        <nav className="gba:flex gba:items-center gba:gap-0 gba:mt-auto" data-testid={`${testId}-tabs`}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`gba:flex gba:items-center gba:gap-1.5 gba:px-4 gba:h-10 gba:text-sm gba:border-b-2 gba:transition-colors ${
                activeTab === tab.key
                  ? 'gba:border-inverse gba:text-inverse gba:font-medium'
                  : 'gba:border-transparent gba:text-inverse/50 gba:hover:text-inverse/80'
              }`}
              data-testid={`${testId}-tab-${tab.key}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </PremiumHeroShell>
  )
}

export default BoardsHubHero
