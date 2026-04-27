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
  AvatarImage,
  AvatarFallback,
  useTranslation
} from '@newwork/nw-design-system'
import { WhiteboardApiService } from '../services/WhiteboardApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEES_LIGHT_BY_USER_IDS } from '@/common/data/employee/queries/employeeQueries'
import translations from '../_i18n'

interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  whiteboardId: string
  accessToken: string
  currentUserId: string
  'data-testid'?: string
}

interface ResolvedUser {
  userId: string
  permission: string
  displayName?: string
  avatar?: string
  isLoading: boolean
}

function normalizeAvatar(raw?: string | null): string | undefined {
  if (!raw) return undefined
  return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
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
  const [users, setUsers] = useState<ResolvedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!open || !whiteboardId) return
    let cancelled = false
    setIsLoading(true)

    const loadAndResolve = async () => {
      try {
        const rawUsers = (await WhiteboardApiService.getSharedUsers(accessToken, whiteboardId)) as Array<{
          userId: string
          userName?: string
          permission?: string
        }>

        const placeholders: ResolvedUser[] = rawUsers.map(u => ({
          userId: u.userId,
          permission: u.permission || 'view',
          displayName: u.userName,
          isLoading: true
        }))
        if (!cancelled) setUsers(placeholders)

        const userIds = rawUsers.map(u => u.userId).filter(Boolean)
        if (userIds.length > 0 && graphqlClient) {
          try {
            const query = GET_EMPLOYEES_LIGHT_BY_USER_IDS(userIds)
            const result = await graphqlClient.request<{
              Employee: Array<{
                userId: string
                displayName: string
                firstName?: string
                lastName?: string
                pictureThumbnail?: string
              }>
            }>(query)

            if (!cancelled) {
              const empMap = new Map(
                (result?.Employee || []).map(emp => [
                  emp.userId,
                  {
                    displayName:
                      emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || undefined,
                    avatar: normalizeAvatar(emp.pictureThumbnail)
                  }
                ])
              )

              setUsers(prev =>
                prev.map(u => ({
                  ...u,
                  displayName: empMap.get(u.userId)?.displayName || u.displayName,
                  avatar: empMap.get(u.userId)?.avatar,
                  isLoading: false
                }))
              )
            }
          } catch (err) {
            console.error('[ManageSharesDialog] Failed to resolve user info:', err)
            if (!cancelled) setUsers(prev => prev.map(u => ({ ...u, isLoading: false })))
          }
        } else if (!cancelled) {
          setUsers(prev => prev.map(u => ({ ...u, isLoading: false })))
        }
      } catch {
        if (!cancelled) setUsers([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadAndResolve()
    return () => {
      cancelled = true
    }
  }, [open, whiteboardId, accessToken, graphqlClient])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-lg gba:max-h-[90vh] gba:flex gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle>{t('whiteboard-manage-shares-title')}</DialogTitle>
          <DialogDescription>{t('whiteboard-manage-shares-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-2 gba:py-2 gba:overflow-y-auto gba:flex-1 gba:-mx-6 gba:px-6">
          {isLoading && <div className="gba:text-sm gba:text-muted-foreground">Loading...</div>}
          {!isLoading && users.length === 0 && (
            <div className="gba:text-sm gba:text-muted-foreground">No shared users</div>
          )}
          {users.map(user => {
            const name = user.displayName || `User ${user.userId.slice(0, 8)}`
            return (
              <div key={user.userId} className="gba:flex gba:items-center gba:gap-2 gba:p-2">
                <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                  {user.avatar && <AvatarImage src={user.avatar} />}
                  <AvatarFallback className="gba:text-xs">{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:truncate">{name}</div>
                  {user.userId === currentUserId && (
                    <span className="gba:text-xs gba:text-muted-foreground">{t('whiteboard-you')}</span>
                  )}
                </div>
                <Badge variant="outline" className="gba:flex-shrink-0">
                  {user.permission}
                </Badge>
              </div>
            )
          })}
        </div>

        <div className="gba:flex gba:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-close`}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
