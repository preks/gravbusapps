import React, { useMemo } from 'react'
import {
  LayoutGrid,
  Table2,
  Kanban,
  Calendar,
  GanttChart,
  FormInput,
  BarChart3,
  Plus,
  Sparkles,
  Clock,
  ArrowRight,
  Star,
  Layers,
  Rows3
} from 'lucide-react'
import type { SearchSection } from './GlobalSearchSidebar'
import type { BoardSummary } from '../../types'

const VIEW_TYPES = [
  { key: 'table', label: 'Table', icon: Table2 },
  { key: 'kanban', label: 'Kanban', icon: Kanban },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
  { key: 'form', label: 'Form', icon: FormInput },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 }
] as const

const QUICK_ACTIONS = [
  { key: 'create', label: 'New Board', icon: Plus, description: 'Start from scratch with a blank board' },
  { key: 'ai', label: 'AI Board', icon: Sparkles, description: 'Describe what you need and AI builds it' }
] as const

interface GlobalSearchBrowseContentProps {
  section: SearchSection
  boards: BoardSummary[]
  onOpenBoard: (id: string) => void
  onCreateBoard: () => void
  onCreateAI: () => void
  'data-testid'?: string
}

export const GlobalSearchBrowseContent: React.FC<GlobalSearchBrowseContentProps> = ({
  section,
  boards,
  onOpenBoard,
  onCreateBoard,
  onCreateAI,
  'data-testid': testId = 'search-browse'
}) => {
  const recentBoards = useMemo(() => {
    return [...boards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8)
  }, [boards])

  const favoriteBoards = useMemo(() => boards.filter(b => b.status === 'promoted'), [boards])

  if (section === 'trending') {
    return (
      <TrendingSection boards={recentBoards} favorites={favoriteBoards} onOpenBoard={onOpenBoard} testId={testId} />
    )
  }
  if (section === 'boards') {
    return <BoardsSection boards={boards} onOpenBoard={onOpenBoard} testId={testId} />
  }
  if (section === 'views') {
    return <ViewsSection testId={testId} />
  }
  return <ActionsSection onCreateBoard={onCreateBoard} onCreateAI={onCreateAI} testId={testId} />
}

function TrendingSection({
  boards,
  favorites,
  onOpenBoard,
  testId
}: {
  boards: BoardSummary[]
  favorites: BoardSummary[]
  onOpenBoard: (id: string) => void
  testId: string
}) {
  return (
    <div className="gba:py-3 gba:px-4" data-testid={`${testId}-trending`}>
      {favorites.length > 0 && (
        <SectionGroup label="Favorites">
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {favorites.slice(0, 6).map(b => (
              <button
                key={b.id}
                onClick={() => onOpenBoard(b.id)}
                className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:bg-desk-badge-golden/10 gba:border gba:border-desk-badge-golden/20 gba:text-sm gba:text-foreground gba:font-medium hover:gba:bg-desk-badge-golden/20 gba:transition-colors"
                data-testid={`${testId}-fav-${b.id}`}
              >
                <Star className="gba:w-3 gba:h-3 gba:text-desk-badge-golden" />
                <span className="gba:truncate gba:max-w-32">{b.name}</span>
              </button>
            ))}
          </div>
        </SectionGroup>
      )}

      <SectionGroup label="Recently Used">
        <div className="gba:space-y-0.5">
          {boards.map(b => (
            <BoardRow key={b.id} board={b} onClick={() => onOpenBoard(b.id)} testId={testId} />
          ))}
        </div>
      </SectionGroup>

      {boards.length === 0 && (
        <div className="gba:py-12 gba:text-center">
          <div className="gba:w-14 gba:h-14 gba:rounded-2xl gba:bg-muted/40 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
            <LayoutGrid className="gba:w-7 gba:h-7 gba:text-muted-foreground/30" />
          </div>
          <p className="gba:text-sm gba:text-muted-foreground">No boards yet. Create your first one!</p>
        </div>
      )}
    </div>
  )
}

function BoardsSection({
  boards,
  onOpenBoard,
  testId
}: {
  boards: BoardSummary[]
  onOpenBoard: (id: string) => void
  testId: string
}) {
  return (
    <div className="gba:py-3 gba:px-4" data-testid={`${testId}-boards`}>
      <SectionGroup label={`All Boards · ${boards.length}`}>
        <div className="gba:space-y-0.5">
          {boards.map(b => (
            <BoardRow key={b.id} board={b} onClick={() => onOpenBoard(b.id)} testId={testId} />
          ))}
        </div>
      </SectionGroup>
    </div>
  )
}

function ViewsSection({ testId }: { testId: string }) {
  return (
    <div className="gba:py-3 gba:px-4" data-testid={`${testId}-views`}>
      <SectionGroup label="View Types">
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          {VIEW_TYPES.map(v => {
            const Icon = v.icon
            return (
              <div
                key={v.key}
                className="gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-3 gba:rounded-xl gba:border gba:border-border/50 gba:bg-card/80 gba:text-sm gba:text-foreground"
                data-testid={`${testId}-view-${v.key}`}
              >
                <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-desk-badge-golden/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
                  <Icon className="gba:w-4 gba:h-4 gba:text-desk-badge-golden" />
                </div>
                <span className="gba:font-medium">{v.label}</span>
              </div>
            )
          })}
        </div>
      </SectionGroup>
      <p className="gba:mt-3 gba:text-xs gba:text-muted-foreground/50">
        Each board can have multiple views. Open a board to manage its views.
      </p>
    </div>
  )
}

function ActionsSection({
  onCreateBoard,
  onCreateAI,
  testId
}: {
  onCreateBoard: () => void
  onCreateAI: () => void
  testId: string
}) {
  const handlers: Record<string, () => void> = { create: onCreateBoard, ai: onCreateAI }

  return (
    <div className="gba:py-3 gba:px-4" data-testid={`${testId}-actions`}>
      <SectionGroup label="Quick Actions">
        <div className="gba:flex gba:flex-col gba:gap-2">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon
            const isAI = a.key === 'ai'
            return (
              <button
                key={a.key}
                onClick={handlers[a.key]}
                className="gba:flex gba:items-center gba:gap-3.5 gba:px-4 gba:py-3.5 gba:rounded-xl gba:border gba:border-border/50 gba:bg-card/80 hover:gba:bg-card gba:text-left gba:transition-all gba:group hover:gba:shadow-sm"
                data-testid={`${testId}-action-${a.key}`}
              >
                <div
                  className={`gba:w-10 gba:h-10 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${
                    isAI ? 'gba:bg-desk-badge-golden/10' : 'gba:bg-primary/8'
                  }`}
                >
                  <Icon className={`gba:w-5 gba:h-5 ${isAI ? 'gba:text-desk-badge-golden' : 'gba:text-primary'}`} />
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-semibold gba:text-foreground">{a.label}</p>
                  <p className="gba:text-xs gba:text-muted-foreground/60 gba:mt-0.5">{a.description}</p>
                </div>
                <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground/20 group-hover:gba:text-muted-foreground/60 gba:transition-colors" />
              </button>
            )
          })}
        </div>
      </SectionGroup>
    </div>
  )
}

function SectionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gba:mb-4">
      <p className="gba:text-[10px] gba:font-semibold gba:text-muted-foreground/50 gba:uppercase gba:tracking-wider gba:mb-2.5">
        {label}
      </p>
      {children}
    </div>
  )
}

function BoardRow({ board, onClick, testId }: { board: BoardSummary; onClick: () => void; testId: string }) {
  return (
    <button
      className="gba:w-full gba:text-left gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-lg hover:gba:bg-muted/50 gba:transition-colors gba:group"
      onClick={onClick}
      data-testid={`${testId}-board-${board.id}`}
    >
      <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/8 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        {board.icon ? (
          <span className="gba:text-base">{board.icon}</span>
        ) : (
          <LayoutGrid className="gba:w-4 gba:h-4 gba:text-primary/40" />
        )}
      </div>
      <div className="gba:flex-1 gba:min-w-0">
        <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate group-hover:gba:text-primary gba:transition-colors">
          {board.name}
        </p>
        <div className="gba:flex gba:items-center gba:gap-2.5 gba:mt-0.5">
          <span className="gba:text-[11px] gba:text-muted-foreground/50 gba:flex gba:items-center gba:gap-1">
            <Clock className="gba:w-3 gba:h-3" />
            {formatShortDate(board.updatedAt)}
          </span>
          <span className="gba:text-[11px] gba:text-muted-foreground/50 gba:flex gba:items-center gba:gap-1">
            <Layers className="gba:w-3 gba:h-3" />
            {board.sheetCount}
          </span>
          {board.rowCount > 0 && (
            <span className="gba:text-[11px] gba:text-muted-foreground/50 gba:flex gba:items-center gba:gap-1">
              <Rows3 className="gba:w-3 gba:h-3" />
              {board.rowCount.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/20 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
    </button>
  )
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays < 1) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
