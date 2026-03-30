// Flatten grouped shapes (<p:grpSp>) into slide-absolute coordinates.

import type { AnySlideElement } from '../../components/slideElements'
import type { OoxmlTheme, SlideRelationships } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import { getChild, isInsideGroup } from './ooxmlUtils'
import { extractTextElements } from './extractText'
import { extractShapeElements } from './extractShapes'
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

  return {
    x: parseInt(off.getAttribute('x') || '0'),
    y: parseInt(off.getAttribute('y') || '0'),
    cx: parseInt(ext.getAttribute('cx') || '0'),
    cy: parseInt(ext.getAttribute('cy') || '0'),
    chOffX: parseInt(chOff.getAttribute('x') || '0'),
    chOffY: parseInt(chOff.getAttribute('y') || '0'),
    chExtCX: parseInt(chExt.getAttribute('cx') || '1'),
    chExtCY: parseInt(chExt.getAttribute('cy') || '1')
  }
}

function transformElementPosition(element: AnySlideElement, gt: GroupTransform, emuPerPx: number): AnySlideElement {
  const childX = element.position.x * emuPerPx
  const childY = element.position.y * emuPerPx
  const childW = element.size.width * emuPerPx
  const childH = element.size.height * emuPerPx

  const scaleX = gt.chExtCX > 0 ? gt.cx / gt.chExtCX : 1
  const scaleY = gt.chExtCY > 0 ? gt.cy / gt.chExtCY : 1

  const absX = gt.x + (childX - gt.chOffX) * scaleX
  const absY = gt.y + (childY - gt.chOffY) * scaleY
  const absW = childW * scaleX
  const absH = childH * scaleY

  return {
    ...element,
    position: { x: Math.max(0, absX / emuPerPx), y: Math.max(0, absY / emuPerPx) },
    size: { width: Math.max(10, absW / emuPerPx), height: Math.max(10, absH / emuPerPx) }
  }
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

  const fakeDoc = new DOMParser().parseFromString(
    `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree></p:spTree></p:cSld></p:sld>`,
    'text/xml'
  )
  const spTree = fakeDoc.getElementsByTagName('p:spTree')[0]

  for (let j = 0; j < grpSp.childNodes.length; j++) {
    const child = grpSp.childNodes[j] as Element
    if (child.tagName === 'p:sp' || child.tagName === 'p:pic') {
      spTree.appendChild(fakeDoc.importNode(child, true))
    }
  }

  const textEls = extractTextElements(fakeDoc, theme, relationships)
  const shapeEls = extractShapeElements(fakeDoc, theme, messages, slideIndex)
  const imageEls = extractImageElements(fakeDoc, relationships, imageData)
  const childElements: AnySlideElement[] = [...textEls, ...shapeEls, ...imageEls]

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
