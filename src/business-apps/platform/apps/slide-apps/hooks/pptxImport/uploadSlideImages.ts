// Uploads base64-encoded images from parsed slides to the drive service,
// replacing inline data URLs with remote download URLs to stay within
// the document-service 10 MB JSON body limit.

import type { SlideData } from '../../components/slideElements'
import { SlidesApiService } from '../../services/SlidesApiService'

const isBase64DataUrl = (url: string | undefined): url is string => typeof url === 'string' && url.startsWith('data:')

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

export async function uploadSlideImages(
  slides: SlideData[],
  onProgress?: (progress: UploadProgress) => void
): Promise<SlideData[]> {
  interface PendingUpload {
    slideIdx: number
    elementIdx: number | null
    field: 'src' | 'imageUrl'
    base64: string
    filename: string
  }

  const pending: PendingUpload[] = []

  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si]

    if (slide.background?.type === 'image' && isBase64DataUrl(slide.background.imageUrl)) {
      const bgUrl = slide.background.imageUrl
      pending.push({
        slideIdx: si,
        elementIdx: null,
        field: 'imageUrl',
        base64: bgUrl,
        filename: `slide-${si + 1}-bg.${extensionForDataUrl(bgUrl)}`
      })
    }

    for (let ei = 0; ei < slide.elements.length; ei++) {
      const el = slide.elements[ei]
      if (el.type === 'image' && 'src' in el && isBase64DataUrl((el as { src: string }).src)) {
        const src = (el as { src: string }).src
        pending.push({
          slideIdx: si,
          elementIdx: ei,
          field: 'src',
          base64: src,
          filename: `slide-${si + 1}-img-${ei}.${extensionForDataUrl(src)}`
        })
      }
    }
  }

  if (pending.length === 0) return slides

  const result: SlideData[] = JSON.parse(JSON.stringify(slides))

  let uploaded = 0
  onProgress?.({ total: pending.length, uploaded: 0 })

  const BATCH_SIZE = 3
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)

    const urls = await Promise.allSettled(batch.map(p => SlidesApiService.uploadImageFromBase64(p.base64, p.filename)))

    for (let j = 0; j < batch.length; j++) {
      const p = batch[j]
      const outcome = urls[j]

      if (outcome.status === 'fulfilled') {
        if (p.elementIdx === null) {
          result[p.slideIdx].background.imageUrl = outcome.value
        } else {
          const el = result[p.slideIdx].elements[p.elementIdx] as unknown as Record<string, unknown>
          el.src = outcome.value
        }
      } else {
        console.warn(`[uploadSlideImages] Failed to upload ${p.filename}:`, outcome.reason)
        if (p.elementIdx === null) {
          result[p.slideIdx].background = { type: 'solid', color: '#f0f0f0' }
        } else {
          const el = result[p.slideIdx].elements[p.elementIdx] as unknown as Record<string, unknown>
          el.src = ''
        }
      }

      uploaded++
    }

    onProgress?.({ total: pending.length, uploaded })
  }

  return result
}
