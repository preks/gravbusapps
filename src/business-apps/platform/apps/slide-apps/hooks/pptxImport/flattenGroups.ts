// Flatten grouped shapes (<p:grpSp>) into slide-absolute coordinates.

import type { AnySlideElement } from '../../components/slideElements'
import type { OoxmlTheme, SlideRelationships } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import { getChild, isInsideGroup } from './ooxmlUtils'
import { extractPSpToSingleElement } from './extractShapes'
import { extractImageElements } from './extractImages'

interface GroupTransform {
  x: number
  y: number
  cx: number
  cy: number
  chOffX: number
  chOffY: number
  chExtCX: number
  chExtCY: number
  /** Group rotation in degrees (converted from the OOXML 60000ths). */
  rotDeg: number
  flipH: boolean
  flipV: boolean
}

function isGroupPlaceholder(spEl: Element): boolean {
  const nvSpPr = getChild(spEl, 'p:nvSpPr')
  if (!nvSpPr) return false
  const nvPr = getChild(nvSpPr, 'p:nvPr')
  if (!nvPr) return false
  return !!getChild(nvPr, 'p:ph')
}

function wrapNodeInMiniSlideDoc(el: Element): Document {
  const d = new DOMParser().parseFromString(
    `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree></p:spTree></p:cSld></p:sld>`,
    'text/xml'
  )
  d.getElementsByTagName('p:spTree')[0]!.appendChild(d.importNode(el, true))
  return d
}

function getGroupTransform(grpSp: Element): GroupTransform | undefined {
  const grpSpPr = getChild(grpSp, 'p:grpSpPr')
  if (!grpSpPr) return undefined

  const xfrm = getChild(grpSpPr, 'a:xfrm')
  if (!xfrm) return undefined

  const off = getChild(xfrm, 'a:off')
  const ext = getChild(xfrm, 'a:ext')
  const chOff = getChild(xfrm, 'a:chOff')
  const chExt = getChild(xfrm, 'a:chExt')

  if (!off || !ext || !chOff || !chExt) return undefined

  const rotRaw = parseInt(xfrm.getAttribute('rot') || '0')
  const rotDeg = Number.isFinite(rotRaw) ? rotRaw / 60000 : 0
  const flipH = xfrm.getAttribute('flipH') === '1'
  const flipV = xfrm.getAttribute('flipV') === '1'

  return {
    x: parseInt(off.getAttribute('x') || '0'),
    y: parseInt(off.getAttribute('y') || '0'),
    cx: parseInt(ext.getAttribute('cx') || '0'),
    cy: parseInt(ext.getAttribute('cy') || '0'),
    chOffX: parseInt(chOff.getAttribute('x') || '0'),
    chOffY: parseInt(chOff.getAttribute('y') || '0'),
    chExtCX: parseInt(chExt.getAttribute('cx') || '1'),
    chExtCY: parseInt(chExt.getAttribute('cy') || '1'),
    rotDeg,
    flipH,
    flipV
  }
}

/**
 * Apply a group's transform to a child element, composing scale, flip,
 * translation, and rotation in the same order PowerPoint does:
 *  1. Scale child coordinates from group child-space to group slide-space.
 *  2. Mirror horizontally/vertically inside the group box when flipH/flipV.
 *  3. Translate into slide space using the group's own offset.
 *  4. Rotate the child's center around the group's slide-space center by
 *     the group's rotation and compose rotations on the child.
 *
 * Note: we do not change the child element's own width/height under rotation;
 * the child's `rotation` property carries the angular offset so downstream
 * renderers that already respect rotation produce the correct visual.
 */
function transformElementPosition(element: AnySlideElement, gt: GroupTransform, emuPerPx: number): AnySlideElement {
  const childX = element.position.x * emuPerPx
  const childY = element.position.y * emuPerPx
  const childW = element.size.width * emuPerPx
  const childH = element.size.height * emuPerPx

  const scaleX = gt.chExtCX > 0 ? gt.cx / gt.chExtCX : 1
  const scaleY = gt.chExtCY > 0 ? gt.cy / gt.chExtCY : 1

  // Step 1: child-space -> group-local (scaled) coordinates.
  let localX = (childX - gt.chOffX) * scaleX
  let localY = (childY - gt.chOffY) * scaleY
  const localW = childW * scaleX
  const localH = childH * scaleY

  // Step 2: apply group flips inside the group box.
  if (gt.flipH) localX = gt.cx - localX - localW
  if (gt.flipV) localY = gt.cy - localY - localH

  // Step 3: translate to slide space.
  let slideX = gt.x + localX
  let slideY = gt.y + localY

  // Step 4: rotate the child's center around the group's slide-space center.
  if (gt.rotDeg !== 0) {
    const centerX = gt.x + gt.cx / 2
    const centerY = gt.y + gt.cy / 2
    const childCx = slideX + localW / 2
    const childCy = slideY + localH / 2
    const rot = (gt.rotDeg * Math.PI) / 180
    const cosR = Math.cos(rot)
    const sinR = Math.sin(rot)
    const dx = childCx - centerX
    const dy = childCy - centerY
    const newCx = centerX + dx * cosR - dy * sinR
    const newCy = centerY + dx * sinR + dy * cosR
    slideX = newCx - localW / 2
    slideY = newCy - localH / 2
  }

  // Compose rotations: a flip flips the rotation sign.
  const existingRot = (element as AnySlideElement & { rotation?: number }).rotation ?? 0
  const flipSign = gt.flipH !== gt.flipV ? -1 : 1
  const composedRotation = flipSign * existingRot + gt.rotDeg

  // Propagate flips into the child's importMeta when present so renderers
  // that honor preset flip flags keep the visual in sync. We XOR because two
  // flips cancel.
  const transformed: AnySlideElement = {
    ...element,
    position: { x: Math.max(0, slideX / emuPerPx), y: Math.max(0, slideY / emuPerPx) },
    size: { width: Math.max(10, localW / emuPerPx), height: Math.max(10, localH / emuPerPx) }
  }

  if ('rotation' in transformed) {
    ;(transformed as AnySlideElement & { rotation: number }).rotation = composedRotation
  }

  if (element.type === 'shape' && element.importMeta) {
    const nextFlipH = (element.importMeta.flipH ?? false) !== gt.flipH
    const nextFlipV = (element.importMeta.flipV ?? false) !== gt.flipV
    const nextMeta = { ...element.importMeta }
    if (nextFlipH) nextMeta.flipH = true
    else delete nextMeta.flipH
    if (nextFlipV) nextMeta.flipV = true
    else delete nextMeta.flipV
    ;(transformed as typeof element).importMeta = nextMeta
  }

  return transformed
}

function flattenSingleGroup(
  grpSp: Element,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships,
  imageData: Map<string, string>,
  messages: ParserMessage[],
  slideIndex: number
): AnySlideElement[] {
  const EMU_PER_PX = 9525
  const gt = getGroupTransform(grpSp)
  if (!gt) return []

  const childElements: AnySlideElement[] = []

  for (let j = 0; j < grpSp.childNodes.length; j++) {
    const child = grpSp.childNodes[j] as Element
    if (!child.tagName) continue
    if (child.tagName === 'p:sp') {
      if (isGroupPlaceholder(child)) continue
      const d = wrapNodeInMiniSlideDoc(child)
      const el = extractPSpToSingleElement(d, theme, relationships, messages, slideIndex, undefined)
      if (el) childElements.push(el)
    } else if (child.tagName === 'p:pic') {
      childElements.push(
        ...extractImageElements(wrapNodeInMiniSlideDoc(child), relationships, imageData, messages, slideIndex)
      )
    } else if (child.tagName === 'p:grpSp') {
      // Nested group: flatten recursively. The inner flatten produces
      // elements in the OUTER group's child coordinate space, which is
      // exactly what {@link transformElementPosition} expects as input,
      // so transforms compose naturally.
      childElements.push(...flattenSingleGroup(child, theme, relationships, imageData, messages, slideIndex))
    }
  }

  return childElements.map(el => transformElementPosition(el, gt, EMU_PER_PX))
}

/**
 * When called with a specific grpSp element, flattens only that group.
 * When called without, scans the whole document for top-level groups.
 */
export function flattenGroupedShapes(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships,
  imageData: Map<string, string>,
  messages: ParserMessage[],
  slideIndex: number,
  singleGroup?: Element
): AnySlideElement[] {
  if (singleGroup) {
    messages.push({
      type: 'info',
      message: 'parser-group-flattened',
      params: { slide: String(slideIndex + 1) }
    })
    return flattenSingleGroup(singleGroup, theme, relationships, imageData, messages, slideIndex)
  }

  // Legacy path: scan whole document
  const result: AnySlideElement[] = []
  const grpSpElements = slideXml.getElementsByTagName('p:grpSp')
  let reportedForSlide = false

  for (let i = 0; i < grpSpElements.length; i++) {
    const grpSp = grpSpElements[i]
    if (isInsideGroup(grpSp)) continue

    if (!reportedForSlide) {
      messages.push({
        type: 'info',
        message: 'parser-group-flattened',
        params: { slide: String(slideIndex + 1) }
      })
      reportedForSlide = true
    }

    result.push(...flattenSingleGroup(grpSp, theme, relationships, imageData, messages, slideIndex))
  }

  return result
}
