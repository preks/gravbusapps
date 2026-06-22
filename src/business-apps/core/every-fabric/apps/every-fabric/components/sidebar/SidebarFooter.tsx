import { Avatar, AvatarFallback, AvatarImage, useTranslation } from '@newwork/nw-design-system'
import { CalendarCheckIcon, GearIcon } from '@phosphor-icons/react'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { useCurrentUserPicture } from '@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture'
import { resolveUserAvatarUrl, resolveUserFirstName, resolveUserFullName } from '../../utils/userUtils'
import translations from '../../_i18n'
import { SidebarTooltip } from './SidebarTooltip'

interface SidebarFooterProps {
  isCollapsed: boolean
  userInfo?: UserInfoProps
  accessToken?: string
  onOpenSettings: () => void
  onOpenScheduled: () => void
}

function resolveInitials(userInfo: UserInfoProps | undefined): string {
  const first = resolveUserFirstName(userInfo) ?? ''
  const last = userInfo?.employeeDetails?.lastName ?? userInfo?.familyName ?? ''
  const letters = `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase()
  if (letters.trim()) return letters
  const fallback = userInfo?.userName?.slice(0, 2)?.toUpperCase()
  return fallback || '—'
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isCollapsed,
  userInfo,
  accessToken = '',
  onOpenSettings,
  onOpenScheduled
}) => {
  const { t } = useTranslation(translations)
  const fullName = resolveUserFullName(userInfo) ?? t('sidebar-signed-in')
  const scheduledLabel = t('sidebar-scheduled-tasks')
  const settingsLabel = t('sidebar-settings')
  const initials = resolveInitials(userInfo)
  const contextPicture = resolveUserAvatarUrl(userInfo)
  const employeeId = userInfo?.employeeDetails?.employeeId?.trim() || undefined
  const userId = userInfo?.id?.trim() || undefined
  const { pictureThumbnail: fetchedPicture } = useCurrentUserPicture(
    contextPicture ? undefined : employeeId,
    accessToken,
    contextPicture || employeeId ? undefined : userId
  )
  const pictureUrl = contextPicture ?? fetchedPicture ?? undefined

  return (
    <div
      className={`gba:mt-auto gba:border-t gba:border-border/60 gba:px-2 gba:py-2 ${
        isCollapsed ? 'gba:flex gba:flex-col gba:items-center gba:gap-2' : 'gba:flex gba:items-center gba:gap-2'
      }`}
      data-testid="sidebar-footer"
    >
      <SidebarTooltip disabled={!isCollapsed} label={fullName}>
        <div
          className={`gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:px-1.5 gba:py-1.5 ${
            isCollapsed ? 'gba:justify-center' : 'gba:flex-1 gba:min-w-0'
          }`}
        >
          <Avatar className="gba:h-7 gba:w-7 gba:shrink-0">
            {pictureUrl ? <AvatarImage src={pictureUrl} alt={fullName} /> : null}
            <AvatarFallback className="gba:text-[10px] gba:font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="gba:flex gba:min-w-0 gba:flex-col gba:text-left">
              <span className="gba:truncate gba:text-[13px] gba:font-medium gba:text-foreground">{fullName}</span>
              {userInfo?.employeeDetails?.jobTitle ? (
                <span className="gba:truncate gba:text-[11px] gba:text-muted-foreground">
                  {userInfo.employeeDetails.jobTitle}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </SidebarTooltip>

      <SidebarTooltip disabled={!isCollapsed} label={scheduledLabel}>
        <button
          type="button"
          onClick={onOpenScheduled}
          aria-label={scheduledLabel}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="sidebar-scheduled-button"
        >
          <CalendarCheckIcon className="gba:h-4 gba:w-4" />
        </button>
      </SidebarTooltip>

      <SidebarTooltip disabled={!isCollapsed} label={settingsLabel}>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={settingsLabel}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="sidebar-settings-button"
        >
          <GearIcon className="gba:h-4 gba:w-4" />
        </button>
      </SidebarTooltip>
    </div>
  )
}
