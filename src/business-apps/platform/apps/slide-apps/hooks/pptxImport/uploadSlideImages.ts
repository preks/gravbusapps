// Uploads base64-encoded raster images from parsed slides to the drive service.
// Embedded PPTX raster images must not remain inline after import: successful
// uploads are replaced with hosted URLs, and failed uploads are replaced with a
// visible placeholder instead of preserving the original data URL. Inline SVGs
// stay inline because the importer already relies on them for rendered vector
// content such as metafiles and Office SVG siblings.

import type { SlideData } from '../../components/slideElements'
import { SlidesApiService } from '../../services/SlidesApiService'
import {
  createMediaFailurePlaceholderDataUrl,
  DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT,
  retryMediaUpload
} from './mediaHosting'

const isBase64DataUrl = (url: string | undefined): url is string => typeof url === 'string' && url.startsWith('data:')
const isInlineSvgDataUrl = (url: string | undefined): url is string =>
  typeof url === 'string' && url.startsWith('data:image/svg+xml')

/**
 * Pick a filename extension that matches the data URL MIME so the drive
 * service (and any downstream consumer that keys off filename) receives the
 * right type. Vector assets in particular need to stay `.svg`, otherwise the
 * server might reject them or re-serve them with the wrong Content-Type.
 */
function extensionForDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);/.exec(dataUrl)
  const mime = match?.[1]?.toLowerCase() ?? 'image/png'
  switch (mime) {
    case 'image/svg+xml':
      return 'svg'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/bmp':
      return 'bmp'
    case 'image/tiff':
      return 'tiff'
    default:
      return 'png'
  }
}

interface UploadProgress {
  total: number
  uploaded: number
}

interface UploadSlideImagesOptions {
  failurePlaceholderDataUrl?: string
  onProgress?: (progress: UploadProgress) => void
  retryCount?: number
}

export interface UploadSlideImagesResult {
  slides: SlideData[]
  failedUploads: number
}

export async function uploadSlideImages(
  slides: SlideData[],
  options: UploadSlideImagesOptions = {}
): Promise<UploadSlideImagesResult> {
  interface UploadTarget {
    slideIdx: number
    elementIdx: number | null
  }

  interface PendingUpload {
    targets: UploadTarget[]
    base64: string
    filename: string
  }

  const pendingBySource = new Map<string, PendingUpload>()
  const {
    failurePlaceholderDataUrl = createMediaFailurePlaceholderDataUrl({
      title: 'Image import failed',
      subtitle: 'Upload unavailable'
    }),
    onProgress,
    retryCount = DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT
  } = options

  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si]

    if (
      slide.background?.type === 'image' &&
      isBase64DataUrl(slide.background.imageUrl) &&
      !isInlineSvgDataUrl(slide.background.imageUrl)
    ) {
      const bgUrl = slide.background.imageUrl
      const existing = pendingBySource.get(bgUrl)
      if (existing) {
        existing.targets.push({ slideIdx: si, elementIdx: null })
      } else {
        pendingBySource.set(bgUrl, {
          targets: [{ slideIdx: si, elementIdx: null }],
          base64: bgUrl,
          filename: `slide-${si + 1}-bg.${extensionForDataUrl(bgUrl)}`
        })
      }
    }

    for (let ei = 0; ei < slide.elements.length; ei++) {
      const el = slide.elements[ei]
      if (
        el.type === 'image' &&
        'src' in el &&
        isBase64DataUrl((el as { src: string }).src) &&
        !isInlineSvgDataUrl((el as { src: string }).src)
      ) {
        const src = (el as { src: string }).src
        const existing = pendingBySource.get(src)
        if (existing) {
          existing.targets.push({ slideIdx: si, elementIdx: ei })
        } else {
          pendingBySource.set(src, {
            targets: [{ slideIdx: si, elementIdx: ei }],
            base64: src,
            filename: `slide-${si + 1}-img-${ei}.${extensionForDataUrl(src)}`
          })
        }
      }
    }
  }

  const pending = Array.from(pendingBySource.values())
  if (pending.length === 0) return { slides, failedUploads: 0 }

  const result: SlideData[] = JSON.parse(JSON.stringify(slides))

  let uploaded = 0
  let failedUploads = 0
  onProgress?.({ total: pending.length, uploaded: 0 })

  const BATCH_SIZE = 3
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)

    const urls = await Promise.allSettled(
      batch.map(p => retryMediaUpload(() => SlidesApiService.uploadImageFromBase64(p.base64, p.filename), retryCount))
    )

    for (let j = 0; j < batch.length; j++) {
      const p = batch[j]
      const outcome = urls[j]

      if (outcome.status === 'fulfilled') {
        for (const target of p.targets) {
          if (target.elementIdx === null) {
            result[target.slideIdx].background.imageUrl = outcome.value
          } else {
            const el = result[target.slideIdx].elements[target.elementIdx] as unknown as Record<string, unknown>
            el.src = outcome.value
          }
        }
      } else {
        console.warn(`[uploadSlideImages] Failed to upload ${p.filename}:`, outcome.reason)
        for (const target of p.targets) {
          if (target.elementIdx === null) {
            result[target.slideIdx].background = { type: 'image', imageUrl: failurePlaceholderDataUrl }
          } else {
            const el = result[target.slideIdx].elements[target.elementIdx] as unknown as Record<string, unknown>
            el.src = failurePlaceholderDataUrl
          }
        }
        failedUploads += p.targets.length
      }

      uploaded++
    }

    onProgress?.({ total: pending.length, uploaded })
  }

  return { slides: result, failedUploads }
}
