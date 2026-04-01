// Browse personal Drive and add selected items to a Space via shortcuts.

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Button, Checkbox, toast } from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Loader2,
  Search,
  Folder,
  FileText,
  StickyNote,
  Table2,
  Presentation,
  File,
  ChevronRight,
  Plus
} from 'lucide-react'
import type { DriveSearchResult, DriveSortBy } from '../types/drive.types'
import { DriveApiService } from '../services/DriveApiService'
import { useDrive } from '../hooks/useDrive'

export interface AddFromDriveStepProps {
  accessToken: string
  spaceId: string
  targetFolderId: string | null
  onBack: () => void
  onComplete: () => void
  'data-testid'?: string
}

const ITEM_TYPE_ICON: Record<string, React.FC<{ className?: string }>> = {
  document: FileText,
  note: StickyNote,
  spreadsheet_app: Table2,
  slide: Presentation,
  drive_file: File,
  drive_folder: Folder
}

function getItemIcon(type: string) {
  return ITEM_TYPE_ICON[type] ?? File
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const AddFromDriveStep: React.FC<AddFromDriveStepProps> = ({
  accessToken,
  spaceId,
  targetFolderId,
  onBack,
  onComplete,
  'data-testid': testId = 'add-from-drive-step'
}) => {
  const [folderId, setFolderId] = useState<string | null>(null)
  const [sortBy] = useState<DriveSortBy>('updatedAt')
  const [page, setPage] = useState(1)

  const drive = useDrive({
    accessToken,
    section: 'my-drive',
    folderId,
    sortBy,
    sortOrder: 'DESC',
    page,
    limit: 20
  })

  const [selected, setSelected] = useState<Map<string, { entityType: string; entityId: string; name: string }>>(
    new Map()
  )
  const [isAdding, setIsAdding] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DriveSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (q.trim().length < 2) {
      setSearchResults([])
      setSearchMode(false)
      return
    }
    setSearchMode(true)
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await DriveApiService.search(q, undefined, 30)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [])

  const toggleSelect = useCallback((entityType: string, entityId: string, name: string) => {
    setSelected(prev => {
      const key = `${entityType}:${entityId}`
      const next = new Map(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.set(key, { entityType, entityId, name })
      }
      return next
    })
  }, [])

  const isSelected = useCallback(
    (entityType: string, entityId: string) => selected.has(`${entityType}:${entityId}`),
    [selected]
  )

  const handleAddToSpace = useCallback(async () => {
    if (selected.size === 0) return
    setIsAdding(true)
    DriveApiService.setAccessToken(accessToken)
    let successCount = 0
    let failCount = 0
    for (const { entityType, entityId } of selected.values()) {
      try {
        await DriveApiService.createShortcut(entityType, entityId, targetFolderId, spaceId)
        successCount++
      } catch {
        failCount++
      }
    }
    setIsAdding(false)
    if (successCount > 0) {
      toast.success(`Added ${successCount} item${successCount > 1 ? 's' : ''} to Space Drive`)
    }
    if (failCount > 0) {
      toast.error(`Failed to add ${failCount} item${failCount > 1 ? 's' : ''}`)
    }
    if (successCount > 0) {
      onComplete()
    }
  }, [selected, accessToken, targetFolderId, spaceId, onComplete])

  const navigateToFolder = useCallback((id: string | null) => {
    setFolderId(id)
    setPage(1)
  }, [])

  const displayItems = useMemo(() => {
    if (searchMode) {
      return searchResults.map(r => ({
        id: r.id,
        type: r.type,
        name: r.name ?? r.id,
        fileSize: undefined as number | undefined,
        isFolder: r.type === 'drive_folder'
      }))
    }
    const folders: Array<{ id: string; type: string; name: string; fileSize?: number; isFolder: boolean }> =
      drive.folders.map(f => ({ id: f.id, type: 'drive_folder', name: f.name, isFolder: true }))
    const items = drive.items.map(i => ({
      id: i.id,
      type: i.type,
      name: i.name,
      fileSize: i.fileSize,
      isFolder: false
    }))
    return [...folders, ...items]
  }, [searchMode, searchResults, drive.folders, drive.items])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-4 gba:h-4" />
        </Button>
        <span className="gba:text-sm gba:font-medium">My Drive</span>
      </div>

      {!searchMode && drive.breadcrumbs.length > 0 && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:mb-3 gba:flex-wrap">
          <button
            className="gba:hover:text-foreground gba:transition-colors gba:underline-offset-2 hover:gba:underline"
            onClick={() => navigateToFolder(null)}
          >
            My Drive
          </button>
          {drive.breadcrumbs.map(crumb => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="gba:w-3 gba:h-3 gba:shrink-0" />
              <button
                className="gba:hover:text-foreground gba:transition-colors gba:underline-offset-2 hover:gba:underline gba:truncate gba:max-w-[120px]"
                onClick={() => navigateToFolder(crumb.id)}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="gba:relative gba:mb-3">
        <Search className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/60" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search in my Drive..."
          className="gba:w-full gba:pl-8 gba:pr-3 gba:py-2 gba:text-sm gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/30 gba:placeholder:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-1 focus:gba:ring-primary/40 focus:gba:border-primary/40"
          data-testid={`${testId}-search-input`}
        />
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:min-h-0 gba:-mx-4 gba:px-4">
        {drive.isLoading || isSearching ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Loader2 className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:animate-spin" />
            <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">
              {isSearching ? 'Searching...' : 'Loading...'}
            </span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:text-center">
            <File className="gba:w-8 gba:h-8 gba:text-muted-foreground/40 gba:mb-2" />
            <p className="gba:text-sm gba:text-muted-foreground">
              {searchMode ? 'No results found' : 'This folder is empty'}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-0.5">
            {displayItems.map(item => {
              const Icon = getItemIcon(item.type)
              const checked = isSelected(item.type, item.id)

              return (
                <div
                  key={`${item.type}:${item.id}`}
                  className={`gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:transition-colors gba:cursor-pointer ${
                    checked ? 'gba:bg-primary/5 gba:ring-1 gba:ring-primary/20' : 'hover:gba:bg-muted/50'
                  }`}
                  onClick={() => {
                    if (item.isFolder && !searchMode) {
                      navigateToFolder(item.id)
                    } else {
                      toggleSelect(item.type, item.id, item.name)
                    }
                  }}
                  data-testid={`${testId}-item-${item.id}`}
                >
                  {!item.isFolder || searchMode ? (
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSelect(item.type, item.id, item.name)}
                      onClick={e => e.stopPropagation()}
                      className="gba:shrink-0"
                    />
                  ) : (
                    <div className="gba:w-4 gba:shrink-0" />
                  )}
                  <Icon
                    className={`gba:w-4 gba:h-4 gba:shrink-0 ${
                      item.isFolder ? 'gba:text-amber-500' : 'gba:text-muted-foreground'
                    }`}
                  />
                  <span className="gba:text-sm gba:truncate gba:flex-1">{item.name}</span>
                  {item.fileSize != null && (
                    <span className="gba:text-[11px] gba:text-muted-foreground/60 gba:shrink-0">
                      {formatSize(item.fileSize)}
                    </span>
                  )}
                  {item.isFolder && !searchMode && (
                    <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/40 gba:shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!searchMode && drive.totalPages > 1 && (
          <div className="gba:flex gba:justify-center gba:gap-2 gba:py-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="gba:text-xs"
            >
              Previous
            </Button>
            <span className="gba:text-xs gba:text-muted-foreground gba:self-center">
              {page} / {drive.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= drive.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="gba:text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <div className="gba:border-t gba:border-border/50 gba:pt-3 gba:mt-3 gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-xs gba:text-muted-foreground">
          {selected.size > 0 ? `${selected.size} item${selected.size > 1 ? 's' : ''} selected` : 'Select files to add'}
        </span>
        <Button
          size="sm"
          disabled={selected.size === 0 || isAdding}
          onClick={handleAddToSpace}
          data-testid={`${testId}-confirm`}
        >
          {isAdding ? (
            <>
              <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin gba:mr-1.5" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
              Add {selected.size > 0 ? `${selected.size} ` : ''}to Space
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
