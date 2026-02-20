/**
 * BoardsHub - main entry point for the Boards product.
 *
 * Single persistent hero header that morphs between hub mode (board list)
 * and viewer mode (open board) so navigation feels seamless.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from '@newwork/nw-design-system'
import { Button, Input, Card, Spinner } from '@newwork/nw-design-system'
import {
  LayoutGrid,
  Plus,
  Search,
  List,
  Star,
  PanelLeftClose,
  PanelLeft,
  FolderClosed,
  Users,
  Clock,
  Sparkles,
  Home,
  Database,
  Settings
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'
import { useBoardApps } from './hooks/useBoardApps'
import { CreateBoardDialog } from './components/CreateBoardDialog'
import { CreateBoardAIDialog } from './components/CreateBoardAIDialog'
import { BoardListItem, formatRelativeTime } from './components/BoardListItem'
import { useMobileDetect } from './hooks/useMobileDetect'
import { setBoardApiAuthTokenProvider } from './services/BoardApiService'
import { BoardViewer } from './BoardViewer'
import type { BoardViewerHandle } from './BoardViewer'
import { GlobalSearchDialog } from './components/search/GlobalSearchDialog'
import type { Board } from './types'
import { useBoardUrlState } from './hooks/useBoardUrlState'

export interface BoardsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type SidebarSection = 'home' | 'my-boards' | 'shared' | 'favorites' | 'recent'

const HERO_BTN = 'gba:bg-white/10 gba:border-white/20 gba:text-white gba:hover:bg-white/15'

export const BoardsHub: React.FC<BoardsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'boards-hub'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>('my-boards')
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const urlState = useBoardUrlState()
  const selectedBoardId = urlState.urlBoardId
  const { isMobile } = useMobileDetect()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const [highlightTarget, setHighlightTarget] = useState<{
    boardId: string
    sheetId: string
    rowId: string
    position?: number
  } | null>(null)
  const viewerRef = useRef<BoardViewerHandle>(null)

  useEffect(() => {
    if (!accessToken) return
    setBoardApiAuthTokenProvider(() => accessToken)
    return () => setBoardApiAuthTokenProvider(null)
  }, [accessToken])

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  const {
    boards,
    currentBoard,
    isLoading,
    error,
    loadBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
    clearCurrentBoard,
    updateSheet,
    rows,
    rowsLoading,
    rowsTotal,
    loadRows,
    createRow,
    updateRow,
    deleteRow
  } = useBoardApps(accessToken)

  useEffect(() => {
    if (urlState.urlBoardId && !currentBoard) {
      void loadBoard(urlState.urlBoardId)
    }
  }, [urlState.urlBoardId, currentBoard, loadBoard])

  const handleCreateBoard = useCallback(async () => {
    if (!newBoardName.trim()) return
    const board = await createBoard({
      name: newBoardName.trim(),
      sheets: [
        {
          id: '',
          name: 'Main',
          description: '',
          position: 0,
          groups: [],
          columns: [
            {
              id: 'col_name',
              name: 'name',
              label: 'Name',
              type: 'text',
              isVisible: true,
              isEditable: true,
              isRequired: false,
              isUnique: false,
              isPrimary: true,
              order: 0
            },
            {
              id: 'col_status',
              name: 'status',
              label: 'Status',
              type: 'status',
              isVisible: true,
              isEditable: true,
              isRequired: false,
              isUnique: false,
              order: 1,
              selectOptions: [
                { value: 'todo', label: 'To Do', colorToken: 'muted' },
                { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
                { value: 'done', label: 'Done', colorToken: 'success' }
              ]
            }
          ],
          views: [{ id: 'v_default', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } }],
          settings: {
            allowAdd: true,
            allowEdit: true,
            allowDelete: true,
            allowExport: true,
            allowImport: true,
            rowsPerPage: 50,
            showRowNumbers: false
          }
        }
      ]
    })
    if (board) {
      setNewBoardName('')
      setIsCreateDialogOpen(false)
      urlState.setBoardId(board.id)
      toast.success('Board created')
    }
  }, [newBoardName, createBoard])

  const handleOpenBoard = useCallback(
    async (id: string) => {
      const board = await loadBoard(id)
      if (board) urlState.setBoardId(id)
    },
    [loadBoard]
  )

  const handleBack = useCallback(() => {
    clearCurrentBoard()
    urlState.clearBoardState()
  }, [clearCurrentBoard, urlState])

  const isViewing = Boolean(selectedBoardId && currentBoard)

  useEffect(() => {
    if (!isViewing || !highlightTarget || !viewerRef.current) return
    if (highlightTarget.boardId !== selectedBoardId) return
    const timer = setTimeout(() => {
      viewerRef.current?.navigateToRow(highlightTarget.sheetId, highlightTarget.rowId, highlightTarget.position)
      setHighlightTarget(null)
    }, 300)
    return () => clearTimeout(timer)
  }, [isViewing, highlightTarget, selectedBoardId])

  const heroActions = isViewing ? (
    <>
      <Button
        variant="outline"
        size="sm"
        className={HERO_BTN}
        onClick={() => viewerRef.current?.openSearch()}
        data-testid={`${testId}-search-btn`}
      >
        <Search className="gba:h-4 gba:w-4 gba:mr-1.5" />
        Search
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={HERO_BTN}
        onClick={() => viewerRef.current?.openSystemData()}
        data-testid={`${testId}-import-btn`}
      >
        <Database className="gba:h-4 gba:w-4 gba:mr-1.5" />
        Import
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={HERO_BTN}
        onClick={() => viewerRef.current?.openSettings()}
        data-testid={`${testId}-settings-btn`}
      >
        <Settings className="gba:h-4 gba:w-4 gba:mr-1.5" />
        Settings
      </Button>
    </>
  ) : (
    <>
      <Button
        variant="outline"
        size="sm"
        className={HERO_BTN}
        onClick={() => setIsGlobalSearchOpen(true)}
        data-testid={`${testId}-global-search-btn`}
      >
        <Search className="gba:h-4 gba:w-4 gba:mr-1.5" />
        Search
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={HERO_BTN}
        onClick={() => setIsAIDialogOpen(true)}
        data-testid={`${testId}-ai-create`}
      >
        <Sparkles className="gba:h-4 gba:w-4 gba:mr-1.5" />
        AI Board
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={HERO_BTN}
        onClick={() => setIsCreateDialogOpen(true)}
        data-testid={`${testId}-new-board`}
      >
        <Plus className="gba:h-4 gba:w-4 gba:mr-1.5" />
        New Board
      </Button>
    </>
  )

  const filteredBoards = boards.filter(b => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const sidebarItems: Array<{ key: SidebarSection; label: string; icon: React.ReactNode }> = [
    { key: 'home', label: 'Home', icon: <Home className="gba:w-4 gba:h-4" /> },
    { key: 'my-boards', label: 'My Boards', icon: <FolderClosed className="gba:w-4 gba:h-4" /> },
    { key: 'shared', label: 'Shared with me', icon: <Users className="gba:w-4 gba:h-4" /> },
    { key: 'favorites', label: 'Favorites', icon: <Star className="gba:w-4 gba:h-4" /> },
    { key: 'recent', label: 'Recent', icon: <Clock className="gba:w-4 gba:h-4" /> }
  ]

  return (
    <div
      className="gba:h-full gba:w-full gba:max-w-full gba:flex gba:flex-col gba:overflow-hidden"
      data-testid={testId}
    >
      <CreateHeroHeader
        icon={LayoutGrid}
        appLabel="Boards"
        title={currentBoard ? currentBoard.name : 'Boards'}
        description={currentBoard ? undefined : 'Build anything. Track everything.'}
        onBack={isViewing ? handleBack : undefined}
        actions={heroActions}
        data-testid={`${testId}-hero`}
      />

      {isViewing ? (
        <BoardViewer
          ref={viewerRef}
          board={currentBoard!}
          accessToken={accessToken}
          userId={currentUserId}
          initialSheetId={urlState.urlSheetId}
          initialViewId={urlState.urlViewId}
          initialPage={urlState.urlPage}
          onSheetIdChange={urlState.setSheetId}
          onViewIdChange={urlState.setViewId}
          onPageChange={urlState.setPage}
          onReloadBoard={async id => {
            await loadBoard(id)
          }}
          onBoardUpdate={async (id, updates) => {
            await updateBoard(id, updates as Partial<Board>)
          }}
          onSheetUpdate={updateSheet}
          rows={rows}
          rowsLoading={rowsLoading}
          rowsTotal={rowsTotal}
          rowsError={error}
          onLoadRows={loadRows}
          onCreateRow={createRow}
          onUpdateRow={updateRow}
          onDeleteRow={deleteRow}
          data-testid={`${testId}-viewer`}
        />
      ) : (
        <HubContent
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewLayout={viewLayout}
          setViewLayout={setViewLayout}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          isMobile={isMobile}
          sidebarItems={sidebarItems}
          isLoading={isLoading}
          error={error}
          filteredBoards={filteredBoards}
          onOpenBoard={handleOpenBoard}
          onDuplicate={duplicateBoard}
          onDelete={deleteBoard}
          onCreateOpen={() => setIsCreateDialogOpen(true)}
          onAIOpen={() => setIsAIDialogOpen(true)}
          testId={testId}
        />
      )}

      <GlobalSearchDialog
        open={isGlobalSearchOpen}
        onOpenChange={setIsGlobalSearchOpen}
        accessToken={accessToken}
        boards={boards.map(b => ({ id: b.id, name: b.name }))}
        onSelectResult={r => {
          setHighlightTarget({ boardId: r.boardId, sheetId: r.sheetId, rowId: r.rowId, position: r.position })
          void handleOpenBoard(r.boardId)
        }}
        data-testid={`${testId}-global-search`}
      />

      <CreateBoardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        name={newBoardName}
        onNameChange={setNewBoardName}
        onSubmit={handleCreateBoard}
        data-testid={`${testId}-create-dialog`}
      />

      <CreateBoardAIDialog
        open={isAIDialogOpen}
        onOpenChange={setIsAIDialogOpen}
        accessToken={accessToken}
        onBoardCreated={async board => {
          const created = await createBoard(board)
          return created
        }}
        onComplete={async boardId => {
          urlState.setBoardId(boardId)
          await loadBoard(boardId)
        }}
        data-testid={`${testId}-ai-dialog`}
      />
    </div>
  )
}

export default BoardsHub

/* ---------- Hub content (extracted to keep main component under 300 LOC) ---------- */

interface HubContentProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  viewLayout: 'list' | 'grid'
  setViewLayout: (l: 'list' | 'grid') => void
  activeSection: SidebarSection
  setActiveSection: (s: SidebarSection) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (c: boolean) => void
  isMobile: boolean
  sidebarItems: Array<{ key: SidebarSection; label: string; icon: React.ReactNode }>
  isLoading: boolean
  error: string | null
  filteredBoards: import('./types').BoardSummary[]
  onOpenBoard: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCreateOpen: () => void
  onAIOpen: () => void
  testId: string
}

const HubContent: React.FC<HubContentProps> = ({
  searchQuery,
  setSearchQuery,
  viewLayout,
  setViewLayout,
  activeSection,
  setActiveSection,
  sidebarCollapsed,
  setSidebarCollapsed,
  isMobile,
  sidebarItems,
  isLoading,
  error,
  filteredBoards,
  onOpenBoard,
  onDuplicate,
  onDelete,
  onCreateOpen,
  onAIOpen,
  testId
}) => (
  <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
    <aside
      className={`gba:border-r gba:bg-card gba:flex gba:flex-col gba:flex-shrink-0 gba:transition-all gba:duration-200 ${isMobile ? 'gba:hidden' : sidebarCollapsed ? 'gba:w-12' : 'gba:w-52'}`}
    >
      <div
        className={`gba:flex gba:items-center gba:border-b gba:border-border ${sidebarCollapsed ? 'gba:justify-center gba:p-2' : 'gba:justify-between gba:px-3 gba:py-2'}`}
      >
        {!sidebarCollapsed && (
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
            Navigate
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          data-testid={`${testId}-toggle-sidebar`}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="gba:w-3.5 gba:h-3.5" />
          ) : (
            <PanelLeftClose className="gba:w-3.5 gba:h-3.5" />
          )}
        </Button>
      </div>
      <nav className="gba:flex-1 gba:overflow-y-auto gba:p-1.5">
        {sidebarItems.map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`gba:w-full gba:flex gba:items-center gba:px-2.5 gba:py-1.5 gba:rounded-md gba:text-xs gba:transition-colors gba:mb-0.5 ${sidebarCollapsed ? 'gba:justify-center' : 'gba:gap-2.5'} ${
              activeSection === item.key
                ? 'gba:bg-accent gba:text-accent-foreground gba:font-medium'
                : 'gba:text-muted-foreground gba:hover:bg-muted/50'
            }`}
            data-testid={`${testId}-nav-${item.key}`}
          >
            {item.icon}
            {!sidebarCollapsed && item.label}
          </button>
        ))}
      </nav>
    </aside>

    <main className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:overflow-hidden">
      <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background gba:px-5 gba:py-2 gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-xs gba:font-medium gba:text-foreground">
          {sidebarItems.find(i => i.key === activeSection)?.label || 'Boards'}
        </span>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-8 gba:w-48 gba:h-7 gba:text-xs"
              data-testid={`${testId}-search`}
            />
          </div>
          <div className="gba:flex gba:border gba:rounded-md">
            <Button
              variant={viewLayout === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewLayout('list')}
              className="gba:rounded-r-none gba:h-7 gba:px-1.5"
              data-testid={`${testId}-view-list`}
            >
              <List className="gba:w-3.5 gba:h-3.5" />
            </Button>
            <Button
              variant={viewLayout === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewLayout('grid')}
              className="gba:rounded-l-none gba:h-7 gba:px-1.5"
              data-testid={`${testId}-view-grid`}
            >
              <LayoutGrid className="gba:w-3.5 gba:h-3.5" />
            </Button>
          </div>
        </div>
      </div>

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
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
            <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-4">
              <LayoutGrid className="gba:w-8 gba:h-8 gba:text-primary" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">No boards yet</h3>
            <p className="gba:text-muted-foreground gba:text-sm gba:mb-5">Create your first board to get started.</p>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" onClick={onCreateOpen} data-testid={`${testId}-empty-create`}>
                <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> New Board
              </Button>
              <Button size="sm" variant="outline" onClick={onAIOpen} data-testid={`${testId}-empty-ai`}>
                <Sparkles className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Create with AI
              </Button>
            </div>
          </div>
        )}

        {!isLoading && filteredBoards.length > 0 && viewLayout === 'list' && (
          <div className="gba:w-full">
            <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
              <div className="gba:flex gba:items-center gba:px-4 gba:py-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground">
                <div className="gba:flex-1 gba:min-w-0">Name</div>
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
                  onOpen={onOpenBoard}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  testId={testId}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && filteredBoards.length > 0 && viewLayout === 'grid' && (
          <div className="gba:p-4 gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-3">
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
                  <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    <span>{formatRelativeTime(board.updatedAt)}</span>
                    <span>{board.rowCount} rows</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  </div>
)
