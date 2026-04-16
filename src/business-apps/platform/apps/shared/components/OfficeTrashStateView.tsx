import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Spinner } from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import type { DriveItemType, TrashedDriveItemDetail } from '@/business-apps/core/office/apps/drive/types/drive.types'
import { PermanentDeleteConfirmDialog } from './PermanentDeleteConfirmDialog'

interface OfficeTrashStateViewProps {
  accessToken: string
  entityType: DriveItemType
  entityId: string
  title: string
  description: string
  onBack: () => void
  onRestoreComplete: () => void
  onDeleteComplete: () => void
  'data-testid'?: string
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString()
}

export function OfficeTrashStateView({
  accessToken,
  entityType,
  entityId,
  title,
  description,
  onBack,
  onRestoreComplete,
  onDeleteComplete,
  'data-testid': testId = 'office-trash-state-view'
}: OfficeTrashStateViewProps) {
  const [item, setItem] = useState<TrashedDriveItemDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const loadItem = useCallback(async () => {
    setIsLoading(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      const result = await DriveApiService.getTrashedItem(entityType, entityId)
      setItem(result)
    } catch (error) {
      console.error('[OfficeTrashStateView] Failed to load trashed item:', error)
      toast.error('Failed to load trashed item')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, entityId, entityType])

  useEffect(() => {
    void loadItem()
  }, [loadItem])

  const handleRestore = useCallback(async () => {
    setIsRestoring(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems([{ entityType, entityId }])
      toast.success('Item restored')
      onRestoreComplete()
    } catch (error) {
      console.error('[OfficeTrashStateView] Failed to restore item:', error)
      toast.error('Failed to restore item')
    } finally {
      setIsRestoring(false)
    }
  }, [accessToken, entityId, entityType, onRestoreComplete])

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.deleteTrashedItem(entityType, entityId)
      toast.success('Item deleted permanently')
      setDeleteConfirmOpen(false)
      onDeleteComplete()
    } catch (error) {
      console.error('[OfficeTrashStateView] Failed to delete item:', error)
      toast.error('Failed to delete item permanently')
    } finally {
      setIsDeleting(false)
    }
  }, [accessToken, entityId, entityType, onDeleteComplete])

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <Card className="gba:max-w-3xl gba:mx-auto gba:p-8 gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
        <div>
          <h1 className="gba:text-2xl gba:font-semibold">{title}</h1>
          <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{description}</p>
        </div>

        <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-4">
          <div className="gba:text-sm gba:text-muted-foreground">Name</div>
          <div className="gba:mt-1 gba:font-medium">{item?.name ?? 'Unknown item'}</div>
          <div className="gba:mt-4 gba:text-sm gba:text-muted-foreground">Scheduled auto-delete date</div>
          <div className="gba:mt-1 gba:font-medium">
            {item?.autoDeleteAt ? formatDate(item.autoDeleteAt) : 'Unavailable'}
          </div>
        </div>

        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button variant="secondary" onClick={onBack} disabled={isRestoring || isDeleting}>
            Back
          </Button>
          <Button variant="secondary" onClick={() => void handleRestore()} disabled={isRestoring || isDeleting}>
            {isRestoring ? 'Restoring...' : 'Restore'}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={isRestoring || isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete permanently'}
          </Button>
        </div>
      </Card>
      <PermanentDeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={open => {
          if (!isDeleting) {
            setDeleteConfirmOpen(open)
          }
        }}
        itemName={item?.name}
        onConfirm={() => {
          void handleDelete()
        }}
        isDeleting={isDeleting}
        data-testid={`${testId}-delete-confirm`}
      />
    </>
  )
}
