import type { VideoElement } from '../components/slideElements'
import { sanitizeSlideImageUrl, sanitizeSlideVideoUrl } from './slideMediaUrl'
import { sanitizeOnlineVideoEmbedUrl } from './onlineVideo'

export function getVideoKind(element: Pick<VideoElement, 'videoKind'>): 'file' | 'embed' {
  return element.videoKind === 'embed' ? 'embed' : 'file'
}

export function isEmbedVideoElement(element: Pick<VideoElement, 'videoKind'>): boolean {
  return getVideoKind(element) === 'embed'
}

export function getVideoSourceUrl(element: Pick<VideoElement, 'src' | 'sourceUrl'>): string {
  return element.sourceUrl?.trim() || element.src
}

export function resolveVideoPlaybackUrl(
  element: Pick<VideoElement, 'src' | 'sourceUrl' | 'videoKind' | 'embedUrl'>
): string {
  if (element.videoKind === 'embed') {
    return sanitizeOnlineVideoEmbedUrl(element.embedUrl || element.sourceUrl || element.src)
  }

  return sanitizeSlideVideoUrl(element.src)
}

export function resolveVideoPreviewUrl(element: Pick<VideoElement, 'previewImageUrl'>): string {
  return sanitizeSlideImageUrl(element.previewImageUrl)
}
