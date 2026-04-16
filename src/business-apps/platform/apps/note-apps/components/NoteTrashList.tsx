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
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  FileTextIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  TrashIcon
} from '@phosphor-icons/react'
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

  const loadItems = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      const result = await DriveApiService.listItems({
        section: 'trash',
        type: 'note',
        limit: 200
      })
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
    if (!normalizedQuery) {
      return personalItems
    }

    return personalItems.filter(item => item.name.toLowerCase().includes(normalizedQuery))
  }, [personalItems, searchQuery])

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

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void loadItems()}
          className="gba:gap-1.5 gba:h-7 gba:text-xs"
          data-testid={`${testId}-refresh-button`}
          disabled={isLoading}
        >
          <ArrowClockwiseIcon className={`gba:w-3.5 gba:h-3.5 ${isLoading ? 'gba:animate-spin' : ''}`} />
          {t('trash-list-refresh')}
        </Button>

        <div className="gba:ml-auto gba:flex gba:items-center gba:gap-1.5">
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

      {sortedItems.length === 0 ? (
        <Card className="gba:p-8 gba:text-center" data-testid={`${testId}-empty`}>
          <h3 className="gba:text-lg gba:font-semibold">{t('empty-trash-title')}</h3>
          <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{t('empty-trash-description')}</p>
        </Card>
      ) : (
        <div className="gba:w-full" data-testid={testId}>
          <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
            <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
              <button
                type="button"
                className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-1 gba:bg-transparent gba:border-0 gba:p-0 gba:text-left hover:gba:text-foreground"
                onClick={() => handleSortChange('name')}
                data-testid={`${testId}-name-column-button`}
              >
                {t('trash-list-sort-name')}
              </button>
              <div className="gba:w-32 gba:flex-shrink-0">
                <button
                  type="button"
                  className="gba:flex gba:items-center gba:gap-1 gba:bg-transparent gba:border-0 gba:p-0 gba:text-left hover:gba:text-foreground"
                  onClick={() => handleSortChange('trashedAt')}
                  data-testid={`${testId}-trashed-on-column-button`}
                >
                  {t('trash-list-trashed-on-column')}
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
                  className="gba:flex gba:items-center gba:px-4 gba:py-3 gba:transition-colors gba:cursor-pointer hover:gba:bg-muted/30"
                  onClick={() => onOpenItem(item)}
                  data-testid={`${testId}-item-${item.id}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-primary/10 gba:flex-shrink-0">
                      <FileTextIcon size={20} className="gba:text-primary" />
                    </div>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:font-medium gba:text-foreground gba:truncate">{item.name}</div>
                      <Badge variant="outline" className="gba:mt-1 gba:inline-flex gba:text-[10px]">
                        {t('trash-list-owner-badge')}
                      </Badge>
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
                        <DropdownMenuItem onClick={() => void handleRestore(item)} disabled={isRestoring || isDeleting}>
                          <ArrowCounterClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                          {isRestoring ? t('trash-list-restoring') : t('trash-list-restore')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gba:text-destructive focus:gba:text-destructive"
                          onClick={() => setDeleteConfirmItem(item)}
                          disabled={isRestoring || isDeleting}
                        >
                          <TrashIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                          {t('trash-list-delete')}
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
        onOpenChange={open => {
          if (!open && !actionKey?.startsWith('delete:')) {
            setDeleteConfirmItem(null)
          }
        }}
        itemName={deleteConfirmItem?.name}
        onConfirm={() => {
          if (deleteConfirmItem) {
            void handleDelete(deleteConfirmItem)
          }
        }}
        isDeleting={Boolean(deleteConfirmItem && actionKey === `delete:${deleteConfirmItem.id}`)}
        data-testid={`${testId}-delete-confirm-dialog`}
      />
    </>
  )
}
