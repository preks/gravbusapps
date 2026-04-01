import type { NormalizedImageCrop } from '@/components/tiptap-extensions/tiptap-custom-image/cropUtils'

const MIN_SIGNATURE_FRAME = 40

/**
 * Narrows the root SVG viewBox so the artwork matches the fractional crop, then resets crop to 0.
 * Requires a root `<svg viewBox="minX minY w h">` (all generated signatures use this).
 */
export function bakeCropIntoSignatureSvg(svg: string, crop: NormalizedImageCrop): string | null {
  if (!svg.trim()) return null
  if (crop.top <= 0 && crop.right <= 0 && crop.bottom <= 0 && crop.left <= 0) return svg

  const viewBoxMatch = svg.match(/<svg[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i)
  if (!viewBoxMatch) return null
  const parts = viewBoxMatch[1]
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) return null
  const [minX, minY, vbW, vbH] = parts
  const nw = vbW * (1 - crop.left - crop.right)
  const nh = vbH * (1 - crop.top - crop.bottom)
  if (nw < 1 || nh < 1) return null
  const nx = minX + vbW * crop.left
  const ny = minY + vbH * crop.top
  const nextViewBox = `${nx} ${ny} ${nw} ${nh}`

  let out = svg.replace(/(<svg[^>]*\bviewBox\s*=\s*)(["'])([^"']*)(\2)/i, `$1$2${nextViewBox}$2`)

  out = out.replace(/<svg(\s[^>]*)>/i, (full, inner: string) => {
    let attrs = inner
    if (/\bwidth\s*=/.test(attrs)) {
      attrs = attrs.replace(/\bwidth\s*=\s*["'][^"']*["']/i, `width="${nw}"`)
    } else {
      attrs = `${attrs} width="${nw}"`
    }
    if (/\bheight\s*=/.test(attrs)) {
      attrs = attrs.replace(/\bheight\s*=\s*["'][^"']*["']/i, `height="${nh}"`)
    } else {
      attrs = `${attrs} height="${nh}"`
    }
    return `<svg${attrs}>`
  })

  return out
}

/**
 * After crop is committed, produces attrs that shrink the frame to the visible area and bake crop
 * into `snapshotSvg`, with fractional crop reset to zero. Returns null if nothing to do or SVG bake failed.
 */
export function buildBakedSignatureAttrsAfterCrop(
  width: number,
  height: number,
  snapshotSvg: string,
  crop: NormalizedImageCrop
): {
  width: number
  height: number
  snapshotSvg: string
  cropTop: number
  cropRight: number
  cropBottom: number
  cropLeft: number
} | null {
  if (crop.top <= 0 && crop.right <= 0 && crop.bottom <= 0 && crop.left <= 0) return null

  const bakedSvg = bakeCropIntoSignatureSvg(snapshotSvg, crop)
  if (bakedSvg == null) return null

  const vw = Math.max(0.05, 1 - crop.left - crop.right)
  const vh = Math.max(0.05, 1 - crop.top - crop.bottom)
  const newW = Math.max(MIN_SIGNATURE_FRAME, Math.round(width * vw))
  const newH = Math.max(MIN_SIGNATURE_FRAME, Math.round(height * vh))

  return {
    width: newW,
    height: newH,
    snapshotSvg: bakedSvg,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
    cropLeft: 0
  }
}
