import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Label } from '@newwork/nw-design-system'
import { Gear, Trash, UsersThree } from '@phosphor-icons/react'
import type { PermissionOption, SharedEntityUser } from '../types'
import type { ShareUserDisplayInfo } from '../hooks/useShareUsersEnrichment'
import { getInitials, getShareIdentifier } from './shareEntityDialogUtils'

interface ShareEntityDialogAccessSectionProps {
  owner: ShareUserDisplayInfo
  resolvedSharedUsers: SharedEntityUser[]
  permissionMap: Map<string, PermissionOption>
  canManageSharing: boolean
  onRequestUnshare: (user: SharedEntityUser) => void
  onManageAccess?: () => void
  entityLabel: string
  testId: string
  t: (key: string, vars?: Record<string, unknown>) => string
}

export function ShareEntityDialogAccessSection({
  owner,
  resolvedSharedUsers,
  permissionMap,
  canManageSharing,
  onRequestUnshare,
  onManageAccess,
  entityLabel,
  testId,
  t
}: ShareEntityDialogAccessSectionProps) {
  return (
    <div className="gba:space-y-3">
      <div className="gba:flex gba:items-center gba:justify-between">
        <Label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
          <UsersThree className="gba:h-4 gba:w-4" />
          {t('share-people-with-access')}
        </Label>
        <div className="gba:flex gba:items-center gba:gap-2">
          {canManageSharing && resolvedSharedUsers.length > 0 && onManageAccess && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onManageAccess}
              data-testid={`${testId}-manage-access`}
            >
              <Gear className="gba:mr-1.5 gba:h-4 gba:w-4" />
              {t('share-manage-access')}
            </Button>
          )}
          <Badge variant="secondary">{resolvedSharedUsers.length + 1}</Badge>
        </div>
      </div>

      <div className="gba:max-h-64 gba:overflow-y-auto gba:divide-y gba:rounded-lg gba:border">
        <div className="gba:flex gba:items-center gba:gap-3 gba:bg-accent/30 gba:p-3">
          <Avatar className="gba:h-10 gba:w-10">
            {owner.avatarUrl && <AvatarImage src={owner.avatarUrl} alt={owner.name} />}
            <AvatarFallback>{getInitials(owner.name)}</AvatarFallback>
          </Avatar>
          <div className="gba:flex-1">
            <p className="gba:text-sm gba:font-medium">{t('share-you')}</p>
            <p className="gba:text-xs gba:text-muted-foreground">{t('share-owner-label')}</p>
          </div>
          <Badge variant="outline">{t('share-owner-label')}</Badge>
        </div>

        {resolvedSharedUsers.map(user => {
          const permission = permissionMap.get(user.permission)
          const Icon = permission?.icon
          const shareId = getShareIdentifier(user)

          return (
            <div
              key={shareId || user.userId}
              className="gba:flex gba:items-center gba:gap-3 gba:p-3"
              data-testid={`${testId}-shared-user-${user.userId}`}
            >
              <Avatar className="gba:h-10 gba:w-10">
                {user.userAvatar && <AvatarImage src={user.userAvatar} alt={user.userName} />}
                <AvatarFallback>{getInitials(user.userName || user.userEmail || '?')}</AvatarFallback>
              </Avatar>
              <div className="gba:min-w-0 gba:flex-1">
                <p className="gba:truncate gba:text-sm gba:font-medium">{user.userName || user.userEmail || ''}</p>
                <p className="gba:truncate gba:text-xs gba:text-muted-foreground">{user.userEmail || ''}</p>
              </div>
              <Badge variant="outline" className="gba:gap-1">
                {Icon && <Icon className="gba:h-3 gba:w-3" />}
                {permission ? t(permission.badgeLabelKey || permission.labelKey) : user.permission}
              </Badge>
              {canManageSharing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestUnshare(user)}
                  className="gba:text-destructive hover:gba:text-destructive"
                  disabled={!shareId}
                  aria-label={t('share-remove-user')}
                  data-testid={`${testId}-unshare-${user.userId}`}
                >
                  <Trash className="gba:h-4 gba:w-4" />
                </Button>
              )}
            </div>
          )
        })}

        {resolvedSharedUsers.length === 0 && (
          <div className="gba:p-6 gba:text-center gba:text-sm gba:text-muted-foreground">
            <UsersThree className="gba:mx-auto gba:mb-2 gba:h-8 gba:w-8 gba:opacity-50" />
            <p>{t('share-not-shared')}</p>
            {canManageSharing && <p className="gba:mt-1 gba:text-xs">{t('share-add-above', { entityLabel })}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
