'use client'

import { memo, useMemo } from 'react'
import { EmployeeAvatarPicture } from './EmployeeAvatarPicture'
import { EmployeeAvatarPlaceholder } from './EmployeeAvatarPlaceholder'
import { EmployeeAvatarStatus } from './EmployeeAvatarStatus'
import { OnlineStatus } from './types'
import { getRandomOnlineStatus } from './utils'

interface EmployeeAvatarProps {
  readonly profilePicture?: any
  readonly firstName: string
  readonly lastName: string
  readonly employeeId: string
  readonly size: number
  readonly fontSizePlaceholder?: number
  readonly onlineStatus?: OnlineStatus
  readonly randomizeStatus?: boolean
}

/**
 * Employee Avatar Component
 * Displays either a profile picture or a placeholder with initials for an employee
 *
 * @param profilePicture - Base64 encoded profile picture
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name
 * @param employeeId - Employee's ID
 * @param size - Size of the avatar in pixels
 * @param fontSizePlaceholder - Font size for the placeholder initials
 */
function EmployeeAvatar({
  profilePicture,
  firstName,
  lastName,
  employeeId,
  size,
  fontSizePlaceholder,
  onlineStatus,
  randomizeStatus = false
}: EmployeeAvatarProps) {
  // Generate random status if randomizeStatus is true
  const randomStatus = useMemo(() => (randomizeStatus ? getRandomOnlineStatus() : undefined), [randomizeStatus])

  // Use provided status or random one if randomizeStatus is true
  const effectiveStatus = onlineStatus ?? randomStatus

  return (
    <div className="gba:relative" style={{ width: size, height: size }}>
      {profilePicture ? (
        <EmployeeAvatarPicture profilePicture={profilePicture} size={size} employeeId={employeeId} />
      ) : (
        <EmployeeAvatarPlaceholder
          firstName={firstName}
          lastName={lastName}
          size={size}
          employeeId={employeeId}
          fontSizePlaceholder={fontSizePlaceholder as number}
        />
      )}

      {/* Status indicator */}
      <EmployeeAvatarStatus size={size} onlineStatus={effectiveStatus} />
    </div>
  )
}

export default memo(EmployeeAvatar)
