import { useMemo } from 'react'
import { useCurrentUserPicture } from '@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture'
import { pictureThumbnailToDataUrl } from '@/common/utils/pictureThumbnailDataUrl'
import type { UserMenuUserInfo } from '../types'

interface UseUserMenuAvatarUrlOptions {
  accessToken?: string
  userInfo?: UserMenuUserInfo
  isProfileLoaded: boolean
}

/**
 * Resolves the menu avatar URL from context userInfo, or fetches via GraphQL when the
 * platform shell omits pictureThumbnail on the remote user-menu screen.
 */
export function useUserMenuAvatarUrl({
  accessToken,
  userInfo,
  isProfileLoaded
}: UseUserMenuAvatarUrlOptions): string | undefined {
  const contextAvatarUrl = useMemo(
    () => pictureThumbnailToDataUrl(userInfo?.employeeDetails?.pictureThumbnail),
    [userInfo?.employeeDetails?.pictureThumbnail]
  )

  const shouldFetchPicture = Boolean(
    isProfileLoaded && !contextAvatarUrl && accessToken && (userInfo?.employeeDetails?.employeeId || userInfo?.id)
  )

  const { pictureThumbnail: fetchedPicture } = useCurrentUserPicture(
    shouldFetchPicture ? userInfo?.employeeDetails?.employeeId : undefined,
    shouldFetchPicture ? (accessToken ?? '') : '',
    shouldFetchPicture ? userInfo?.id : undefined
  )

  return contextAvatarUrl ?? fetchedPicture ?? undefined
}
