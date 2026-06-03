import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import { UserMenu } from '@/business-apps/core/use/apps/user-menu'
import { IDE_USER_MENU_LANGUAGE_OPTIONS } from '@/business-apps/core/use/apps/user-menu/constants/languageOptions'
import type { UserMenuSupportedLocale, UserMenuUserInfo } from '@/business-apps/core/use/apps/user-menu/types'
import { pictureThumbnailToDataUrl } from '@/common/utils/pictureThumbnailDataUrl'

export interface UserMenuPopoverContentProps {
  accessToken: string
  userInfo?: UserMenuUserInfo
  isProfileLoaded: boolean
  onLogout: () => void
  selectedLanguage: UserMenuSupportedLocale
  onLanguageChange: (locale: UserMenuSupportedLocale) => void
}

function getInitials(givenName: string, familyName: string): string {
  const first = givenName.trim().charAt(0)
  const last = familyName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || '?'
}

function resolveHeaderDisplayName(userInfo: UserMenuUserInfo): string {
  const displayName = userInfo.employeeDetails?.displayName?.trim()
  if (displayName) {
    return displayName
  }
  const combined = `${userInfo.givenName ?? ''} ${userInfo.familyName ?? ''}`.trim()
  return combined || userInfo.userName
}

/** Matches platform header avatar (28px) inside iconSm (32px) — same visual weight as size={18} phosphor icons */
const HEADER_USER_AVATAR_CLASS = 'nw:h-7 nw:w-7'

export const UserMenuActionIcon: React.FC<{
  userInfo?: UserMenuUserInfo
  isProfileLoaded: boolean
}> = ({ userInfo, isProfileLoaded }) => {
  if (!isProfileLoaded || !userInfo) {
    return (
      <div
        className={`${HEADER_USER_AVATAR_CLASS} nw:flex nw:items-center nw:justify-center nw:rounded-full nw:bg-muted`}
        aria-hidden
      />
    )
  }

  const displayName = resolveHeaderDisplayName(userInfo)
  const avatarUrl = pictureThumbnailToDataUrl(userInfo.employeeDetails?.pictureThumbnail)

  return (
    <Avatar size="sm" className={HEADER_USER_AVATAR_CLASS}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
      <AvatarFallback className="nw:text-[10px]">
        {getInitials(userInfo.givenName ?? '', userInfo.familyName ?? '')}
      </AvatarFallback>
    </Avatar>
  )
}

export const UserMenuPopoverContent: React.FC<UserMenuPopoverContentProps> = ({
  accessToken,
  userInfo,
  isProfileLoaded,
  onLogout,
  selectedLanguage,
  onLanguageChange
}) => {
  return (
    <UserMenu
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={{
        isProfileLoaded,
        onLogout,
        languageOptions: [...IDE_USER_MENU_LANGUAGE_OPTIONS],
        selectedLanguage,
        onLanguageChange
      }}
      data-testid="ide-user-menu-popover"
    />
  )
}
