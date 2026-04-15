import React, { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Card,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Plus,
  Search,
  MoreHorizontal,
  Share2,
  Copy,
  Trash2,
  Star,
  Home,
  Users,
  Clock,
  LayoutGrid,
  List,
  PenTool,
  Pencil
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWhiteboards } from './hooks/useWhiteboards'
import { useWhiteboardHubUrlState } from './hooks/useWhiteboardHubUrlState'
import { useWhiteboardHubFavorites } from './hooks/useWhiteboardHubFavorites'
import { WhiteboardEditorWithAi } from './components/WhiteboardEditorWithAi'
import { ShareWhiteboardDialog } from './components/ShareWhiteboardDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import { RenameWhiteboardDialog } from './components/RenameWhiteboardDialog'
import { OfficeTrashList } from '@/business-apps/platform/apps/shared/components/OfficeTrashList'
import { OfficeTrashStateView } from '@/business-apps/platform/apps/shared/components/OfficeTrashStateView'
import translations from './_i18n'
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
  const [currentView, setCurrentView] = useState<HubView>(() => initialView)
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>(() =>
    initialView === 'trash' ? 'trash' : 'my-whiteboards'
  )
  const [selectedWhiteboardId, setSelectedWhiteboardId] = useState<string | null>(() => wbFromUrlOnMount)
  const [sortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
  const [sortOrder] = useState<'ASC' | 'DESC'>('DESC')

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [whiteboardToDelete, setWhiteboardToDelete] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [whiteboardForShare, setWhiteboardForShare] = useState<string | null>(null)
  const [manageSharesOpen, setManageSharesOpen] = useState(false)
  const [whiteboardForManageShares, setWhiteboardForManageShares] = useState<string | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [whiteboardToRename, setWhiteboardToRename] = useState<string | null>(null)

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

  const handleCreate = useCallback(async () => {
    const id = await createWhiteboard(t('whiteboard-untitled'))
    if (id) {
      setSelectedWhiteboardId(id)
      setCurrentView('editor')
    }
  }, [createWhiteboard, t])

  const handleOpen = useCallback((id: string) => {
    setSelectedWhiteboardId(id)
    setCurrentView('editor')
  }, [])

  const handleOpenTrashedWhiteboard = useCallback((id: string) => {
    setSelectedWhiteboardId(id)
    setActiveSection('trash')
    setCurrentView('trash')
  }, [])

  const handleBack = useCallback(() => {
    setCurrentView('list')
    setSelectedWhiteboardId(null)
    refresh()
  }, [refresh])

  const handleDelete = useCallback(async () => {
    if (!whiteboardToDelete) return
    try {
      await deleteWhiteboard(whiteboardToDelete)
      toast.success('Whiteboard deleted')
    } catch {
      toast.error('Failed to delete whiteboard')
    }
    setDeleteConfirmOpen(false)
    setWhiteboardToDelete(null)
  }, [whiteboardToDelete, deleteWhiteboard])

  const handleRename = useCallback(
    async (newTitle: string) => {
      if (!whiteboardToRename) return
      try {
        await renameWhiteboard(whiteboardToRename, newTitle)
        toast.success(t('whiteboard-rename'))
      } catch {
        toast.error('Failed to rename whiteboard')
      }
    },
    [whiteboardToRename, renameWhiteboard, t]
  )

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await duplicateWhiteboard(id)
        toast.success('Whiteboard duplicated')
      } catch {
        toast.error('Failed to duplicate')
      }
    },
    [duplicateWhiteboard]
  )

  if (currentView === 'editor' && selectedWhiteboardId) {
    return (
      <WhiteboardEditorWithAi
        whiteboardId={selectedWhiteboardId}
        accessToken={accessToken}
        userInfo={userInfo}
        onBack={handleBack}
        data-testid={`${testId}-editor`}
      />
    )
  }

  if (currentView === 'trash' && selectedWhiteboardId) {
    return (
      <div className="gba:flex gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
        <div className="gba:w-56 gba:border-r gba:border-border gba:bg-card gba:flex gba:flex-col gba:p-3 gba:gap-1">
          <Button
            className="gba:w-full gba:justify-start gba:mb-4"
            onClick={handleCreate}
            data-testid={`${testId}-create`}
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-create')}
          </Button>

          {(
            [
              { key: 'my-whiteboards', icon: Home, label: t('whiteboard-my-whiteboards') },
              { key: 'shared', icon: Users, label: t('whiteboard-shared-with-me') },
              { key: 'favorites', icon: Star, label: t('whiteboard-favorites') },
              { key: 'recent', icon: Clock, label: t('whiteboard-recent') },
              { key: 'trash', icon: Trash2, label: 'Trash' }
            ] as const
          ).map(item => (
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
          <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:border-border">
            <h1 className="gba:text-xl gba:font-semibold">{t('whiteboard-hub-title')}</h1>
          </div>

          <main className="gba:flex-1 gba:overflow-auto gba:p-6">
            <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
              <OfficeTrashStateView
                accessToken={accessToken}
                entityType="whiteboard"
                entityId={selectedWhiteboardId}
                title="This whiteboard is in trash"
                description="Trashed whiteboards are read-only until you restore them. You can restore it now or delete it permanently."
                onBack={handleBack}
                onRestoreComplete={async () => {
                  setSelectedWhiteboardId(null)
                  setCurrentView('list')
                  await refresh()
                }}
                onDeleteComplete={() => {
                  setSelectedWhiteboardId(null)
                  setCurrentView('list')
                }}
              />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (activeSection === 'trash') {
    return (
      <div className="gba:flex gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
        <div className="gba:w-56 gba:border-r gba:border-border gba:bg-card gba:flex gba:flex-col gba:p-3 gba:gap-1">
          <Button
            className="gba:w-full gba:justify-start gba:mb-4"
            onClick={handleCreate}
            data-testid={`${testId}-create`}
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-create')}
          </Button>

          {(
            [
              { key: 'my-whiteboards', icon: Home, label: t('whiteboard-my-whiteboards') },
              { key: 'shared', icon: Users, label: t('whiteboard-shared-with-me') },
              { key: 'favorites', icon: Star, label: t('whiteboard-favorites') },
              { key: 'recent', icon: Clock, label: t('whiteboard-recent') },
              { key: 'trash', icon: Trash2, label: 'Trash' }
            ] as const
          ).map(item => (
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
          <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:border-border">
            <h1 className="gba:text-xl gba:font-semibold">{t('whiteboard-hub-title')}</h1>
          </div>

          <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
            <OfficeTrashList
              accessToken={accessToken}
              entityType="whiteboard"
              emptyTitle="No trashed whiteboards"
              emptyDescription="Whiteboards moved to trash will appear here."
              onOpenItem={item => handleOpenTrashedWhiteboard(item.id)}
              onItemsChanged={refresh}
            />
          </div>
        </div>
      </div>
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
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          {t('whiteboard-create')}
        </Button>

        {(
          [
            { key: 'my-whiteboards', icon: Home, label: t('whiteboard-my-whiteboards') },
            { key: 'shared', icon: Users, label: t('whiteboard-shared-with-me') },
            { key: 'favorites', icon: Star, label: t('whiteboard-favorites') },
            { key: 'recent', icon: Clock, label: t('whiteboard-recent') },
            { key: 'trash', icon: Trash2, label: 'Trash' }
          ] as const
        ).map(item => (
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
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
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
                <List className="gba:h-4 gba:w-4" />
              ) : (
                <LayoutGrid className="gba:h-4 gba:w-4" />
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
              <PenTool className="gba:h-12 gba:w-12 gba:text-muted-foreground" />
              <h3 className="gba:text-lg gba:font-medium">{t('whiteboard-no-whiteboards')}</h3>
              <p className="gba:text-sm gba:text-muted-foreground">{t('whiteboard-no-whiteboards-description')}</p>
              <Button onClick={handleCreate} data-testid={`${testId}-empty-create`}>
                <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
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
                  onDelete={() => {
                    setWhiteboardToDelete(wb.id)
                    setDeleteConfirmOpen(true)
                  }}
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
                  onDelete={() => {
                    setWhiteboardToDelete(wb.id)
                    setDeleteConfirmOpen(true)
                  }}
                  testId={`${testId}-row-${wb.id}`}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid={`${testId}-delete-dialog`}>
          <DialogHeader>
            <DialogTitle>{t('whiteboard-delete-confirm-title')}</DialogTitle>
            <DialogDescription>{t('whiteboard-delete-confirm-description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t('whiteboard-delete-cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} data-testid={`${testId}-delete-confirm`}>
              {t('whiteboard-delete-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <PenTool className="gba:h-10 gba:w-10 gba:text-muted-foreground/40" />
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
              Shared
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
                <MoreHorizontal className="gba:h-4 gba:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename} data-testid={`${testId}-rename`}>
                <Pencil className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-rename')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite}>
                <Star className="gba:h-4 gba:w-4 gba:mr-2" />
                {isFavorite ? t('whiteboard-remove-favorite') : t('whiteboard-add-favorite')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-share')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageShares}>
                <Users className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('whiteboard-manage-shares')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="gba:h-4 gba:w-4 gba:mr-2" />
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
                    <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
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
        <PenTool className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
      </div>
      <div className="gba:min-w-0">
        <h3 className="gba:text-sm gba:font-medium gba:truncate">{whiteboard.title}</h3>
        <p className="gba:text-xs gba:text-muted-foreground">{formatRelativeTime(whiteboard.updatedAt, t)}</p>
      </div>
    </div>
    <div className="gba:flex gba:items-center gba:gap-2" onClick={e => e.stopPropagation()}>
      {whiteboard.isShared && (
        <Badge variant="outline" className="gba:text-[10px]">
          Shared
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
            <MoreHorizontal className="gba:h-4 gba:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename} data-testid={`${testId}-rename`}>
            <Pencil className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-rename')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleFavorite}>
            <Star className="gba:h-4 gba:w-4 gba:mr-2" />
            {isFavorite ? t('whiteboard-remove-favorite') : t('whiteboard-add-favorite')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShare}>
            <Share2 className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-share')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onManageShares}>
            <Users className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-manage-shares')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('whiteboard-duplicate')}
          </DropdownMenuItem>
          {whiteboard.isOwner !== false && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gba:text-destructive" data-testid={`${testId}-delete`}>
                <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
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
