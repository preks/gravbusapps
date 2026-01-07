import React from 'react'

export interface AvatarWithInitialsProps {
  firstName: string
  lastName: string
  pictureThumbnail?: string | null
  size?: number
}

export const AvatarWithInitials: React.FC<AvatarWithInitialsProps> = ({
  firstName,
  lastName,
  pictureThumbnail,
  size = 40
}) => {
  const firstInitial = (firstName ?? '').trim().charAt(0).toUpperCase()
  const lastInitial = (lastName ?? '').trim().charAt(0).toUpperCase()
  const initials = firstInitial + lastInitial || '?'

  const imageUrl = pictureThumbnail
    ? pictureThumbnail.startsWith('data:')
      ? pictureThumbnail
      : `data:image/png;base64,${pictureThumbnail}`
    : undefined

  return (
    <div
      className="gba:rounded-full gba:bg-muted gba:text-muted-foreground gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:font-medium"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.4}px`,
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {!imageUrl && initials}
    </div>
  )
}

export default AvatarWithInitials
