import React, { useMemo } from 'react'
import { Badge, Card } from '@newwork/nw-design-system'
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
  { key: 'create', label: 'New Board', icon: Plus, description: 'Create from scratch' },
  { key: 'ai', label: 'AI Board', icon: Sparkles, description: 'Build with AI' }
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
    <div className="gba:py-2" data-testid={`${testId}-trending`}>
      {favorites.length > 0 && (
        <SectionGroup label="Favorites">
          <div className="gba:flex gba:flex-wrap gba:gap-2 gba:px-4">
            {favorites.slice(0, 6).map(b => (
              <button
                key={b.id}
                onClick={() => onOpenBoard(b.id)}
                className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-warning/5 gba:border gba:border-warning/15 gba:text-sm gba:text-foreground gba:font-medium hover:gba:bg-warning/10 gba:transition-colors"
                data-testid={`${testId}-fav-${b.id}`}
              >
                <Star className="gba:w-3.5 gba:h-3.5 gba:text-warning" />
                <span className="gba:truncate gba:max-w-32">
                  {b.icon || ''} {b.name}
                </span>
              </button>
            ))}
          </div>
        </SectionGroup>
      )}

      <SectionGroup label="Recently Used">
        <div className="gba:grid gba:grid-cols-2 gba:gap-2.5 gba:px-4">
          {boards.map(b => (
            <BoardMiniCard key={b.id} board={b} onClick={() => onOpenBoard(b.id)} testId={testId} />
          ))}
        </div>
      </SectionGroup>

      {boards.length === 0 && (
        <div className="gba:px-6 gba:py-12 gba:text-center">
          <LayoutGrid className="gba:w-10 gba:h-10 gba:text-muted-foreground/30 gba:mx-auto gba:mb-3" />
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
    <div className="gba:py-2" data-testid={`${testId}-boards`}>
      <SectionGroup label="All Boards">
        <div className="gba:grid gba:grid-cols-2 gba:gap-2.5 gba:px-4">
          {boards.map(b => (
            <BoardMiniCard key={b.id} board={b} onClick={() => onOpenBoard(b.id)} testId={testId} />
          ))}
        </div>
      </SectionGroup>
    </div>
  )
}

function ViewsSection({ testId }: { testId: string }) {
  return (
    <div className="gba:py-2" data-testid={`${testId}-views`}>
      <SectionGroup label="View Types">
        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:px-4">
          {VIEW_TYPES.map(v => {
            const Icon = v.icon
            return (
              <div
                key={v.key}
                className="gba:flex gba:items-center gba:gap-2 gba:px-3.5 gba:py-2 gba:rounded-lg gba:border gba:bg-card gba:text-sm gba:text-foreground gba:font-medium"
                data-testid={`${testId}-view-${v.key}`}
              >
                <Icon className="gba:w-4 gba:h-4 gba:text-primary" />
                {v.label}
              </div>
            )
          })}
        </div>
      </SectionGroup>
      <p className="gba:px-4 gba:mt-4 gba:text-xs gba:text-muted-foreground/60">
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
    <div className="gba:py-2" data-testid={`${testId}-actions`}>
      <SectionGroup label="Quick Actions">
        <div className="gba:flex gba:flex-col gba:gap-1 gba:px-3">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon
            return (
              <button
                key={a.key}
                onClick={handlers[a.key]}
                className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-lg hover:gba:bg-accent/50 gba:text-left gba:transition-colors gba:group"
                data-testid={`${testId}-action-${a.key}`}
              >
                <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                  <Icon className="gba:w-4 gba:h-4 gba:text-primary" />
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">{a.label}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{a.description}</p>
                </div>
                <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground/30 group-hover:gba:text-primary gba:transition-colors" />
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
      <div className="gba:px-4 gba:py-2">
        <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
          {label}
        </h3>
      </div>
      {children}
    </div>
  )
}

function BoardMiniCard({ board, onClick, testId }: { board: BoardSummary; onClick: () => void; testId: string }) {
  const hasRows = board.rowCount > 0

  return (
    <Card
      className="gba:cursor-pointer hover:gba:ring-1 hover:gba:ring-primary/20 gba:transition-all gba:overflow-hidden gba:group gba:p-0"
      onClick={onClick}
      data-testid={`${testId}-board-${board.id}`}
    >
      <div className="gba:h-16 gba:bg-gradient-to-br gba:from-primary/8 gba:to-primary/3 gba:flex gba:items-center gba:justify-center gba:relative">
        {board.icon ? (
          <span className="gba:text-3xl">{board.icon}</span>
        ) : (
          <LayoutGrid className="gba:w-7 gba:h-7 gba:text-primary/20" />
        )}
        {board.isShared && (
          <Badge
            variant="secondary"
            className="gba:absolute gba:top-1.5 gba:right-1.5 gba:text-[9px] gba:px-1.5 gba:py-0 gba:h-4"
          >
            Shared
          </Badge>
        )}
      </div>

      <div className="gba:px-3 gba:py-2.5">
        <p className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate group-hover:gba:text-primary gba:transition-colors">
          {board.name}
        </p>
        {board.description && (
          <p className="gba:text-xs gba:text-muted-foreground/70 gba:truncate gba:mt-0.5">{board.description}</p>
        )}

        <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2">
          <span className="gba:text-[11px] gba:text-muted-foreground/60 gba:flex gba:items-center gba:gap-1">
            <Clock className="gba:w-3 gba:h-3" />
            {formatShortDate(board.updatedAt)}
          </span>
          <span className="gba:text-[11px] gba:text-muted-foreground/60 gba:flex gba:items-center gba:gap-1">
            <Layers className="gba:w-3 gba:h-3" />
            {board.sheetCount} {board.sheetCount === 1 ? 'sheet' : 'sheets'}
          </span>
          {hasRows && (
            <span className="gba:text-[11px] gba:text-muted-foreground/60 gba:flex gba:items-center gba:gap-1">
              <Rows3 className="gba:w-3 gba:h-3" />
              {board.rowCount.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Card>
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
