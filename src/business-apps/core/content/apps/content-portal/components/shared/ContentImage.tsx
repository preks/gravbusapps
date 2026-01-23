import React, { useState, useEffect, useRef } from 'react'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { FileInfo } from '@/common/types/FileTypes'

interface ContentImageProps {
  picture: string | FileInfo | null
  accessToken: string
  alt: string
  className?: string
  fallbackText?: string
}

export const ContentImage: React.FC<ContentImageProps> = ({
  picture,
  accessToken,
  alt,
  className = '',
  fallbackText
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const blobUrlRef = useRef<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    // Clean up previous blob URL
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (!picture) {
      setImageUrl(null)
      setIsLoaded(false)
      setHasError(false)
      return
    }

    let fileInfo: FileInfo | null = null
    try {
      fileInfo = typeof picture === 'string' ? JSON.parse(picture) : picture
    } catch {
      // If it's not JSON, check if it's a data URL
      if (typeof picture === 'string' && picture.startsWith('data:')) {
        setImageUrl(picture)
        setIsLoaded(true)
        return
      }
      // Otherwise try to use as direct URL (old format)
      setImageUrl(picture)
      setIsLoaded(true)
      return
    }

    if (!fileInfo?.path) {
      setImageUrl(null)
      setIsLoaded(false)
      setHasError(true)
      return
    }

    // Always use accessToken for buildFileUrl
    setIsLoaded(false)
    setHasError(false)
    let isCancelled = false

    const fetchImage = async () => {
      try {
        const blobUrl = await buildFileUrl(fileInfo!, accessToken)
        if (!isCancelled) {
          blobUrlRef.current = blobUrl
          setImageUrl(blobUrl)
          // Keep loading state until image actually loads (onLoad event)
        } else {
          URL.revokeObjectURL(blobUrl)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[ContentImage] Error fetching image:', error)
          setImageUrl(null)
          setIsLoaded(false)
          setHasError(true)
        }
      }
    }

    fetchImage()

    return () => {
      isCancelled = true
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [picture, accessToken])

  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  const handleImageError = () => {
    setHasError(true)
    setIsLoaded(false)
  }

  if (hasError || !picture) {
    if (fallbackText) {
      return (
        <div className={`gba:flex gba:items-center gba:justify-center gba:bg-muted ${className}`}>
          <span className="gba:text-muted-foreground">{fallbackText}</span>
        </div>
      )
    }
    return null
  }

  if (!imageUrl) {
    return null
  }

  return (
    <div className={`gba:relative gba:overflow-hidden ${className}`}>
      {/* Blur-up placeholder - shown while image is loading */}
      {!isLoaded && imageUrl && (
        <div
          className="gba:absolute gba:inset-0"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            opacity: isLoaded ? 0 : 1,
            transition: 'opacity 0.3s ease-out'
          }}
        />
      )}
      {/* Actual image - fades in when loaded */}
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          className={`gba:relative gba:w-full gba:h-full gba:object-cover ${
            isLoaded ? 'gba:opacity-100' : 'gba:opacity-0'
          } gba:transition-opacity gba:duration-300 gba:ease-in-out`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  )
}
