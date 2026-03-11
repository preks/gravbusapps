import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Loader2 } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { DriveItem, DriveFolder } from './types/drive.types'
import { DriveSidebar } from './components/DriveSidebar'
import { DriveBreadcrumbs } from './components/DriveBreadcrumbs'
import { DriveToolbar } from './components/DriveToolbar'
import { DriveContentGrid } from './components/DriveContentGrid'
import { DriveSearchDialog } from './components/DriveSearchDialog'
import { CreateFolderDialog } from './components/CreateFolderDialog'
import { RenameDialog } from './components/RenameDialog'
import { ShareDriveItemDialog } from './components/ShareDriveItemDialog'
import { DriveFilePreviewDialog } from './components/DriveFilePreviewDialog'
import { DriveDropZoneOverlay } from './components/DriveDropZoneOverlay'
import { useDrive } from './hooks/useDrive'
import { useDriveSearch } from './hooks/useDriveSearch'
import { useDriveHubUrlState } from './hooks/useDriveHubUrlState'
import { useDriveDropZone } from './hooks/useDriveDropZone'
import { useDriveUpload } from './hooks/useDriveUpload'
import { useDriveSelection } from './hooks/useDriveSelection'
import { DriveApiService } from './services/DriveApiService'
import { downloadDriveItem } from './utils/driveExportUtils'
import { HubPaginationFooter } from '@/business-apps/platform/apps/shared/components/HubPaginationFooter'
import { openInNewTab, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from './_i18n'

export interface DriveAppsHubProps extends BusinessAppContextProps {
  entityContext?: string
  'data-testid'?: string
}

export const DriveAppsHub: React.FC<DriveAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'drive-apps-hub'
}) => {
  const { t } = useTranslation(translations)
  const [urlState, setUrlState] = useDriveHubUrlState()
  const { section: activeSection, folderId: currentFolderId, viewMode, sortBy, page } = urlState
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [searchOpen, setSearchOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<DriveItem | null>(null)
  const [shareTarget, setShareTarget] = useState<{ entityType: string; entityId: string; entityName: string } | null>(
    null
  )

  const drive = useDrive({
    accessToken,
    section: activeSection,
    folderId: currentFolderId,
    sortBy,
    sortOrder,
    page,
    limit: 50
  })

  const search = useDriveSearch()

  const upload = useDriveUpload({
    accessToken,
    currentFolderId,
    onComplete: drive.refresh
  })

  const dropZone = useDriveDropZone({
    onDrop: upload.uploadDroppedEntries,
    disabled: activeSection !== 'my-drive' || upload.isUploading
  })

  const selection = useDriveSelection({ items: drive.items, folders: drive.folders })

  const handleMoveToFolder = useCallback(
    (targetFolderId: string, refs: Array<{ entityType: string; entityId: string }>) => {
      drive.moveItems(refs, targetFolderId)
      selection.clearSelection()
    },
    [drive, selection]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null)

  const handleItemClick = useCallback(
    (item: DriveItem) => {
      switch (item.type) {
        case 'document':
          openInNewTab(buildPlatformUrl('/platform/documents', { docId: item.id, view: 'editor', from: 'drive' }))
          break
        case 'spreadsheet_app':
          openInNewTab(buildPlatformUrl('/platform/spreadsheets', { appId: item.id, view: 'viewer', from: 'drive' }))
          break
        case 'slide':
          openInNewTab(buildPlatformUrl('/platform/slides', { slideId: item.id, view: 'editor', from: 'drive' }))
          break
        case 'note':
          openInNewTab(buildPlatformUrl('/platform/notes', { noteId: item.id, view: 'editor', from: 'drive' }))
          break
        case 'drive_file':
          if (item.mimeType?.startsWith('image/')) {
            setPreviewItem(item)
          } else {
            DriveApiService.setAccessToken(accessToken ?? null)
            DriveApiService.downloadFile(item.id)
          }
          break
      }
    },
    [accessToken]
  )

  const handleSearchSelect = useCallback(
    (result: { id: string; type: string }) => {
      handleItemClick(result as DriveItem)
    },
    [handleItemClick]
  )

  const handleTrashItem = useCallback(
    (item: DriveItem) => {
      drive.trashItems([{ entityType: item.type, entityId: item.id }])
    },
    [drive]
  )

  const handleRestoreItem = useCallback(
    (item: DriveItem) => {
      drive.restoreItems([{ entityType: item.type, entityId: item.id }])
    },
    [drive]
  )

  const handleDownload = useCallback(
    async (item: DriveItem) => {
      DriveApiService.setAccessToken(accessToken ?? null)
      await downloadDriveItem(item)
    },
    [accessToken]
  )

  const handleShareItem = useCallback((item: DriveItem) => {
    setShareTarget({ entityType: item.type, entityId: item.id, entityName: item.name })
  }, [])

  const handleShareFolder = useCallback((folder: DriveFolder) => {
    setShareTarget({ entityType: 'drive_folder', entityId: folder.id, entityName: folder.name })
  }, [])

  const handleRename = useCallback(
    async (newName: string) => {
      if (!renameTarget) return
      DriveApiService.setAccessToken(accessToken ?? null)
      if (renameTarget.type === 'drive_file') {
        await DriveApiService.renameFile(renameTarget.id, newName)
      } else if (
        renameTarget.type === 'document' ||
        renameTarget.type === 'note' ||
        renameTarget.type === 'slide' ||
        renameTarget.type === 'spreadsheet_app'
      ) {
        await DriveApiService.renameFile(renameTarget.id, newName)
      }
      setRenameTarget(null)
    },
    [renameTarget, accessToken]
  )

  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      <DriveSidebar
        activeSection={activeSection}
        onSectionChange={s => setUrlState({ section: s, folderId: null, page: 1 })}
        onCreateNew={() => setCreateFolderOpen(true)}
        t={t}
        data-testid={`${testId}-sidebar`}
      />

      <div className="gba:flex-1 gba:min-w-0 gba:flex gba:flex-col gba:relative" {...dropZone.dropZoneProps}>
        <DriveDropZoneOverlay
          isDragActive={dropZone.isDragActive}
          uploadProgress={upload.progress}
          t={t}
          data-testid={`${testId}-drop-overlay`}
        />
        <div className="gba:px-6 gba:pt-5 gba:pb-4 gba:border-b gba:border-border/50 gba:space-y-3">
          <DriveBreadcrumbs
            section={activeSection}
            breadcrumbs={drive.breadcrumbs}
            isCurrentFolderShared={drive.isCurrentFolderShared}
            onNavigateRoot={() => setUrlState({ folderId: null, page: 1 })}
            onNavigateFolder={id => setUrlState({ folderId: id, page: 1 })}
            t={t}
            data-testid={`${testId}-breadcrumbs`}
          />
          <DriveToolbar
            viewMode={viewMode}
            onViewModeChange={m => setUrlState({ viewMode: m })}
            sortBy={sortBy}
            onSortByChange={s => setUrlState({ sortBy: s, page: 1 })}
            sortOrder={sortOrder}
            onSortOrderToggle={() => setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'))}
            onSearchClick={() => setSearchOpen(true)}
            onUploadFiles={upload.uploadFiles}
            section={activeSection}
            onEmptyTrash={activeSection === 'trash' ? drive.emptyTrash : undefined}
            t={t}
            data-testid={`${testId}-toolbar`}
          />
        </div>

        <div
          className="gba:flex-1 gba:overflow-y-auto gba:p-6"
          onClick={e => {
            if (e.target === e.currentTarget) selection.clearSelection()
          }}
        >
          {drive.isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-20" data-testid={`${testId}-loading`}>
              <Loader2 className="gba:w-8 gba:h-8 gba:text-muted-foreground gba:animate-spin" />
            </div>
          ) : (
            <DriveContentGrid
              items={drive.items}
              folders={drive.folders}
              viewMode={viewMode}
              section={activeSection}
              onItemClick={handleItemClick}
              onFolderClick={f => setUrlState({ folderId: f.id, page: 1 })}
              onToggleFavorite={(type, id, isFav) => drive.toggleFavorite(type, id, isFav)}
              onTrashItem={handleTrashItem}
              selectedKeys={selection.selectedKeys}
              onSelect={selection.handleSelect}
              onSelectOnly={selection.selectOnly}
              onMoveToFolder={handleMoveToFolder}
              onAddToMyDrive={activeSection === 'shared' ? (type, id) => drive.addToMyDrive(type, id) : undefined}
              onRemoveShortcut={shortcutId => drive.removeShortcut(shortcutId)}
              onRestoreItem={activeSection === 'trash' ? handleRestoreItem : undefined}
              onDownloadItem={handleDownload}
              onRenameItem={item => setRenameTarget(item)}
              onShareItem={handleShareItem}
              onShareFolder={handleShareFolder}
              t={t}
              data-testid={`${testId}-content`}
            />
          )}

          {drive.totalPages > 1 && (
            <HubPaginationFooter
              currentPage={page}
              totalPages={drive.totalPages}
              totalItems={drive.total}
              pageSize={50}
              onPageChange={p => setUrlState({ page: p })}
              data-testid={`${testId}-pagination`}
            />
          )}
        </div>
      </div>

      <DriveSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={search.query}
        onQueryChange={search.setQuery}
        results={search.results}
        isSearching={search.isSearching}
        onSelectResult={handleSearchSelect}
        t={t}
        data-testid={`${testId}-search`}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onConfirm={async name => {
          await drive.createFolder(name, currentFolderId ?? undefined)
        }}
        t={t}
        data-testid={`${testId}-create-folder`}
      />

      <RenameDialog
        open={!!renameTarget}
        onOpenChange={open => {
          if (!open) setRenameTarget(null)
        }}
        currentName={renameTarget?.name ?? ''}
        onConfirm={handleRename}
        t={t}
        data-testid={`${testId}-rename`}
      />

      {shareTarget && (
        <ShareDriveItemDialog
          open={!!shareTarget}
          onOpenChange={open => {
            if (!open) setShareTarget(null)
          }}
          entityType={shareTarget.entityType}
          entityId={shareTarget.entityId}
          entityName={shareTarget.entityName}
          accessToken={accessToken ?? ''}
          currentUserId={userInfo?.userId ?? ''}
          t={t}
          data-testid={`${testId}-share-dialog`}
        />
      )}

      <DriveFilePreviewDialog
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={handleDownload}
        t={t}
        data-testid={`${testId}-preview`}
      />
    </div>
  )
}

export default DriveAppsHub
