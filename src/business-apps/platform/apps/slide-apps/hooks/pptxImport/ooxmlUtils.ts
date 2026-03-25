// OOXML unit conversion and XML helper utilities.

import type { OoxmlTheme, OoxmlTransform } from './types'

const EMU_PER_PIXEL = 9525
const HUNDREDTHS_POINT_TO_PX = 96 / 72 / 100

export function emuToPixels(emu: number): number {
  return emu / EMU_PER_PIXEL
}

export function hundredthsPointToPixels(hp: number): number {
  return hp * HUNDREDTHS_POINT_TO_PX
}

export function rotationToAngle(rot: number | undefined): number {
  return (rot ?? 0) / 60000
}

export function parseXML(xmlString: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(xmlString, 'text/xml')
}

export function getChild(parent: Element, tagName: string): Element | undefined {
  return parent.getElementsByTagName(tagName)[0] as Element | undefined
}

export function getChildren(parent: Element, tagName: string): Element[] {
  return Array.from(parent.getElementsByTagName(tagName))
}

/**
 * Walk up the tree to check if an element is inside a <p:grpSp>.
 * Stops at <p:spTree> to avoid false positives in fakeDoc contexts.
 */
const ELEMENT_NODE = 1

export function isInsideGroup(element: Element): boolean {
  let node: Node | null = element.parentNode
  while (node && node.nodeType === ELEMENT_NODE) {
    const tag = (node as Element).tagName
    if (tag === 'p:grpSp') return true
    if (tag === 'p:spTree') return false
    node = node.parentNode
  }
  return false
}

export function extractTransform(shapeEl: Element): OoxmlTransform | undefined {
  const xfrm = getChild(shapeEl, 'a:xfrm')
  if (!xfrm) return undefined

  const off = getChild(xfrm, 'a:off')
  const ext = getChild(xfrm, 'a:ext')
  if (!off || !ext) return undefined

  return {
    x: parseInt(off.getAttribute('x') || '0'),
    y: parseInt(off.getAttribute('y') || '0'),
    cx: parseInt(ext.getAttribute('cx') || '0'),
    cy: parseInt(ext.getAttribute('cy') || '0'),
    rotation: xfrm.getAttribute('rot') ? parseInt(xfrm.getAttribute('rot')!) : undefined
  }
}

function applyLuminanceModifiers(hex: string, lumMod?: number, lumOff?: number): string {
  if (lumMod === undefined && lumOff === undefined) return hex

  let r = parseInt(hex.slice(0, 2), 16) / 255
  let g = parseInt(hex.slice(2, 4), 16) / 255
  let b = parseInt(hex.slice(4, 6), 16) / 255

  const mod = (lumMod ?? 100000) / 100000
  const off = (lumOff ?? 0) / 100000

  r = Math.min(1, Math.max(0, r * mod + off))
  g = Math.min(1, Math.max(0, g * mod + off))
  b = Math.min(1, Math.max(0, b * mod + off))

  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function resolveColor(colorEl: Element, theme?: OoxmlTheme): string | undefined {
  const srgb = getChild(colorEl, 'a:srgbClr')
  if (srgb) {
    const val = srgb.getAttribute('val')
    if (!val) return undefined
    const lumMod = getChild(srgb, 'a:lumMod')
    const lumOff = getChild(srgb, 'a:lumOff')
    return `#${applyLuminanceModifiers(
      val,
      lumMod ? parseInt(lumMod.getAttribute('val') || '100000') : undefined,
      lumOff ? parseInt(lumOff.getAttribute('val') || '0') : undefined
    )}`
  }

  const scheme = getChild(colorEl, 'a:schemeClr')
  if (scheme && theme) {
    const schemeVal = scheme.getAttribute('val')
    if (!schemeVal) return undefined
    const resolved = theme.colors.get(schemeVal)
    if (!resolved) return undefined
    const hex = resolved.replace('#', '')
    const lumMod = getChild(scheme, 'a:lumMod')
    const lumOff = getChild(scheme, 'a:lumOff')
    return `#${applyLuminanceModifiers(
      hex,
      lumMod ? parseInt(lumMod.getAttribute('val') || '100000') : undefined,
      lumOff ? parseInt(lumOff.getAttribute('val') || '0') : undefined
    )}`
  }

  return undefined
}

export function parseSolidFill(fillNode: Element, theme?: OoxmlTheme): string | undefined {
  return resolveColor(fillNode, theme)
}

export function parseGradientFill(
  gradFillNode: Element,
  theme?: OoxmlTheme
): { type: 'linear' | 'radial'; angle: number; stops: { color: string; position: number }[] } | undefined {
  const gsLst = getChild(gradFillNode, 'a:gsLst')
  if (!gsLst) return undefined

  const gsElements = getChildren(gsLst, 'a:gs')
  if (gsElements.length === 0) return undefined

  const stops = gsElements
    .map(gs => {
      const pos = parseInt(gs.getAttribute('pos') || '0') / 1000
      const color = resolveColor(gs, theme)
      return color ? { color, position: pos } : null
    })
    .filter((s): s is { color: string; position: number } => s !== null)

  if (stops.length === 0) return undefined

  const lin = getChild(gradFillNode, 'a:lin')
  const angle = lin ? parseInt(lin.getAttribute('ang') || '0') / 60000 : 0
  const isLinear = !!lin

  return { type: isLinear ? 'linear' : 'radial', angle, stops }
}
