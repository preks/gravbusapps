// Placeholder inheritance helpers.
//
// PowerPoint slides rarely repeat the transform/styling of their placeholders:
// the slide's <p:sp> carries the *content* (text runs) while the matching
// placeholder on the slide layout (and in turn the master) supplies position,
// size, and default formatting. Our importer used to skip any slide placeholder
// that lacked an <a:xfrm>, which dropped titles/subtitles from many decks
// produced by actual PowerPoint. This module resolves that inheritance so the
// rest of the import pipeline can treat slide placeholders like regular shapes.

import { getChild, getDirectChild } from './ooxmlUtils'

const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'

/** Key used to match a slide placeholder against its layout/master pair. */
function getPlaceholderKey(sp: Element): string | null {
  const nvSpPr = getChild(sp, 'p:nvSpPr')
  if (!nvSpPr) return null
  const nvPr = getChild(nvSpPr, 'p:nvPr')
  if (!nvPr) return null
  const ph = getChild(nvPr, 'p:ph')
  if (!ph) return null

  const type = ph.getAttribute('type') || ''
  const idx = ph.getAttribute('idx') || ''
  // Matching rules (PPTX spec): prefer idx match; fall back to type match;
  // treat missing idx as idx="0" for title-style placeholders.
  return `${type || 'body'}|${idx || '0'}`
}

export interface PlaceholderMap {
  byKey: Map<string, Element>
  byType: Map<string, Element>
  byIdx: Map<string, Element>
}

/** Walk a slide layout / master XML and index its placeholder shapes. */
export function collectPlaceholders(xml: Document): PlaceholderMap {
  const byKey = new Map<string, Element>()
  const byType = new Map<string, Element>()
  const byIdx = new Map<string, Element>()

  const spTree = xml.getElementsByTagName('p:spTree')[0]
  if (!spTree) return { byKey, byType, byIdx }

  const shapes = spTree.getElementsByTagName('p:sp')
  for (const sp of Array.from(shapes)) {
    const nvSpPr = getChild(sp, 'p:nvSpPr')
    const nvPr = nvSpPr ? getChild(nvSpPr, 'p:nvPr') : undefined
    const ph = nvPr ? getChild(nvPr, 'p:ph') : undefined
    if (!ph) continue

    const key = getPlaceholderKey(sp)
    if (key && !byKey.has(key)) byKey.set(key, sp)

    const type = ph.getAttribute('type')
    if (type && !byType.has(type)) byType.set(type, sp)

    const idx = ph.getAttribute('idx')
    if (idx && !byIdx.has(idx)) byIdx.set(idx, sp)
  }

  return { byKey, byType, byIdx }
}

function findMatchingPlaceholder(slideSp: Element, map: PlaceholderMap): Element | undefined {
  const nvSpPr = getChild(slideSp, 'p:nvSpPr')
  const nvPr = nvSpPr ? getChild(nvSpPr, 'p:nvPr') : undefined
  const ph = nvPr ? getChild(nvPr, 'p:ph') : undefined
  if (!ph) return undefined

  const type = ph.getAttribute('type')
  const idx = ph.getAttribute('idx')

  const key = getPlaceholderKey(slideSp)
  if (key && map.byKey.has(key)) return map.byKey.get(key)

  if (idx && map.byIdx.has(idx)) return map.byIdx.get(idx)
  if (type && map.byType.has(type)) return map.byType.get(type)

  return undefined
}

function hasXfrm(sp: Element): boolean {
  const spPr = getChild(sp, 'p:spPr')
  if (!spPr) return false
  return !!getChild(spPr, 'a:xfrm')
}

function getXfrm(sp: Element): Element | undefined {
  const spPr = getChild(sp, 'p:spPr')
  if (!spPr) return undefined
  return getChild(spPr, 'a:xfrm')
}

function hasAnyRunText(sp: Element): boolean {
  const txBody = getChild(sp, 'p:txBody')
  if (!txBody) return false
  const ts = txBody.getElementsByTagNameNS(DRAWING_NS, 't')
  for (const t of Array.from(ts)) {
    const text = t.textContent || ''
    if (text.trim().length > 0) return true
  }
  return false
}

/**
 * Placeholder types that represent PURE text regions in PowerPoint. For these
 * we never inherit layout/master fill or line — PowerPoint does not paint a
 * background behind a title/body text placeholder just because its template
 * style slot references an accent fill. Inheriting the layout's visuals here
 * is the root cause of "random colored boxes appearing behind titles after
 * import".
 *
 * Non-text placeholders (obj, pic, chart, tbl, dgm, media, sldImg) are still
 * allowed to inherit because they are content containers that may carry a
 * real shape fill.
 */
const TEXT_PLACEHOLDER_TYPES = new Set(['title', 'ctrTitle', 'subTitle', 'body', 'hdr', 'ftr', 'dt', 'sldNum'])

function isBodyPlaceholder(phType: string): boolean {
  return phType === 'body'
}

function canTextPlaceholderInheritExplicitVisuals(
  phType: string,
  layoutSpPr: Element | undefined,
  masterSpPr: Element | undefined
): boolean {
  if (!isBodyPlaceholder(phType)) return false

  const source = layoutSpPr || masterSpPr
  if (!source) return false

  return (
    !!getDirectChild(source, 'a:solidFill') ||
    !!getDirectChild(source, 'a:gradFill') ||
    !!getDirectChild(source, 'a:blipFill') ||
    !!getDirectChild(source, 'a:noFill') ||
    !!getDirectChild(source, 'a:ln') ||
    !!getDirectChild(source, 'a:prstGeom') ||
    !!getDirectChild(source, 'a:custGeom')
  )
}

function getPlaceholderType(sp: Element): string {
  const nvSpPr = getChild(sp, 'p:nvSpPr')
  const nvPr = nvSpPr ? getChild(nvSpPr, 'p:nvPr') : undefined
  const ph = nvPr ? getChild(nvPr, 'p:ph') : undefined
  return ph?.getAttribute('type') || 'body'
}

/**
 * True when the slide placeholder has any explicit visual fill/line/geometry
 * on its own {@code p:spPr}. We check specific children (not just a non-empty
 * spPr) because PowerPoint emits a `<p:spPr>` with only `<a:xfrm>` very often.
 */
function hasExplicitVisuals(sp: Element): {
  fill: boolean
  line: boolean
  prstGeom: boolean
  custGeom: boolean
} {
  const spPr = getChild(sp, 'p:spPr')
  if (!spPr) return { fill: false, line: false, prstGeom: false, custGeom: false }
  const hasFill =
    !!getDirectChild(spPr, 'a:solidFill') ||
    !!getDirectChild(spPr, 'a:gradFill') ||
    !!getDirectChild(spPr, 'a:blipFill') ||
    !!getDirectChild(spPr, 'a:noFill')
  const hasLine = !!getDirectChild(spPr, 'a:ln')
  const hasPrst = !!getDirectChild(spPr, 'a:prstGeom')
  const hasCust = !!getDirectChild(spPr, 'a:custGeom')
  return { fill: hasFill, line: hasLine, prstGeom: hasPrst, custGeom: hasCust }
}

function hasExplicitStyle(sp: Element): boolean {
  return !!getChild(sp, 'p:style')
}

function copyFillChildren(targetSpPr: Element, sourceSpPr: Element): void {
  const doc = targetSpPr.ownerDocument
  const candidates = ['a:noFill', 'a:solidFill', 'a:gradFill', 'a:blipFill']
  for (const name of candidates) {
    const fromSource = getDirectChild(sourceSpPr, name)
    if (fromSource) {
      targetSpPr.appendChild(doc.importNode(fromSource, true))
      break
    }
  }
}

function copyLineChildren(targetSpPr: Element, sourceSpPr: Element): void {
  const doc = targetSpPr.ownerDocument
  const fromSource = getDirectChild(sourceSpPr, 'a:ln')
  if (fromSource) targetSpPr.appendChild(doc.importNode(fromSource, true))
}

function copyGeometry(targetSpPr: Element, sourceSpPr: Element): void {
  const doc = targetSpPr.ownerDocument
  const prst = getDirectChild(sourceSpPr, 'a:prstGeom')
  const cust = getDirectChild(sourceSpPr, 'a:custGeom')
  if (prst) targetSpPr.appendChild(doc.importNode(prst, true))
  else if (cust) targetSpPr.appendChild(doc.importNode(cust, true))
}

function ensureSpPr(slideSp: Element): Element {
  let spPr = getChild(slideSp, 'p:spPr')
  if (spPr) return spPr
  spPr = slideSp.ownerDocument.createElementNS('http://schemas.openxmlformats.org/presentationml/2006/main', 'p:spPr')
  slideSp.appendChild(spPr)
  return spPr
}

/**
 * If the slide's placeholder shape lacks a transform or any text body, borrow
 * them from the matching placeholder in the layout (or master). Mutates
 * `slideSp` in place so downstream extractors see a complete shape.
 *
 * In addition to transform/text, we also inherit visual styling when the slide
 * shape omits it: fill, line, geometry, and {@code p:style}. PowerPoint
 * renders these by looking them up at layout/master level, so without this
 * step placeholder-based autoshapes lose their theme color and appear blank.
 *
 * We explicitly do NOT copy layout text when the slide shape already has runs
 * — PowerPoint's precedence rule is slide > layout > master for content.
 */
export function inheritPlaceholderFromLayout(
  slideSp: Element,
  layoutMap: PlaceholderMap,
  masterMap: PlaceholderMap | undefined
): void {
  const nvSpPr = getChild(slideSp, 'p:nvSpPr')
  const nvPr = nvSpPr ? getChild(nvSpPr, 'p:nvPr') : undefined
  const ph = nvPr ? getChild(nvPr, 'p:ph') : undefined
  if (!ph) return

  const layoutMatch = findMatchingPlaceholder(slideSp, layoutMap)
  const masterMatch = masterMap ? findMatchingPlaceholder(slideSp, masterMap) : undefined
  const inheritanceSource = layoutMatch || masterMatch
  if (!inheritanceSource) return

  // 1. Inherit transform when missing so position/size are present.
  if (!hasXfrm(slideSp)) {
    const sourceXfrm = getXfrm(inheritanceSource) || (masterMatch ? getXfrm(masterMatch) : undefined)
    if (sourceXfrm) {
      const spPr = ensureSpPr(slideSp)
      spPr.insertBefore(slideSp.ownerDocument.importNode(sourceXfrm, true), spPr.firstChild)
    }
  }

  // 2. Inherit missing visual spPr pieces (fill/line/geometry) from layout,
  //    falling back to master. This is what makes placeholder-based autoshapes
  //    look the same as in PowerPoint — the slide XML commonly has only text
  //    runs and delegates visuals to the layout template.
  //
  //    Text placeholders (title/body/footer/etc.) are intentionally skipped:
  //    PowerPoint does not paint a fill behind them even when their layout
  //    style references a theme accent. Copying layout fills onto title/body
  //    boxes is what makes decks look "covered in accent color" after import.
  const phType = getPlaceholderType(slideSp)
  const isTextPlaceholder = TEXT_PLACEHOLDER_TYPES.has(phType)
  const slideVisuals = hasExplicitVisuals(slideSp)
  const layoutSpPr = layoutMatch ? getChild(layoutMatch, 'p:spPr') : undefined
  const masterSpPr = masterMatch ? getChild(masterMatch, 'p:spPr') : undefined
  const allowExplicitBodyVisuals =
    isTextPlaceholder && canTextPlaceholderInheritExplicitVisuals(phType, layoutSpPr, masterSpPr)

  if ((!isTextPlaceholder || allowExplicitBodyVisuals) && !slideVisuals.fill) {
    const spPr = ensureSpPr(slideSp)
    if (layoutSpPr) copyFillChildren(spPr, layoutSpPr)
    if (
      !getDirectChild(spPr, 'a:solidFill') &&
      !getDirectChild(spPr, 'a:gradFill') &&
      !getDirectChild(spPr, 'a:blipFill') &&
      !getDirectChild(spPr, 'a:noFill') &&
      masterSpPr
    ) {
      copyFillChildren(spPr, masterSpPr)
    }
  }

  if ((!isTextPlaceholder || allowExplicitBodyVisuals) && !slideVisuals.line) {
    const spPr = ensureSpPr(slideSp)
    if (layoutSpPr) copyLineChildren(spPr, layoutSpPr)
    if (!getDirectChild(spPr, 'a:ln') && masterSpPr) copyLineChildren(spPr, masterSpPr)
  }

  // Geometry inheritance is also limited to non-text placeholders. Copying a
  // layout's <a:prstGeom> onto a title/body placeholder would re-route the
  // slide element through the shape pipeline (rectangle + theme accent fill)
  // and produce visible colored boxes behind every imported title.
  if ((!isTextPlaceholder || allowExplicitBodyVisuals) && !slideVisuals.prstGeom && !slideVisuals.custGeom) {
    const spPr = ensureSpPr(slideSp)
    if (layoutSpPr) copyGeometry(spPr, layoutSpPr)
    if (!getDirectChild(spPr, 'a:prstGeom') && !getDirectChild(spPr, 'a:custGeom') && masterSpPr) {
      copyGeometry(spPr, masterSpPr)
    }
  }

  // 3. Inherit <p:style> (fillRef / lnRef / fontRef) when the slide omits it.
  //    We still inherit style for text placeholders so fontRef keeps
  //    working — but resolveTextBackgroundFromShape deliberately ignores
  //    fillRef for text boxes, so this no longer produces stray fills.
  if (!hasExplicitStyle(slideSp)) {
    const layoutStyle = layoutMatch ? getChild(layoutMatch, 'p:style') : undefined
    const masterStyle = masterMatch ? getChild(masterMatch, 'p:style') : undefined
    const source = layoutStyle || masterStyle
    if (source) {
      slideSp.appendChild(slideSp.ownerDocument.importNode(source, true))
    }
  }

  // 4. If the slide shape has no meaningful text AND the layout copy has some,
  //    borrow its txBody so users see a rendered title/subtitle instead of a
  //    blank spot. We skip "Click to add title" style instruction text by
  //    requiring the layout copy to NOT contain <a:fld> (date/footer fields
  //    are the main false positives) and to have at least one non-empty run.
  if (!hasAnyRunText(slideSp)) {
    const sourceTxBody = getChild(inheritanceSource, 'p:txBody')
    if (sourceTxBody && hasAnyRunText(inheritanceSource)) {
      const existingTxBody = getChild(slideSp, 'p:txBody')
      if (existingTxBody) {
        slideSp.replaceChild(slideSp.ownerDocument.importNode(sourceTxBody, true), existingTxBody)
      } else {
        slideSp.appendChild(slideSp.ownerDocument.importNode(sourceTxBody, true))
      }
    }
  }
}
