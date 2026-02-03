import React, { useState, useEffect, useRef } from 'react'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { FileInfo } from '@/common/types/FileTypes'

type ContentImageTone = 'default' | 'muted'

interface ContentImageProps {
  picture: string | FileInfo | null
  accessToken: string
  alt: string
  className?: string
  fallbackText?: string
  tone?: ContentImageTone
}

export const ContentImage: React.FC<ContentImageProps> = ({
  picture,
  accessToken,
  alt,
  className = '',
  fallbackText,
  tone = 'muted'
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  const toneClasses = tone === 'muted' ? 'gba:brightness-95 gba:saturate-50' : ''

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
      {/* Blur-up placeholder (no inline styles) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className={`gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:scale-110 gba:blur-2xl ${
            isLoaded ? 'gba:opacity-0' : 'gba:opacity-100'
          } gba:transition-opacity gba:duration-300 gba:ease-in-out ${toneClasses}`}
        />
      )}

      {/* Actual image - fades in when loaded */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt}
          className={`gba:relative gba:w-full gba:h-full gba:object-cover ${
            isLoaded ? 'gba:opacity-100' : 'gba:opacity-0'
          } gba:transition-opacity gba:duration-300 gba:ease-in-out ${toneClasses}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  )
}
