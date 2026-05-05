import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { FileText, MoreHorizontal, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react'
import { SortAscendingIcon, SortDescendingIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import type { DriveItem } from '@/business-apps/core/office/apps/drive/types/drive.types'
import { PermanentDeleteConfirmDialog } from '../../shared/components/PermanentDeleteConfirmDialog'
import translations from '../_i18n'

interface NoteTrashListProps {
  accessToken: string
  currentUserId: string
  searchQuery?: string
  onOpenItem: (item: DriveItem) => void
  onItemsChanged?: () => void
  'data-testid'?: string
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString()
}

export function NoteTrashList({
  accessToken,
  currentUserId,
  searchQuery,
  onOpenItem,
  onItemsChanged,
  'data-testid': testId = 'note-trash-list'
}: NoteTrashListProps) {
  const { t } = useTranslation(translations)
  const [items, setItems] = useState<DriveItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DriveItem | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'trashedAt'>('trashedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkRestoring, setIsBulkRestoring] = useState(false)

  const loadItems = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      const result = await DriveApiService.listItems({ section: 'trash', type: 'note', limit: 200 })
      setItems(result.items)
    } catch (error) {
      console.error('[NoteTrashList] Failed to load trash items:', error)
      toast.error(t('trash-list-load-failed'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, t])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const personalItems = useMemo(
    () => items.filter(item => item.ownerId === currentUserId && !item.spaceId),
    [currentUserId, items]
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery?.trim().toLowerCase()
    if (!normalizedQuery) return personalItems
    return personalItems.filter(item => item.name.toLowerCase().includes(normalizedQuery))
  }, [personalItems, searchQuery])

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((left, right) => {
      const comparison =
        sortBy === 'name'
          ? left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
          : new Date(left.trashedAt ?? 0).getTime() - new Date(right.trashedAt ?? 0).getTime()
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredItems, sortBy, sortOrder])

  const handleSortChange = useCallback(
    (nextSortBy: 'name' | 'trashedAt') => {
      if (sortBy === nextSortBy) {
        setSortOrder(previous => (previous === 'asc' ? 'desc' : 'asc'))
        return
      }
      setSortBy(nextSortBy)
      setSortOrder(nextSortBy === 'name' ? 'asc' : 'desc')
    },
    [sortBy]
  )

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleRestore = useCallback(
    async (item: DriveItem) => {
      setActionKey(`restore:${item.id}`)
      try {
        DriveApiService.setAccessToken(accessToken)
        await DriveApiService.restoreItems([{ entityType: 'note', entityId: item.id }])
        toast.success(t('trash-list-item-restored'))
        await loadItems()
        onItemsChanged?.()
      } catch (error) {
        console.error('[NoteTrashList] Failed to restore note:', error)
        toast.error(t('trash-list-item-restore-failed'))
      } finally {
        setActionKey(null)
      }
    },
    [accessToken, loadItems, onItemsChanged, t]
  )

  const handleDelete = useCallback(
    async (item: DriveItem) => {
      setActionKey(`delete:${item.id}`)
      try {
        DriveApiService.setAccessToken(accessToken)
        await DriveApiService.deleteTrashedItem('note', item.id)
        toast.success(t('trash-list-item-deleted'))
        setDeleteConfirmItem(null)
        await loadItems()
        onItemsChanged?.()
      } catch (error) {
        console.error('[NoteTrashList] Failed to permanently delete note:', error)
        toast.error(t('trash-list-item-delete-failed'))
      } finally {
        setActionKey(null)
      }
    },
    [accessToken, loadItems, onItemsChanged, t]
  )

  const handleBulkRestore = useCallback(async () => {
    if (!accessToken || selectedIds.size === 0) return
    const toRestore = sortedItems.filter(item => selectedIds.has(item.id))
    setIsBulkRestoring(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems(toRestore.map(item => ({ entityType: 'note', entityId: item.id })))
      toast.success(t('trash-bulk-restored', { count: toRestore.length }))
      setSelectedIds(new Set())
      await loadItems()
      onItemsChanged?.()
    } catch (error) {
      console.error('[NoteTrashList] Failed to bulk restore notes:', error)
      toast.error(t('trash-list-item-restore-failed'))
    } finally {
      setIsBulkRestoring(false)
    }
  }, [accessToken, loadItems, onItemsChanged, selectedIds, sortedItems, t])

  const handleBulkDelete = useCallback(async () => {
    if (!accessToken || selectedIds.size === 0) return
    const toDelete = sortedItems.filter(item => selectedIds.has(item.id))
    setIsBulkDeleting(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      for (const item of toDelete) {
        await DriveApiService.deleteTrashedItem('note', item.id)
      }
      toast.success(t('trash-bulk-deleted', { count: toDelete.length }))
      setSelectedIds(new Set())
      await loadItems()
      onItemsChanged?.()
    } catch (error) {
      console.error('[NoteTrashList] Failed to bulk delete notes:', error)
      toast.error(t('trash-list-item-delete-failed'))
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteOpen(false)
    }
  }, [accessToken, loadItems, onItemsChanged, selectedIds, sortedItems, t])

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full">
      {/* Toolbar */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:mb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void loadItems()}
          className="gba:gap-1.5 gba:h-7 gba:text-xs"
          disabled={isLoading}
          data-testid={`${testId}-refresh-button`}
        >
          <RefreshCw className={`gba:w-3.5 gba:h-3.5 ${isLoading ? 'gba:animate-spin' : ''}`} />
          {t('trash-list-refresh')}
        </Button>
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:px-1 gba:py-0.5">
            <select
              value={sortBy}
              onChange={event => handleSortChange(event.target.value as 'name' | 'trashedAt')}
              className="gba:text-xs gba:bg-transparent gba:border-0 gba:pr-1 gba:py-0.5 gba:text-muted-foreground gba:cursor-pointer focus:gba:outline-none"
              data-testid={`${testId}-sort-select`}
            >
              <option value="trashedAt">{t('trash-list-sort-trashed-on')}</option>
              <option value="name">{t('trash-list-sort-name')}</option>
            </select>
            <div className="gba:w-px gba:h-4 gba:bg-border/50" />
            <button
              type="button"
              onClick={() => setSortOrder(previous => (previous === 'asc' ? 'desc' : 'asc'))}
              className="gba:p-1 gba:rounded hover:gba:bg-accent gba:text-muted-foreground gba:transition-colors"
              data-testid={`${testId}-sort-order-button`}
            >
              {sortOrder === 'asc' ? (
                <SortAscendingIcon className="gba:w-3.5 gba:h-3.5" />
              ) : (
                <SortDescendingIcon className="gba:w-3.5 gba:h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="gba:flex-1 gba:overflow-auto">
        {sortedItems.length === 0 ? (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4 gba:text-center"
            data-testid={`${testId}-empty`}
          >
            <h3 className="gba:text-lg gba:font-semibold">{t('notes-empty-trash-title')}</h3>
            <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{t('notes-empty-trash-description')}</p>
          </div>
        ) : (
          <div className="gba:w-full gba:px-4 gba:py-2 gba:space-y-px" data-testid={testId}>
            {sortedItems.map(item => {
              const isSelected = selectedIds.has(item.id)
              const restoreKey = `restore:${item.id}`
              const deleteKey = `delete:${item.id}`
              const isRestoring = actionKey === restoreKey
              const isDeleting = actionKey === deleteKey

              return (
                <div
                  key={item.id}
                  className={`gba:group gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl gba:transition-all gba:duration-150 gba:cursor-pointer ${
                    isSelected ? 'gba:bg-primary/8 gba:ring-1 gba:ring-primary/20' : 'hover:gba:bg-muted/40'
                  }`}
                  onClick={() => onOpenItem(item)}
                  data-testid={`${testId}-item-${item.id}`}
                >
                  <div
                    className={`gba:flex-shrink-0 gba:transition-opacity ${isSelected ? 'gba:opacity-100' : 'gba:opacity-60 group-hover:gba:opacity-100'}`}
                    onClick={event => event.stopPropagation()}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => handleToggleSelect(item.id)} />
                  </div>

                  <div className="gba:w-9 gba:h-9 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:bg-card-decorative">
                    <FileText className="gba:w-4 gba:h-4 gba:text-decorative-foreground" />
                  </div>

                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <span className="gba:text-[13px] gba:font-medium gba:text-foreground gba:truncate">
                        {item.name || t('title-untitled')}
                      </span>
                      {item.isShared && (
                        <Badge
                          variant="outline"
                          className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:border-muted-foreground/20"
                        >
                          {t('trash-list-owner-badge')}
                        </Badge>
                      )}
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground/60 gba:truncate gba:mt-0.5">
                      {formatDate(item.trashedAt)}
                    </p>
                  </div>

                  <div
                    className="gba:flex-shrink-0 gba:flex gba:items-center gba:gap-1"
                    onClick={event => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:h-7 gba:w-7 gba:p-0 gba:opacity-50 group-hover:gba:opacity-100 gba:transition-opacity"
                        >
                          <MoreHorizontal className="gba:h-4 gba:w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="gba:w-48">
                        <DropdownMenuItem onClick={() => void handleRestore(item)} disabled={isRestoring || isDeleting}>
                          <RotateCcw className="gba:mr-2 gba:h-4 gba:w-4" />
                          {isRestoring ? t('trash-list-restoring') : t('trash-list-restore')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gba:text-destructive focus:gba:text-destructive"
                          onClick={() => setDeleteConfirmItem(item)}
                          disabled={isRestoring || isDeleting}
                        >
                          <Trash2 className="gba:mr-2 gba:h-4 gba:w-4" />
                          {t('trash-list-delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          className="gba:sticky gba:bottom-4 gba:z-20 gba:mx-auto gba:w-fit gba:flex gba:items-center gba:gap-1.5 gba:px-4 gba:py-2 gba:bg-foreground/90 gba:backdrop-blur-lg gba:text-background gba:rounded-full gba:shadow-xl gba:border gba:border-foreground/10"
          data-testid={`${testId}-bulk-bar`}
        >
          <span className="gba:text-sm gba:font-medium gba:px-2 gba:tabular-nums">
            {t('trash-bulk-selected', { count: selectedIds.size })}
          </span>
          <div className="gba:w-px gba:h-4 gba:bg-background/20 gba:mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void handleBulkRestore()
            }}
            disabled={isBulkRestoring || isBulkDeleting}
            className="gba:gap-1.5 gba:text-background hover:gba:bg-background/10 hover:gba:text-background gba:h-7"
            data-testid={`${testId}-bulk-restore`}
          >
            <RotateCcw className="gba:w-3.5 gba:h-3.5" />
            {isBulkRestoring ? t('trash-list-restoring') : t('trash-list-restore')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={isBulkRestoring || isBulkDeleting}
            className="gba:gap-1.5 gba:text-red-400 hover:gba:bg-red-500/20 hover:gba:text-red-300 gba:h-7"
            data-testid={`${testId}-bulk-delete`}
          >
            <Trash2 className="gba:w-3.5 gba:h-3.5" />
            {t('trash-list-delete')}
          </Button>
          <div className="gba:w-px gba:h-4 gba:bg-background/20 gba:mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedIds(new Set())}
            className="gba:text-background/60 hover:gba:text-background hover:gba:bg-background/10 gba:h-7 gba:w-7"
            data-testid={`${testId}-bulk-clear`}
          >
            <X className="gba:w-3.5 gba:h-3.5" />
          </Button>
        </div>
      )}

      {/* Single-item delete confirmation */}
      <PermanentDeleteConfirmDialog
        open={Boolean(deleteConfirmItem)}
        onOpenChange={open => {
          if (!open && !actionKey?.startsWith('delete:')) {
            setDeleteConfirmItem(null)
          }
        }}
        itemNames={deleteConfirmItem ? [deleteConfirmItem.name] : []}
        title={t('trash-delete-dialog-title-single')}
        description={
          deleteConfirmItem ? t('trash-delete-dialog-description-single', { name: deleteConfirmItem.name }) : undefined
        }
        cancelLabel={t('trash-delete-dialog-cancel')}
        confirmLabel={t('trash-delete-dialog-confirm')}
        deletingLabel={t('trash-delete-dialog-deleting')}
        onConfirm={() => {
          if (deleteConfirmItem) {
            void handleDelete(deleteConfirmItem)
          }
        }}
        isDeleting={Boolean(deleteConfirmItem && actionKey === `delete:${deleteConfirmItem.id}`)}
        data-testid={`${testId}-delete-confirm-dialog`}
      />

      {/* Bulk delete confirmation */}
      <PermanentDeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={open => {
          if (!isBulkDeleting) setBulkDeleteOpen(open)
        }}
        itemNames={sortedItems.filter(item => selectedIds.has(item.id)).map(item => item.name)}
        title={
          selectedIds.size === 1
            ? t('trash-delete-dialog-title-single')
            : t('trash-delete-dialog-title-multiple', { count: selectedIds.size })
        }
        description={
          selectedIds.size === 1
            ? t('trash-delete-dialog-description-single', {
                name: sortedItems.find(item => selectedIds.has(item.id))?.name ?? ''
              })
            : t('trash-delete-dialog-description-multiple', { count: selectedIds.size })
        }
        cancelLabel={t('trash-delete-dialog-cancel')}
        confirmLabel={t('trash-delete-dialog-confirm')}
        deletingLabel={t('trash-delete-dialog-deleting')}
        onConfirm={() => {
          void handleBulkDelete()
        }}
        isDeleting={isBulkDeleting}
        data-testid={`${testId}-bulk-delete-confirm-dialog`}
      />
    </div>
  )
}
