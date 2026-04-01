/**
 * Shared helpers for signature snapshot SVG intrinsic size (editor + export).
 * Typed/drawn snapshots use a fixed viewBox; the frame (width×height) can differ in aspect ratio —
 * uniform scaling avoids non-uniform stretch of strokes.
 */

/**
 * Reads width/height from the root SVG element (attributes first, then viewBox).
 */
export function parseSvgIntrinsicSizeFromMarkup(svg: string): { width: number; height: number } | null {
  const open = svg.match(/<svg\b[^>]*>/is)
  if (!open) return null
  const tag = open[0]
  const wAttr = tag.match(/\bwidth\s*=\s*["']([^"'%]+)/i)
  const hAttr = tag.match(/\bheight\s*=\s*["']([^"'%]+)/i)
  const wParsed = wAttr ? parseFloat(wAttr[1]) : Number.NaN
  const hParsed = hAttr ? parseFloat(hAttr[1]) : Number.NaN
  if (Number.isFinite(wParsed) && wParsed > 0 && Number.isFinite(hParsed) && hParsed > 0) {
    return { width: wParsed, height: hParsed }
  }
  const viewBox = tag.match(/\bviewBox\s*=\s*["']\s*([^"']+)\s*["']/i)
  if (viewBox) {
    const parts = viewBox[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
    if (parts.length >= 4 && parts.every(n => Number.isFinite(n))) {
      const w = parts[2]
      const h = parts[3]
      if (w > 0 && h > 0) return { width: w, height: h }
    }
  }
  return null
}

/**
 * Ensures the root SVG has pixel width/height so Image() intrinsic size matches crop math.
 */
export function ensureSvgRootHasExplicitPixelSize(svg: string): string {
  if (/<svg[^>]*\bwidth\s*=/i.test(svg) && /<svg[^>]*\bheight\s*=/i.test(svg)) {
    return svg
  }
  const parsed = parseSvgIntrinsicSizeFromMarkup(svg)
  if (!parsed) return svg
  return svg.replace(/<svg\b/i, `<svg width="${parsed.width}" height="${parsed.height}" `)
}

export interface SignatureUniformContainLayout {
  renderedWidth: number
  renderedHeight: number
  offsetX: number
  offsetY: number
}

/**
 * Scales the snapshot uniformly to fit inside the frame (CSS object-fit: contain), bottom-left aligned.
 * Matches raster export when crop is zero.
 */
export function computeSignatureUniformContainLayout(
  frameWidth: number,
  frameHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number
): SignatureUniformContainLayout {
  const fw = Math.max(1, Math.round(frameWidth))
  const fh = Math.max(1, Math.round(frameHeight))
  const nw = Math.max(1, intrinsicWidth)
  const nh = Math.max(1, intrinsicHeight)
  const scale = Math.min(fw / nw, fh / nh)
  const renderedWidth = Math.max(1, Math.round(nw * scale))
  const renderedHeight = Math.max(1, Math.round(nh * scale))
  return {
    renderedWidth,
    renderedHeight,
    offsetX: 0,
    offsetY: fh - renderedHeight
  }
}
