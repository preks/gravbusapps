import React from 'react'
import type { SlideBackground } from './slideElements'
import { gradientToCss } from './slideElements'
import { useResolvedSlideMediaUrl } from '../hooks/useResolvedSlideMediaUrl'
import { sanitizeSlideImageUrl, sanitizeSlideVideoUrl } from '../utils/slideMediaUrl'

export function resolveSlideImageUrl(url: string | undefined): string {
  return sanitizeSlideImageUrl(url)
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
      return { backgroundColor: background.color || '#000000' }
    }
    case 'video': {
      return { backgroundColor: '#000000' }
    }
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
  const imageUrl = useResolvedSlideMediaUrl(resolveSlideImageUrl(background.imageUrl))
  const videoUrl = useResolvedSlideMediaUrl(resolveSlideVideoUrl(background.videoUrl))
  const videoPreviewImageUrl = useResolvedSlideMediaUrl(resolveSlideImageUrl(background.videoPreviewImageUrl))

  if (background.type === 'image' && imageUrl) {
    return <img src={imageUrl} alt="" className={className} style={style} draggable={false} />
  }

  if (background.type !== 'video' || !background.videoUrl) return null

  if (!renderVideo) {
    return videoPreviewImageUrl ? (
      <img src={videoPreviewImageUrl} alt="" className={className} style={style} draggable={false} />
    ) : null
  }

  if (!videoUrl) return null

  return (
    <video
      autoPlay={autoPlay}
      loop={background.videoLoop !== false}
      muted={background.videoMuted !== false}
      playsInline
      preload="metadata"
      poster={videoPreviewImageUrl || undefined}
      className={className}
      style={style}
    >
      <source src={videoUrl} type="video/mp4" />
    </video>
  )
}
