/**
 * SpaceDriveView
 *
 * Folder-driven content browser inside a Space (shared drive model).
 * Modern, sleek design following NEWWORK design system.
 */

import React, { useMemo, useState, useCallback } from 'react'
import type { Space, SpaceContentItem } from '../types/space.types'
import { SpaceFolderSidebar } from './SpaceFolderSidebar'
import { SpaceBreadcrumbs } from './SpaceBreadcrumbs'
import { SpaceFolderGrid } from './SpaceFolderGrid'
import { SpaceContent } from './SpaceContent'
import { SpaceFolderNameDialog } from './SpaceFolderNameDialog'
import { MoveToFolderDialog } from './MoveToFolderDialog'
import { useSpaceFolders } from '../hooks/useSpaceFolders'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { AlertTriangle, HardDrive } from 'lucide-react'

export interface SpaceDriveViewProps {
  spaceId: string
  accessToken: string | undefined
  space: Space | null
  items: SpaceContentItem[]
  isLoading?: boolean
  canEdit: boolean
  onItemClick: (item: SpaceContentItem) => void
  onMoveItemToFolder: (item: SpaceContentItem, folderId: string | null) => Promise<void>
  onRemoveContent?: (item: SpaceContentItem) => void
  'data-testid'?: string
}

export const SpaceDriveView: React.FC<SpaceDriveViewProps> = ({
  spaceId,
  accessToken,
  space,
  items,
  isLoading = false,
  canEdit,
  onItemClick,
  onMoveItemToFolder,
  onRemoveContent,
  'data-testid': testId = 'space-drive-view'
}) => {
  const { folders, createFolder, updateFolder, deleteFolder, isSupported, error } = useSpaceFolders(
    spaceId,
    accessToken,
    space
  )

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null)

  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [moveItems, setMoveItems] = useState<SpaceContentItem[]>([])

  const folderById = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders])

  const visibleItems = useMemo(() => {
    if (!selectedFolderId) return items.filter(i => !i.folderId)
    return items.filter(i => i.folderId === selectedFolderId)
  }, [items, selectedFolderId])

  const handleSelectRoot = useCallback(() => {
    setSelectedFolderId(null)
  }, [])

  const handleSelectFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId)
  }, [])

  const handleCreateFolder = useCallback(
    (parentId?: string | null) => {
      if (!canEdit) return
      setCreateParentId(parentId ?? null)
      setCreateDialogOpen(true)
    },
    [canEdit]
  )

  const handleRenameFolder = useCallback(
    (folderId: string) => {
      if (!canEdit) return
      setRenameFolderId(folderId)
      setRenameDialogOpen(true)
    },
    [canEdit]
  )

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      if (!canEdit) return
      const folder = folderById.get(folderId)
      const ok = confirm(`Delete folder "${folder?.name ?? 'Folder'}"? Items will move to the parent/root.`)
      if (!ok) return
      const success = await deleteFolder(folderId)
      if (success && selectedFolderId === folderId) {
        setSelectedFolderId(null)
      }
    },
    [canEdit, deleteFolder, folderById, selectedFolderId]
  )

  const handleMoveToFolderClick = useCallback(
    (item: SpaceContentItem) => {
      if (!canEdit) return
      setMoveItems([item])
      setMoveDialogOpen(true)
    },
    [canEdit]
  )

  const handleMoveMultipleToFolder = useCallback(
    (items: SpaceContentItem[]) => {
      if (!canEdit || items.length === 0) return
      setMoveItems(items)
      setMoveDialogOpen(true)
    },
    [canEdit]
  )

  const currentFolderName = useMemo(() => {
    if (!selectedFolderId) return 'Root directory'
    return folderById.get(selectedFolderId)?.name ?? 'Folder'
  }, [folderById, selectedFolderId])

  const itemCount = visibleItems.length
  const folderCount = folders.filter(f => (f.parentId ?? null) === selectedFolderId).length

  return (
    <div
      className="gba:flex gba:w-full gba:min-h-[600px] gba:bg-background gba:rounded-xl gba:border gba:border-border/50 gba:overflow-hidden"
      data-testid={testId}
    >
      <SpaceFolderSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        canEdit={canEdit}
        onSelectRoot={handleSelectRoot}
        onSelectFolder={handleSelectFolder}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        data-testid={`${testId}-sidebar`}
      />

      <div className="gba:flex-1 gba:min-w-0 gba:flex gba:flex-col">
        {/* Header area */}
        <div className="gba:px-6 gba:pt-6 gba:pb-4 gba:border-b gba:border-border/50 gba:bg-muted/20">
          {!isSupported && (
            <Alert className="gba:mb-4" data-testid={`${testId}-folders-not-supported`}>
              <AlertTriangle className="gba:h-4 gba:w-4" />
              <AlertDescription>
                Folders are not available on the backend instance you're connected to yet. Once the updated
                document-service is running (with migrations applied), folders will work here.
              </AlertDescription>
            </Alert>
          )}
          {isSupported && error && (
            <Alert className="gba:mb-4" data-testid={`${testId}-folders-error`}>
              <AlertTriangle className="gba:h-4 gba:w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                  <HardDrive className="gba:w-5 gba:h-5 gba:text-primary" />
                </div>
                <div>
                  <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:tracking-tight">
                    {currentFolderName}
                  </h2>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {folderCount > 0 && `${folderCount} folder${folderCount !== 1 ? 's' : ''}`}
                    {folderCount > 0 && itemCount > 0 && ' · '}
                    {itemCount > 0 && `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
                    {itemCount === 0 && folderCount === 0 && 'Empty'}
                  </p>
                </div>
              </div>
              <SpaceBreadcrumbs
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectRoot={handleSelectRoot}
                onSelectFolder={handleSelectFolder}
                data-testid={`${testId}-breadcrumbs`}
              />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="gba:flex-1 gba:p-6 gba:space-y-6 gba:overflow-y-auto">
          <SpaceFolderGrid
            folders={folders}
            parentId={selectedFolderId}
            canEdit={canEdit}
            onOpenFolder={handleSelectFolder}
            onCreateFolder={pid => handleCreateFolder(pid)}
            onDropItem={async (item, folderId) => {
              await onMoveItemToFolder(item, folderId)
            }}
            data-testid={`${testId}-folder-grid`}
          />

          <SpaceContent
            items={visibleItems}
            isLoading={isLoading}
            onItemClick={onItemClick}
            onMoveToFolderClick={canEdit ? handleMoveToFolderClick : undefined}
            onMoveMultipleToFolder={canEdit ? handleMoveMultipleToFolder : undefined}
            onRemoveContent={canEdit ? onRemoveContent : undefined}
            data-testid={`${testId}-content`}
          />
        </div>
      </div>

      {/* Create */}
      <SpaceFolderNameDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="New folder"
        description={createParentId ? 'Create a subfolder' : 'Create a folder in the drive root'}
        confirmLabel="Create"
        onConfirm={async name => {
          await createFolder({ name, ...(createParentId ? { parentId: createParentId } : {}) })
        }}
        data-testid={`${testId}-create-folder`}
      />

      {/* Rename */}
      <SpaceFolderNameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        title="Rename folder"
        initialName={renameFolderId ? (folderById.get(renameFolderId)?.name ?? '') : ''}
        confirmLabel="Rename"
        onConfirm={async name => {
          if (!renameFolderId) return
          await updateFolder(renameFolderId, { name })
        }}
        data-testid={`${testId}-rename-folder`}
      />

      {/* Move */}
      {moveItems.length > 0 && (
        <MoveToFolderDialog
          open={moveDialogOpen}
          onOpenChange={open => {
            setMoveDialogOpen(open)
            if (!open) setMoveItems([])
          }}
          folders={folders}
          itemLabel={
            moveItems.length === 1
              ? moveItems[0].title
                ? `"${moveItems[0].title}"`
                : 'this item'
              : `${moveItems.length} items`
          }
          onMove={async folderId => {
            // Move all selected items
            for (const item of moveItems) {
              await onMoveItemToFolder(item, folderId)
            }
          }}
          data-testid={`${testId}-move-to-folder`}
        />
      )}
    </div>
  )
}

export default SpaceDriveView
