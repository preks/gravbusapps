/**
 * BoardsHub - main entry point for the Boards product.
 *
 * Single persistent hero header that morphs between hub mode (board list)
 * and viewer mode (open board) so navigation feels seamless.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from '@newwork/nw-design-system'
import {
  Button,
  Input,
  Card,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import {
  LayoutGrid,
  Plus,
  Search,
  List,
  Star,
  FolderClosed,
  Users,
  Clock,
  Sparkles,
  Home,
  Database,
  Settings,
  Share2,
  GitBranch
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'
import { useBoardApps } from './hooks/useBoardApps'
import { CreateBoardDialog } from './components/CreateBoardDialog'
import { CreateBoardAIDialog } from './components/CreateBoardAIDialog'
import { BoardListItem, formatRelativeTime } from './components/BoardListItem'
import { setBoardApiAuthTokenProvider } from './services/BoardApiService'
import { setFlowEngineTokenProvider } from './services/flowEngine'
import { BoardViewer } from './BoardViewer'
import type { BoardViewerHandle } from './BoardViewer'
import { GlobalSearchDialog } from './components/search/GlobalSearchDialog'
import { ShareBoardDialog } from './components/ShareBoardDialog'
import { ManageBoardSharesDialog } from './components/ManageBoardSharesDialog'
import type { Board } from './types'
import { useBoardUrlState } from './hooks/useBoardUrlState'
import { BoardsHomeDashboard } from './components/home/BoardsHomeDashboard'
import { useBoardAppsHubFavorites } from './hooks/useBoardAppsHubFavorites'
import { useBoardAppsHubFiltering } from './hooks/useBoardAppsHubFiltering'
import type { BoardHubSidebarSection } from './hooks/useBoardAppsHubFiltering'
import { useBoardHomeData } from './hooks/useBoardHomeData'
import { BoardsHubHero } from './components/hero'

export interface BoardsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type SidebarSection = BoardHubSidebarSection

const HERO_BTN = 'gba:bg-white/10 gba:border-white/20 gba:text-white gba:hover:bg-white/15'

export const BoardsHub: React.FC<BoardsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'boards-hub'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>('home')
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const urlState = useBoardUrlState()
  const selectedBoardId = urlState.urlBoardId
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const [highlightTarget, setHighlightTarget] = useState<{
    boardId: string
    sheetId: string
    rowId: string
    position?: number
  } | null>(null)
  const viewerRef = useRef<BoardViewerHandle>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const { favorites, setFavorites } = useBoardAppsHubFavorites()
  const [shareBoardId, setShareBoardId] = useState<string | null>(null)
  const [manageBoardId, setManageBoardId] = useState<string | null>(null)
  const { stats: heroStats, myWork: heroMyWork, isLoading: heroLoading } = useBoardHomeData(activeSection === 'home')

  // Set token synchronously during render so child effects already have it
  // (useEffect would run after children, causing 401 races)
  const tokenRef = useRef(accessToken)
  tokenRef.current = accessToken
  setBoardApiAuthTokenProvider(accessToken ? () => tokenRef.current : null)
  setFlowEngineTokenProvider(accessToken ? () => tokenRef.current : null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsGlobalSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    deleteRow,
    patchRowCreated,
    patchRowUpdated,
    patchRowDeleted,
    patchSheetColumns
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
      await loadBoard(board.id)
      urlState.setBoardId(board.id)
      toast.success('Board created')
    }
  }, [newBoardName, createBoard, loadBoard])

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

  const handleNavigateToItem = useCallback(
    (boardId: string, sheetId: string, rowId: string) => {
      setHighlightTarget({ boardId, sheetId, rowId })
      void handleOpenBoard(boardId)
    },
    [handleOpenBoard]
  )

  const handleTemplateCreated = useCallback(
    async (boardId: string) => {
      const board = await loadBoard(boardId)
      if (board) urlState.setBoardId(boardId)
    },
    [loadBoard, urlState]
  )

  const isViewing = Boolean(selectedBoardId && currentBoard)

  useEffect(() => {
    if (isViewing && rootRef.current) {
      rootRef.current.scrollTop = 0
    }
  }, [isViewing])

  useEffect(() => {
    if (!isViewing || !highlightTarget || !viewerRef.current) return
    if (highlightTarget.boardId !== selectedBoardId) return
    const timer = setTimeout(() => {
      viewerRef.current?.navigateToRow(highlightTarget.sheetId, highlightTarget.rowId, highlightTarget.position)
      setHighlightTarget(null)
    }, 300)
    return () => clearTimeout(timer)
  }, [isViewing, highlightTarget, selectedBoardId])

  useEffect(() => {
    const handler = (e: Event) => {
      const { boardId, sheetId, rowId } = (e as CustomEvent).detail || {}
      if (boardId && sheetId && rowId) handleNavigateToItem(boardId, sheetId, rowId)
    }
    window.addEventListener('board:navigate-to-item', handler)
    return () => window.removeEventListener('board:navigate-to-item', handler)
  }, [handleNavigateToItem])

  const isViewerOwner = currentBoard && !currentBoard.isShared

  const viewerActions = (
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
      {isViewerOwner && (
        <Button
          variant="outline"
          size="sm"
          className={HERO_BTN}
          onClick={() => setShareBoardId(currentBoard!.id)}
          data-testid={`${testId}-share-btn`}
        >
          <Share2 className="gba:h-4 gba:w-4 gba:mr-1.5" />
          Share
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={HERO_BTN} data-testid={`${testId}-import-btn`}>
            <Database className="gba:h-4 gba:w-4 gba:mr-1.5" />
            Import
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => viewerRef.current?.openSystemData()} data-testid={`${testId}-import-system`}>
            <Database className="gba:h-4 gba:w-4 gba:mr-2" />
            System data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => viewerRef.current?.openFlowData()} data-testid={`${testId}-import-flow`}>
            <GitBranch className="gba:h-4 gba:w-4 gba:mr-2" />
            Flow data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
  )

  const { filteredBoards } = useBoardAppsHubFiltering({
    boards,
    activeSection,
    favorites,
    searchQuery,
    sortBy: 'modified',
    sortOrder: 'desc'
  })

  const toggleFavorite = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setFavorites(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          toast.success('Removed from favorites')
        } else {
          next.add(id)
          toast.success('Added to favorites')
        }
        return next
      })
    },
    [setFavorites]
  )

  const shareBoardInfo = shareBoardId ? boards.find(b => b.id === shareBoardId) : null
  const manageBoardInfo = manageBoardId ? boards.find(b => b.id === manageBoardId) : null

  const heroTabs: Array<{ key: string; label: string; icon: React.ReactNode }> = [
    { key: 'home', label: 'Home', icon: <Home className="gba:w-4 gba:h-4" /> },
    { key: 'my-boards', label: 'My Boards', icon: <FolderClosed className="gba:w-4 gba:h-4" /> },
    { key: 'shared', label: 'Shared', icon: <Users className="gba:w-4 gba:h-4" /> },
    { key: 'favorites', label: 'Favorites', icon: <Star className="gba:w-4 gba:h-4" /> },
    { key: 'recent', label: 'Recent', icon: <Clock className="gba:w-4 gba:h-4" /> }
  ]

  return (
    <div
      ref={rootRef}
      className={`gba:h-full gba:w-full gba:max-w-full gba:relative gba:flex gba:flex-col ${isViewing ? 'gba:overflow-hidden' : 'gba:overflow-y-auto'}`}
      data-testid={testId}
    >
      {/* Hub view — always mounted, crossfade out when viewing a board */}
      <div
        className={`gba:flex gba:flex-col gba:w-full ${isViewing ? 'gba:absolute gba:inset-0 gba:opacity-0 gba:pointer-events-none gba:z-0' : 'gba:relative gba:opacity-100 gba:z-10 gba:flex-1'}`}
        style={{ transition: 'opacity 300ms ease' }}
      >
        <BoardsHubHero
          stats={heroStats}
          boards={boards}
          myWork={heroMyWork}
          isLoading={heroLoading}
          onOpenBoard={handleOpenBoard}
          onNavigateToItem={handleNavigateToItem}
          tabs={heroTabs}
          activeTab={activeSection}
          onTabChange={setActiveSection}
          onCreateOpen={() => setIsCreateDialogOpen(true)}
          onAIOpen={() => setIsAIDialogOpen(true)}
          onSearchOpen={() => setIsGlobalSearchOpen(true)}
          data-testid={`${testId}-hero`}
        />
        <HubContent
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewLayout={viewLayout}
          setViewLayout={setViewLayout}
          activeSection={activeSection}
          isLoading={isLoading}
          error={error}
          filteredBoards={filteredBoards}
          allBoards={boards}
          onOpenBoard={handleOpenBoard}
          onDuplicate={duplicateBoard}
          onDelete={deleteBoard}
          onCreateOpen={() => setIsCreateDialogOpen(true)}
          onAIOpen={() => setIsAIDialogOpen(true)}
          onSearchOpen={() => setIsGlobalSearchOpen(true)}
          onNavigateToItem={handleNavigateToItem}
          onCreateBoard={createBoard}
          onBoardCreated={handleTemplateCreated}
          createRow={createRow}
          updateSheet={updateSheet}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onShare={setShareBoardId}
          onManageShares={setManageBoardId}
          accessToken={accessToken}
          userInfo={userInfo}
          testId={testId}
        />
      </div>

      {/* Board viewer — always mounted when board is loaded, crossfade in */}
      {selectedBoardId && currentBoard && (
        <div
          className={`gba:flex gba:flex-col gba:w-full ${isViewing ? 'gba:relative gba:opacity-100 gba:z-10 gba:flex-1' : 'gba:absolute gba:inset-0 gba:opacity-0 gba:pointer-events-none gba:z-0'}`}
          style={{ transition: 'opacity 300ms ease' }}
        >
          <CreateHeroHeader
            icon={LayoutGrid}
            appLabel="Boards"
            title={currentBoard.name}
            size="default"
            onBack={handleBack}
            actions={viewerActions}
            data-testid={`${testId}-viewer-hero`}
          />
          <BoardViewer
            ref={viewerRef}
            board={currentBoard}
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
            onPatchRowCreated={patchRowCreated}
            onPatchRowUpdated={patchRowUpdated}
            onPatchRowDeleted={patchRowDeleted}
            onPatchSheetColumns={patchSheetColumns}
            data-testid={`${testId}-viewer`}
          />
        </div>
      )}

      <GlobalSearchDialog
        open={isGlobalSearchOpen}
        onOpenChange={setIsGlobalSearchOpen}
        accessToken={accessToken}
        boards={boards}
        onSelectResult={r => {
          setHighlightTarget({ boardId: r.boardId, sheetId: r.sheetId, rowId: r.rowId, position: r.position })
          void handleOpenBoard(r.boardId)
        }}
        onOpenBoard={handleOpenBoard}
        onCreateBoard={() => setIsCreateDialogOpen(true)}
        onCreateAI={() => setIsAIDialogOpen(true)}
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

      {shareBoardInfo && (
        <ShareBoardDialog
          open={!!shareBoardId}
          onOpenChange={open => {
            if (!open) setShareBoardId(null)
          }}
          boardId={shareBoardInfo.id}
          boardTitle={shareBoardInfo.name}
          currentUserId={currentUserId}
          currentUserName={userInfo?.displayName as string | undefined}
          accessToken={accessToken}
          onShareComplete={() => {
            setShareBoardId(null)
          }}
          data-testid={`${testId}-share-dialog`}
        />
      )}

      {manageBoardInfo && (
        <ManageBoardSharesDialog
          open={!!manageBoardId}
          onOpenChange={open => {
            if (!open) setManageBoardId(null)
          }}
          boardId={manageBoardInfo.id}
          boardTitle={manageBoardInfo.name}
          accessToken={accessToken}
          onSharesChanged={() => void 0}
          onAddMoreUsers={() => {
            setManageBoardId(null)
            setShareBoardId(manageBoardInfo.id)
          }}
          data-testid={`${testId}-manage-shares-dialog`}
        />
      )}
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
  isLoading: boolean
  error: string | null
  filteredBoards: import('./types').BoardSummary[]
  allBoards: import('./types').BoardSummary[]
  onOpenBoard: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCreateOpen: () => void
  onAIOpen: () => void
  onSearchOpen: () => void
  onNavigateToItem: (boardId: string, sheetId: string, rowId: string) => void
  onCreateBoard: (board: Partial<Board>) => Promise<Board | null>
  onBoardCreated: (boardId: string) => Promise<void>
  createRow: (
    boardId: string,
    sheetId: string,
    data: Record<string, unknown>
  ) => Promise<import('./types').BoardRow | null>
  updateSheet: (
    boardId: string,
    sheetId: string,
    updates: Partial<import('./types').BoardSheet>
  ) => Promise<import('./types').BoardSheet | null>
  favorites: Set<string>
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void
  onShare: (boardId: string) => void
  onManageShares: (boardId: string) => void
  accessToken: string
  userInfo?: Record<string, unknown>
  testId: string
}

const HubContent: React.FC<HubContentProps> = ({
  searchQuery,
  setSearchQuery,
  viewLayout,
  setViewLayout,
  activeSection,
  isLoading,
  error,
  filteredBoards,
  allBoards,
  onOpenBoard,
  onDuplicate,
  onDelete,
  onCreateOpen,
  onAIOpen,
  onSearchOpen,
  onNavigateToItem,
  onCreateBoard,
  onBoardCreated,
  createRow,
  updateSheet,
  favorites,
  onToggleFavorite,
  onShare,
  onManageShares,
  accessToken,
  userInfo,
  testId
}) => (
  <div className="gba:flex gba:flex-col gba:flex-1">
    {activeSection === 'home' ? (
      <BoardsHomeDashboard
        accessToken={accessToken}
        userInfo={userInfo as any}
        boards={allBoards}
        onOpenBoard={onOpenBoard}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCreateOpen={onCreateOpen}
        onCreateAI={onAIOpen}
        onSearchOpen={onSearchOpen}
        onNavigateToItem={onNavigateToItem}
        onCreateBoard={onCreateBoard}
        onBoardCreated={onBoardCreated}
        createRow={createRow}
        updateSheet={updateSheet}
        data-testid={`${testId}-home`}
      />
    ) : (
      <>
        <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background gba:px-5 gba:py-2 gba:flex gba:items-center gba:justify-end">
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
                    onToggleFavorite={onToggleFavorite}
                    onOpen={onOpenBoard}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onShare={onShare}
                    onManageShares={onManageShares}
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
                      {board.rowCount > 0 && <span>{board.rowCount.toLocaleString()} rows</span>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </>
    )}
  </div>
)

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
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              Create manually
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAIOpen} data-testid={`${testId}-empty-create-ai`}>
              <Sparkles className="gba:h-4 gba:w-4 gba:mr-2" />
              Create with AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
