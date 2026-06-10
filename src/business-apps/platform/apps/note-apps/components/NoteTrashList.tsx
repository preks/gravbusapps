import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { RotateCcw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import type { DriveItem } from '@/business-apps/core/office/apps/drive/types/drive.types'
import { PermanentDeleteConfirmDialog } from '../../shared/components/PermanentDeleteConfirmDialog'
import {
  OfficeTrashListTable,
  OfficeTrashListToolbar,
  type OfficeTrashListControls
} from '../../shared/components/OfficeTrashList'
import translations from '../_i18n'

interface NoteTrashListProps {
  accessToken: string
  currentUserId: string
  searchQuery?: string
  onOpenItem: (item: DriveItem) => void
  onItemsChanged?: () => void
  'data-testid'?: string
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

  const handleSelectAll = useCallback(() => {
    const allIds = sortedItems.map(item => item.id)
    setSelectedIds(prev => (prev.size === allIds.length && allIds.length > 0 ? new Set() : new Set(allIds)))
  }, [sortedItems])

  const handleRequestDelete = useCallback((item: DriveItem) => {
    setDeleteConfirmItem(item)
  }, [])

  const handleDeleteConfirmOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !actionKey?.startsWith('delete:')) {
        setDeleteConfirmItem(null)
      }
    },
    [actionKey]
  )

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmItem) {
      void handleDelete(deleteConfirmItem)
    }
  }, [deleteConfirmItem, handleDelete])

  const listControls = useMemo<OfficeTrashListControls>(
    () => ({
      refreshLabel: t('trash-list-refresh'),
      sortNameLabel: t('trash-list-sort-name'),
      sortTrashedOnLabel: t('trash-list-sort-trashed-on'),
      trashedOnColumnLabel: t('trash-list-trashed-on-column'),
      defaultSortBy: 'trashedAt',
      deleteDialogTitle: t('trash-delete-dialog-title-single'),
      deleteDialogDescriptionFn: (name: string) => t('trash-delete-dialog-description-single', { name }),
      deleteDialogCancel: t('trash-delete-dialog-cancel'),
      deleteDialogConfirm: t('trash-delete-dialog-confirm'),
      deleteDialogDeleting: t('trash-delete-dialog-deleting'),
      restoreLabel: t('trash-list-restore'),
      restoringLabel: t('trash-list-restoring'),
      deleteLabel: t('trash-list-delete'),
      deletingLabel: t('trash-delete-dialog-deleting')
    }),
    [t]
  )

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full">
      <div className="gba:w-full gba:max-w-6xl gba:mx-auto gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
        {/* Toolbar / bulk actions */}
        <div className="gba:mb-4">
          {selectedIds.size > 0 ? (
            <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-bulk-bar`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                data-testid={`${testId}-bulk-clear`}
              >
                <X className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('trash-bulk-selected', { count: selectedIds.size })}
              </Button>
              <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void handleBulkRestore()
                }}
                disabled={isBulkRestoring || isBulkDeleting}
                data-testid={`${testId}-bulk-restore`}
              >
                <RotateCcw className="gba:w-4 gba:h-4 gba:mr-1" />
                {isBulkRestoring ? t('trash-list-restoring') : t('trash-list-restore')}
              </Button>
              <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="gba:text-destructive"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={isBulkRestoring || isBulkDeleting}
                data-testid={`${testId}-bulk-delete`}
              >
                <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('trash-list-delete')}
              </Button>
            </div>
          ) : (
            <OfficeTrashListToolbar
              listControls={listControls}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onRefresh={() => void loadItems()}
              onSortChange={nextSortBy => handleSortChange(nextSortBy)}
              onToggleSortOrder={() => setSortOrder(previous => (previous === 'asc' ? 'desc' : 'asc'))}
              data-testid={testId}
            />
          )}
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
            <OfficeTrashListTable
              items={sortedItems}
              listControls={listControls}
              sortBy={sortBy}
              actionKey={actionKey}
              deleteConfirmItem={deleteConfirmItem}
              onOpenItem={onOpenItem}
              onSortChange={nextSortBy => handleSortChange(nextSortBy)}
              onRestoreItem={item => void handleRestore(item)}
              onRequestDelete={handleRequestDelete}
              onDeleteConfirmOpenChange={handleDeleteConfirmOpenChange}
              onConfirmDelete={handleConfirmDelete}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              data-testid={testId}
            />
          )}
        </div>
      </div>

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
