import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner
} from '@newwork/nw-design-system'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowsDownUpIcon,
  DotsThreeVerticalIcon,
  FileTextIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  TrashIcon,
  UsersIcon
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import { type DriveItem, type DriveItemType } from '@/business-apps/core/office/apps/drive/types/drive.types'
import { PermanentDeleteConfirmDialog } from './PermanentDeleteConfirmDialog'

export type OfficeTrashSortBy = 'name' | 'trashedAt'
export type OfficeTrashSortOrder = 'asc' | 'desc'

export interface OfficeTrashListControls {
  refreshLabel: string
  sortNameLabel: string
  sortTrashedOnLabel: string
  trashedOnColumnLabel: string
  defaultSortBy?: OfficeTrashSortBy
  defaultSortOrder?: OfficeTrashSortOrder
  deleteDialogTitle?: string
  deleteDialogDescriptionFn?: (itemName: string) => string
  deleteDialogCancel?: string
  deleteDialogConfirm?: string
  deleteDialogDeleting?: string
  // Single-item action labels
  restoreLabel?: string
  restoringLabel?: string
  deleteLabel?: string
  deletingLabel?: string
  openLabel?: string
  // Toast messages
  toastRestoredLabel?: string
  toastRestoreFailedLabel?: string
  toastDeletedLabel?: string
  toastDeleteFailedLabel?: string
}

interface OfficeTrashListProps {
  accessToken: string
  entityType: DriveItemType
  emptyTitle: string
  emptyDescription: string
  layout?: 'cards' | 'list'
  searchQuery?: string
  listControls?: OfficeTrashListControls
  onOpenItem?: (item: DriveItem) => void
  onItemsChanged?: () => void
  enabled?: boolean
  'data-testid'?: string
}

interface UseOfficeTrashListOptions {
  accessToken: string
  entityType: DriveItemType
  searchQuery?: string
  onItemsChanged?: () => void
  defaultSortBy?: OfficeTrashSortBy
  defaultSortOrder?: OfficeTrashSortOrder
  enabled?: boolean
  listControls?: OfficeTrashListControls
}

interface OfficeTrashListState {
  isLoading: boolean
  sortedItems: DriveItem[]
  sortBy: OfficeTrashSortBy
  sortOrder: OfficeTrashSortOrder
  actionKey: string | null
  deleteConfirmItem: DriveItem | null
  refresh: () => Promise<void>
  handleSortChange: (nextSortBy: OfficeTrashSortBy) => void
  toggleSortOrder: () => void
  handleRestore: (item: DriveItem) => Promise<void>
  requestDelete: (item: DriveItem) => void
  handleDeleteConfirmOpenChange: (open: boolean) => void
  confirmDelete: () => Promise<void>
}

interface OfficeTrashListToolbarProps {
  listControls: OfficeTrashListControls
  isLoading: boolean
  sortBy: OfficeTrashSortBy
  sortOrder: OfficeTrashSortOrder
  onRefresh: () => void
  onSortChange: (nextSortBy: OfficeTrashSortBy) => void
  onToggleSortOrder: () => void
  'data-testid'?: string
}

interface OfficeTrashListTableProps {
  items: DriveItem[]
  listControls?: OfficeTrashListControls
  sortBy: OfficeTrashSortBy
  actionKey: string | null
  deleteConfirmItem: DriveItem | null
  onOpenItem?: (item: DriveItem) => void
  onSortChange: (nextSortBy: OfficeTrashSortBy) => void
  onRestoreItem: (item: DriveItem) => void
  onRequestDelete: (item: DriveItem) => void
  onDeleteConfirmOpenChange: (open: boolean) => void
  onConfirmDelete: () => void
  renderIcon?: (item: DriveItem) => React.ReactNode
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: () => void
  'data-testid'?: string
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString()
}

export function useOfficeTrashList({
  accessToken,
  entityType,
  searchQuery,
  onItemsChanged,
  defaultSortBy = 'trashedAt',
  defaultSortOrder = 'desc',
  enabled = true,
  listControls
}: UseOfficeTrashListOptions): OfficeTrashListState {
  const [items, setItems] = useState<DriveItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DriveItem | null>(null)
  const [sortBy, setSortBy] = useState<OfficeTrashSortBy>(defaultSortBy)
  const [sortOrder, setSortOrder] = useState<OfficeTrashSortOrder>(defaultSortOrder)

  const refresh = useCallback(async () => {
    if (!accessToken || !enabled) return

    setIsLoading(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      const result = await DriveApiService.listItems({
        section: 'trash',
        type: entityType,
        limit: 200
      })
      setItems(result.items)
    } catch (error) {
      console.error('[OfficeTrashList] Failed to load trash items:', error)
      toast.error('Failed to load trash items')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, entityType])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [enabled, refresh])

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery?.trim().toLowerCase()
    if (!normalizedQuery) return items

    return items.filter(item => item.name.toLowerCase().includes(normalizedQuery))
  }, [items, searchQuery])

  const sortedItems = useMemo(() => {
    const nextItems = [...filteredItems]

    nextItems.sort((left, right) => {
      const comparison =
        sortBy === 'name'
          ? left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
          : new Date(left.trashedAt ?? 0).getTime() - new Date(right.trashedAt ?? 0).getTime()

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return nextItems
  }, [filteredItems, sortBy, sortOrder])

  const handleSortChange = useCallback(
    (nextSortBy: OfficeTrashSortBy) => {
      if (sortBy === nextSortBy) {
        setSortOrder(previous => (previous === 'asc' ? 'desc' : 'asc'))
        return
      }

      setSortBy(nextSortBy)
      setSortOrder(nextSortBy === 'name' ? 'asc' : 'desc')
    },
    [sortBy]
  )

  const toggleSortOrder = useCallback(() => {
    setSortOrder(previous => (previous === 'asc' ? 'desc' : 'asc'))
  }, [])

  const handleRestore = useCallback(
    async (item: DriveItem) => {
      setActionKey(`restore:${item.id}`)
      try {
        DriveApiService.setAccessToken(accessToken)
        await DriveApiService.restoreItems([{ entityType: item.type, entityId: item.id }])
        toast.success(listControls?.toastRestoredLabel ?? 'Item restored')
        await refresh()
        onItemsChanged?.()
      } catch (error) {
        console.error('[OfficeTrashList] Failed to restore item:', error)
        toast.error(listControls?.toastRestoreFailedLabel ?? 'Failed to restore item')
      } finally {
        setActionKey(null)
      }
    },
    [accessToken, onItemsChanged, refresh]
  )

  const handleDelete = useCallback(
    async (item: DriveItem) => {
      setActionKey(`delete:${item.id}`)
      try {
        DriveApiService.setAccessToken(accessToken)
        await DriveApiService.deleteTrashedItem(item.type, item.id)
        toast.success(listControls?.toastDeletedLabel ?? 'Item deleted permanently')
        await refresh()
        onItemsChanged?.()
        setDeleteConfirmItem(null)
      } catch (error) {
        console.error('[OfficeTrashList] Failed to delete trashed item:', error)
        toast.error(listControls?.toastDeleteFailedLabel ?? 'Failed to delete item permanently')
      } finally {
        setActionKey(null)
      }
    },
    [accessToken, onItemsChanged, refresh]
  )

  const requestDelete = useCallback((item: DriveItem) => {
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

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmItem) return
    await handleDelete(deleteConfirmItem)
  }, [deleteConfirmItem, handleDelete])

  return {
    isLoading,
    sortedItems,
    sortBy,
    sortOrder,
    actionKey,
    deleteConfirmItem,
    refresh,
    handleSortChange,
    toggleSortOrder,
    handleRestore,
    requestDelete,
    handleDeleteConfirmOpenChange,
    confirmDelete
  }
}

export function OfficeTrashListToolbar({
  listControls,
  isLoading,
  sortBy,
  sortOrder,
  onRefresh,
  onSortChange,
  onToggleSortOrder,
  'data-testid': testId = 'office-trash-list'
}: OfficeTrashListToolbarProps) {
  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="gba:gap-1.5 gba:h-7 gba:text-xs"
        data-testid={`${testId}-refresh`}
        disabled={isLoading}
      >
        <ArrowClockwiseIcon className={`gba:w-3.5 gba:h-3.5 ${isLoading ? 'gba:animate-spin' : ''}`} />
        {listControls.refreshLabel}
      </Button>

      <div className="gba:ml-auto gba:flex gba:items-center gba:gap-1.5">
        <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:px-1 gba:py-0.5">
          <select
            value={sortBy}
            onChange={event => onSortChange(event.target.value as OfficeTrashSortBy)}
            className="gba:text-xs gba:bg-transparent gba:border-0 gba:pr-1 gba:py-0.5 gba:text-muted-foreground gba:cursor-pointer focus:gba:outline-none"
            data-testid={`${testId}-sort-select`}
          >
            <option value="trashedAt">{listControls.sortTrashedOnLabel}</option>
            <option value="name">{listControls.sortNameLabel}</option>
          </select>
          <div className="gba:w-px gba:h-4 gba:bg-border/50" />
          <button
            type="button"
            onClick={onToggleSortOrder}
            className="gba:p-1 gba:rounded hover:gba:bg-accent gba:text-muted-foreground gba:transition-colors"
            data-testid={`${testId}-sort-order`}
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
  )
}

export function OfficeTrashListTable({
  items,
  listControls,
  sortBy,
  actionKey,
  deleteConfirmItem,
  onOpenItem,
  onSortChange,
  onRestoreItem,
  onRequestDelete,
  onDeleteConfirmOpenChange,
  onConfirmDelete,
  renderIcon,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  'data-testid': testId = 'office-trash-list'
}: OfficeTrashListTableProps) {
  const showSelection = Boolean(selectedIds && onToggleSelect && onSelectAll)

  if (items.length === 0) {
    return null
  }

  return (
    <>
      <div className="gba:w-full" data-testid={testId}>
        <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
          <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
            {showSelection && (
              <div className="gba:w-8 gba:flex-shrink-0">
                <Checkbox
                  checked={items.length > 0 && selectedIds!.size === items.length}
                  onCheckedChange={() => onSelectAll!()}
                />
              </div>
            )}
            <div className="gba:w-8 gba:flex-shrink-0" />
            <button
              type="button"
              className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-1 gba:bg-transparent gba:border-0 gba:p-0 gba:text-left hover:gba:text-foreground"
              onClick={() => onSortChange('name')}
            >
              {listControls?.sortNameLabel ?? 'Name'}
              {sortBy === 'name' && <ArrowsDownUpIcon className="gba:w-3 gba:h-3" />}
            </button>
            <div className="gba:w-32 gba:flex-shrink-0">
              <button
                type="button"
                className="gba:flex gba:items-center gba:gap-1 gba:bg-transparent gba:border-0 gba:p-0 gba:text-left hover:gba:text-foreground"
                onClick={() => onSortChange('trashedAt')}
              >
                {listControls?.trashedOnColumnLabel ?? 'Trashed on'}
                {sortBy === 'trashedAt' && <ArrowsDownUpIcon className="gba:w-3 gba:h-3" />}
              </button>
            </div>
            <div className="gba:w-10 gba:flex-shrink-0" />
          </div>
        </div>
        <div className="gba:divide-y gba:divide-border">
          {items.map(item => {
            const restoreKey = `restore:${item.id}`
            const deleteKey = `delete:${item.id}`
            const isRestoring = actionKey === restoreKey
            const isDeleting = actionKey === deleteKey

            return (
              <div
                key={item.id}
                className={`gba:flex gba:items-center gba:px-4 gba:py-3 gba:transition-colors ${
                  onOpenItem ? 'gba:cursor-pointer hover:gba:bg-muted/30' : ''
                }`}
                onClick={() => onOpenItem?.(item)}
              >
                {showSelection && (
                  <div className="gba:w-8 gba:flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds!.has(item.id)} onCheckedChange={() => onToggleSelect!(item.id)} />
                  </div>
                )}
                <div className="gba:w-8 gba:flex-shrink-0" />
                <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                  {renderIcon ? (
                    renderIcon(item)
                  ) : (
                    <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-primary/10 gba:flex-shrink-0">
                      <FileTextIcon size={20} className="gba:text-primary" />
                    </div>
                  )}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:font-medium gba:text-foreground gba:truncate">{item.name}</div>
                    {item.isShared ? (
                      <Badge
                        variant="outline"
                        className="gba:mt-1 gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:px-1.5 gba:py-0"
                      >
                        <UsersIcon size={10} />
                        Shared
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                  {formatDate(item.trashedAt)}
                </div>
                <div
                  className="gba:w-10 gba:flex-shrink-0 gba:flex gba:justify-end"
                  onClick={event => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gba:h-8 gba:w-8 gba:p-0">
                        <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="gba:w-56">
                      <DropdownMenuItem onClick={() => onRestoreItem(item)} disabled={isRestoring || isDeleting}>
                        <ArrowCounterClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                        {isRestoring
                          ? (listControls?.restoringLabel ?? 'Restoring...')
                          : (listControls?.restoreLabel ?? 'Restore')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gba:text-destructive focus:gba:text-destructive"
                        onClick={() => onRequestDelete(item)}
                        disabled={isRestoring || isDeleting}
                      >
                        <TrashIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                        {isDeleting
                          ? (listControls?.deletingLabel ?? 'Deleting...')
                          : (listControls?.deleteLabel ?? 'Delete permanently')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <PermanentDeleteConfirmDialog
        open={Boolean(deleteConfirmItem)}
        onOpenChange={onDeleteConfirmOpenChange}
        itemNames={deleteConfirmItem ? [deleteConfirmItem.name] : []}
        title={listControls?.deleteDialogTitle}
        description={
          listControls?.deleteDialogDescriptionFn && deleteConfirmItem?.name
            ? listControls.deleteDialogDescriptionFn(deleteConfirmItem.name)
            : undefined
        }
        cancelLabel={listControls?.deleteDialogCancel}
        confirmLabel={listControls?.deleteDialogConfirm}
        deletingLabel={listControls?.deleteDialogDeleting}
        onConfirm={onConfirmDelete}
        isDeleting={deleteConfirmItem ? actionKey === `delete:${deleteConfirmItem.id}` : false}
        data-testid={`${testId}-delete-confirm`}
      />
    </>
  )
}

export function OfficeTrashList({
  accessToken,
  entityType,
  emptyTitle,
  emptyDescription,
  layout = 'cards',
  searchQuery,
  listControls,
  onOpenItem,
  onItemsChanged,
  enabled = true,
  'data-testid': testId = 'office-trash-list'
}: OfficeTrashListProps) {
  const trashList = useOfficeTrashList({
    accessToken,
    entityType,
    searchQuery,
    onItemsChanged,
    enabled,
    defaultSortBy: listControls?.defaultSortBy,
    defaultSortOrder: listControls?.defaultSortOrder
  })

  if (layout === 'list') {
    return (
      <>
        {listControls ? (
          <div className="gba:mb-4">
            <OfficeTrashListToolbar
              listControls={listControls}
              isLoading={trashList.isLoading}
              sortBy={trashList.sortBy}
              sortOrder={trashList.sortOrder}
              onRefresh={() => {
                void trashList.refresh()
              }}
              onSortChange={trashList.handleSortChange}
              onToggleSortOrder={trashList.toggleSortOrder}
              data-testid={testId}
            />
          </div>
        ) : null}

        {trashList.isLoading ? (
          <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
            <Spinner />
          </div>
        ) : trashList.sortedItems.length === 0 ? (
          <Card className="gba:p-8 gba:text-center" data-testid={`${testId}-empty`}>
            <h3 className="gba:text-lg gba:font-semibold">{emptyTitle}</h3>
            <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{emptyDescription}</p>
          </Card>
        ) : (
          <OfficeTrashListTable
            items={trashList.sortedItems}
            listControls={listControls}
            sortBy={trashList.sortBy}
            actionKey={trashList.actionKey}
            deleteConfirmItem={trashList.deleteConfirmItem}
            onOpenItem={onOpenItem}
            onSortChange={trashList.handleSortChange}
            onRestoreItem={item => {
              void trashList.handleRestore(item)
            }}
            onRequestDelete={trashList.requestDelete}
            onDeleteConfirmOpenChange={trashList.handleDeleteConfirmOpenChange}
            onConfirmDelete={() => {
              void trashList.confirmDelete()
            }}
            data-testid={testId}
          />
        )}
      </>
    )
  }

  if (trashList.isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner />
      </div>
    )
  }

  if (trashList.sortedItems.length === 0) {
    return (
      <Card className="gba:p-8 gba:text-center" data-testid={`${testId}-empty`}>
        <h3 className="gba:text-lg gba:font-semibold">{emptyTitle}</h3>
        <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{emptyDescription}</p>
      </Card>
    )
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
        {trashList.sortedItems.map(item => {
          const restoreKey = `restore:${item.id}`
          const deleteKey = `delete:${item.id}`
          const isRestoring = trashList.actionKey === restoreKey
          const isDeleting = trashList.actionKey === deleteKey

          return (
            <Card
              key={item.id}
              className="gba:p-4 gba:flex gba:flex-col gba:gap-3 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between"
            >
              <div className="gba:min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenItem?.(item)}
                  className="gba:text-left gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer"
                  disabled={!onOpenItem}
                >
                  <div className="gba:font-medium gba:text-foreground gba:truncate">{item.name}</div>
                </button>
                <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
                  Trashed on {formatDate(item.trashedAt)}
                </div>
              </div>

              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {onOpenItem ? (
                  <Button variant="secondary" onClick={() => onOpenItem(item)} disabled={isRestoring || isDeleting}>
                    {listControls?.openLabel ?? 'Open'}
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => void trashList.handleRestore(item)}
                  disabled={isRestoring || isDeleting}
                >
                  {isRestoring
                    ? (listControls?.restoringLabel ?? 'Restoring...')
                    : (listControls?.restoreLabel ?? 'Restore')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => trashList.requestDelete(item)}
                  disabled={isRestoring || isDeleting}
                >
                  {isDeleting
                    ? (listControls?.deletingLabel ?? 'Deleting...')
                    : (listControls?.deleteLabel ?? 'Delete permanently')}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
      <PermanentDeleteConfirmDialog
        open={Boolean(trashList.deleteConfirmItem)}
        onOpenChange={trashList.handleDeleteConfirmOpenChange}
        itemNames={trashList.deleteConfirmItem ? [trashList.deleteConfirmItem.name ?? ''] : []}
        onConfirm={() => {
          void trashList.confirmDelete()
        }}
        isDeleting={
          trashList.deleteConfirmItem ? trashList.actionKey === `delete:${trashList.deleteConfirmItem.id}` : false
        }
        data-testid={`${testId}-delete-confirm`}
      />
    </>
  )
}
