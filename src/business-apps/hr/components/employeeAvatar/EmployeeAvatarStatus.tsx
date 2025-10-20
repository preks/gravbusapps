'use client'

import { OnlineStatus, ONLINE_STATUS_COLORS } from './types'

interface EmployeeAvatarStatusProps {
  readonly size: number
  readonly onlineStatus?: OnlineStatus
}

/**
 * Component to display the online status of an employee
 *
 * @param size - Size of the avatar in pixels
 * @param onlineStatus - Online status of the employee
 */
export function EmployeeAvatarStatus({ size, onlineStatus }: EmployeeAvatarStatusProps) {
  if (!onlineStatus) return null

  const statusColor = ONLINE_STATUS_COLORS[onlineStatus]
  const indicatorSize = Math.max(16, size * 0.33) // Scale indicator size with avatar size to match Teams ratio

  return (
    <div
      className="gba:absolute"
      style={{
        bottom: 0,
        right: 0,
        width: indicatorSize,
        height: indicatorSize,
        backgroundColor: statusColor,
        borderRadius: '50%',
        border: `${Math.max(2, size * 0.05)}px solid white`,
        boxShadow: '0 1px 3px var(--nw-shadow)',
        zIndex: 10
      }}
    />
  )
}
