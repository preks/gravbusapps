import React from 'react'
import type { SlideBackground } from './slideElements'
import { gradientToCss } from './slideElements'
import { getCachedImageUrl } from '../hooks/useImageObjectUrls'
import { sanitizeSlideImageUrl, sanitizeSlideVideoUrl } from '../utils/slideMediaUrl'

export function resolveSlideImageUrl(url: string | undefined): string {
  const sanitized = sanitizeSlideImageUrl(url)
  if (!sanitized) return ''
  return getCachedImageUrl(sanitized)
}

export function resolveSlideVideoUrl(url: string | undefined): string {
  return sanitizeSlideVideoUrl(url)
}

export function getSlideBackgroundStyle(background: SlideBackground): React.CSSProperties {
  switch (background.type) {
    case 'gradient':
      return background.gradient ? { background: gradientToCss(background.gradient) } : {}
    case 'branded': {
      const layers: string[] = []
      if (background.overlay) layers.push(gradientToCss(background.overlay))
      if (background.gradient) layers.push(gradientToCss(background.gradient))
      const baseColor = background.color || '#0a0a0a'
      return layers.length > 0 ? { background: `${layers.join(', ')}, ${baseColor}` } : { backgroundColor: baseColor }
    }
    case 'image': {
      const imageUrl = resolveSlideImageUrl(background.imageUrl)
      return imageUrl
        ? {
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }
        : {}
    }
    case 'video':
      return { backgroundColor: '#000000' }
    default:
      return { backgroundColor: background.color || '#ffffff' }
  }
}

interface SlideBackgroundMediaProps {
  background: SlideBackground
  renderVideo?: boolean
  autoPlay?: boolean
  className?: string
  style?: React.CSSProperties
}

export function SlideBackgroundMedia({
  background,
  renderVideo = true,
  autoPlay = true,
  className,
  style
}: SlideBackgroundMediaProps) {
  if (!renderVideo || background.type !== 'video' || !background.videoUrl) return null

  const videoUrl = resolveSlideVideoUrl(background.videoUrl)
  if (!videoUrl) return null

  return (
    <video
      autoPlay={autoPlay}
      loop={background.videoLoop !== false}
      muted={background.videoMuted !== false}
      playsInline
      className={className}
      style={style}
    >
      <source src={videoUrl} type="video/mp4" />
    </video>
  )
}
