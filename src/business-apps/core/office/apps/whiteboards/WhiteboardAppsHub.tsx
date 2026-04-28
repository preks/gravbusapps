import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Card,
  Button,
  Input,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowCounterClockwiseIcon,
  ClockCounterClockwiseIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  HouseIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  ShareNetworkIcon,
  SquaresFourIcon,
  StarIcon,
  TrashIcon,
  UsersThreeIcon,
  XIcon
} from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWhiteboards } from './hooks/useWhiteboards'
import { useWhiteboardHubUrlState } from './hooks/useWhiteboardHubUrlState'
import { useWhiteboardHubFavorites } from './hooks/useWhiteboardHubFavorites'
import { WhiteboardEditorWithAi } from './components/WhiteboardEditorWithAi'
import { ShareWhiteboardDialog } from './components/ShareWhiteboardDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import { RenameWhiteboardDialog } from './components/RenameWhiteboardDialog'
import { TrashedWhiteboardReadonlyDialog } from './components/TrashedWhiteboardReadonlyDialog'
import { DeleteConfirmDialog } from '@/business-apps/core/office/apps/drive/components/DeleteConfirmDialog'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import {
  OfficeTrashListTable,
  OfficeTrashListToolbar,
  useOfficeTrashList
} from '@/business-apps/platform/apps/shared/components/OfficeTrashList'
import { PermanentDeleteConfirmDialog } from '@/business-apps/platform/apps/shared/components/PermanentDeleteConfirmDialog'
import translations from './_i18n'
import { WhiteboardApiService } from './services/WhiteboardApiService'
import type { WhiteboardSummary } from './types'

export interface WhiteboardAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'editor' | 'trash'
type SidebarSection = 'my-whiteboards' | 'shared' | 'favorites' | 'recent' | 'trash'

function readWhiteboardIdFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('whiteboardId')
  } catch {
    return null
  }
}

function readWhiteboardViewFromUrl(): HubView {
  try {
    return new URLSearchParams(window.location.search).get('view') === 'trash' ? 'trash' : 'editor'
  } catch {
    return 'editor'
  }
}

function formatRelativeTime(dateString: string, t: (k: string, vars?: Record<string, number>) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString()
}

export const WhiteboardAppsHub: React.FC<WhiteboardAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'whiteboard-apps-hub'
}) => {
  const { t } = useTranslation(translations)

  const wbFromUrlOnMount = readWhiteboardIdFromUrl()
  const initialView = wbFromUrlOnMount ? readWhiteboardViewFromUrl() : 'list'
  const hasResolvedInitialUrlRef = useRef(false)
  const [currentView, setCurrentView] = useState<HubView>(() => initialView)
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [trashSearchQuery, setTrashSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>(() =>
    initialView === 'trash' ? 'trash' : 'my-whiteboards'
  )
  const [selectedWhiteboardId, setSelectedWhiteboardId] = useState<string | null>(() => wbFromUrlOnMount)
  const [sortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
  const [sortOrder] = useState<'ASC' | 'DESC'>('DESC')

  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [pendingTrashWhiteboard, setPendingTrashWhiteboard] = useState<{ id: string; name: string } | null>(null)
  const [isMovingToTrash, setIsMovingToTrash] = useState(false)
  const [isResolvingWhiteboard, setIsResolvingWhiteboard] = useState(() => Boolean(wbFromUrlOnMount))
  const [isRestoringTrashedWhiteboard, setIsRestoringTrashedWhiteboard] = useState(false)
  const [currentWhiteboard, setCurrentWhiteboard] = useState<WhiteboardSummary | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [whiteboardForShare, setWhiteboardForShare] = useState<string | null>(null)
  const [manageSharesOpen, setManageSharesOpen] = useState(false)
  const [whiteboardForManageShares, setWhiteboardForManageShares] = useState<string | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [whiteboardToRename, setWhiteboardToRename] = useState<string | null>(null)
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set())
  const [bulkDeleteTrashOpen, setBulkDeleteTrashOpen] = useState(false)
  const [isBulkDeletingTrash, setIsBulkDeletingTrash] = useState(false)
  const [isBulkRestoringTrash, setIsBulkRestoringTrash] = useState(false)

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  useWhiteboardHubUrlState({
    currentView,
    selectedWhiteboardId
  })

  const { favorites, toggleFavorite } = useWhiteboardHubFavorites()

  const includeShared = activeSection === 'shared' || activeSection === 'my-whiteboards'
  const { whiteboards, isLoading, refresh, createWhiteboard, deleteWhiteboard, duplicateWhiteboard, renameWhiteboard } =
    useWhiteboards({
      accessToken,
      search: searchQuery || undefined,
      includeShared,
      sortBy,
      sortOrder
    })

  const filteredWhiteboards = whiteboards.filter(wb => {
    if (activeSection === 'shared') return wb.isShared
    if (activeSection === 'favorites') return favorites.has(wb.id)
    return true
  })

  const sidebarItems = [
    { key: 'my-whiteboards', icon: HouseIcon, label: t('whiteboard-my-whiteboards') },
    { key: 'shared', icon: UsersThreeIcon, label: t('whiteboard-shared-with-me') },
    { key: 'favorites', icon: StarIcon, label: t('whiteboard-favorites') },
    { key: 'recent', icon: ClockCounterClockwiseIcon, label: t('whiteboard-recent') },
    { key: 'trash', icon: TrashIcon, label: t('whiteboard-trash') }
  ] as const

  const trashList = useOfficeTrashList({
    accessToken,
    entityType: 'whiteboard',
    enabled: activeSection === 'trash',
    searchQuery: trashSearchQuery,
    defaultSortBy: 'trashedAt',
    defaultSortOrder: 'desc',
    onItemsChanged: refresh
  })

  const handleToggleTrashSelect = useCallback((id: string) => {
    setSelectedTrashIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAllTrash = useCallback(() => {
    setSelectedTrashIds(prev =>
      prev.size === trashList.sortedItems.length && trashList.sortedItems.length > 0
        ? new Set()
        : new Set(trashList.sortedItems.map(i => i.id))
    )
  }, [trashList.sortedItems])

  const handleBulkRestoreTrash = useCallback(async () => {
    if (!accessToken || selectedTrashIds.size === 0) return
    const toRestore = trashList.sortedItems.filter(item => selectedTrashIds.has(item.id))
    setIsBulkRestoringTrash(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems(toRestore.map(item => ({ entityType: 'whiteboard', entityId: item.id })))
      toast.success(t('trash-bulk-restored', { count: toRestore.length }))
      setSelectedTrashIds(new Set())
      await trashList.refresh()
      refresh()
    } catch (error) {
      console.error('[WhiteboardAppsHub] Bulk restore failed:', error)
      toast.error(t('toast-restore-failed'))
    } finally {
      setIsBulkRestoringTrash(false)
    }
  }, [accessToken, refresh, selectedTrashIds, t, trashList])

  const handleBulkDeleteTrash = useCallback(async () => {
    if (!accessToken || selectedTrashIds.size === 0) return
    const toDelete = trashList.sortedItems.filter(item => selectedTrashIds.has(item.id))
    setIsBulkDeletingTrash(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      for (const item of toDelete) {
        await DriveApiService.deleteTrashedItem('whiteboard', item.id)
      }
      toast.success(t('trash-bulk-deleted', { count: toDelete.length }))
      setSelectedTrashIds(new Set())
      await trashList.refresh()
      refresh()
    } catch (error) {
      console.error('[WhiteboardAppsHub] Bulk delete failed:', error)
      toast.error(t('toast-restore-failed'))
    } finally {
      setIsBulkDeletingTrash(false)
      setBulkDeleteTrashOpen(false)
    }
  }, [accessToken, refresh, selectedTrashIds, t, trashList])

  const openWhiteboard = useCallback(
    async ({
      id,
      fallbackSection,
      showErrorToast = true
    }: {
      id: string
      fallbackSection: SidebarSection
      showErrorToast?: boolean
    }) => {
      if (!accessToken) {
        return
      }

      setSelectedWhiteboardId(id)
      setCurrentWhiteboard(null)
      setIsResolvingWhiteboard(true)

      try {
        const loadedWhiteboard = await WhiteboardApiService.getTrashedPreview(accessToken, id)
        const resolvedView: HubView = loadedWhiteboard.trashedAt ? 'trash' : 'editor'

        if (!loadedWhiteboard) {
          setSelectedWhiteboardId(null)
          setCurrentWhiteboard(null)
          setCurrentView('list')
          setActiveSection(fallbackSection)
          if (showErrorToast) {
            toast.error(t('whiteboard-open-failed'))
          }
          return
        }

        setCurrentWhiteboard(loadedWhiteboard)
        setCurrentView(resolvedView)
        setActiveSection(resolvedView === 'trash' ? 'trash' : fallbackSection)
      } catch {
        setSelectedWhiteboardId(null)
        setCurrentWhiteboard(null)
        setCurrentView('list')
        setActiveSection(fallbackSection)
        if (showErrorToast) {
          toast.error(t('whiteboard-open-failed'))
        }
      } finally {
        setIsResolvingWhiteboard(false)
      }
    },
    [accessToken, t]
  )

  useEffect(() => {
    if (!wbFromUrlOnMount) {
      setIsResolvingWhiteboard(false)
      return
    }

    if (!accessToken || hasResolvedInitialUrlRef.current) {
      return
    }

    hasResolvedInitialUrlRef.current = true

    void openWhiteboard({
      id: wbFromUrlOnMount,
      fallbackSection: 'my-whiteboards',
      showErrorToast: false
    })
  }, [accessToken, initialView, openWhiteboard, wbFromUrlOnMount])

  const handleCreate = useCallback(async () => {
    const id = await createWhiteboard(t('whiteboard-untitled'))
    if (id) {
      setActiveSection('my-whiteboards')
      void openWhiteboard({
        id,
        fallbackSection: 'my-whiteboards'
      })
    }
  }, [createWhiteboard, openWhiteboard, t])

  const handleOpen = useCallback(
    (id: string) => {
      void openWhiteboard({
        id,
        fallbackSection: activeSection === 'trash' ? 'my-whiteboards' : activeSection
      })
    },
    [activeSection, openWhiteboard]
  )

  const handleOpenTrashedWhiteboard = useCallback(
    (id: string) => {
      void openWhiteboard({
        id,
        fallbackSection: 'my-whiteboards'
      })
    },
    [openWhiteboard]
  )

  const handleBack = useCallback(() => {
    setCurrentWhiteboard(null)
    setCurrentView('list')
    setSelectedWhiteboardId(null)
    refresh()
  }, [refresh])

  const handleGoToWhiteboardsHome = useCallback(() => {
    setCurrentWhiteboard(null)
    setSelectedWhiteboardId(null)
    setCurrentView('list')
    setActiveSection('my-whiteboards')
    refresh()
  }, [refresh])

  const handleDeleteWhiteboard = useCallback(
    (id: string, name?: string) => {
      setPendingTrashWhiteboard({
        id,
        name: name || t('whiteboard-untitled')
      })
      setTrashConfirmOpen(true)
    },
    [t]
  )

  const confirmMoveToTrash = useCallback(async () => {
    if (!pendingTrashWhiteboard) {
      return
    }

    setIsMovingToTrash(true)
    try {
      await deleteWhiteboard(pendingTrashWhiteboard.id)
      toast.success(t('toast-moved-to-trash'))

      if (selectedWhiteboardId === pendingTrashWhiteboard.id) {
        setCurrentWhiteboard(null)
        setSelectedWhiteboardId(null)
        setCurrentView('list')
      }
    } catch {
      toast.error(t('toast-move-to-trash-failed'))
    } finally {
      setIsMovingToTrash(false)
      setPendingTrashWhiteboard(null)
    }
  }, [deleteWhiteboard, pendingTrashWhiteboard, selectedWhiteboardId, t])

  const handleTrashConfirmOpenChange = useCallback(
    (open: boolean) => {
      setTrashConfirmOpen(open)
      if (!open && !isMovingToTrash) {
        setPendingTrashWhiteboard(null)
      }
    },
    [isMovingToTrash]
  )

  const isTrashedWhiteboard = Boolean(currentWhiteboard?.trashedAt)
  const canRestoreTrashedWhiteboard = Boolean(
    isTrashedWhiteboard && currentWhiteboard?.isOwner !== false && !currentWhiteboard?.spaceId
  )

  const handleRestoreTrashedWhiteboard = useCallback(async () => {
    if (!currentWhiteboard?.id || !canRestoreTrashedWhiteboard) {
      return
    }

    setIsRestoringTrashedWhiteboard(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems([{ entityType: 'whiteboard', entityId: currentWhiteboard.id }])
      const restoredWhiteboard = await WhiteboardApiService.get(accessToken, currentWhiteboard.id)
      setCurrentWhiteboard(restoredWhiteboard)
      setSelectedWhiteboardId(currentWhiteboard.id)
      setActiveSection('my-whiteboards')
      setCurrentView('editor')
      toast.success(t('toast-restored'))
      refresh()
    } catch (error) {
      console.error('[WhiteboardAppsHub] Failed to restore trashed whiteboard:', error)
      toast.error(t('toast-restore-failed'))
    } finally {
      setIsRestoringTrashedWhiteboard(false)
    }
  }, [accessToken, canRestoreTrashedWhiteboard, currentWhiteboard, refresh, t])

  const handleRename = useCallback(
    async (newTitle: string) => {
      if (!whiteboardToRename) return
      try {
        await renameWhiteboard(whiteboardToRename, newTitle)
        toast.success(t('whiteboard-rename'))
      } catch {
        toast.error(t('toast-rename-failed'))
      }
    },
    [whiteboardToRename, renameWhiteboard, t]
  )

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await duplicateWhiteboard(id)
        toast.success(t('toast-duplicated'))
      } catch {
        toast.error(t('toast-duplicate-failed'))
      }
    },
    [duplicateWhiteboard, t]
  )

  if (selectedWhiteboardId && isResolvingWhiteboard) {
    return (
      <div
        className="gba:flex gba:h-full gba:w-full gba:items-center gba:justify-center gba:bg-background"
        data-testid={testId}
      >
        <Spinner data-testid={`${testId}-open-loading`} />
      </div>
    )
  }

  const shouldRenderEditorView = Boolean(
    selectedWhiteboardId && currentWhiteboard && (currentView === 'editor' || currentView === 'trash')
  )

  if (shouldRenderEditorView && selectedWhiteboardId && currentWhiteboard) {
    return (
      <>
        <WhiteboardEditorWithAi
          key={`${selectedWhiteboardId}-${currentView}`}
          whiteboardId={selectedWhiteboardId}
          isReadOnly={isTrashedWhiteboard}
          accessToken={accessToken}
          userInfo={userInfo}
          onBack={handleBack}
          data-testid={`${testId}-editor`}
        />
        {isTrashedWhiteboard ? (
          <TrashedWhiteboardReadonlyDialog
            whiteboardTitle={currentWhiteboard.title}
            canRestore={canRestoreTrashedWhiteboard}
            isRestoring={isRestoringTrashedWhiteboard}
            onGoToWhiteboardsHome={handleGoToWhiteboardsHome}
            onRestore={handleRestoreTrashedWhiteboard}
            data-testid={`${testId}-trashed-whiteboard-dialog`}
          />
        ) : null}
      </>
    )
  }

  if (activeSection === 'trash') {
    const trashListControls = {
      refreshLabel: t('trash-refresh'),
      sortNameLabel: t('sort-name'),
      sortTrashedOnLabel: t('sort-trashed'),
      trashedOnColumnLabel: t('table-trashed'),
      defaultSortBy: 'trashedAt' as const,
      defaultSortOrder: 'desc' as const,
      deleteDialogTitle: t('trash-delete-dialog-title-single'),
      deleteDialogDescriptionFn: (name: string) => t('trash-delete-dialog-description-single', { name }),
      deleteDialogCancel: t('trash-delete-dialog-cancel'),
      deleteDialogConfirm: t('trash-delete-dialog-confirm'),
      deleteDialogDeleting: t('trash-delete-dialog-deleting')
    }

    return (
      <>
        <div className="gba:flex gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
          <div className="gba:w-56 gba:border-r gba:border-border gba:bg-card gba:flex gba:flex-col gba:p-3 gba:gap-1">
            <Button
              className="gba:w-full gba:justify-start gba:mb-4"
              onClick={handleCreate}
              data-testid={`${testId}-create`}
            >
              <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('whiteboard-create')}
            </Button>

            {sidebarItems.map(item => (
              <Button
                key={item.key}
                variant={activeSection === item.key ? 'secondary' : 'ghost'}
                className="gba:w-full gba:justify-start"
                onClick={() => setActiveSection(item.key)}
                data-testid={`${testId}-sidebar-${item.key}`}
              >
                <item.icon className="gba:h-4 gba:w-4 gba:mr-2" />
                {item.label}
              </Button>
            ))}
          </div>

          <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden">
            <div className="gba:px-6 gba:py-4 gba:border-b gba:border-border">
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
                <div className="gba:relative">
                  <MagnifyingGlassIcon className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
                  <Input
                    placeholder={t('whiteboard-trash-search-placeholder')}
                    value={trashSearchQuery}
                    onChange={event => setTrashSearchQuery(event.target.value)}
                    className="gba:h-12 gba:pl-11 gba:rounded-xl gba:bg-muted/40 gba:border-border/60 gba:shadow-sm"
                    data-testid={`${testId}-trash-search`}
                  />
                </div>
              </div>
            </div>

            <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
                <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
                  {selectedTrashIds.size > 0 ? (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTrashIds(new Set())}
                        data-testid={`${testId}-bulk-clear`}
                      >
                        <XIcon className="gba:w-4 gba:h-4 gba:mr-1" />
                        {t('header-selected-count', { count: selectedTrashIds.size })}
                      </Button>
                      <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void handleBulkRestoreTrash()
                        }}
                        disabled={isBulkRestoringTrash || isBulkDeletingTrash}
                        data-testid={`${testId}-bulk-restore`}
                      >
                        <ArrowCounterClockwiseIcon className="gba:w-4 gba:h-4 gba:mr-1" />
                        {isBulkRestoringTrash ? t('trash-bulk-restoring') : t('trash-bulk-restore')}
                      </Button>
                      <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBulkDeleteTrashOpen(true)}
                        disabled={isBulkRestoringTrash || isBulkDeletingTrash}
                        data-testid={`${testId}-bulk-delete`}
                      >
                        <TrashIcon className="gba:w-4 gba:h-4 gba:mr-1" />
                        {t('trash-bulk-delete-permanently')}
                      </Button>
                    </div>
                  ) : (
                    <OfficeTrashListToolbar
                      listControls={trashListControls}
                      isLoading={trashList.isLoading}
                      sortBy={trashList.sortBy}
                      sortOrder={trashList.sortOrder}
                      onRefresh={() => {
                        void trashList.refresh()
                      }}
                      onSortChange={trashList.handleSortChange}
                      onToggleSortOrder={trashList.toggleSortOrder}
                      data-testid={`${testId}-trash-toolbar`}
                    />
                  )}
                </div>

                {trashList.isLoading ? (
                  <div className="gba:flex gba:justify-center gba:py-12">
                    <Spinner />
                  </div>
                ) : trashList.sortedItems.length === 0 ? (
                  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:text-center">
                    <h3 className="gba:text-lg gba:font-semibold">{t('whiteboards-empty-trash-title')}</h3>
                    <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">
                      {t('whiteboards-empty-trash-description')}
                    </p>
                  </div>
                ) : (
                  <OfficeTrashListTable
                    items={trashList.sortedItems}
                    listControls={trashListControls}
                    sortBy={trashList.sortBy}
                    actionKey={trashList.actionKey}
                    deleteConfirmItem={trashList.deleteConfirmItem}
                    onOpenItem={item => handleOpenTrashedWhiteboard(item.id)}
                    onSortChange={trashList.handleSortChange}
                    onRestoreItem={item => {
                      void trashList.handleRestore(item)
                    }}
                    onRequestDelete={trashList.requestDelete}
                    onDeleteConfirmOpenChange={trashList.handleDeleteConfirmOpenChange}
                    onConfirmDelete={() => {
                      void trashList.confirmDelete()
                    }}
                    selectedIds={selectedTrashIds}
                    onToggleSelect={handleToggleTrashSelect}
                    onSelectAll={handleSelectAllTrash}
                    renderIcon={() => (
                      <div className="gba:w-9 gba:h-9 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:bg-violet-500/10">
                        <PencilSimpleLineIcon className="gba:w-5 gba:h-5 gba:text-violet-500" />
                      </div>
                    )}
                    data-testid={`${testId}-trash-table`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <PermanentDeleteConfirmDialog
          open={bulkDeleteTrashOpen}
          onOpenChange={open => {
            if (!isBulkDeletingTrash) setBulkDeleteTrashOpen(open)
          }}
          itemNames={trashList.sortedItems.filter(item => selectedTrashIds.has(item.id)).map(item => item.name)}
          title={
            selectedTrashIds.size === 1
              ? t('trash-delete-dialog-title-single')
              : t('trash-delete-dialog-title-multiple', { count: selectedTrashIds.size })
          }
          description={
            selectedTrashIds.size === 1
              ? t('trash-delete-dialog-description-single', {
                  name: trashList.sortedItems.find(item => selectedTrashIds.has(item.id))?.name ?? ''
                })
              : t('trash-delete-dialog-description-multiple', { count: selectedTrashIds.size })
          }
          cancelLabel={t('trash-delete-dialog-cancel')}
          confirmLabel={t('trash-delete-dialog-confirm')}
          deletingLabel={t('trash-delete-dialog-deleting')}
          onConfirm={() => {
            void handleBulkDeleteTrash()
          }}
          isDeleting={isBulkDeletingTrash}
          data-testid={`${testId}-bulk-delete-dialog`}
        />
      </>
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
      {/* Sidebar */}
      <div className="gba:w-56 gba:border-r gba:border-border gba:bg-card gba:flex gba:flex-col gba:p-3 gba:gap-1">
        <Button
          className="gba:w-full gba:justify-start gba:mb-4"
          onClick={handleCreate}
          data-testid={`${testId}-create`}
        >
          <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {t('whiteboard-create')}
        </Button>

        {sidebarItems.map(item => (
          <Button
            key={item.key}
            variant={activeSection === item.key ? 'secondary' : 'ghost'}
            className="gba:w-full gba:justify-start"
            onClick={() => setActiveSection(item.key)}
            data-testid={`${testId}-sidebar-${item.key}`}
          >
            <item.icon className="gba:h-4 gba:w-4 gba:mr-2" />
            {item.label}
          </Button>
        ))}
      </div>

      {/* Main */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden">
        {/* Toolbar */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:border-border">
          <h1 className="gba:text-xl gba:font-semibold">{t('whiteboard-hub-title')}</h1>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:relative">
              <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <Input
                className="gba:pl-9 gba:w-64"
                placeholder={t('whiteboard-search-placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                data-testid={`${testId}-search`}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewLayout(viewLayout === 'grid' ? 'list' : 'grid')}
              data-testid={`${testId}-toggle-layout`}
            >
              {viewLayout === 'grid' ? (
                <ListBulletsIcon className="gba:h-4 gba:w-4" />
              ) : (
                <SquaresFourIcon className="gba:h-4 gba:w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
          {isLoading && (
            <div className="gba:flex gba:justify-center gba:py-12">
              <Spinner />
            </div>
          )}

          {!isLoading && filteredWhiteboards.length === 0 && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:gap-4">
              <PencilSimpleLineIcon className="gba:h-12 gba:w-12 gba:text-muted-foreground" />
              <h3 className="gba:text-lg gba:font-medium">{t('whiteboard-no-whiteboards')}</h3>
              <p className="gba:text-sm gba:text-muted-foreground">{t('whiteboard-no-whiteboards-description')}</p>
              <Button onClick={handleCreate} data-testid={`${testId}-empty-create`}>
                <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-create')}
              </Button>
            </div>
          )}

          {!isLoading && filteredWhiteboards.length > 0 && viewLayout === 'grid' && (
            <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-4">
              {filteredWhiteboards.map(wb => (
                <WhiteboardCard
                  key={wb.id}
                  whiteboard={wb}
                  isFavorite={favorites.has(wb.id)}
                  onOpen={() => handleOpen(wb.id)}
                  onToggleFavorite={() => toggleFavorite(wb.id)}
                  onRename={() => {
                    setWhiteboardToRename(wb.id)
                    setRenameDialogOpen(true)
                  }}
                  onDuplicate={() => handleDuplicate(wb.id)}
                  onShare={() => {
                    setWhiteboardForShare(wb.id)
                    setShareDialogOpen(true)
                  }}
                  onManageShares={() => {
                    setWhiteboardForManageShares(wb.id)
                    setManageSharesOpen(true)
                  }}
                  onDelete={() => handleDeleteWhiteboard(wb.id, wb.title)}
                  testId={`${testId}-card-${wb.id}`}
                  t={t}
                />
              ))}
            </div>
          )}

          {!isLoading && filteredWhiteboards.length > 0 && viewLayout === 'list' && (
            <div className="gba:space-y-2">
              {filteredWhiteboards.map(wb => (
                <WhiteboardListItem
                  key={wb.id}
                  whiteboard={wb}
                  isFavorite={favorites.has(wb.id)}
                  onOpen={() => handleOpen(wb.id)}
                  onToggleFavorite={() => toggleFavorite(wb.id)}
                  onRename={() => {
                    setWhiteboardToRename(wb.id)
                    setRenameDialogOpen(true)
                  }}
                  onDuplicate={() => handleDuplicate(wb.id)}
                  onShare={() => {
                    setWhiteboardForShare(wb.id)
                    setShareDialogOpen(true)
                  }}
                  onManageShares={() => {
                    setWhiteboardForManageShares(wb.id)
                    setManageSharesOpen(true)
                  }}
                  onDelete={() => handleDeleteWhiteboard(wb.id, wb.title)}
                  testId={`${testId}-row-${wb.id}`}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={trashConfirmOpen}
        onOpenChange={handleTrashConfirmOpenChange}
        itemNames={pendingTrashWhiteboard ? [pendingTrashWhiteboard.name] : []}
        onConfirm={() => {
          void confirmMoveToTrash()
        }}
        isDeleting={isMovingToTrash}
        t={t}
        data-testid={`${testId}-trash-confirm`}
      />

      <RenameWhiteboardDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentTitle={whiteboards.find(w => w.id === whiteboardToRename)?.title || ''}
        onRename={handleRename}
        data-testid={`${testId}-rename-dialog`}
      />

      {whiteboardForShare && (
        <ShareWhiteboardDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          whiteboardId={whiteboardForShare}
          whiteboardTitle={whiteboards.find(w => w.id === whiteboardForShare)?.title || t('whiteboard-untitled')}
          currentUserId={currentUserId}
          currentUserName={[userInfo?.givenName, userInfo?.familyName].filter(Boolean).join(' ') || userInfo?.userName}
          accessToken={accessToken}
          onShareComplete={refresh}
          data-testid={`${testId}-share-dialog`}
        />
      )}

      {whiteboardForManageShares && (
        <ManageSharesDialog
          open={manageSharesOpen}
          onOpenChange={setManageSharesOpen}
          whiteboardId={whiteboardForManageShares}
          accessToken={accessToken}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface WhiteboardCardProps {
  whiteboard: WhiteboardSummary
  isFavorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onRename: () => void
  onDuplicate: () => void
  onShare: () => void
  onManageShares: () => void
  onDelete: () => void
  testId: string
  t: (key: string, vars?: Record<string, number>) => string
}

const WhiteboardCard: React.FC<WhiteboardCardProps> = ({
  whiteboard,
  isFavorite,
  onOpen,
  onToggleFavorite,
  onRename,
  onDuplicate,
  onShare,
  onManageShares,
  onDelete,
  testId,
  t
}) => (
  <Card
    className="gba:cursor-pointer gba:group gba:relative gba:overflow-hidden gba:transition-all gba:hover:ring-2 gba:hover:ring-primary/20"
    onClick={onOpen}
    data-testid={testId}
  >
    <div className="gba:aspect-video gba:bg-muted/40 gba:flex gba:items-center gba:justify-center gba:border-b gba:border-border">
      <PencilSimpleLineIcon className="gba:h-10 gba:w-10 gba:text-muted-foreground/40" />
    </div>
    <div className="gba:p-3">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div className="gba:min-w-0 gba:flex-1">
          <h3 className="gba:text-sm gba:font-medium gba:truncate">{whiteboard.title}</h3>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
            {formatRelativeTime(whiteboard.updatedAt, t)}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-1" onClick={e => e.stopPropagation()}>
          {whiteboard.isShared && (
            <Badge variant="outline" className="gba:text-[10px]">
              {t('whiteboard-shared-badge')}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-7 gba:w-7 gba:p-0 gba:opacity-0 gba:group-hover:opacity-100"
                data-testid={`${testId}-menu`}
              >
                <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename} data-testid={`${testId}-rename`}>
                <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-rename')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite}>
                <StarIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                {isFavorite ? t('whiteboard-remove-favorite') : t('whiteboard-add-favorite')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <ShareNetworkIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-share')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageShares}>
                <UsersThreeIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-manage-shares')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <CopyIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-duplicate')}
              </DropdownMenuItem>
              {whiteboard.isOwner !== false && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="gba:text-destructive"
                    data-testid={`${testId}-delete`}
                  >
                    <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                    {t('whiteboard-delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </Card>
)

/* ------------------------------------------------------------------ */

interface WhiteboardListItemProps {
  whiteboard: WhiteboardSummary
  isFavorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onRename: () => void
  onDuplicate: () => void
  onShare: () => void
  onManageShares: () => void
  onDelete: () => void
  testId: string
  t: (key: string, vars?: Record<string, number>) => string
}

const WhiteboardListItem: React.FC<WhiteboardListItemProps> = ({
  whiteboard,
  isFavorite,
  onOpen,
  onToggleFavorite,
  onRename,
  onDuplicate,
  onShare,
  onManageShares,
  onDelete,
  testId,
  t
}) => (
  <div
    className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:rounded-lg gba:border gba:border-border gba:cursor-pointer gba:hover:bg-accent/50 gba:transition-colors gba:group"
    onClick={onOpen}
    data-testid={testId}
  >
    <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0 gba:flex-1">
      <div className="gba:h-9 gba:w-9 gba:rounded gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
        <PencilSimpleLineIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
      </div>
      <div className="gba:min-w-0">
        <h3 className="gba:text-sm gba:font-medium gba:truncate">{whiteboard.title}</h3>
        <p className="gba:text-xs gba:text-muted-foreground">{formatRelativeTime(whiteboard.updatedAt, t)}</p>
      </div>
    </div>
    <div className="gba:flex gba:items-center gba:gap-2" onClick={e => e.stopPropagation()}>
      {whiteboard.isShared && (
        <Badge variant="outline" className="gba:text-[10px]">
          {t('whiteboard-shared-badge')}
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-7 gba:w-7 gba:p-0 gba:opacity-0 gba:group-hover:opacity-100"
            data-testid={`${testId}-menu`}
          >
            <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename} data-testid={`${testId}-rename`}>
            <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-rename')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleFavorite}>
            <StarIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {isFavorite ? t('whiteboard-remove-favorite') : t('whiteboard-add-favorite')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShare}>
            <ShareNetworkIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-share')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onManageShares}>
            <UsersThreeIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-manage-shares')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <CopyIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-duplicate')}
          </DropdownMenuItem>
          {whiteboard.isOwner !== false && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gba:text-destructive" data-testid={`${testId}-delete`}>
                <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-delete')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
)

export default WhiteboardAppsHub
