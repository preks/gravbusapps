'use client'

interface EmployeeAvatarPictureProps {
  readonly profilePicture: any
  readonly size: number
  readonly employeeId: string
}

/**
 * Employee Avatar Picture Component
 * Displays a profile picture for an employee using the AvatarEditor component
 *
 * @param profilePicture - Base64 encoded profile picture
 * @param size - Size of the avatar in pixels
 * @param employeeId - Employee's ID
 */
export function EmployeeAvatarPicture({ profilePicture, size }: EmployeeAvatarPictureProps) {
  return (
    <div className="gba:relative gba:flex gba:items-center gba:justify-center" style={{ width: size, height: size }}>
      <div className="gba:w-full gba:h-full gba:rounded-full gba:overflow-hidden gba:[&_.controls]:hidden gba:flex gba:items-center gba:justify-center">
        {profilePicture ? (
          <img
            src={`data:image/gif;base64,${profilePicture}`}
            alt="Profile"
            className="gba:w-full gba:h-full gba:object-cover"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              objectFit: 'cover',
              objectPosition: 'center center'
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
