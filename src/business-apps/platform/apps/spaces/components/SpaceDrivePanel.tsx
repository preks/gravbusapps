// Space-scoped drive panel using the Drive API directly with spaceId filter.

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation, Switch } from '@newwork/nw-design-system'
import { Loader2, HardDrive } from 'lucide-react'
import type {
  DriveItem,
  DriveFolder,
  DriveSortBy,
  DriveViewMode,
  DriveSearchResult
} from '@/business-apps/core/office/apps/drive/types/drive.types'
import { DriveContentGrid } from '@/business-apps/core/office/apps/drive/components/DriveContentGrid'
import { DriveToolbar } from '@/business-apps/core/office/apps/drive/components/DriveToolbar'
import { DriveBreadcrumbs } from '@/business-apps/core/office/apps/drive/components/DriveBreadcrumbs'
import { DriveSearchDialog } from '@/business-apps/core/office/apps/drive/components/DriveSearchDialog'
import { DriveDropZoneOverlay } from '@/business-apps/core/office/apps/drive/components/DriveDropZoneOverlay'
import { DriveFilePreviewDialog } from '@/business-apps/core/office/apps/drive/components/DriveFilePreviewDialog'
import { ShareDriveItemDialog } from '@/business-apps/core/office/apps/drive/components/ShareDriveItemDialog'
import { CreateFolderDialog } from '@/business-apps/core/office/apps/drive/components/CreateFolderDialog'
import { RenameDialog } from '@/business-apps/core/office/apps/drive/components/RenameDialog'
import { DeleteConfirmDialog } from '@/business-apps/core/office/apps/drive/components/DeleteConfirmDialog'
import { DriveBulkActions } from '@/business-apps/core/office/apps/drive/components/DriveBulkActions'
import { DriveExternalImportSheet } from '@/business-apps/core/office/apps/drive/components/DriveExternalImportSheet'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import { downloadDriveItem } from '@/business-apps/core/office/apps/drive/utils/driveExportUtils'
import { useDrive } from '@/business-apps/core/office/apps/drive/hooks/useDrive'
import { useDriveUpload } from '@/business-apps/core/office/apps/drive/hooks/useDriveUpload'
import type { UploadProgress } from '@/business-apps/core/office/apps/drive/hooks/useDriveUpload'
import { useDriveDropZone } from '@/business-apps/core/office/apps/drive/hooks/useDriveDropZone'
import { useDriveSelection } from '@/business-apps/core/office/apps/drive/hooks/useDriveSelection'
import { HubPaginationFooter } from '@/business-apps/platform/apps/shared/components/HubPaginationFooter'
import driveTranslations from '@/business-apps/core/office/apps/drive/_i18n'

export interface SpaceDrivePanelProps {
  spaceId: string
  accessToken: string | undefined
  userInfo?: { userId?: string; id?: string }
  canEdit: boolean
  onItemClick: (item: DriveItem) => void
  onRefreshRef?: React.MutableRefObject<(() => void) | null>
  onActivityChange?: () => void
  'data-testid'?: string
}

export const SpaceDrivePanel: React.FC<SpaceDrivePanelProps> = ({
  spaceId,
  accessToken,
  userInfo,
  canEdit,
  onItemClick,
  onRefreshRef,
  onActivityChange,
  'data-testid': testId = 'space-drive-panel'
}) => {
  const { t } = useTranslation(driveTranslations)

  const [folderId, setFolderId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<DriveViewMode>('list')
  const [sortBy, setSortBy] = useState<DriveSortBy>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [page, setPage] = useState(1)

  const drive = useDrive({
    accessToken,
    section: 'my-drive',
    folderId,
    sortBy,
    sortOrder,
    page,
    limit: 50,
    spaceId
  })

  useEffect(() => {
    if (onRefreshRef) onRefreshRef.current = drive.refresh
    return () => {
      if (onRefreshRef) onRefreshRef.current = null
    }
  }, [onRefreshRef, drive.refresh])

  // Toolbar upload with optional "Also add to my Drive" shortcut
  const [alsoAddToMyDrive, setAlsoAddToMyDrive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !accessToken) return
      DriveApiService.setAccessToken(accessToken)
      setIsUploading(true)
      setUploadProgress({ current: 0, total: files.length, currentFileName: files[0].name })
      try {
        for (let i = 0; i < files.length; i++) {
          setUploadProgress({ current: i, total: files.length, currentFileName: files[i].name })
          const result = await DriveApiService.uploadFile(files[i], folderId ?? undefined, spaceId)
          if (alsoAddToMyDrive) {
            const entityType = ('entityType' in result ? result.entityType : (result as DriveItem).type) ?? 'document'
            const entityId = 'entityId' in result ? result.entityId : (result as DriveItem).id
            try {
              await DriveApiService.createShortcut(entityType, entityId)
            } catch {
              /* non-critical */
            }
          }
        }
      } finally {
        setIsUploading(false)
        setUploadProgress(null)
        drive.refresh()
        onActivityChange?.()
      }
    },
    [accessToken, folderId, spaceId, alsoAddToMyDrive, drive.refresh, onActivityChange]
  )

  // Drop zone upload (handles directory structures via useDriveUpload)
  const driveUpload = useDriveUpload({
    accessToken,
    currentFolderId: folderId,
    onComplete: () => {
      drive.refresh()
      onActivityChange?.()
    },
    spaceId
  })

  const effectiveUploading = isUploading || driveUpload.isUploading
  const effectiveProgress = uploadProgress ?? driveUpload.progress

  const dropZone = useDriveDropZone({
    onDrop: driveUpload.uploadDroppedEntries,
    disabled: !canEdit || effectiveUploading
  })

  const selection = useDriveSelection({ items: drive.items, folders: drive.folders })

  // Space-scoped search via Drive API
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DriveSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSearchQueryChange = useCallback(
    (q: string) => {
      setSearchQuery(q)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      if (q.trim().length < 2) {
        setSearchResults([])
        return
      }
      searchDebounceRef.current = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await DriveApiService.search(q, undefined, 20, spaceId)
          setSearchResults(results)
        } catch {
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 300)
    },
    [spaceId]
  )

  const [externalImportOpen, setExternalImportOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; isFolder: boolean } | null>(null)
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null)
  const [shareTarget, setShareTarget] = useState<{
    entityType: string
    entityId: string
    entityName: string
  } | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeleteRefs, setPendingDeleteRefs] = useState<
    Array<{ entityType: string; entityId: string; name: string }>
  >([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.selectedCount > 0 && canEdit) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        e.preventDefault()
        handleBulkTrash()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selection.selectedCount, canEdit])

  const handleMoveToFolder = useCallback(
    async (targetFolderId: string, refs: Array<{ entityType: string; entityId: string }>) => {
      DriveApiService.setAccessToken(accessToken ?? null)
      const folderRefs = refs.filter(r => r.entityType === 'drive_folder')
      const fileRefs = refs.filter(r => r.entityType === 'drive_file')
      const contentRefs = refs.filter(r => r.entityType !== 'drive_folder' && r.entityType !== 'drive_file')
      const promises: Promise<unknown>[] = []
      for (const f of folderRefs) {
        promises.push(DriveApiService.updateFolder(f.entityId, { parentId: targetFolderId }, spaceId))
      }
      if (fileRefs.length > 0) {
        promises.push(drive.moveItems(fileRefs, targetFolderId))
      }
      for (const item of contentRefs) {
        promises.push(DriveApiService.moveSpaceContent(spaceId, item.entityType, item.entityId, targetFolderId))
      }
      await Promise.all(promises)
      drive.refresh()
      selection.clearSelection()
      onActivityChange?.()
    },
    [drive, selection, accessToken, spaceId, onActivityChange]
  )

  const handleSearchSelect = useCallback(
    (result: { id: string; type: string }) => {
      onItemClick(result as DriveItem)
    },
    [onItemClick]
  )

  const requestTrash = useCallback((refs: Array<{ entityType: string; entityId: string; name: string }>) => {
    setPendingDeleteRefs(refs)
    setDeleteConfirmOpen(true)
  }, [])

  const handleTrashItem = useCallback(
    (item: DriveItem) => {
      requestTrash([{ entityType: item.type, entityId: item.id, name: item.name }])
    },
    [requestTrash]
  )

  const handleBulkTrash = useCallback(() => {
    const refs = selection.getSelectedRefs().map(r => {
      const item = drive.items.find(i => i.type === r.entityType && i.id === r.entityId)
      const folder = drive.folders.find(f => f.id === r.entityId && r.entityType === 'drive_folder')
      return { ...r, name: item?.name ?? folder?.name ?? 'Unknown' }
    })
    if (refs.length > 0) requestTrash(refs)
  }, [selection, drive.items, drive.folders, requestTrash])

  const confirmTrash = useCallback(() => {
    const refs = pendingDeleteRefs.map(({ entityType, entityId }) => ({ entityType, entityId }))
    drive.trashItems(refs).then(() => onActivityChange?.())
    selection.clearSelection()
    setPendingDeleteRefs([])
  }, [drive, pendingDeleteRefs, selection, onActivityChange])

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
      if (renameTarget.isFolder) {
        await DriveApiService.updateFolder(renameTarget.id, { name: newName }, spaceId)
      } else {
        await DriveApiService.renameFile(renameTarget.id, newName)
      }
      setRenameTarget(null)
      drive.refresh()
      onActivityChange?.()
    },
    [renameTarget, accessToken, drive, spaceId, onActivityChange]
  )

  const handleItemClickInternal = useCallback(
    (item: DriveItem) => {
      if (item.type === 'drive_file') {
        if (item.mimeType?.startsWith('image/') || item.mimeType === 'application/pdf') {
          setPreviewItem(item)
        } else {
          DriveApiService.setAccessToken(accessToken ?? null)
          DriveApiService.downloadFile(item.id)
        }
      } else {
        onItemClick(item)
      }
    },
    [onItemClick, accessToken]
  )

  const handleAddToMyDrive = useCallback(
    async (entityType: string, entityId: string) => {
      DriveApiService.setAccessToken(accessToken ?? null)
      try {
        await DriveApiService.createShortcut(entityType, entityId)
      } catch {
        /* non-critical */
      }
    },
    [accessToken]
  )

  const currentUserId = userInfo?.userId ?? userInfo?.id ?? ''

  return (
    <div
      className="gba:flex gba:flex-col gba:min-h-[600px] gba:bg-background gba:rounded-xl gba:border gba:border-border/50 gba:overflow-hidden"
      data-testid={testId}
    >
      <div
        className="gba:flex-1 gba:min-w-0 gba:min-h-0 gba:flex gba:flex-col gba:relative"
        onDragEnter={dropZone.dropZoneProps.onDragEnter}
        onDragOver={dropZone.dropZoneProps.onDragOver}
        onDragLeave={dropZone.dropZoneProps.onDragLeave}
        onDrop={dropZone.dropZoneProps.onDrop}
      >
        <DriveDropZoneOverlay
          isDragActive={dropZone.isDragActive}
          uploadProgress={effectiveProgress}
          t={t}
          data-testid={`${testId}-drop-overlay`}
        />

        <div className="gba:px-6 gba:pt-5 gba:pb-4 gba:border-b gba:border-border/50 gba:space-y-3">
          {drive.breadcrumbs.length > 0 && (
            <DriveBreadcrumbs
              section="my-drive"
              breadcrumbs={drive.breadcrumbs}
              isCurrentFolderShared={drive.isCurrentFolderShared}
              onNavigateRoot={() => {
                setFolderId(null)
                setPage(1)
              }}
              onNavigateFolder={id => {
                setFolderId(id)
                setPage(1)
              }}
              rootLabel="Drive"
              t={t}
              data-testid={`${testId}-breadcrumbs`}
            />
          )}
          <DriveToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortByChange={s => {
              setSortBy(s)
              setPage(1)
            }}
            sortOrder={sortOrder}
            onSortOrderToggle={() => setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'))}
            onSearchClick={() => setSearchOpen(true)}
            onUploadFiles={canEdit ? uploadFiles : () => {}}
            onImportExternal={canEdit ? () => setExternalImportOpen(true) : undefined}
            onCreateFolder={canEdit ? () => setCreateFolderOpen(true) : undefined}
            actionsSlot={
              canEdit ? (
                <label
                  htmlFor="also-add-to-drive"
                  className="gba:inline-flex gba:items-center gba:gap-1.5 gba:cursor-pointer gba:select-none gba:group gba:py-0.5 gba:px-2 gba:rounded-md gba:transition-colors hover:gba:bg-muted/40 gba:border gba:border-transparent hover:gba:border-border/40"
                  data-testid={`${testId}-also-add-toggle`}
                >
                  <Switch
                    id="also-add-to-drive"
                    checked={alsoAddToMyDrive}
                    onCheckedChange={v => setAlsoAddToMyDrive(!!v)}
                    className="gba:scale-[0.7] gba:origin-center"
                    data-testid={`${testId}-also-add-checkbox`}
                  />
                  <HardDrive className="gba:w-3 gba:h-3 gba:text-muted-foreground/50 group-hover:gba:text-muted-foreground gba:transition-colors" />
                  <span className="gba:text-[11px] gba:text-muted-foreground/60 group-hover:gba:text-muted-foreground gba:transition-colors gba:whitespace-nowrap">
                    Also save to my Drive
                  </span>
                </label>
              ) : undefined
            }
            section="my-drive"
            t={t}
            data-testid={`${testId}-toolbar`}
          />
        </div>

        <div
          className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:relative"
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
              section="my-drive"
              onItemClick={handleItemClickInternal}
              onFolderClick={f => {
                setFolderId(f.id)
                setPage(1)
              }}
              onToggleFavorite={(type, id, isFav) => drive.toggleFavorite(type, id, isFav)}
              onTrashItem={canEdit ? handleTrashItem : () => {}}
              selectedKeys={selection.selectedKeys}
              onSelect={selection.handleSelect}
              onSelectOnly={selection.selectOnly}
              onMoveToFolder={canEdit ? handleMoveToFolder : undefined}
              onDownloadItem={handleDownload}
              onRenameItem={
                canEdit ? item => setRenameTarget({ id: item.id, name: item.name, isFolder: false }) : undefined
              }
              onRenameFolder={canEdit ? f => setRenameTarget({ id: f.id, name: f.name, isFolder: true }) : undefined}
              onShareItem={handleShareItem}
              onShareFolder={handleShareFolder}
              onAddToMyDrive={handleAddToMyDrive}
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
              onPageChange={setPage}
              data-testid={`${testId}-pagination`}
            />
          )}

          {selection.selectedCount > 0 && canEdit && (
            <div className="gba:sticky gba:bottom-4 gba:flex gba:justify-center gba:pointer-events-none gba:z-20">
              <div className="gba:pointer-events-auto gba:shadow-lg gba:rounded-xl">
                <DriveBulkActions
                  selectedCount={selection.selectedCount}
                  onTrash={handleBulkTrash}
                  onClearSelection={selection.clearSelection}
                  t={t}
                  data-testid={`${testId}-bulk-actions`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <DriveSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={searchQuery}
        onQueryChange={handleSearchQueryChange}
        results={searchResults}
        isSearching={isSearching}
        onSelectResult={handleSearchSelect}
        t={t}
        data-testid={`${testId}-search`}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onConfirm={async name => {
          await drive.createFolder(name, folderId ?? undefined)
          onActivityChange?.()
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
          currentUserId={currentUserId}
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

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        itemNames={pendingDeleteRefs.map(r => r.name)}
        onConfirm={confirmTrash}
        t={t}
        data-testid={`${testId}-delete-confirm`}
      />

      <DriveExternalImportSheet
        open={externalImportOpen}
        onOpenChange={setExternalImportOpen}
        accessToken={accessToken ?? ''}
        currentFolderId={folderId}
        spaceId={spaceId}
        onAfterImport={drive.refresh}
        data-testid={`${testId}-external-import`}
      />
    </div>
  )
}

export default SpaceDrivePanel
