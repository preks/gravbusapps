'use client'

import placeholderBackground from '@/assets/images/placeholderBackground.png'

interface EmployeeAvatarPlaceholderProps {
  readonly firstName: string
  readonly lastName: string
  readonly employeeId: string
  readonly size: number
  readonly fontSizePlaceholder?: number
}

/**
 * Employee Avatar Placeholder Component
 * Displays a placeholder with employee initials when no profile picture is available
 *
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name
 * @param employeeId - Employee's ID
 * @param size - Size of the avatar in pixels
 * @param fontSizePlaceholder - Font size for the placeholder initials
 */
export function EmployeeAvatarPlaceholder({
  firstName,
  lastName,
  size,
  employeeId,
  fontSizePlaceholder
}: EmployeeAvatarPlaceholderProps) {
  const initials = firstName?.charAt(0) + lastName?.charAt(0)

  return (
    <div
      style={{
        backgroundImage: `url(${placeholderBackground})`,
        backgroundSize: 'cover',
        fontSize: fontSizePlaceholder ? `${fontSizePlaceholder}px` : '20px',
        width: `${size}px`,
        height: `${size}px`
      }}
      className="gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xl"
      key={`${employeeId}-Avatar`}
    >
      {initials}
    </div>
  )
}
