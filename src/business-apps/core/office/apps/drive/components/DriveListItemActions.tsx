import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Star, Trash2, Download, Pencil, Share2, Plus, ExternalLink } from 'lucide-react'
import type { DriveItem } from '../types/drive.types'

interface DriveListItemActionsProps {
  item: DriveItem
  isTrash: boolean
  onToggleFavorite: (entityType: string, entityId: string, isFav: boolean) => void
  onTrashItem: (item: DriveItem) => void
  onRestoreItem?: (item: DriveItem) => void
  onDownloadItem?: (item: DriveItem) => void
  onRenameItem?: (item: DriveItem) => void
  onShareItem?: (item: DriveItem) => void
  onAddToMyDrive?: (entityType: string, entityId: string) => void
  onRemoveShortcut?: (shortcutId: string) => void
  t: (key: string) => string
  testId: string
}

export const DriveListItemActions: React.FC<DriveListItemActionsProps> = ({
  item,
  isTrash,
  onToggleFavorite,
  onTrashItem,
  onRestoreItem,
  onDownloadItem,
  onRenameItem,
  onShareItem,
  onAddToMyDrive,
  onRemoveShortcut,
  t,
  testId
}) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end gba:w-48">
      {!isTrash && (
        <button
          onClick={e => {
            e.stopPropagation()
            onToggleFavorite(item.type, item.id, !!item.isFavorite)
          }}
          className={`gba:p-1 gba:rounded gba:hover:bg-accent gba:transition-opacity ${item.isFavorite ? 'gba:opacity-100' : 'gba:opacity-0 gba:group-hover:opacity-100'}`}
          data-testid={`${testId}-star-${item.id}`}
        >
          <Star
            className={`gba:w-4 gba:h-4 ${item.isFavorite ? 'gba:text-warning gba:fill-current' : 'gba:text-muted-foreground'}`}
          />
        </button>
      )}
      {!isTrash && onDownloadItem && (
        <button
          onClick={e => {
            e.stopPropagation()
            onDownloadItem(item)
          }}
          className="gba:p-1 gba:rounded gba:hover:bg-accent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
          data-testid={`${testId}-download-${item.id}`}
        >
          <Download className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        </button>
      )}
      {!isTrash && onRenameItem && (
        <button
          onClick={e => {
            e.stopPropagation()
            onRenameItem(item)
          }}
          className="gba:p-1 gba:rounded gba:hover:bg-accent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
          data-testid={`${testId}-rename-${item.id}`}
        >
          <Pencil className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        </button>
      )}
      {!isTrash && onShareItem && (
        <button
          onClick={e => {
            e.stopPropagation()
            onShareItem(item)
          }}
          className="gba:p-1 gba:rounded gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:hover:bg-accent"
          data-testid={`${testId}-share-${item.id}`}
        >
          <Share2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        </button>
      )}
      {isTrash && onRestoreItem && (
        <Button
          size="sm"
          variant="ghost"
          className="gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            onRestoreItem(item)
          }}
          data-testid={`${testId}-restore-${item.id}`}
        >
          {t('action-restore')}
        </Button>
      )}
      {!isTrash && onAddToMyDrive && !item.isShortcut && (
        <button
          onClick={e => {
            e.stopPropagation()
            onAddToMyDrive(item.type, item.id)
          }}
          className="gba:p-1 gba:rounded gba:hover:bg-accent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
          title={t('add-to-my-drive')}
          data-testid={`${testId}-add-drive-${item.id}`}
        >
          <Plus className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        </button>
      )}
      {!isTrash && item.isShortcut && item.shortcutId && onRemoveShortcut && (
        <button
          onClick={e => {
            e.stopPropagation()
            onRemoveShortcut(item.shortcutId!)
          }}
          className="gba:p-1 gba:rounded gba:hover:bg-destructive-secondary gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
          title={t('shortcut-remove')}
          data-testid={`${testId}-remove-shortcut-${item.id}`}
        >
          <ExternalLink className="gba:w-4 gba:h-4 gba:text-destructive" />
        </button>
      )}
      {!isTrash && (
        <button
          onClick={e => {
            e.stopPropagation()
            onTrashItem(item)
          }}
          className="gba:p-1 gba:rounded gba:hover:bg-destructive-secondary gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
          data-testid={`${testId}-trash-${item.id}`}
        >
          <Trash2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
