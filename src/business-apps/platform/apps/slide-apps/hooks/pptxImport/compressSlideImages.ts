// Compresses base64-encoded images in parsed slides using canvas downscaling
// and JPEG re-encoding to keep the contentJson payload under the
// document-service 10 MB JSON body limit.

import type { SlideData } from '../../components/slideElements'

const isBase64DataUrl = (url: string | undefined): url is string => typeof url === 'string' && url.startsWith('data:')

const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024 // 8 MB safety margin under 10 MB limit

interface CompressionPass {
  maxWidth: number
  maxHeight: number
  quality: number
}

const PASSES: CompressionPass[] = [
  { maxWidth: 1200, maxHeight: 900, quality: 0.7 },
  { maxWidth: 800, maxHeight: 600, quality: 0.5 },
  { maxWidth: 500, maxHeight: 375, quality: 0.35 }
]

function compressImage(base64: string, pass: CompressionPass): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image()

    img.onload = () => {
      let w = img.naturalWidth
      let h = img.naturalHeight

      if (w > pass.maxWidth) {
        h = Math.round((h * pass.maxWidth) / w)
        w = pass.maxWidth
      }
      if (h > pass.maxHeight) {
        w = Math.round((w * pass.maxHeight) / h)
        h = pass.maxHeight
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, w)
      canvas.height = Math.max(1, h)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', pass.quality))
    }

    // Browser can't decode (EMF, WMF, etc.) -- strip it
    img.onerror = () => resolve(null)
    img.src = base64
  })
}

interface ImageSlot {
  slideIdx: number
  elementIdx: number | null // null = background image
  field: 'src' | 'imageUrl'
}

function collectImageSlots(slides: SlideData[]): ImageSlot[] {
  const slots: ImageSlot[] = []
  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si]
    if (slide.background?.type === 'image' && isBase64DataUrl(slide.background.imageUrl)) {
      slots.push({ slideIdx: si, elementIdx: null, field: 'imageUrl' })
    }
    for (let ei = 0; ei < slide.elements.length; ei++) {
      const el = slide.elements[ei]
      if (el.type === 'image' && 'src' in el && isBase64DataUrl((el as { src: string }).src)) {
        slots.push({ slideIdx: si, elementIdx: ei, field: 'src' })
      }
    }
  }
  return slots
}

function getSlotValue(slides: SlideData[], slot: ImageSlot): string {
  if (slot.elementIdx === null) {
    return (slides[slot.slideIdx].background as { imageUrl: string }).imageUrl
  }
  return (slides[slot.slideIdx].elements[slot.elementIdx] as unknown as Record<string, string>).src
}

function setSlotValue(slides: SlideData[], slot: ImageSlot, value: string): void {
  if (slot.elementIdx === null) {
    ;(slides[slot.slideIdx].background as { imageUrl: string }).imageUrl = value
  } else {
    ;(slides[slot.slideIdx].elements[slot.elementIdx] as unknown as Record<string, string>).src = value
  }
}

function estimatePayloadSize(slides: SlideData[]): number {
  return JSON.stringify(slides).length
}

export async function compressSlideImages(
  slides: SlideData[],
  onProgress?: (done: number, total: number) => void
): Promise<SlideData[]> {
  const slots = collectImageSlots(slides)
  if (slots.length === 0) return slides

  const result: SlideData[] = JSON.parse(JSON.stringify(slides))
  const total = slots.length
  let done = 0
  onProgress?.(0, total)

  // First pass: compress all images
  const pass = PASSES[0]
  const BATCH = 4
  for (let i = 0; i < slots.length; i += BATCH) {
    const batch = slots.slice(i, i + BATCH)
    const originals = batch.map(s => getSlotValue(result, s))
    const compressed = await Promise.all(originals.map(b64 => compressImage(b64, pass)))

    for (let j = 0; j < batch.length; j++) {
      const slot = batch[j]
      const comp = compressed[j]

      if (comp === null) {
        // Non-decodable format: replace with 1x1 transparent pixel
        if (slot.elementIdx === null) {
          result[slot.slideIdx].background = { type: 'solid', color: '#f0f0f0' }
        } else {
          setSlotValue(result, slot, '')
        }
      } else {
        const original = originals[j]
        setSlotValue(result, slot, comp.length < original.length ? comp : original)
      }
      done++
    }
    onProgress?.(done, total)
  }

  // Check total size; if over budget run additional passes
  for (let pi = 1; pi < PASSES.length; pi++) {
    const size = estimatePayloadSize(result)
    if (size <= MAX_PAYLOAD_BYTES) break

    console.warn(
      `[compressSlideImages] Payload ${(size / 1024 / 1024).toFixed(1)} MB exceeds budget, running pass ${pi + 1}`
    )
    const aggressivePass = PASSES[pi]

    const remaining = collectImageSlots(result)
    for (let i = 0; i < remaining.length; i += BATCH) {
      const batch = remaining.slice(i, i + BATCH)
      const originals = batch.map(s => getSlotValue(result, s))
      const compressed = await Promise.all(originals.map(b64 => compressImage(b64, aggressivePass)))

      for (let j = 0; j < batch.length; j++) {
        const comp = compressed[j]
        if (comp !== null) {
          setSlotValue(result, batch[j], comp)
        }
      }
    }
  }

  // Last resort: if still over budget, strip the largest images
  let finalSize = estimatePayloadSize(result)
  if (finalSize > MAX_PAYLOAD_BYTES) {
    console.warn(
      `[compressSlideImages] Still ${(finalSize / 1024 / 1024).toFixed(1)} MB after all passes, stripping largest images`
    )

    const remaining = collectImageSlots(result)
    const sorted = remaining
      .map(slot => ({ slot, size: getSlotValue(result, slot).length }))
      .sort((a, b) => b.size - a.size)

    for (const { slot } of sorted) {
      if (slot.elementIdx === null) {
        result[slot.slideIdx].background = { type: 'solid', color: '#f0f0f0' }
      } else {
        setSlotValue(result, slot, '')
      }
      finalSize = estimatePayloadSize(result)
      if (finalSize <= MAX_PAYLOAD_BYTES) break
    }
  }

  return result
}
