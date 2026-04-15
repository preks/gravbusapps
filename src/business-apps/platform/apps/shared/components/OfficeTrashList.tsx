import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
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

interface OfficeTrashListProps {
  accessToken: string
  entityType: DriveItemType
  emptyTitle: string
  emptyDescription: string
  layout?: 'cards' | 'list'
  searchQuery?: string
  listControls?: {
    refreshLabel: string
    sortNameLabel: string
    sortTrashedOnLabel: string
    trashedOnColumnLabel: string
    defaultSortBy?: 'name' | 'trashedAt'
    defaultSortOrder?: 'asc' | 'desc'
  }
  onOpenItem?: (item: DriveItem) => void
  onItemsChanged?: () => void
  'data-testid'?: string
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString()
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
  'data-testid': testId = 'office-trash-list'
}: OfficeTrashListProps) {
  const [items, setItems] = useState<DriveItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DriveItem | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'trashedAt'>(listControls?.defaultSortBy ?? 'trashedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(listControls?.defaultSortOrder ?? 'desc')

  const loadItems = useCallback(async () => {
    if (!accessToken) return
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
  }, [accessToken, entityType])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

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

  const handleRestore = useCallback(
    async (item: DriveItem) => {
      setActionKey(`restore:${item.id}`)
      try {
        DriveApiService.setAccessToken(accessToken)
        await DriveApiService.restoreItems([{ entityType: item.type, entityId: item.id }])
        toast.success('Item restored')
        await loadItems()
        onItemsChanged?.()
      } catch (error) {
        console.error('[OfficeTrashList] Failed to restore item:', error)
        toast.error('Failed to restore item')
      } finally {
        setActionKey(null)
      }
    },
    [accessToken, loadItems, onItemsChanged]
  )

  const handleDelete = useCallback(
    async (item: DriveItem) => {
      setActionKey(`delete:${item.id}`)
      try {
        DriveApiService.setAccessToken(accessToken)
        await DriveApiService.deleteTrashedItem(item.type, item.id)
        toast.success('Item deleted permanently')
        await loadItems()
        onItemsChanged?.()
        setDeleteConfirmItem(null)
      } catch (error) {
        console.error('[OfficeTrashList] Failed to delete trashed item:', error)
        toast.error('Failed to delete item permanently')
      } finally {
        setActionKey(null)
      }
    },
    [accessToken, loadItems, onItemsChanged]
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

  if (layout === 'list') {
    return (
      <>
        {listControls ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadItems()}
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
                  onChange={event => handleSortChange(event.target.value as 'name' | 'trashedAt')}
                  className="gba:text-xs gba:bg-transparent gba:border-0 gba:pr-1 gba:py-0.5 gba:text-muted-foreground gba:cursor-pointer focus:gba:outline-none"
                  data-testid={`${testId}-sort-select`}
                >
                  <option value="trashedAt">{listControls.sortTrashedOnLabel}</option>
                  <option value="name">{listControls.sortNameLabel}</option>
                </select>
                <div className="gba:w-px gba:h-4 gba:bg-border/50" />
                <button
                  type="button"
                  onClick={() => setSortOrder(previous => (previous === 'asc' ? 'desc' : 'asc'))}
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
        ) : null}

        {isLoading ? (
          <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
            <Spinner />
          </div>
        ) : sortedItems.length === 0 ? (
          <Card className="gba:p-8 gba:text-center" data-testid={`${testId}-empty`}>
            <h3 className="gba:text-lg gba:font-semibold">{emptyTitle}</h3>
            <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{emptyDescription}</p>
          </Card>
        ) : (
          <div className="gba:w-full" data-testid={testId}>
            <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
              <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                <button
                  type="button"
                  className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-1 gba:bg-transparent gba:border-0 gba:p-0 gba:text-left hover:gba:text-foreground"
                  onClick={() => handleSortChange('name')}
                >
                  {listControls?.sortNameLabel ?? 'Name'}
                  {sortBy === 'name' && <ArrowsDownUpIcon className="gba:w-3 gba:h-3" />}
                </button>
                <div className="gba:w-32 gba:flex-shrink-0">
                  <button
                    type="button"
                    className="gba:flex gba:items-center gba:gap-1 gba:bg-transparent gba:border-0 gba:p-0 gba:text-left hover:gba:text-foreground"
                    onClick={() => handleSortChange('trashedAt')}
                  >
                    {listControls?.trashedOnColumnLabel ?? 'Trashed on'}
                    {sortBy === 'trashedAt' && <ArrowsDownUpIcon className="gba:w-3 gba:h-3" />}
                  </button>
                </div>
                <div className="gba:w-10 gba:flex-shrink-0" />
              </div>
            </div>
            <div className="gba:divide-y gba:divide-border">
              {sortedItems.map(item => {
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
                    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-primary/10 gba:flex-shrink-0">
                        <FileTextIcon size={20} className="gba:text-primary" />
                      </div>
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
                          <DropdownMenuItem
                            onClick={() => void handleRestore(item)}
                            disabled={isRestoring || isDeleting}
                          >
                            <ArrowCounterClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                            {isRestoring ? 'Restoring...' : 'Restore'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gba:text-destructive focus:gba:text-destructive"
                            onClick={() => requestDelete(item)}
                            disabled={isRestoring || isDeleting}
                          >
                            <TrashIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                            {isDeleting ? 'Deleting...' : 'Delete permanently'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <PermanentDeleteConfirmDialog
          open={Boolean(deleteConfirmItem)}
          onOpenChange={handleDeleteConfirmOpenChange}
          itemName={deleteConfirmItem?.name}
          onConfirm={() => {
            if (deleteConfirmItem) {
              void handleDelete(deleteConfirmItem)
            }
          }}
          isDeleting={deleteConfirmItem ? actionKey === `delete:${deleteConfirmItem.id}` : false}
          data-testid={`${testId}-delete-confirm`}
        />
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner />
      </div>
    )
  }

  if (filteredItems.length === 0) {
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
        {filteredItems.map(item => {
          const restoreKey = `restore:${item.id}`
          const deleteKey = `delete:${item.id}`
          const isRestoring = actionKey === restoreKey
          const isDeleting = actionKey === deleteKey

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
                    Open
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => void handleRestore(item)}
                  disabled={isRestoring || isDeleting}
                >
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </Button>
                <Button variant="destructive" onClick={() => requestDelete(item)} disabled={isRestoring || isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete permanently'}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
      <PermanentDeleteConfirmDialog
        open={Boolean(deleteConfirmItem)}
        onOpenChange={handleDeleteConfirmOpenChange}
        itemName={deleteConfirmItem?.name}
        onConfirm={() => {
          if (deleteConfirmItem) {
            void handleDelete(deleteConfirmItem)
          }
        }}
        isDeleting={deleteConfirmItem ? actionKey === `delete:${deleteConfirmItem.id}` : false}
        data-testid={`${testId}-delete-confirm`}
      />
    </>
  )
}
