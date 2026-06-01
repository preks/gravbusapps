import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'

interface HubEmployeeCellProps {
  name: string
  pictureThumbnail?: string | null
  subtitle?: string | null
}

const getAvatarSrc = (pictureThumbnail?: string | null): string | undefined => {
  if (!pictureThumbnail) {
    return undefined
  }

  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

const getInitials = (name: string): string => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()

  return initials || 'E'
}

export const HubEmployeeCell: React.FC<HubEmployeeCellProps> = ({ name, pictureThumbnail, subtitle }) => (
  <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-3">
    <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
      <AvatarImage src={getAvatarSrc(pictureThumbnail)} alt={name} />
      <AvatarFallback className="gba:text-xs">{getInitials(name)}</AvatarFallback>
    </Avatar>
    <div className="gba:min-w-0 gba:space-y-0.5">
      <span className="gba:block gba:truncate gba:text-sm gba:font-medium gba:text-foreground" title={name}>
        {name}
      </span>
      {subtitle ? (
        <span className="gba:block gba:truncate gba:text-xs gba:text-muted-foreground" title={subtitle}>
          {subtitle}
        </span>
      ) : null}
    </div>
  </div>
)

export default HubEmployeeCell
