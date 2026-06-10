import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { avatarSrc } from '../../utils/heatmapHelpers'

interface PersonAvatarCellProps {
  pictureThumbnail?: string
  fullName: string
  firstName: string
  lastName: string
}

export const PersonAvatarCell: React.FC<PersonAvatarCellProps> = ({
  pictureThumbnail,
  fullName,
  firstName,
  lastName
}) => (
  <div className="gba:flex gba:items-center gba:gap-3">
    <Avatar className="gba:h-8 gba:w-8">
      <AvatarImage src={avatarSrc(pictureThumbnail)} alt={fullName} />
      <AvatarFallback>{`${firstName[0]}${lastName[0]}`.toUpperCase()}</AvatarFallback>
    </Avatar>
    <span className="gba:font-medium">{fullName}</span>
  </div>
)
