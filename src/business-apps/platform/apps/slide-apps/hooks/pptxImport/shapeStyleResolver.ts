// Shared Office-style resolver for OOXML shapes.
//
// PowerPoint applies a precise precedence order when rendering shape visuals:
// 1. Explicit properties on p:spPr (solidFill, gradFill, blipFill, noFill; a:ln)
// 2. References into the theme's fmtScheme via p:style
//    (a:fillRef idx=1..3 = subtle/moderate/intense fill; a:lnRef idx=1..3 = line)
// 3. No style / nothing defined → shape has no visible fill / line.
//
// Without this resolver each importer guessed; the result was shapes going
// transparent whenever the slide relied on fillRef indexes (the common case
// for decks generated in PowerPoint — placeholder boxes almost always stay
// idx=1 against the theme).
//
// This module centralises the logic so extractShapes and extractText (the
// "p:sp with text-only txBody" path) agree, and so placeholder/layout
// inheritance can be stacked on top deterministically.

import type { OoxmlTheme } from './types'
import { emuToPixels, getChild, getDirectChild, parseGradientFill, parseSolidFill } from './ooxmlUtils'

/** Color-child tag names that may appear inside a fillRef/lnRef or fill element. */
const COLOR_CHILD_TAGS = ['a:srgbClr', 'a:schemeClr', 'a:prstClr', 'a:sysClr', 'a:hslClr', 'a:scrgbClr']

function getColorChild(el: Element): Element | undefined {
  for (const tag of COLOR_CHILD_TAGS) {
    const c = getDirectChild(el, tag)
    if (c) return c
  }
  return undefined
}

/**
 * Recursively walk a cloned theme-template subtree and replace every
 * `<a:schemeClr val="phClr">` with the given override color element, while
 * preserving any transforms that were nested inside the phClr placeholder
 * (e.g. `<a:lumMod/>`, `<a:shade/>`). Transforms from the template are
 * appended after the override's own transforms so idx=2/3's luminosity /
 * shade still applies to the overridden accent.
 */
function substitutePhClr(node: Element, override: Element): void {
  // Collect child elements up front to avoid mutating while iterating.
  const children: Element[] = []
  for (const raw of Array.from(node.childNodes)) {
    const c = raw as Element
    if (c.tagName) children.push(c)
  }
  for (const child of children) {
    if (child.tagName === 'a:schemeClr' && child.getAttribute('val') === 'phClr') {
      const replacement = override.cloneNode(true) as Element
      for (const rawTransform of Array.from(child.childNodes)) {
        const transform = rawTransform as Element
        if (transform.tagName) replacement.appendChild(transform.cloneNode(true))
      }
      node.replaceChild(replacement, child)
    } else {
      substitutePhClr(child, override)
    }
  }
}

/**
 * Produce a fill template instance with phClr substituted by the override
 * color. Returns undefined when either the template or override is missing —
 * callers should fall back to simple fillRef parsing in that case.
 */
function instantiateFillTemplate(template: Element, override: Element): Element | undefined {
  const clone = template.cloneNode(true) as Element
  substitutePhClr(clone, override)
  return clone
}

/**
 * Resolve an `<a:fillRef idx="N">` using the theme's `fmtScheme`. Returns
 * both a CSS color and an optional gradient descriptor when the template is
 * a `a:gradFill`. Returns undefined when the theme has no matching template
 * or the reference lacks a usable color child.
 */
function resolveFillRefTemplate(
  fillRef: Element,
  idx: number,
  theme: OoxmlTheme | undefined
): { color: string; gradient?: ReturnType<typeof parseGradientFill> } | undefined {
  if (!theme?.fmtFillStyles || idx < 1 || idx > theme.fmtFillStyles.length) return undefined
  const template = theme.fmtFillStyles[idx - 1]
  if (!template) return undefined
  const override = getColorChild(fillRef)
  if (!override) return undefined
  const instance = instantiateFillTemplate(template, override)
  if (!instance) return undefined

  if (instance.tagName === 'a:solidFill') {
    const color = parseSolidFill(instance, theme)
    return color ? { color } : undefined
  }
  if (instance.tagName === 'a:gradFill') {
    const grad = parseGradientFill(instance, theme)
    if (grad && grad.stops.length > 0) {
      return { color: grad.stops[0].color, gradient: grad }
    }
  }
  return undefined
}

function resolveLineRefTemplate(
  lnRef: Element,
  idx: number,
  theme: OoxmlTheme | undefined
): { color: string; width?: number; style?: ResolvedLine['style'] } | undefined {
  if (!theme?.fmtLineStyles || idx < 1 || idx > theme.fmtLineStyles.length) return undefined
  const template = theme.fmtLineStyles[idx - 1]
  if (!template) return undefined
  const override = getColorChild(lnRef)
  if (!override) return undefined
  const instance = instantiateFillTemplate(template, override)
  if (!instance) return undefined

  // fmtScheme line templates are themselves `a:ln` elements.
  const solidFill = getDirectChild(instance, 'a:solidFill')
  let color: string | undefined
  if (solidFill) color = parseSolidFill(solidFill, theme)

  const widthEmu = Number.parseInt(instance.getAttribute('w') || '0') || 0
  const width = widthEmu > 0 ? Math.max(0, Math.round(emuToPixels(widthEmu))) : undefined

  let style: ResolvedLine['style'] | undefined
  const prstDash = getDirectChild(instance, 'a:prstDash')
  if (prstDash) {
    style = DASH_MAP[prstDash.getAttribute('val') || 'solid'] || 'solid'
  }

  if (!color) return undefined
  return { color, width, style }
}

export interface ResolvedGradient {
  type: 'linear' | 'radial'
  angle: number
  stops: { color: string; position: number }[]
}

export interface ResolvedPicture {
  /** `r:embed` id on the blip — caller resolves to an image src via relationships. */
  relId?: string
  stretch?: boolean
  tile?: boolean
}

export interface ResolvedPattern {
  /** Preset id (`dkHorz`, `lgGrid`, etc.). */
  preset: string
  fgColor: string
  bgColor: string
}

export interface ResolvedFill {
  /** Solid CSS color string (`#rrggbb` or `rgba(...)`). `transparent` for a:noFill. */
  color: string
  gradient?: ResolvedGradient
  /** Picture fill metadata (from `a:blipFill`). Unresolved — caller maps relId → src. */
  picture?: ResolvedPicture
  /** Pattern fill metadata (from `a:pattFill`). */
  pattern?: ResolvedPattern
  /**
   * True when OOXML did not define the fill anywhere; callers can apply their
   * own defaults (e.g. "inherit from layout/master") without trampling an
   * explicit a:noFill / solidFill.
   */
  inherited: boolean
  kind: 'none' | 'solid' | 'gradient' | 'blip' | 'pattern' | 'noFill'
}

/**
 * OOXML line compound type (`a:ln cmpd`). Distinguishes single strokes from
 * double / thick-thin / thin-thick / triple compound outlines. Renderers
 * approximate the non-single variants by layering a second parallel stroke.
 */
export type ResolvedLineCompound = 'sng' | 'dbl' | 'thickThin' | 'thinThick' | 'tri'
/** OOXML line cap (`a:ln cap`). Maps directly onto SVG `stroke-linecap`. */
export type ResolvedLineCap = 'rnd' | 'sq' | 'flat'
/** OOXML line join (`a:miter/round/bevel`). Maps onto SVG `stroke-linejoin`. */
export type ResolvedLineJoin = 'miter' | 'round' | 'bevel'
/** OOXML `a:headEnd` / `a:tailEnd` arrowhead preset. */
export type ResolvedLineEndType = 'none' | 'triangle' | 'stealth' | 'diamond' | 'oval' | 'arrow'
export interface ResolvedLineEnd {
  type: ResolvedLineEndType
  width?: 'sm' | 'med' | 'lg'
  length?: 'sm' | 'med' | 'lg'
}

export interface ResolvedLine {
  color: string
  /** Pixel width; 0 means "do not draw". */
  width: number
  style: 'solid' | 'dashed' | 'dotted'
  inherited: boolean
  /** Compound outline (single by default; dbl / triple / thick-thin variants). */
  compound?: ResolvedLineCompound
  /** Stroke cap. Unset falls through to the renderer default (`butt`). */
  cap?: ResolvedLineCap
  /** Stroke join. Unset falls through to the renderer default. */
  join?: ResolvedLineJoin
  /** Arrowhead at the start of the line (OOXML `a:headEnd`). */
  headEnd?: ResolvedLineEnd
  /** Arrowhead at the end of the line (OOXML `a:tailEnd`). */
  tailEnd?: ResolvedLineEnd
}

const DASH_MAP: Record<string, ResolvedLine['style']> = {
  solid: 'solid',
  dash: 'dashed',
  dot: 'dotted',
  lgDash: 'dashed',
  dashDot: 'dashed',
  lgDashDot: 'dashed',
  lgDashDotDot: 'dashed',
  sysDash: 'dashed',
  sysDot: 'dotted',
  sysDashDot: 'dashed',
  sysDashDotDot: 'dashed'
}

/**
 * Read a style-only fill reference (a:fillRef / a:lnRef).
 *
 * The color child inside fillRef/lnRef describes HOW to tweak the referenced
 * theme fill (e.g. schemeClr with lumMod), but the base color still needs to
 * come from the theme. `parseSolidFill` understands the full transform chain,
 * so passing the ref element through it is correct — and importantly it does
 * NOT return `'transparent'` when the child happens to use `phClr`, which some
 * decks emit to defer to the slide's colormap.
 *
 * `idx=0` is "no fill from this path" (same for line). We return undefined in
 * that case so callers can continue the inheritance chain rather than treat
 * `0` as "transparent" (which was the previous bug).
 */
function resolveStyleFill(
  styleEl: Element | undefined,
  theme: OoxmlTheme | undefined
): { color?: string; idx: number; gradient?: ReturnType<typeof parseGradientFill> } | undefined {
  if (!styleEl) return undefined
  const fillRef = getDirectChild(styleEl, 'a:fillRef')
  if (!fillRef) return undefined
  const idx = Number.parseInt(fillRef.getAttribute('idx') || '0')
  if (!Number.isFinite(idx)) return { idx: 0 }
  if (idx === 0) return { idx: 0 }

  // Preferred path: expand the theme's fmtScheme template at `idx` so the
  // subtle/moderate/intense variations carry through (idx=2 typically adds
  // a small lumMod; idx=3 adds shade + gradient). Without this step every
  // idx collapses to the raw accent color and decks that rely on fillRef
  // variations look monochromatic.
  const templated = resolveFillRefTemplate(fillRef, idx, theme)
  if (templated) {
    return { color: templated.color, idx, gradient: templated.gradient }
  }

  // Fallback: no fmtScheme template or no color override on the ref. Use the
  // direct color parse; this still honours lumMod/shade declared inline on
  // the ref and keeps backwards compatibility with decks that don't carry
  // a fmtScheme.
  const color = parseSolidFill(fillRef, theme)
  if (color) return { color, idx }

  // Last resort — fillRef used a bare `phClr` with no override and no
  // template. Fall back to theme accent1 so the shape is not invisible.
  if (theme) {
    const accent1 = theme.colors.get('accent1')
    if (accent1) return { color: accent1.startsWith('#') ? accent1 : `#${accent1}`, idx }
  }
  return { idx }
}

function resolveStyleLine(
  styleEl: Element | undefined,
  theme: OoxmlTheme | undefined
): { color?: string; idx: number; width?: number; style?: ResolvedLine['style'] } | undefined {
  if (!styleEl) return undefined
  const lnRef = getDirectChild(styleEl, 'a:lnRef')
  if (!lnRef) return undefined
  const idx = Number.parseInt(lnRef.getAttribute('idx') || '0')
  if (!Number.isFinite(idx)) return { idx: 0 }
  if (idx === 0) return { idx: 0 }

  // As with fillRef, prefer the fmtScheme template. Line templates carry a
  // `w` attribute (line width) so idx=2/3 actually thicken the stroke in
  // addition to the luminosity transform.
  const templated = resolveLineRefTemplate(lnRef, idx, theme)
  if (templated) {
    return { color: templated.color, idx, width: templated.width, style: templated.style }
  }

  const color = parseSolidFill(lnRef, theme)
  if (color) return { color, idx }
  if (theme) {
    const dk1 = theme.colors.get('dk1')
    if (dk1) return { color: dk1.startsWith('#') ? dk1 : `#${dk1}`, idx }
  }
  return { idx }
}

/**
 * Resolve an Office-style shape fill from a single {@code p:sp} element.
 * This inspects explicit {@code p:spPr} children first, then falls back to
 * {@code p:style}'s {@code a:fillRef}, and finally returns `inherited: true`
 * so upstream inheritance/layout lookups can supply the default.
 */
export function resolveShapeFill(shape: Element, theme: OoxmlTheme | undefined): ResolvedFill {
  const spPr = getChild(shape, 'p:spPr')
  if (spPr) {
    const noFill = getDirectChild(spPr, 'a:noFill')
    if (noFill) return { color: 'transparent', inherited: false, kind: 'noFill' }

    const gradFill = getDirectChild(spPr, 'a:gradFill')
    if (gradFill) {
      const parsed = parseGradientFill(gradFill, theme)
      if (parsed) {
        return {
          color: parsed.stops[0]?.color || 'transparent',
          gradient: parsed,
          inherited: false,
          kind: 'gradient'
        }
      }
    }

    const solidFill = getDirectChild(spPr, 'a:solidFill')
    if (solidFill) {
      const color = parseSolidFill(solidFill, theme)
      if (color) return { color, inherited: false, kind: 'solid' }
    }

    const blipFill = getDirectChild(spPr, 'a:blipFill')
    if (blipFill) {
      const blip = getDirectChild(blipFill, 'a:blip')
      const relId =
        blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ??
        blip?.getAttribute('r:embed') ??
        undefined
      const stretch = getDirectChild(blipFill, 'a:stretch') != null
      const tile = getDirectChild(blipFill, 'a:tile') != null
      return {
        color: 'transparent',
        inherited: false,
        kind: 'blip',
        picture: { relId: relId || undefined, stretch, tile }
      }
    }

    const pattFill = getDirectChild(spPr, 'a:pattFill')
    if (pattFill) {
      const preset = pattFill.getAttribute('prst') || 'pct50'
      const fgEl = getDirectChild(pattFill, 'a:fgClr')
      const bgEl = getDirectChild(pattFill, 'a:bgClr')
      const fgColor = (fgEl && parseSolidFill(fgEl, theme)) || '#000000'
      const bgColor = (bgEl && parseSolidFill(bgEl, theme)) || '#ffffff'
      return {
        color: fgColor,
        inherited: false,
        kind: 'pattern',
        pattern: { preset, fgColor, bgColor }
      }
    }
  }

  const style = getChild(shape, 'p:style')
  const styleFill = resolveStyleFill(style, theme)
  if (styleFill?.color) {
    // If the fmtScheme template expanded into a gradient (idx=2/3 often do)
    // surface it so renderers can draw the actual gradient rather than a
    // flat fill of the first stop.
    if (styleFill.gradient) {
      return {
        color: styleFill.color,
        gradient: styleFill.gradient,
        inherited: false,
        kind: 'gradient'
      }
    }
    return { color: styleFill.color, inherited: false, kind: 'solid' }
  }

  return { color: 'transparent', inherited: true, kind: 'none' }
}

/**
 * Resolve an Office-style shape outline from a single {@code p:sp} element.
 * Falls through to {@code p:style > a:lnRef} when {@code a:ln} is missing.
 */
function parseLineEnd(el: Element | undefined): ResolvedLineEnd | undefined {
  if (!el) return undefined
  const type = (el.getAttribute('type') || 'none') as ResolvedLineEndType
  if (type === 'none') return { type: 'none' }
  const width = el.getAttribute('w') as 'sm' | 'med' | 'lg' | null
  const length = el.getAttribute('len') as 'sm' | 'med' | 'lg' | null
  return {
    type,
    ...(width ? { width } : {}),
    ...(length ? { length } : {})
  }
}

function parseLineJoin(ln: Element): ResolvedLineJoin | undefined {
  if (getDirectChild(ln, 'a:miter')) return 'miter'
  if (getDirectChild(ln, 'a:round')) return 'round'
  if (getDirectChild(ln, 'a:bevel')) return 'bevel'
  return undefined
}

export function resolveShapeLine(shape: Element, theme: OoxmlTheme | undefined): ResolvedLine {
  const spPr = getChild(shape, 'p:spPr')
  if (spPr) {
    const ln = getDirectChild(spPr, 'a:ln')
    if (ln) {
      const widthEmu = Number.parseInt(ln.getAttribute('w') || '0')
      let width = widthEmu ? Math.max(0, Math.round(emuToPixels(widthEmu))) : 0

      let color = '#000000'
      const solidFill = getDirectChild(ln, 'a:solidFill')
      if (solidFill) {
        const parsed = parseSolidFill(solidFill, theme)
        if (parsed) color = parsed
      }

      let style: ResolvedLine['style'] = 'solid'
      const prstDash = getDirectChild(ln, 'a:prstDash')
      if (prstDash) {
        const val = prstDash.getAttribute('val') || 'solid'
        style = DASH_MAP[val] || 'solid'
      }

      if (getDirectChild(ln, 'a:noFill')) width = 0

      const cmpdAttr = ln.getAttribute('cmpd') as ResolvedLineCompound | null
      const capAttr = ln.getAttribute('cap') as ResolvedLineCap | null
      const join = parseLineJoin(ln)
      const headEnd = parseLineEnd(getDirectChild(ln, 'a:headEnd'))
      const tailEnd = parseLineEnd(getDirectChild(ln, 'a:tailEnd'))

      return {
        color,
        width,
        style,
        inherited: false,
        ...(cmpdAttr && cmpdAttr !== 'sng' ? { compound: cmpdAttr } : {}),
        ...(capAttr ? { cap: capAttr } : {}),
        ...(join ? { join } : {}),
        ...(headEnd ? { headEnd } : {}),
        ...(tailEnd ? { tailEnd } : {})
      }
    }
  }

  const style = getChild(shape, 'p:style')
  const styleLine = resolveStyleLine(style, theme)
  if (styleLine?.color) {
    return {
      color: styleLine.color,
      width: styleLine.width ?? 1,
      style: styleLine.style ?? 'solid',
      inherited: false
    }
  }

  return { color: '#000000', width: 0, style: 'solid', inherited: true }
}

/**
 * Utility for text-box background extraction. Returns CSS-ready values that
 * match {@code TextElement.backgroundColor}/{@code gradient}.
 *
 * Unlike {@link resolveShapeFill}, this path is INTENTIONALLY conservative
 * and only honours explicit fills declared directly on {@code p:spPr}
 * (solidFill / gradFill / noFill). It does NOT promote {@code p:style >
 * a:fillRef} into a concrete background, because PowerPoint itself does not
 * paint text placeholders that only carry a theme fill reference — doing so
 * would drop an accent color behind every title/body box that inherits its
 * style slot from the layout.
 */
export interface ResolvedShapeEffects {
  glow?: { color: string; size: number }
  reflection?: { opacity: number; distance: number }
  softEdges?: { size: number }
  innerShadow?: { color: string; size: number; offsetX: number; offsetY: number }
  outerShadow?: { color: string; blur: number; offsetX: number; offsetY: number }
  blur?: { radius: number }
}

/**
 * Parse `<a:effectLst>` under a shape's `p:spPr`. Supports the subset of
 * effects we can approximate with CSS/SVG: outerShdw, innerShdw, glow,
 * reflection, softEdge, blur. Missing values use PowerPoint defaults.
 *
 * OOXML angle/offset model: `a:outerShdw` carries `dist` (EMU) + `dir` (60k
 * units/deg), which we resolve to an (offsetX, offsetY) pixel pair so CSS
 * `drop-shadow` filters can round-trip without further math.
 */
export function resolveShapeEffects(shape: Element, theme: OoxmlTheme | undefined): ResolvedShapeEffects | undefined {
  const spPr = getChild(shape, 'p:spPr')
  if (!spPr) return undefined
  const effectLst = getDirectChild(spPr, 'a:effectLst')
  if (!effectLst) return undefined

  const result: ResolvedShapeEffects = {}

  const outerShdw = getDirectChild(effectLst, 'a:outerShdw')
  if (outerShdw) {
    const blurEmu = Number.parseInt(outerShdw.getAttribute('blurRad') || '0')
    const distEmu = Number.parseInt(outerShdw.getAttribute('dist') || '0')
    const dirDeg = Number.parseInt(outerShdw.getAttribute('dir') || '0') / 60000
    const distPx = emuToPixels(distEmu)
    const offsetX = Math.round(distPx * Math.cos((dirDeg * Math.PI) / 180))
    const offsetY = Math.round(distPx * Math.sin((dirDeg * Math.PI) / 180))
    const color = parseSolidFill(outerShdw, theme) || '#000000'
    result.outerShadow = {
      color,
      blur: Math.round(emuToPixels(blurEmu)),
      offsetX,
      offsetY
    }
  }

  const innerShdw = getDirectChild(effectLst, 'a:innerShdw')
  if (innerShdw) {
    const blurEmu = Number.parseInt(innerShdw.getAttribute('blurRad') || '0')
    const distEmu = Number.parseInt(innerShdw.getAttribute('dist') || '0')
    const dirDeg = Number.parseInt(innerShdw.getAttribute('dir') || '0') / 60000
    const distPx = emuToPixels(distEmu)
    const offsetX = Math.round(distPx * Math.cos((dirDeg * Math.PI) / 180))
    const offsetY = Math.round(distPx * Math.sin((dirDeg * Math.PI) / 180))
    const color = parseSolidFill(innerShdw, theme) || '#000000'
    result.innerShadow = {
      color,
      size: Math.round(emuToPixels(blurEmu)),
      offsetX,
      offsetY
    }
  }

  const glow = getDirectChild(effectLst, 'a:glow')
  if (glow) {
    const radEmu = Number.parseInt(glow.getAttribute('rad') || '0')
    const color = parseSolidFill(glow, theme) || '#000000'
    result.glow = { color, size: Math.round(emuToPixels(radEmu)) }
  }

  const reflection = getDirectChild(effectLst, 'a:reflection')
  if (reflection) {
    const endAlpha = Number.parseInt(reflection.getAttribute('endA') || '0') / 100000
    const distEmu = Number.parseInt(reflection.getAttribute('dist') || '0')
    result.reflection = {
      opacity: 1 - endAlpha,
      distance: Math.round(emuToPixels(distEmu))
    }
  }

  const softEdge = getDirectChild(effectLst, 'a:softEdge')
  if (softEdge) {
    const radEmu = Number.parseInt(softEdge.getAttribute('rad') || '0')
    result.softEdges = { size: Math.round(emuToPixels(radEmu)) }
  }

  const blur = getDirectChild(effectLst, 'a:blur')
  if (blur) {
    const radEmu = Number.parseInt(blur.getAttribute('rad') || '0')
    result.blur = { radius: Math.round(emuToPixels(radEmu)) }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

export function resolveTextBackgroundFromShape(
  shape: Element,
  theme: OoxmlTheme | undefined
): { backgroundColor: string; gradient?: ResolvedGradient } {
  const spPr = getChild(shape, 'p:spPr')
  if (!spPr) return { backgroundColor: 'transparent' }

  if (getDirectChild(spPr, 'a:noFill')) return { backgroundColor: 'transparent' }

  const gradFill = getDirectChild(spPr, 'a:gradFill')
  if (gradFill) {
    const parsed = parseGradientFill(gradFill, theme)
    if (parsed) {
      return { backgroundColor: parsed.stops[0]?.color || 'transparent', gradient: parsed }
    }
  }

  const solidFill = getDirectChild(spPr, 'a:solidFill')
  if (solidFill) {
    const color = parseSolidFill(solidFill, theme)
    if (color) return { backgroundColor: color }
  }

  return { backgroundColor: 'transparent' }
}
