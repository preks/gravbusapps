/**
 * BoardsHub - main entry point for the Boards product.
 *
 * Sidebar + main content layout with collection-based organization.
 * Sidebar provides quick access sections and a collection tree.
 * Main area shows either the board list, a collection dashboard, or the board viewer.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { toast } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBoardApps } from './hooks/useBoardApps'
import { CreateBoardDialog } from './components/CreateBoardDialog'
import { CreateBoardAIDialog } from './components/CreateBoardAIDialog'
import { setBoardApiAuthTokenProvider } from './services/BoardApiService'
import { setCollectionApiAuthTokenProvider } from './services/CollectionApiService'
import { setFlowEngineTokenProvider } from './services/flowEngine'
import { BoardViewer } from './BoardViewer'
import type { BoardViewerHandle } from './BoardViewer'
import { GlobalSearchDialog } from './components/search/GlobalSearchDialog'
import { ShareBoardDialog } from './components/ShareBoardDialog'
import { ManageBoardSharesDialog } from './components/ManageBoardSharesDialog'
import type { Board } from './types'
import { useBoardUrlState } from './hooks/useBoardUrlState'
import { useBoardAppsHubFavorites } from './hooks/useBoardAppsHubFavorites'
import { useBoardAppsHubFiltering } from './hooks/useBoardAppsHubFiltering'
import type { BoardHubSidebarSection } from './hooks/useBoardAppsHubFiltering'
import { useBoardCollections } from './hooks/useBoardCollections'
import { useResizableSidebar } from './hooks/useResizableSidebar'
import { BoardsSidebar } from './components/sidebar/BoardsSidebar'
import type { QuickAccessSection } from './components/sidebar/BoardsSidebarQuickAccess'
import { CreateCollectionDialog } from './components/collections/CreateCollectionDialog'
import { CollectionDashboard } from './components/collections/CollectionDashboard'
import { MoveBoardDialog } from './components/collections/MoveBoardDialog'
import { ShareCollectionDialog } from './components/collections/ShareCollectionDialog'
import { ManageCollectionMembersDialog } from './components/collections/ManageCollectionMembersDialog'
import { AddBoardToCollectionDialog } from './components/collections/AddBoardToCollectionDialog'
import { RenameCollectionDialog } from './components/collections/RenameCollectionDialog'
import { BoardsHubBoardList } from './components/BoardsHubBoardList'
import { BoardContentHeader } from './components/BoardContentHeader'
import { BoardEditorHeader } from './components/BoardEditorHeader'
import { BoardsHubHero } from './components/hero'
import { BoardsHomeDashboard } from './components/home/BoardsHomeDashboard'
import { useBoardHomeData } from './hooks/useBoardHomeData'

export interface BoardsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const BoardsHub: React.FC<BoardsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'boards-hub'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<BoardHubSidebarSection>('home')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const urlState = useBoardUrlState()
  const selectedBoardId = urlState.urlBoardId
  const activeCollectionId = urlState.urlCollectionId
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
  const [moveBoardId, setMoveBoardId] = useState<string | null>(null)
  const [addBoardToCollectionOpen, setAddBoardToCollectionOpen] = useState(false)
  const [renameCollectionId, setRenameCollectionId] = useState<string | null>(null)
  const [renameBoardId, setRenameBoardId] = useState<string | null>(null)
  const [shareCollectionId, setShareCollectionId] = useState<string | null>(null)
  const [manageCollectionId, setManageCollectionId] = useState<string | null>(null)
  const { stats: heroStats, myWork: heroMyWork, isLoading: heroLoading } = useBoardHomeData(activeSection === 'home')

  const sidebar = useResizableSidebar()
  const {
    collections,
    collectionBoards,
    createCollection,
    deleteCollection,
    updateCollection,
    moveBoardToCollection,
    removeBoardFromCollection,
    loadCollectionBoards,
    refreshCollections
  } = useBoardCollections()

  const tokenRef = useRef(accessToken)
  tokenRef.current = accessToken
  setBoardApiAuthTokenProvider(accessToken ? () => tokenRef.current : null)
  setCollectionApiAuthTokenProvider(accessToken ? () => tokenRef.current : null)
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

  const { filteredBoards, myBoards, sharedBoards, recentBoards } = useBoardAppsHubFiltering({
    boards,
    activeSection,
    favorites,
    searchQuery,
    sortBy: 'modified',
    sortOrder: 'desc'
  })

  const boardCounts = useMemo<Partial<Record<QuickAccessSection, number>>>(
    () => ({
      'my-boards': myBoards.length,
      shared: sharedBoards.length,
      favorites: boards.filter(b => favorites.has(b.id)).length,
      recent: recentBoards.length
    }),
    [myBoards, sharedBoards, boards, favorites, recentBoards]
  )

  const collectionNameMap = useMemo(() => {
    const map = new Map<string, { name: string; color?: string; icon?: string; memberCount: number }>()
    for (const c of collections) {
      map.set(c.id, { name: c.name, color: c.color, icon: c.icon, memberCount: c.memberCount })
    }
    return map
  }, [collections])

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
      if (activeCollectionId) {
        await moveBoardToCollection(activeCollectionId, board.id)
      }
      await loadBoard(board.id)
      urlState.setBoardId(board.id)
      toast.success(activeCollectionId ? 'Board created in collection' : 'Board created')
    }
  }, [newBoardName, createBoard, loadBoard, urlState, activeCollectionId, moveBoardToCollection])

  const handleOpenBoard = useCallback(
    async (id: string) => {
      const board = await loadBoard(id)
      if (board) urlState.setBoardId(id)
    },
    [loadBoard, urlState]
  )

  const handleBack = useCallback(() => {
    clearCurrentBoard()
    urlState.setBoardId(null)
  }, [clearCurrentBoard, urlState])

  const handleNavigateToItem = useCallback(
    (boardId: string, sheetId: string, rowId: string) => {
      setHighlightTarget({ boardId, sheetId, rowId })
      void handleOpenBoard(boardId)
    },
    [handleOpenBoard]
  )

  const handleSectionChange = useCallback(
    (section: QuickAccessSection) => {
      setActiveSection(section)
      urlState.setCollectionId(null)
    },
    [urlState]
  )

  const handleSelectCollection = useCallback(
    (id: string) => {
      urlState.setCollectionId(id)
      setActiveSection('my-boards')
      if (!collectionBoards.has(id)) loadCollectionBoards(id)
    },
    [urlState, collectionBoards, loadCollectionBoards]
  )

  const handleCreateCollection = useCallback(
    async (data: { name: string; description?: string; icon?: string; color?: string }) => {
      const result = await createCollection(data)
      if (result) {
        setIsCreateCollectionOpen(false)
        toast.success('Collection created')
        urlState.setCollectionId(result.id)
      }
    },
    [createCollection, urlState]
  )

  const handleDeleteCollection = useCallback(
    async (id: string) => {
      const ok = await deleteCollection(id)
      if (ok) {
        toast.success('Collection deleted')
        if (activeCollectionId === id) urlState.setCollectionId(null)
      }
    },
    [deleteCollection, activeCollectionId, urlState]
  )

  const handleMoveBoard = useCallback(
    async (collectionId: string) => {
      if (!moveBoardId) return
      const ok = await moveBoardToCollection(collectionId, moveBoardId)
      if (ok) {
        toast.success('Board moved to collection')
        setMoveBoardId(null)
      }
    },
    [moveBoardId, moveBoardToCollection]
  )

  const handleAddBoardsToCollection = useCallback(
    async (boardIds: string[]) => {
      if (!activeCollectionId) return
      let count = 0
      for (const id of boardIds) {
        const ok = await moveBoardToCollection(activeCollectionId, id)
        if (ok) count++
      }
      if (count > 0) {
        toast.success(`${count} board${count !== 1 ? 's' : ''} added to collection`)
      }
    },
    [activeCollectionId, moveBoardToCollection]
  )

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

  const handleTemplateCreated = useCallback(
    async (boardId: string) => {
      const board = await loadBoard(boardId)
      if (board) urlState.setBoardId(boardId)
    },
    [loadBoard, urlState]
  )

  const isViewing = Boolean(selectedBoardId && currentBoard)
  const isViewerOwner = currentBoard && !currentBoard.isShared
  const activeCollection = activeCollectionId ? collections.find(c => c.id === activeCollectionId) : null
  const activeCollectionBoardList = activeCollectionId ? collectionBoards.get(activeCollectionId) || [] : []
  const shareBoardInfo = shareBoardId ? boards.find(b => b.id === shareBoardId) : null
  const manageBoardInfo = manageBoardId ? boards.find(b => b.id === manageBoardId) : null
  const moveBoardInfo = moveBoardId ? boards.find(b => b.id === moveBoardId) : null

  useEffect(() => {
    if (isViewing && rootRef.current) rootRef.current.scrollTop = 0
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

  return (
    <div
      ref={rootRef}
      className="gba:h-full gba:w-full gba:max-w-full gba:flex gba:overflow-hidden"
      data-testid={testId}
    >
      {/* Sidebar */}
      {!sidebar.isCollapsed && (
        <BoardsSidebar
          width={sidebar.width}
          isResizing={sidebar.isResizing}
          activeSection={activeSection}
          activeCollectionId={activeCollectionId}
          activeBoardId={selectedBoardId}
          collections={collections}
          collectionBoards={collectionBoards}
          boardCounts={boardCounts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSectionChange={handleSectionChange}
          onSelectCollection={handleSelectCollection}
          onSelectBoard={id => void handleOpenBoard(id)}
          onCreateBoard={() => setIsCreateDialogOpen(true)}
          onCreateBoardAI={() => setIsAIDialogOpen(true)}
          onCreateCollection={() => setIsCreateCollectionOpen(true)}
          onShareCollection={setShareCollectionId}
          onRenameCollection={setRenameCollectionId}
          onDeleteCollection={handleDeleteCollection}
          onAddBoardToCollection={id => {
            handleSelectCollection(id)
          }}
          onCreateBoardInCollection={id => {
            handleSelectCollection(id)
            setIsCreateDialogOpen(true)
          }}
          onLoadCollectionBoards={loadCollectionBoards}
          onShareBoard={setManageBoardId}
          onRenameBoard={setRenameBoardId}
          onDeleteBoard={deleteBoard}
          onCollapse={sidebar.toggleCollapsed}
          onResizeStart={sidebar.handleMouseDown}
          data-testid={`${testId}-sidebar`}
        />
      )}

      {/* Main Content Area */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:h-full gba:overflow-hidden">
        {/* Board viewer */}
        {isViewing ? (
          <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
            <BoardEditorHeader
              boardName={currentBoard!.name}
              isOwner={!!isViewerOwner}
              isSidebarCollapsed={sidebar.isCollapsed}
              onToggleSidebar={sidebar.toggleCollapsed}
              onBack={handleBack}
              onSearch={() => viewerRef.current?.openSearch()}
              onShare={() => setManageBoardId(currentBoard!.id)}
              onImportSystemData={() => viewerRef.current?.openSystemData()}
              onImportFlowData={() => viewerRef.current?.openFlowData()}
              onSettings={() => viewerRef.current?.openSettings()}
              data-testid={`${testId}-editor-header`}
            />
            <BoardViewer
              ref={viewerRef}
              board={currentBoard!}
              accessToken={accessToken}
              userId={currentUserId as string}
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
        ) : activeSection === 'home' ? (
          <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
            <BoardsHubHero
              stats={heroStats}
              boards={boards}
              myWork={heroMyWork}
              isLoading={heroLoading}
              onOpenBoard={id => void handleOpenBoard(id)}
              onNavigateToItem={handleNavigateToItem}
              isSidebarCollapsed={sidebar.isCollapsed}
              onToggleSidebar={sidebar.toggleCollapsed}
              onCreateOpen={() => setIsCreateDialogOpen(true)}
              onAIOpen={() => setIsAIDialogOpen(true)}
              onSearchOpen={() => setIsGlobalSearchOpen(true)}
              data-testid={`${testId}-hero`}
            />
            <BoardsHomeDashboard
              accessToken={accessToken}
              userInfo={userInfo as any}
              boards={boards}
              onOpenBoard={id => void handleOpenBoard(id)}
              onDuplicate={duplicateBoard}
              onDelete={deleteBoard}
              onCreateOpen={() => setIsCreateDialogOpen(true)}
              onCreateAI={() => setIsAIDialogOpen(true)}
              onSearchOpen={() => setIsGlobalSearchOpen(true)}
              onNavigateToItem={handleNavigateToItem}
              onCreateBoard={createBoard}
              onBoardCreated={handleTemplateCreated}
              createRow={createRow}
              updateSheet={updateSheet}
              data-testid={`${testId}-home`}
            />
          </div>
        ) : (
          <>
            <BoardContentHeader
              activeSection={activeSection}
              collectionName={activeCollection?.name}
              isSidebarCollapsed={sidebar.isCollapsed}
              onToggleSidebar={sidebar.toggleCollapsed}
              onSectionReset={() => {
                handleSectionChange('my-boards')
                urlState.setCollectionId(null)
              }}
              onGlobalSearch={() => setIsGlobalSearchOpen(true)}
              onCreateBoard={() => setIsCreateDialogOpen(true)}
              onCreateBoardAI={() => setIsAIDialogOpen(true)}
              onCreateCollection={() => setIsCreateCollectionOpen(true)}
              data-testid={`${testId}-content-header`}
            />
            {activeCollection ? (
              <CollectionDashboard
                collection={activeCollection}
                boards={activeCollectionBoardList}
                isLoading={isLoading}
                onOpenBoard={id => void handleOpenBoard(id)}
                onCreateBoard={() => setIsCreateDialogOpen(true)}
                onAddExistingBoard={() => setAddBoardToCollectionOpen(true)}
                onShareCollection={() => setShareCollectionId(activeCollection.id)}
                onManageMembers={() => setManageCollectionId(activeCollection.id)}
                data-testid={`${testId}-collection-dashboard`}
              />
            ) : (
              <BoardsHubBoardList
                searchQuery={searchQuery}
                activeSection={activeSection}
                isLoading={isLoading}
                error={error}
                filteredBoards={filteredBoards}
                favorites={favorites}
                collectionNameMap={collectionNameMap}
                onOpenBoard={id => void handleOpenBoard(id)}
                onDuplicate={duplicateBoard}
                onDelete={deleteBoard}
                onCreateOpen={() => setIsCreateDialogOpen(true)}
                onAIOpen={() => setIsAIDialogOpen(true)}
                onToggleFavorite={toggleFavorite}
                onShare={setManageBoardId}
                onMoveToCollection={setMoveBoardId}
                testId={testId}
              />
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <GlobalSearchDialog
        open={isGlobalSearchOpen}
        onOpenChange={setIsGlobalSearchOpen}
        accessToken={accessToken}
        boards={boards}
        onSelectResult={r => {
          setHighlightTarget({ boardId: r.boardId, sheetId: r.sheetId, rowId: r.rowId, position: r.position })
          void handleOpenBoard(r.boardId)
        }}
        onOpenBoard={id => void handleOpenBoard(id)}
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
        onBoardCreated={async board => await createBoard(board)}
        onComplete={async boardId => {
          urlState.setBoardId(boardId)
          await loadBoard(boardId)
        }}
        data-testid={`${testId}-ai-dialog`}
      />
      <CreateCollectionDialog
        open={isCreateCollectionOpen}
        onOpenChange={setIsCreateCollectionOpen}
        onSubmit={handleCreateCollection}
        data-testid={`${testId}-create-collection-dialog`}
      />
      {renameCollectionId && (
        <RenameCollectionDialog
          open={!!renameCollectionId}
          onOpenChange={open => {
            if (!open) setRenameCollectionId(null)
          }}
          currentName={collections.find(c => c.id === renameCollectionId)?.name || ''}
          onSubmit={name => void updateCollection(renameCollectionId, { name })}
          data-testid={`${testId}-rename-collection-dialog`}
        />
      )}
      {renameBoardId && (
        <RenameCollectionDialog
          open={!!renameBoardId}
          onOpenChange={open => {
            if (!open) setRenameBoardId(null)
          }}
          currentName={boards.find(b => b.id === renameBoardId)?.name || ''}
          onSubmit={name => void updateBoard(renameBoardId, { name } as Partial<Board>)}
          title="Rename Board"
          placeholder="Board name"
          data-testid={`${testId}-rename-board-dialog`}
        />
      )}
      {shareBoardInfo && (
        <ShareBoardDialog
          open={!!shareBoardId}
          onOpenChange={open => {
            if (!open) setShareBoardId(null)
          }}
          boardId={shareBoardInfo.id}
          boardTitle={shareBoardInfo.name}
          currentUserId={currentUserId as string}
          currentUserName={userInfo?.displayName as string | undefined}
          accessToken={accessToken}
          onShareComplete={() => setShareBoardId(null)}
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
          collectionId={manageBoardInfo.spaceId || undefined}
          collectionName={manageBoardInfo.spaceId ? collectionNameMap.get(manageBoardInfo.spaceId)?.name : undefined}
          onSharesChanged={() => void refreshCollections()}
          onAddMoreUsers={() => {
            setManageBoardId(null)
            setShareBoardId(manageBoardInfo.id)
          }}
          data-testid={`${testId}-manage-shares-dialog`}
        />
      )}
      {moveBoardInfo && (
        <MoveBoardDialog
          open={!!moveBoardId}
          onOpenChange={open => {
            if (!open) setMoveBoardId(null)
          }}
          boardName={moveBoardInfo.name}
          currentCollectionId={activeCollectionId}
          collections={collections}
          onMove={handleMoveBoard}
          onRemoveFromCollection={
            activeCollectionId && moveBoardId
              ? () => {
                  void removeBoardFromCollection(activeCollectionId, moveBoardId)
                  setMoveBoardId(null)
                }
              : undefined
          }
          data-testid={`${testId}-move-dialog`}
        />
      )}
      {activeCollectionId && activeCollection && (
        <AddBoardToCollectionDialog
          open={addBoardToCollectionOpen}
          onOpenChange={setAddBoardToCollectionOpen}
          collectionName={activeCollection.name}
          collectionId={activeCollectionId}
          boards={boards}
          onAdd={ids => void handleAddBoardsToCollection(ids)}
          data-testid={`${testId}-add-board-dialog`}
        />
      )}
      {shareCollectionId && (
        <ShareCollectionDialog
          open={!!shareCollectionId}
          onOpenChange={open => {
            if (!open) setShareCollectionId(null)
          }}
          collectionId={shareCollectionId}
          collectionName={collections.find(c => c.id === shareCollectionId)?.name || 'Collection'}
          accessToken={accessToken}
          currentUserId={currentUserId as string}
          onShareComplete={() => setShareCollectionId(null)}
          data-testid={`${testId}-share-collection-dialog`}
        />
      )}
      {manageCollectionId && (
        <ManageCollectionMembersDialog
          open={!!manageCollectionId}
          onOpenChange={open => {
            if (!open) setManageCollectionId(null)
          }}
          collectionId={manageCollectionId}
          collectionName={collections.find(c => c.id === manageCollectionId)?.name || 'Collection'}
          accessToken={accessToken}
          onMembersChanged={() => void refreshCollections()}
          onAddMoreMembers={() => {
            const id = manageCollectionId
            setManageCollectionId(null)
            setShareCollectionId(id)
          }}
          data-testid={`${testId}-manage-collection-dialog`}
        />
      )}
    </div>
  )
}

export default BoardsHub
