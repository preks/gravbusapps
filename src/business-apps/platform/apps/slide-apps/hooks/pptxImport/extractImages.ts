// Extract image elements from slide XML using relationships and media data.

import type { ImageCropRect, ImageElement } from '../../components/slideElements'
import { createImageElement } from '../../components/slideElements'
import type { SlideRelationships } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import { emuToPixels, rotationToAngle, extractTransform, getChild, isInsideGroup, nextImportUid } from './ooxmlUtils'
import { resolveMediaData } from './resolveRelationships'

/**
 * Parse <a:srcRect l="..." t="..." r="..." b="..."> into a normalized
 * ImageCropRect. OOXML percentages are in 1000ths (100000 == 100%). Returns
 * `undefined` if no non-zero crop is present so we don't clutter every image.
 */
function parseSrcRect(blipFill: Element): ImageCropRect | undefined {
  const srcRect = getChild(blipFill, 'a:srcRect')
  if (!srcRect) return undefined

  const read = (attr: string): number => {
    const raw = srcRect.getAttribute(attr)
    if (!raw) return 0
    const n = Number(raw)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100000, n)) / 100000
  }

  const crop: ImageCropRect = {
    left: read('l'),
    top: read('t'),
    right: read('r'),
    bottom: read('b')
  }

  const hasCrop = crop.left > 0 || crop.top > 0 || crop.right > 0 || crop.bottom > 0
  if (!hasCrop) return undefined

  // Guard against pathological input that would leave no visible region.
  if (crop.left + crop.right >= 1 || crop.top + crop.bottom >= 1) return undefined

  return crop
}

const RELS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const MS_SVG_NS = 'http://schemas.microsoft.com/office/drawing/2016/SVG/main'
// Microsoft's SVG Blip extension URI. PowerPoint 2016+ decks store SVGs as an
// extension sibling on the raster <a:blip>, with an EMF/WMF raster fallback
// for legacy viewers. Without looking for this extension we always take the
// raster path and stamp a placeholder when the EMF has no embedded bitmap.
const SVG_BLIP_EXT_URI = '{96DAC541-7B7A-43D3-8B79-37D633B846F1}'

/**
 * PowerPoint 2016+ authors vector pictures as:
 *
 *   <a:blip r:embed="rIdRaster">
 *     <a:extLst>
 *       <a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}">
 *         <asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main"
 *                       r:embed="rIdSvg"/>
 *       </a:ext>
 *     </a:extLst>
 *   </a:blip>
 *
 * The outer `r:embed` points at an EMF/WMF raster fallback. The real vector
 * content lives in the inner `asvg:svgBlip`. Prefer the SVG so the browser
 * renders the picture natively instead of the metafile placeholder.
 */
function findSvgBlipEmbedId(blip: Element): string | undefined {
  const extLsts = blip.getElementsByTagName('a:extLst')
  if (extLsts.length === 0) return undefined

  // Only scan extensions that belong to *this* blip, not nested blips inside
  // descendant shapes (getElementsByTagName is deep).
  const directExtLst = Array.from(extLsts).find(node => node.parentNode === blip)
  if (!directExtLst) return undefined

  const exts = directExtLst.getElementsByTagName('a:ext')
  for (const ext of Array.from(exts)) {
    const uri = ext.getAttribute('uri') || ''
    if (uri.toUpperCase() !== SVG_BLIP_EXT_URI) continue

    // Match svgBlip by namespace + local name so decks with alternative prefix
    // declarations (seen in some authoring tools) still resolve correctly.
    for (const node of Array.from(ext.childNodes)) {
      const child = node as Element
      if (child.nodeType !== 1) continue
      const localName = (child.localName || child.nodeName.split(':').pop() || '').toLowerCase()
      const ns = child.namespaceURI || ''
      const matchesSvgBlip =
        localName === 'svgblip' &&
        (ns === MS_SVG_NS || ns === '' || !ns || child.nodeName.toLowerCase().endsWith(':svgblip'))
      if (!matchesSvgBlip) continue

      const embed = child.getAttributeNS(RELS_NS, 'embed') || child.getAttribute('r:embed')
      if (embed) return embed
    }
  }
  return undefined
}

/**
 * Return the first embed id whose relationship target can actually be
 * resolved to media bytes. This lets the SVG sibling win when present but
 * gracefully falls back to the raster embed (and ultimately to the warning
 * emitted below) when the SVG rel is broken or its bytes were dropped.
 */
function pickEmbedWithResolvableMedia(
  preferred: string | undefined,
  fallback: string | undefined,
  relationships: SlideRelationships,
  imageData: Map<string, string>
): string | undefined {
  if (preferred) {
    const path = relationships.images.get(preferred)
    if (path && resolveMediaData(path, imageData)) return preferred
  }
  return fallback
}

export function extractImageElements(
  slideXml: Document,
  relationships: SlideRelationships,
  imageData: Map<string, string>,
  messages?: ParserMessage[],
  slideIndex?: number
): ImageElement[] {
  const elements: ImageElement[] = []
  const pics = slideXml.getElementsByTagName('p:pic')
  const slideNumber = typeof slideIndex === 'number' ? String(slideIndex + 1) : undefined

  for (const pic of Array.from(pics)) {
    if (isInsideGroup(pic)) continue

    const transform = extractTransform(pic)
    if (!transform) continue

    const blipFill = getChild(pic, 'p:blipFill')
    if (!blipFill) continue

    const blip = getChild(blipFill, 'a:blip')
    if (!blip) continue

    const rasterEmbedId = blip.getAttributeNS(RELS_NS, 'embed') || blip.getAttribute('r:embed')
    const svgEmbedId = findSvgBlipEmbedId(blip)
    // Prefer the SVG sibling when it is present AND resolves to real media.
    // Falling back to the raster embed means decks authored before PowerPoint
    // grew SVG support (and decks whose svg rel is broken) still render.
    const embedRelId = pickEmbedWithResolvableMedia(svgEmbedId, rasterEmbedId, relationships, imageData)
    const linkRelId = blip.getAttributeNS(RELS_NS, 'link') || blip.getAttribute('r:link')

    if (!embedRelId) {
      // No embedded bytes at all. PPTX lets authors reference external URLs
      // via `r:link`, but we don't fetch those (CORS + privacy). Surface a
      // warning so the missing image doesn't look like an unexplained blank.
      if (linkRelId && messages && slideNumber) {
        messages.push({
          type: 'warning',
          message: 'parser-image-linked-unsupported',
          params: { slide: slideNumber }
        })
      }
      continue
    }

    const imagePath = relationships.images.get(embedRelId)
    if (!imagePath) {
      if (messages && slideNumber) {
        messages.push({
          type: 'warning',
          message: 'parser-image-missing',
          params: { slide: slideNumber }
        })
      }
      continue
    }

    const imageBase64 = resolveMediaData(imagePath, imageData)
    if (!imageBase64) {
      if (messages && slideNumber) {
        messages.push({
          type: 'warning',
          message: 'parser-image-missing',
          params: { slide: slideNumber }
        })
      }
      continue
    }

    const x = emuToPixels(transform.x)
    const y = emuToPixels(transform.y)
    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)

    const cropRect = parseSrcRect(blipFill)

    // Object fit heuristic:
    //   - Explicit crop (<a:srcRect>) → 'fill' so the crop reprojection below
    //     covers the frame exactly as PowerPoint does.
    //   - Vector images (SVG, including our rendered-from-EMF/WMF output) →
    //     'contain' so logos and diagrams are never cropped by a slide slot
    //     whose aspect ratio differs from the metafile's natural aspect.
    //   - Everything else (photos, screenshots, generic bitmaps) → 'cover'
    //     to match the existing behaviour PowerPoint uses for pictures.
    const isVectorSrc = typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/svg+xml')
    const objectFit: 'fill' | 'cover' | 'contain' = cropRect ? 'fill' : isVectorSrc ? 'contain' : 'cover'

    elements.push(
      createImageElement(imageBase64, {
        id: nextImportUid('image-import'),
        position: { x: Math.max(0, x), y: Math.max(0, y) },
        size: { width: Math.max(20, width), height: Math.max(20, height) },
        rotation: rotationToAngle(transform.rotation),
        objectFit,
        ...(cropRect ? { cropRect } : {})
      })
    )
  }

  markDuplicatedBackgroundPictures(elements)

  return elements
}

/**
 * Author-intent heuristic: when a deck contains two identical adjacent
 * pictures whose combined footprint covers most of the slide, the author
 * was almost certainly tiling the same photo to form a full-bleed
 * background (slides 5/12/13 of the Enterprise AI deck use this pattern
 * to stretch a single 2000×1417 galaxy PNG across the canvas). PowerPoint
 * blends the duplicated tiles with slide-master backgrounds and any
 * foreground card fills; our editor renders everything faithfully which
 * leaves the tiled background fighting the foreground content.
 *
 * We detect the pattern by grouping pictures whose `src` matches and
 * whose bounding boxes either overlap or sit within a short gap of each
 * other, then mark the combined group as a dimmed background when the
 * union covers a large area of the slide. The dim is applied via
 * `opacity` (0.5) instead of moving the element in z-order because
 * `assembleSlide` assigns `zIndex` later based on source order — opacity
 * is the signal that survives the pipeline.
 */
export function markDuplicatedBackgroundPictures(elements: ImageElement[], options?: { insideGroup?: boolean }): void {
  if (elements.length < 2) return

  // Group by identical `src`. A WeakRef-ish key via indexOf would do, but
  // we only need reference equality for the common duplicate-picture case.
  const bySrc = new Map<string, number[]>()
  for (let i = 0; i < elements.length; i++) {
    const src = elements[i].src
    if (!src) continue
    const existing = bySrc.get(src)
    if (existing) existing.push(i)
    else bySrc.set(src, [i])
  }

  for (const indices of bySrc.values()) {
    if (indices.length < 2) continue

    // Compute the bounding union of the duplicates and check whether any
    // two of them are close enough (overlap or <= 64px gap on either
    // axis) to read as a contiguous tiled strip. 64px ≈ 5% of a
    // 1280-wide slide, which covers the "240px overlap" the Enterprise
    // AI deck uses without flagging unrelated repeated icons.
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let combinedImageArea = 0
    let largestImageArea = 0
    let adjacent = false
    const CLOSE_GAP_PX = 64

    for (const i of indices) {
      const el = elements[i]
      const l = el.position.x
      const t = el.position.y
      const r = l + el.size.width
      const b = t + el.size.height
      const area = Math.max(0, el.size.width) * Math.max(0, el.size.height)
      if (l < minX) minX = l
      if (t < minY) minY = t
      if (r > maxX) maxX = r
      if (b > maxY) maxY = b
      combinedImageArea += area
      if (area > largestImageArea) largestImageArea = area
    }

    for (let a = 0; a < indices.length && !adjacent; a++) {
      for (let b = a + 1; b < indices.length && !adjacent; b++) {
        const ea = elements[indices[a]]
        const eb = elements[indices[b]]
        const al = ea.position.x
        const ar = al + ea.size.width
        const at = ea.position.y
        const ab = at + ea.size.height
        const bl = eb.position.x
        const br = bl + eb.size.width
        const bt = eb.position.y
        const bb = bt + eb.size.height

        const gapX = Math.max(0, Math.max(al, bl) - Math.min(ar, br))
        const gapY = Math.max(0, Math.max(at, bt) - Math.min(ab, bb))
        if (gapX <= CLOSE_GAP_PX && gapY <= CLOSE_GAP_PX) {
          adjacent = true
        }
      }
    }

    if (!adjacent) continue

    // Coverage gate: only treat the group as a background when the union
    // covers a large rectangle. We use 1280×720 as the reference canvas
    // (matches `DEFAULT_SLIDE_CANVAS_SIZE`) and require ≥60% of that area.
    // The actual slide size is not known at this extraction layer, but
    // PPTX decks overwhelmingly use 16:9 / 4:3 variants of the same
    // magnitude, so the ratio stays meaningful.
    const unionWidth = Math.max(0, maxX - minX)
    const unionHeight = Math.max(0, maxY - minY)
    const unionArea = unionWidth * unionHeight
    const CANVAS_AREA = 1280 * 720
    const coversLargeBackground = unionArea >= CANVAS_AREA * 0.6
    const resemblesGroupedDecorativeStrip =
      options?.insideGroup === true && combinedImageArea >= CANVAS_AREA * 0.18 && largestImageArea >= CANVAS_AREA * 0.08

    if (!coversLargeBackground && !resemblesGroupedDecorativeStrip) continue

    for (const i of indices) {
      const el = elements[i]
      // Preserve any pre-existing author-provided opacity — only dim when
      // the picture was fully opaque. Mirrors the "first duplicate wins"
      // behavior of PowerPoint's own Designer heuristic.
      if (el.opacity === undefined || el.opacity >= 0.95) {
        el.opacity = 0.5
      }
    }
  }
}
