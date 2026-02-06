/**
 * SpaceFolderGrid
 *
 * Shows immediate child folders for the current folder.
 * Modern card design with subtle hover effects.
 */

import React, { useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Folder, Plus, ChevronRight } from 'lucide-react'
import type { SpaceFolder } from '../types/space.types'

export interface SpaceFolderGridProps {
  folders: SpaceFolder[]
  parentId: string | null
  canEdit: boolean
  onOpenFolder: (folderId: string) => void
  onCreateFolder: (parentId: string | null) => void
  onDropItem?: (item: any, folderId: string) => void
  'data-testid'?: string
}

function sortFolders(a: SpaceFolder, b: SpaceFolder): number {
  if (a.position !== b.position) return a.position - b.position
  return a.name.localeCompare(b.name)
}

export const SpaceFolderGrid: React.FC<SpaceFolderGridProps> = ({
  folders,
  parentId,
  canEdit,
  onOpenFolder,
  onCreateFolder,
  onDropItem,
  'data-testid': testId = 'space-folder-grid'
}) => {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  const visible = useMemo(() => {
    const pid = parentId ?? null
    return folders.filter(f => (f.parentId ?? null) === pid).sort(sortFolders)
  }, [folders, parentId])

  if (visible.length === 0 && !canEdit) {
    return null
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Folders</h3>
          {visible.length > 0 && (
            <span className="gba:text-xs gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded-full">
              {visible.length}
            </span>
          )}
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="gba:gap-1.5 gba:h-8 gba:text-muted-foreground gba:hover:text-foreground"
            onClick={() => onCreateFolder(parentId)}
            data-testid={`${testId}-new-folder`}
          >
            <Plus className="gba:w-4 gba:h-4" />
            New folder
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="gba:rounded-xl gba:border gba:border-dashed gba:border-border/60 gba:p-8 gba:text-center gba:bg-muted/20">
          <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-3">
            <Folder className="gba:w-6 gba:h-6 gba:text-muted-foreground/50" />
          </div>
          <p className="gba:text-sm gba:text-muted-foreground">No folders here yet</p>
          <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">Create a folder to organize your content</p>
        </div>
      ) : (
        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-3">
          {visible.map(folder => {
            const isDragOver = dragOverFolderId === folder.id

            return (
              <button
                key={folder.id}
                type="button"
                onDragOver={e => {
                  if (onDropItem) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverFolderId(folder.id)
                  }
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOverFolderId(null)
                  if (onDropItem) {
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('application/json'))
                      // Handle both single items and arrays of items
                      const items = Array.isArray(data) ? data : [data]
                      items.forEach(item => onDropItem(item, folder.id))
                    } catch (err) {
                      console.error('Failed to parse dropped item:', err)
                    }
                  }
                }}
                className={`gba:group gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-xl gba:border gba:border-border/50 gba:bg-card gba:text-left gba:transition-all gba:duration-150 ${
                  isDragOver
                    ? 'gba:border-primary gba:bg-primary/10 gba:shadow-md'
                    : 'gba:hover:border-primary/30 gba:hover:bg-primary/5 gba:hover:shadow-sm'
                }`}
                onClick={() => onOpenFolder(folder.id)}
                data-testid={`${testId}-folder-${folder.id}`}
              >
                <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-warning/10 gba:flex gba:items-center gba:justify-center gba:transition-colors gba:group-hover:bg-warning/20">
                  <Folder className="gba:w-5 gba:h-5 gba:text-warning" />
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:group-hover:text-primary">
                    {folder.name}
                  </p>
                  <p className="gba:text-xs gba:text-muted-foreground">Folder</p>
                </div>
                <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground/50 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SpaceFolderGrid
