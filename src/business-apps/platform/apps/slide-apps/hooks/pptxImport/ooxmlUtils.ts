// OOXML unit conversion and XML helper utilities.

import type { OoxmlTheme, OoxmlTransform } from './types'

const EMU_PER_PIXEL = 9525
const HUNDREDTHS_POINT_TO_PX = 96 / 72 / 100

export function emuToPixels(emu: number): number {
  return emu / EMU_PER_PIXEL
}

// Monotonic counter used to generate unique ids for imported elements.
// Plain `Date.now()` collides when multiple sp/pic/cxnSp elements are wrapped
// in individual fake docs during `assembleSlide`, because the internal loop
// counter `i` resets to 0 for each extraction.
let importUidCounter = 0

/**
 * Returns a stable, unique id suffix for imported elements.
 * Combines a monotonic counter with a short random tail so concurrent imports
 * from different tabs/files cannot collide either.
 */
export function nextImportUid(prefix: string): string {
  importUidCounter = (importUidCounter + 1) >>> 0
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}-${Date.now().toString(36)}-${importUidCounter.toString(36)}-${rand}`
}

/**
 * Read the raw `<p:cNvPr id="…">` value off any drawing element (shape,
 * connector, picture, graphic frame, group). These ids are what connector
 * endpoints reference via {@code a:stCxn}/{@code a:endCxn@id}, so we need
 * them to rebuild endpoint bindings during import.
 */
export function getOoxmlShapeId(drawingEl: Element): string | undefined {
  // Each shape-like element nests cNvPr under a namespaced `nvXxxPr` wrapper
  // (p:nvSpPr, p:nvCxnSpPr, p:nvPicPr, p:nvGraphicFramePr, p:nvGrpSpPr).
  // We accept any of them to avoid hard-coding per-type lookups.
  const wrappers = ['p:nvSpPr', 'p:nvCxnSpPr', 'p:nvPicPr', 'p:nvGraphicFramePr', 'p:nvGrpSpPr']
  for (const tag of wrappers) {
    const wrap = getChild(drawingEl, tag)
    if (!wrap) continue
    const cNvPr = getChild(wrap, 'p:cNvPr')
    const raw = cNvPr?.getAttribute('id')
    if (raw) return raw
  }
  return undefined
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

export function getDirectChild(parent: Element, tagName: string): Element | undefined {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType !== ELEMENT_NODE) continue
    const el = child as Element
    if (el.tagName === tagName) return el
  }
  return undefined
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
    x: Number.parseInt(off.getAttribute('x') || '0'),
    y: Number.parseInt(off.getAttribute('y') || '0'),
    cx: Number.parseInt(ext.getAttribute('cx') || '0'),
    cy: Number.parseInt(ext.getAttribute('cy') || '0'),
    rotation: xfrm.getAttribute('rot') ? Number.parseInt(xfrm.getAttribute('rot')!) : undefined
  }
}

// ---------------------------------------------------------------------------
// Color model + OOXML color transforms
// ---------------------------------------------------------------------------

interface RgbColor {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '')
  return {
    r: Number.parseInt(clean.slice(0, 2), 16) / 255,
    g: Number.parseInt(clean.slice(2, 4), 16) / 255,
    b: Number.parseInt(clean.slice(4, 6), 16) / 255
  }
}

function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHsl({ r, g, b }: RgbColor): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h, s, l }
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): RgbColor {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  if (s === 0) return { r: l, g: l, b: l }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: hue2rgb(p, q, h + 1 / 3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1 / 3)
  }
}

function parsePerMille(raw: string | null): number | undefined {
  if (!raw) return undefined
  const n = Number.parseInt(raw)
  if (!Number.isFinite(n)) return undefined
  return n / 100000
}

function parseAngle60000(raw: string | null): number | undefined {
  if (!raw) return undefined
  const n = Number.parseInt(raw)
  if (!Number.isFinite(n)) return undefined
  return n / 60000
}

/**
 * Accumulator for OOXML color transforms found inside a color element.
 * Transforms are applied in document order, which matches how PowerPoint
 * renders them (ECMA-376 §20.1.2.3 — "Color Transforms").
 */
interface ColorTransforms {
  lumMod?: number
  lumOff?: number
  satMod?: number
  satOff?: number
  hueMod?: number
  hueOff?: number
  tint?: number
  shade?: number
  alpha?: number
  alphaMod?: number
  alphaOff?: number
  red?: number
  redMod?: number
  redOff?: number
  green?: number
  greenMod?: number
  greenOff?: number
  blue?: number
  blueMod?: number
  blueOff?: number
  gray?: boolean
  comp?: boolean
  inv?: boolean
  gamma?: boolean
  invGamma?: boolean
}

function readColorTransforms(node: Element): ColorTransforms {
  const t: ColorTransforms = {}
  for (const raw of Array.from(node.childNodes)) {
    const child = raw as Element
    if (!child.tagName) continue
    const val = child.getAttribute('val')
    switch (child.tagName) {
      case 'a:lumMod':
        t.lumMod = parsePerMille(val)
        break
      case 'a:lumOff':
        t.lumOff = parsePerMille(val)
        break
      case 'a:satMod':
        t.satMod = parsePerMille(val)
        break
      case 'a:satOff':
        t.satOff = parsePerMille(val)
        break
      case 'a:hueMod':
        t.hueMod = parsePerMille(val)
        break
      case 'a:hueOff': {
        const deg = parseAngle60000(val)
        if (deg !== undefined) t.hueOff = deg / 360
        break
      }
      case 'a:tint':
        t.tint = parsePerMille(val)
        break
      case 'a:shade':
        t.shade = parsePerMille(val)
        break
      case 'a:alpha':
        t.alpha = parsePerMille(val)
        break
      case 'a:alphaMod':
        t.alphaMod = parsePerMille(val)
        break
      case 'a:alphaOff':
        t.alphaOff = parsePerMille(val)
        break
      case 'a:red':
        t.red = parsePerMille(val)
        break
      case 'a:redMod':
        t.redMod = parsePerMille(val)
        break
      case 'a:redOff':
        t.redOff = parsePerMille(val)
        break
      case 'a:green':
        t.green = parsePerMille(val)
        break
      case 'a:greenMod':
        t.greenMod = parsePerMille(val)
        break
      case 'a:greenOff':
        t.greenOff = parsePerMille(val)
        break
      case 'a:blue':
        t.blue = parsePerMille(val)
        break
      case 'a:blueMod':
        t.blueMod = parsePerMille(val)
        break
      case 'a:blueOff':
        t.blueOff = parsePerMille(val)
        break
      case 'a:gray':
        t.gray = true
        break
      case 'a:comp':
        t.comp = true
        break
      case 'a:inv':
        t.inv = true
        break
      case 'a:gamma':
        t.gamma = true
        break
      case 'a:invGamma':
        t.invGamma = true
        break
    }
  }
  return t
}

function applyColorTransforms(rgb: RgbColor, t: ColorTransforms): { rgb: RgbColor; alpha: number } {
  let { r, g, b } = rgb
  let alpha = 1

  // Luminance + saturation + hue operate on HSL.
  if (
    t.lumMod !== undefined ||
    t.lumOff !== undefined ||
    t.satMod !== undefined ||
    t.satOff !== undefined ||
    t.hueMod !== undefined ||
    t.hueOff !== undefined
  ) {
    const hsl = rgbToHsl({ r, g, b })
    if (t.hueMod !== undefined) hsl.h *= t.hueMod
    if (t.hueOff !== undefined) hsl.h = (hsl.h + t.hueOff) % 1
    if (t.satMod !== undefined) hsl.s = Math.min(1, Math.max(0, hsl.s * t.satMod))
    if (t.satOff !== undefined) hsl.s = Math.min(1, Math.max(0, hsl.s + t.satOff))
    if (t.lumMod !== undefined) hsl.l = Math.min(1, Math.max(0, hsl.l * t.lumMod))
    if (t.lumOff !== undefined) hsl.l = Math.min(1, Math.max(0, hsl.l + t.lumOff))
    const next = hslToRgb(hsl)
    r = next.r
    g = next.g
    b = next.b
  }

  // Tint blends toward white (1 - tint) * c + tint * 1.
  // Shade scales toward black: c * shade.
  // (ECMA-376 §20.1.2.3.9 / .10 — PowerPoint treats tint val=0 as "no change"
  // and val=100000 as "full white"; same for shade toward black. Many decks
  // encode theme-lighten this way.)
  if (t.tint !== undefined) {
    const k = Math.min(1, Math.max(0, t.tint))
    r = r * (1 - k) + k
    g = g * (1 - k) + k
    b = b * (1 - k) + k
  }
  if (t.shade !== undefined) {
    const k = Math.min(1, Math.max(0, t.shade))
    r = r * k
    g = g * k
    b = b * k
  }

  if (t.red !== undefined) r = t.red
  if (t.redMod !== undefined) r = Math.min(1, Math.max(0, r * t.redMod))
  if (t.redOff !== undefined) r = Math.min(1, Math.max(0, r + t.redOff))
  if (t.green !== undefined) g = t.green
  if (t.greenMod !== undefined) g = Math.min(1, Math.max(0, g * t.greenMod))
  if (t.greenOff !== undefined) g = Math.min(1, Math.max(0, g + t.greenOff))
  if (t.blue !== undefined) b = t.blue
  if (t.blueMod !== undefined) b = Math.min(1, Math.max(0, b * t.blueMod))
  if (t.blueOff !== undefined) b = Math.min(1, Math.max(0, b + t.blueOff))

  if (t.comp) {
    r = 1 - r
    g = 1 - g
    b = 1 - b
  }
  if (t.inv) {
    r = 1 - r
    g = 1 - g
    b = 1 - b
  }
  if (t.gray) {
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    r = y
    g = y
    b = y
  }

  if (t.alpha !== undefined) alpha = t.alpha
  if (t.alphaMod !== undefined) alpha *= t.alphaMod
  if (t.alphaOff !== undefined) alpha += t.alphaOff
  alpha = Math.min(1, Math.max(0, alpha))

  return { rgb: { r, g, b }, alpha }
}

function colorToCssOrHex(rgb: RgbColor, alpha: number): string {
  if (alpha >= 0.999) return `#${rgbToHex(rgb)}`
  const r = Math.round(Math.min(1, Math.max(0, rgb.r)) * 255)
  const g = Math.round(Math.min(1, Math.max(0, rgb.g)) * 255)
  const b = Math.round(Math.min(1, Math.max(0, rgb.b)) * 255)
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`
}

const SCHEME_ALIAS: Record<string, string> = {
  tx1: 'dk1',
  bg1: 'lt1',
  tx2: 'dk2',
  bg2: 'lt2'
}

/**
 * ST_PresetColorVal — full table of preset color names allowed on
 * {@code a:prstClr}. Values are 6-char hex without leading #.
 * @see ECMA-376 Part 1 §20.1.10.48 — ST_PresetColorVal
 */
const PRST_COLOR_HEX: Record<string, string> = {
  aliceBlue: 'F0F8FF',
  antiqueWhite: 'FAEBD7',
  aqua: '00FFFF',
  aquamarine: '7FFFD4',
  azure: 'F0FFFF',
  beige: 'F5F5DC',
  bisque: 'FFE4C4',
  black: '000000',
  blanchedAlmond: 'FFEBCD',
  blue: '0000FF',
  blueViolet: '8A2BE2',
  brown: 'A52A2A',
  burlyWood: 'DEB887',
  cadetBlue: '5F9EA0',
  chartreuse: '7FFF00',
  chocolate: 'D2691E',
  coral: 'FF7F50',
  cornflowerBlue: '6495ED',
  cornsilk: 'FFF8DC',
  crimson: 'DC143C',
  cyan: '00FFFF',
  darkBlue: '00008B',
  darkCyan: '008B8B',
  darkGoldenrod: 'B8860B',
  darkGray: 'A9A9A9',
  darkGrey: 'A9A9A9',
  darkGreen: '006400',
  darkKhaki: 'BDB76B',
  darkMagenta: '8B008B',
  darkOliveGreen: '556B2F',
  darkOrange: 'FF8C00',
  darkOrchid: '9932CC',
  darkRed: '8B0000',
  darkSalmon: 'E9967A',
  darkSeaGreen: '8FBC8F',
  darkSlateBlue: '483D8B',
  darkSlateGray: '2F4F4F',
  darkSlateGrey: '2F4F4F',
  darkTurquoise: '00CED1',
  darkViolet: '9400D3',
  deepPink: 'FF1493',
  deepSkyBlue: '00BFFF',
  dimGray: '696969',
  dimGrey: '696969',
  dodgerBlue: '1E90FF',
  firebrick: 'B22222',
  floralWhite: 'FFFAF0',
  forestGreen: '228B22',
  fuchsia: 'FF00FF',
  gainsboro: 'DCDCDC',
  ghostWhite: 'F8F8FF',
  gold: 'FFD700',
  goldenrod: 'DAA520',
  gray: '808080',
  grey: '808080',
  green: '008000',
  greenYellow: 'ADFF2F',
  honeydew: 'F0FFF0',
  hotPink: 'FF69B4',
  indianRed: 'CD5C5C',
  indigo: '4B0082',
  ivory: 'FFFFF0',
  khaki: 'F0E68C',
  lavender: 'E6E6FA',
  lavenderBlush: 'FFF0F5',
  lawnGreen: '7CFC00',
  lemonChiffon: 'FFFACD',
  lightBlue: 'ADD8E6',
  lightCoral: 'F08080',
  lightCyan: 'E0FFFF',
  lightGoldenrodYellow: 'FAFAD2',
  lightGray: 'D3D3D3',
  lightGrey: 'D3D3D3',
  lightGreen: '90EE90',
  lightPink: 'FFB6C1',
  lightSalmon: 'FFA07A',
  lightSeaGreen: '20B2AA',
  lightSkyBlue: '87CEFA',
  lightSlateGray: '778899',
  lightSlateGrey: '778899',
  lightSteelBlue: 'B0C4DE',
  lightYellow: 'FFFFE0',
  lime: '00FF00',
  limeGreen: '32CD32',
  linen: 'FAF0E6',
  magenta: 'FF00FF',
  maroon: '800000',
  medAquamarine: '66CDAA',
  medBlue: '0000CD',
  medOrchid: 'BA55D3',
  medPurple: '9370DB',
  medSeaGreen: '3CB371',
  medSlateBlue: '7B68EE',
  medSpringGreen: '00FA9A',
  medTurquoise: '48D1CC',
  medVioletRed: 'C71585',
  mediumAquamarine: '66CDAA',
  mediumBlue: '0000CD',
  mediumOrchid: 'BA55D3',
  mediumPurple: '9370DB',
  mediumSeaGreen: '3CB371',
  mediumSlateBlue: '7B68EE',
  mediumSpringGreen: '00FA9A',
  mediumTurquoise: '48D1CC',
  mediumVioletRed: 'C71585',
  midnightBlue: '191970',
  mintCream: 'F5FFFA',
  mistyRose: 'FFE4E1',
  moccasin: 'FFE4B5',
  navajoWhite: 'FFDEAD',
  navy: '000080',
  oldLace: 'FDF5E6',
  olive: '808000',
  oliveDrab: '6B8E23',
  orange: 'FFA500',
  orangeRed: 'FF4500',
  orchid: 'DA70D6',
  paleGoldenrod: 'EEE8AA',
  paleGreen: '98FB98',
  paleTurquoise: 'AFEEEE',
  paleVioletRed: 'DB7093',
  papayaWhip: 'FFEFD5',
  peachPuff: 'FFDAB9',
  peru: 'CD853F',
  pink: 'FFC0CB',
  plum: 'DDA0DD',
  powderBlue: 'B0E0E6',
  purple: '800080',
  red: 'FF0000',
  rosyBrown: 'BC8F8F',
  royalBlue: '4169E1',
  saddleBrown: '8B4513',
  salmon: 'FA8072',
  sandyBrown: 'F4A460',
  seaGreen: '2E8B57',
  seaShell: 'FFF5EE',
  sienna: 'A0522D',
  silver: 'C0C0C0',
  skyBlue: '87CEEB',
  slateBlue: '6A5ACD',
  slateGray: '708090',
  slateGrey: '708090',
  snow: 'FFFAFA',
  springGreen: '00FF7F',
  steelBlue: '4682B4',
  tan: 'D2B48C',
  teal: '008080',
  thistle: 'D8BFD8',
  tomato: 'FF6347',
  turquoise: '40E0D0',
  violet: 'EE82EE',
  wheat: 'F5DEB3',
  white: 'FFFFFF',
  whiteSmoke: 'F5F5F5',
  yellow: 'FFFF00',
  yellowGreen: '9ACD32',
  // Abbreviations present in older office XML variants
  dkRed: '8B0000',
  dkBlue: '00008B',
  dkGreen: '006400',
  dkCyan: '008B8B',
  dkMagenta: '8B008B',
  dkYellow: 'BDB76B',
  ltBlue: 'ADD8E6',
  ltGreen: '90EE90',
  ltCyan: 'E0FFFF',
  ltOrange: 'FFA500'
}

/** Case-insensitive preset lookup. */
function lookupPreset(name: string): string | undefined {
  if (PRST_COLOR_HEX[name]) return PRST_COLOR_HEX[name]
  const lower = name.toLowerCase()
  for (const key of Object.keys(PRST_COLOR_HEX)) {
    if (key.toLowerCase() === lower) return PRST_COLOR_HEX[key]
  }
  return undefined
}

/**
 * Minimal system-color fallbacks. PowerPoint emits `a:sysClr` with a
 * `lastClr` attribute holding the hex value it actually used at save time;
 * when present we use it directly, otherwise we map the well-known names.
 */
const SYS_COLOR_HEX: Record<string, string> = {
  windowText: '000000',
  window: 'FFFFFF',
  menuText: '000000',
  menu: 'F0F0F0',
  menuBar: 'F0F0F0',
  highlight: '3399FF',
  highlightText: 'FFFFFF',
  hotLight: '0066CC',
  btnFace: 'F0F0F0',
  btnText: '000000',
  btnShadow: 'A0A0A0',
  btnHighlight: 'FFFFFF',
  grayText: '808080',
  greyText: '808080',
  captionText: '000000',
  activeCaption: '99B4D1',
  inactiveCaption: 'BFCDDB',
  appWorkspace: 'ABABAB',
  background: 'FFFFFF',
  scrollBar: 'C8C8C8',
  infoText: '000000',
  infoBk: 'FFFFE1',
  '3dDkShadow': '696969',
  '3dLight': 'E3E3E3'
}

/** Look up the base color of a color element before transforms apply. */
function readBaseColor(
  node: Element,
  theme: OoxmlTheme | undefined
): { rgb: RgbColor; source: 'srgb' | 'scheme' | 'prst' | 'sys' } | undefined {
  const srgb = getChild(node, 'a:srgbClr')
  if (srgb) {
    const val = srgb.getAttribute('val')
    if (val) return { rgb: hexToRgb(val), source: 'srgb' }
  }

  const scheme = getChild(node, 'a:schemeClr')
  if (scheme && theme) {
    const schemeVal = scheme.getAttribute('val')
    if (schemeVal) {
      const mapped = SCHEME_ALIAS[schemeVal] || schemeVal
      const resolved = theme.colors.get(mapped)
      if (resolved) return { rgb: hexToRgb(resolved.replace('#', '')), source: 'scheme' }
    }
  }

  const prst = getChild(node, 'a:prstClr')
  if (prst) {
    const name = prst.getAttribute('val') || ''
    // Some decks use scheme-ish names inside prstClr — honor the theme first
    // when the preset key matches a theme color.
    if (theme) {
      const key = SCHEME_ALIAS[name.toLowerCase()] || name.toLowerCase()
      const fromTheme = theme.colors.get(key) || theme.colors.get(name)
      if (fromTheme) return { rgb: hexToRgb(fromTheme.replace('#', '')), source: 'prst' }
    }
    const fromPrst = lookupPreset(name)
    if (fromPrst) return { rgb: hexToRgb(fromPrst), source: 'prst' }
  }

  const sys = getChild(node, 'a:sysClr')
  if (sys) {
    const lastClr = sys.getAttribute('lastClr')
    if (lastClr) return { rgb: hexToRgb(lastClr), source: 'sys' }
    const name = sys.getAttribute('val') || ''
    const fromSys = SYS_COLOR_HEX[name]
    if (fromSys) return { rgb: hexToRgb(fromSys), source: 'sys' }
    return { rgb: { r: 0, g: 0, b: 0 }, source: 'sys' }
  }

  return undefined
}

/**
 * Resolve the first color child (srgb/scheme/prst/sys) and apply every
 * OOXML color transform child (lumMod/lumOff, satMod/satOff, hueMod/hueOff,
 * tint/shade, alpha, alphaMod, alphaOff, comp/inv/gray, red/redMod/redOff,
 * green/greenMod/greenOff, blue/blueMod/blueOff, gamma, invGamma).
 *
 * Returns a CSS string: `#rrggbb` when fully opaque, `rgba(...)` otherwise.
 */
export function resolveColor(colorEl: Element, theme?: OoxmlTheme): string | undefined {
  const base = readBaseColor(colorEl, theme)
  if (!base) return undefined

  // Transforms live either directly on the color element or nested under
  // the color child; we scan both so both encodings work.
  const outerTransforms = readColorTransforms(colorEl)
  const colorChild =
    getChild(colorEl, 'a:srgbClr') ||
    getChild(colorEl, 'a:schemeClr') ||
    getChild(colorEl, 'a:prstClr') ||
    getChild(colorEl, 'a:sysClr')
  const innerTransforms = colorChild ? readColorTransforms(colorChild) : {}

  const merged: ColorTransforms = { ...outerTransforms, ...innerTransforms }
  const { rgb, alpha } = applyColorTransforms(base.rgb, merged)
  return colorToCssOrHex(rgb, alpha)
}

export function parseSolidFill(fillNode: Element, theme?: OoxmlTheme): string | undefined {
  return resolveColor(fillNode, theme)
}

/**
 * Resolve a "fill" container (parent of `<a:solidFill>` / `<a:gradFill>` /
 * `<a:noFill>`) to a single CSS color suitable for text / bullet / line
 * rendering. Text in PowerPoint can be painted with a gradient (e.g. slide 1
 * of the Enterprise AI deck colors the title with a 3-stop `<a:gradFill>` to
 * fade the ends of "The NEWWORK Enterprise AI."); the editor has no
 * background-clip-text plumbing, so we collapse the gradient to its most
 * opaque stop — the one nearest 50% position when multiple are fully opaque.
 *
 * For the slide-1 case (`bg1@67%, bg1, bg1@67%`) this picks the middle pure-
 * white stop, which matches the author's visual intent. Without this helper
 * the text run has no resolved color and callers fall back to the theme's
 * `dk1` (= `#000000`), rendering black text on a dark gradient background.
 *
 * Returns `undefined` when neither a solid nor gradient fill is present, so
 * upstream inheritance (placeholder/layout/master) can still apply.
 */
export function resolveTextFillColor(parent: Element, theme?: OoxmlTheme): string | undefined {
  const solid = getChild(parent, 'a:solidFill')
  if (solid) {
    const color = resolveColor(solid, theme)
    if (color) return color
  }
  const grad = getChild(parent, 'a:gradFill')
  if (grad) {
    const parsed = parseGradientFill(grad, theme)
    if (parsed && parsed.stops.length > 0) {
      // Rank stops by opacity first (`#rrggbb` is fully opaque and beats any
      // `rgba(...)` stop), then by distance-to-50% so symmetric "fade in &
      // out" gradients still pick the central pure color instead of one of
      // the faded bookends.
      const ranked = [...parsed.stops].sort((a, b) => {
        const aOpaque = a.color.startsWith('#') ? 0 : 1
        const bOpaque = b.color.startsWith('#') ? 0 : 1
        if (aOpaque !== bOpaque) return aOpaque - bOpaque
        return Math.abs(a.position - 50) - Math.abs(b.position - 50)
      })
      return ranked[0].color
    }
  }
  return undefined
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
      const pos = Number.parseInt(gs.getAttribute('pos') || '0') / 1000
      const color = resolveColor(gs, theme)
      return color ? { color, position: pos } : null
    })
    .filter((s): s is { color: string; position: number } => s !== null)

  if (stops.length === 0) return undefined

  const lin = getChild(gradFillNode, 'a:lin')
  // OOXML stores linear gradient angles with 0deg pointing to the right,
  // while our shared renderer/CSS model uses 90deg for left-to-right.
  // Normalize at import time so imported gradients render like native ones.
  const angle = lin ? (Number.parseInt(lin.getAttribute('ang') || '0') / 60000 + 90) % 360 : 0
  const isLinear = !!lin

  return { type: isLinear ? 'linear' : 'radial', angle, stops }
}
