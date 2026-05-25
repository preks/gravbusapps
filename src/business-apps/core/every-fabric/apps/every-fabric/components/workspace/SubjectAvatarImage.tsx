import type { FC } from 'react'

import { sanitizeSlideImageUrl } from '@/business-apps/platform/apps/slide-apps/utils/slideMediaUrl'

const sanitizeMediaUrl = sanitizeSlideImageUrl

/** Wrap raw base64 payloads before slide media sanitizer (directory thumbnails). */
function toImageSrcCandidate(raw: string): string {
  const trimmed = raw.trim()
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }
  const payload = trimmed.replace(/\s+/g, '')
  if (/^[A-Za-z0-9+/=]+$/.test(payload)) {
    return `data:image/png;base64,${payload}`
  }
  return trimmed
}

interface SubjectAvatarImageProps {
  pictureThumbnail: string
  alt: string
}

export const SubjectAvatarImage: FC<SubjectAvatarImageProps> = ({ pictureThumbnail, alt }) => {
  const candidate = toImageSrcCandidate(pictureThumbnail)
  if (!sanitizeMediaUrl(candidate)) return null

  return (
    <img
      src={sanitizeMediaUrl(candidate)}
      alt={alt}
      className="gba:h-full gba:w-full gba:object-cover"
      onError={e => {
        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}
