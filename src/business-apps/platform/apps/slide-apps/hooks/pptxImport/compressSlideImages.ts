// Compresses base64-encoded images in parsed slides using canvas downscaling
// and JPEG re-encoding to keep the contentJson payload under the
// document-service 10 MB JSON body limit.
//
// Design rule: this step MUST never silently blank an imported image.
//  - If recompression fails (undecodable format), keep the original src so the
//    renderer can still try to display it and, if that also fails, fall back
//    to its visible "broken image" placeholder.
//  - If the payload is still over budget after all compression passes, replace
//    the largest remaining images with an explicit visible placeholder data
//    URL (passes renderer sanitization) and surface a warning to the caller.

import type { SlideData } from '../../components/slideElements'

const isBase64DataUrl = (url: string | undefined): url is string => typeof url === 'string' && url.startsWith('data:')

/**
 * SVG (and our metafile placeholder, which is itself an SVG) should never go
 * through the canvas → JPEG pipeline: rasterizing them throws away the
 * vector fidelity that made them small and sharp to begin with, and jsdom /
 * some browsers taint the canvas on SVG decode and would otherwise trigger a
 * spurious `decode-failed` warning.
 */
const isVectorImageDataUrl = (url: string): boolean => url.startsWith('data:image/svg+xml')

const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024 // 8 MB safety margin under 10 MB limit

/**
 * Visible SVG placeholder shown in place of an image that had to be stripped
 * to keep the document under the JSON body budget. Always a `data:image/...`
 * URL so it passes {@link sanitizeSlideImageUrl} and the user sees
 * deterministically that the asset was removed (rather than a blank frame).
 */
export const STRIPPED_IMAGE_PLACEHOLDER_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa(
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet">',
      '<rect width="160" height="100" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>',
      '<g fill="#94a3b8" font-family="system-ui,sans-serif" font-size="10" text-anchor="middle">',
      '<text x="80" y="46">Image removed</text>',
      '<text x="80" y="62">to reduce file size</text>',
      '</g>',
      '</svg>'
    ].join('')
  )

interface CompressionPass {
  maxWidth: number
  maxHeight: number
  quality: number
}

// The first pass intentionally keeps a higher resolution and quality because
// PowerPoint decks are dominated by UI screenshots/diagrams with fine text and
// thin lines. A 1200x900 @ JPEG 0.7 re-encode visibly blurs those. Subsequent
// passes only run when the JSON payload is still over budget.
const PASSES: CompressionPass[] = [
  { maxWidth: 1920, maxHeight: 1440, quality: 0.9 },
  { maxWidth: 1280, maxHeight: 960, quality: 0.75 },
  { maxWidth: 800, maxHeight: 600, quality: 0.55 }
]

// Images smaller than this are left untouched in the first pass. Most PPTX
// icons, small thumbnails, and already-optimized assets fall under this and
// suffer quality loss from a JPEG round-trip without meaningful size savings.
const FIRST_PASS_SIZE_THRESHOLD_BYTES = 256 * 1024

export type CompressionWarning =
  | { type: 'decode-failed'; slideIndex: number; elementIndex: number | null }
  | { type: 'stripped-for-size'; slideIndex: number; elementIndex: number | null }

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

      try {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', pass.quality))
      } catch {
        // Canvas can taint on unexpected inputs; keep original on failure.
        resolve(null)
      }
    }

    // Browser can't decode (EMF/WMF, corrupt bytes, wrong MIME, ...). Signal
    // the caller to keep the original bytes instead of blanking the slot.
    img.onerror = () => resolve(null)
    img.src = base64
  })
}

interface ImageSlot {
  slideIdx: number
  elementIdx: number | null // null = background image
  field: 'src' | 'imageUrl'
}

/**
 * Collect image slots. `includeVector=false` (the default used by the JPEG
 * compression passes) skips SVG data URLs because rasterizing vectors loses
 * fidelity without saving bytes on small icons. `includeVector=true` is used
 * by the final stripping pass so an oversized EMF/WMF render (rtf.js can
 * emit multi-MB SVGs for dense invoicing charts) can still be replaced with
 * the visible "Image removed" placeholder when even the raster budget is
 * blown. Without this, a deck full of vector charts could never fit under
 * the backend's JSON body limit and the save would silently fail.
 */
function collectImageSlots(slides: SlideData[], includeVector = false): ImageSlot[] {
  const slots: ImageSlot[] = []
  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si]
    if (slide.background?.type === 'image' && isBase64DataUrl(slide.background.imageUrl)) {
      if (includeVector || !isVectorImageDataUrl(slide.background.imageUrl)) {
        slots.push({ slideIdx: si, elementIdx: null, field: 'imageUrl' })
      }
    }
    for (let ei = 0; ei < slide.elements.length; ei++) {
      const el = slide.elements[ei]
      if (el.type === 'image' && 'src' in el && isBase64DataUrl((el as { src: string }).src)) {
        const src = (el as { src: string }).src
        if (includeVector || !isVectorImageDataUrl(src)) {
          slots.push({ slideIdx: si, elementIdx: ei, field: 'src' })
        }
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
  onProgress?: (done: number, total: number) => void,
  onWarning?: (warning: CompressionWarning) => void
): Promise<SlideData[]> {
  const slots = collectImageSlots(slides)
  if (slots.length === 0) return slides

  const result: SlideData[] = JSON.parse(JSON.stringify(slides))
  const total = slots.length
  let done = 0
  onProgress?.(0, total)

  // First pass: only recompress images that are large enough to matter.
  // Small assets (icons, already-optimized PNGs) are left alone so we don't
  // re-encode sharp text/UI screenshots into soft JPEGs for no byte savings.
  const pass = PASSES[0]
  const BATCH = 4
  for (let i = 0; i < slots.length; i += BATCH) {
    const batch = slots.slice(i, i + BATCH)
    const originals = batch.map(s => getSlotValue(result, s))
    const compressed = await Promise.all(
      originals.map(b64 =>
        b64.length >= FIRST_PASS_SIZE_THRESHOLD_BYTES ? compressImage(b64, pass) : Promise.resolve(b64)
      )
    )

    for (let j = 0; j < batch.length; j++) {
      const slot = batch[j]
      const comp = compressed[j]
      const original = originals[j]

      if (comp === null) {
        // Non-decodable here; surface the decode failure but keep the original
        // src so the user sees either the image (if the <img> tag can decode
        // it) or the renderer's explicit "Image failed to load" fallback.
        onWarning?.({ type: 'decode-failed', slideIndex: slot.slideIdx, elementIndex: slot.elementIdx })
      } else {
        setSlotValue(result, slot, comp.length < original.length ? comp : original)
      }
      done++
    }
    onProgress?.(done, total)
  }

  // Additional passes if still over budget.
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
        if (comp !== null && comp.length < originals[j].length) {
          setSlotValue(result, batch[j], comp)
        }
      }
    }
  }

  // Last resort: if still over budget, swap the largest images (raster AND
  // vector) for a VISIBLE placeholder so the user can see that something
  // was removed. Never set src to ''; that silently hides content with no
  // feedback. EMF/WMF decks in particular can produce multi-MB SVGs from
  // rtf.js, which the JPEG compression passes above deliberately skip —
  // this is the only phase that can clip them.
  let finalSize = estimatePayloadSize(result)
  if (finalSize > MAX_PAYLOAD_BYTES) {
    console.warn(
      `[compressSlideImages] Still ${(finalSize / 1024 / 1024).toFixed(1)} MB after all passes, substituting largest images (incl. vector) with placeholder`
    )

    const remaining = collectImageSlots(result, true)
    const sorted = remaining
      .map(slot => ({ slot, size: getSlotValue(result, slot).length }))
      .sort((a, b) => b.size - a.size)

    for (const { slot } of sorted) {
      if (slot.elementIdx === null) {
        result[slot.slideIdx].background = { type: 'image', imageUrl: STRIPPED_IMAGE_PLACEHOLDER_DATA_URL }
      } else {
        setSlotValue(result, slot, STRIPPED_IMAGE_PLACEHOLDER_DATA_URL)
      }
      onWarning?.({ type: 'stripped-for-size', slideIndex: slot.slideIdx, elementIndex: slot.elementIdx })
      finalSize = estimatePayloadSize(result)
      if (finalSize <= MAX_PAYLOAD_BYTES) break
    }
  }

  // Even after stripping every image, non-image content (text, paragraphs,
  // effects, tables, connectors) can keep the JSON over the backend's body
  // limit — especially for decks with hundreds of slides. Surface this so
  // the caller can show a clearer error than the generic "save failed".
  finalSize = estimatePayloadSize(result)
  if (finalSize > MAX_PAYLOAD_BYTES) {
    console.warn(
      `[compressSlideImages] Final payload ${(finalSize / 1024 / 1024).toFixed(1)} MB still exceeds ${(MAX_PAYLOAD_BYTES / 1024 / 1024).toFixed(0)} MB budget after stripping all images — non-image content is driving the size.`
    )
  }

  return result
}
