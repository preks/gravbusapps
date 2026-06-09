import React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import type { Room } from '../types'

type TranslationFn = (key: string) => string

interface DeleteRoomDialogProps {
  open: boolean
  room: Room | null
  isDeleting: boolean
  t: TranslationFn
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export const DeleteRoomDialog: React.FC<DeleteRoomDialogProps> = ({
  open,
  room,
  isDeleting,
  t,
  onOpenChange,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid="workplace-room-delete-dialog">
        <DialogHeader>
          <DialogTitle>{t('workplace-room-delete-title')}</DialogTitle>
          <DialogDescription>{t('workplace-room-delete-description')}</DialogDescription>
        </DialogHeader>

        {room && (
          <div className="gba:rounded-lg gba:bg-muted/30 gba:p-3" data-testid="workplace-room-delete-summary">
            <p className="gba:text-sm">{room.name}</p>
            <p className="gba:text-xs gba:text-muted-foreground">{room.code}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            data-testid="workplace-room-delete-no-button"
          >
            {t('workplace-room-delete-no')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting || !room}
            data-testid="workplace-room-delete-yes-button"
          >
            {isDeleting ? t('workplace-room-deleting') : t('workplace-room-delete-yes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
