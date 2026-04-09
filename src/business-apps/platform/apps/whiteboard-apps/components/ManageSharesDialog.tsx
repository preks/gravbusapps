import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  useTranslation
} from '@newwork/nw-design-system'
import { WhiteboardApiService } from '../services/WhiteboardApiService'
import translations from '../_i18n'

interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  whiteboardId: string
  accessToken: string
  currentUserId: string
  'data-testid'?: string
}

export const ManageSharesDialog: React.FC<ManageSharesDialogProps> = ({
  open,
  onOpenChange,
  whiteboardId,
  accessToken,
  currentUserId,
  'data-testid': testId = 'manage-shares-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !whiteboardId) return
    setIsLoading(true)
    WhiteboardApiService.getSharedUsers(accessToken, whiteboardId)
      .then(result => setUsers(result as any[]))
      .catch(() => setUsers([]))
      .finally(() => setIsLoading(false))
  }, [open, whiteboardId, accessToken])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{t('whiteboard-manage-shares-title')}</DialogTitle>
          <DialogDescription>{t('whiteboard-manage-shares-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-3 gba:max-h-64 gba:overflow-y-auto">
          {isLoading && <div className="gba:text-sm gba:text-muted-foreground">Loading...</div>}
          {!isLoading && users.length === 0 && (
            <div className="gba:text-sm gba:text-muted-foreground">No shared users</div>
          )}
          {users.map((user: any) => (
            <div key={user.userId} className="gba:flex gba:items-center gba:justify-between gba:gap-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Avatar className="gba:h-8 gba:w-8">
                  <AvatarFallback className="gba:text-xs">
                    {(user.userName || user.userId || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="gba:text-sm gba:font-medium">{user.userName || user.userId}</div>
                  {user.userId === currentUserId && (
                    <span className="gba:text-xs gba:text-muted-foreground">{t('whiteboard-you')}</span>
                  )}
                </div>
              </div>
              <Badge variant="outline">{user.permission || 'view'}</Badge>
            </div>
          ))}
        </div>

        <div className="gba:flex gba:justify-end gba:pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-close`}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
