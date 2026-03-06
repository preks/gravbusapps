/**
 * AvatarImage - Renders a profile image with smooth fade-in when loaded.
 * Uses decode() to ensure the image is fully ready before fading in,
 * avoiding any partial render or pop during the transition.
 */

import React, { useState } from 'react'

export interface AvatarImageProps {
  src: string
  alt: string
  mimeType?: string
  className?: string
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt,
  mimeType = 'image/jpeg',
  className = 'gba:w-full gba:h-full gba:object-cover'
}) => {
  const [loaded, setLoaded] = useState(false)
  const dataSrc = src.startsWith('data:') ? src : `data:${mimeType};base64,${src}`

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.decode) {
      img
        .decode()
        .then(() => setLoaded(true))
        .catch(() => setLoaded(true))
    } else {
      setLoaded(true)
    }
  }

  return (
    <img
      src={dataSrc}
      alt={alt}
      onLoad={handleLoad}
      decoding="async"
      className={`${className} gba:transition-opacity gba:duration-300 gba:ease-out ${
        loaded ? 'gba:opacity-100' : 'gba:opacity-0'
      }`}
    />
  )
}
