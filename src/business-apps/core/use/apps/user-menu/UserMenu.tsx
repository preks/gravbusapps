import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { UserMenuPanel } from './components'
import { resolveUserMenuAdditionalData, type UserMenuUserInfo } from './types'

export interface UserMenuProps extends BusinessAppContextProps {
  className?: string
  'data-testid'?: string
}

const TEST_ID = 'user-menu'

export const UserMenu: React.FC<UserMenuProps> = ({
  className,
  accessToken,
  userInfo,
  additionalData,
  'data-testid': dataTestId = TEST_ID
}) => {
  const resolvedAdditionalData = resolveUserMenuAdditionalData(additionalData)

  return (
    <UserMenuPanel
      className={className}
      accessToken={accessToken}
      userInfo={userInfo as UserMenuUserInfo | undefined}
      additionalData={resolvedAdditionalData}
      data-testid={dataTestId}
    />
  )
}

export default UserMenu
