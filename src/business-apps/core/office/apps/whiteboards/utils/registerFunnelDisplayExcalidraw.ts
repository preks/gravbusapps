import * as ExcalidrawLib from '@excalidraw/excalidraw'
import { PLATFORM_WHITEBOARD_FONT_WOFF2 } from '@/common/constants/platformFontUrls'

const FUNNEL_DISPLAY = 'Funnel Display'
const INTER = 'Inter'
const MANROPE = 'Manrope'
const DM_SANS = 'DM Sans'
const LATIN_UNICODE_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
const LATIN_EXT_UNICODE_RANGE =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'

export const NW_FUNNEL_DISPLAY_FONT_FAMILY = 4 as const
export const NW_INTER_FONT_FAMILY = 10 as const
export const NW_MANROPE_FONT_FAMILY = 11 as const
export const NW_DM_SANS_FONT_FAMILY = 12 as const

const FONT_FAMILY = ExcalidrawLib.FONT_FAMILY as Record<string, number>

interface FontDef {
  family: string
  id: number
  metrics: { unitsPerEm: number; ascender: number; descender: number; lineHeight: number }
  latinWoff2: string
  latinExtWoff2: string
}

const NW_FONTS: FontDef[] = [
  {
    family: FUNNEL_DISPLAY,
    id: NW_FUNNEL_DISPLAY_FONT_FAMILY,
    metrics: { unitsPerEm: 1000, ascender: 950, descender: -280, lineHeight: 1.2 },
    latinWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.funnelDisplay.latin,
    latinExtWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.funnelDisplay.latinExt
  },
  {
    family: INTER,
    id: NW_INTER_FONT_FAMILY,
    metrics: { unitsPerEm: 1000, ascender: 969, descender: -241, lineHeight: 1.25 },
    latinWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.inter.latin,
    latinExtWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.inter.latinExt
  },
  {
    family: MANROPE,
    id: NW_MANROPE_FONT_FAMILY,
    metrics: { unitsPerEm: 1000, ascender: 1060, descender: -340, lineHeight: 1.28 },
    latinWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.manrope.latin,
    latinExtWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.manrope.latinExt
  },
  {
    family: DM_SANS,
    id: NW_DM_SANS_FONT_FAMILY,
    metrics: { unitsPerEm: 1000, ascender: 1015, descender: -350, lineHeight: 1.3 },
    latinWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.dmSans.latin,
    latinExtWoff2: PLATFORM_WHITEBOARD_FONT_WOFF2.dmSans.latinExt
  }
]

function ensureFontFace(family: string, latinWoff2: string, latinExtWoff2: string): void {
  if (typeof document === 'undefined') return
  const styleId = `nw-fontface-${family.toLowerCase().replace(/\s+/g, '-')}`
  if (document.getElementById(styleId)) return
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
@font-face {
  font-family: '${family}';
  src: url('${latinWoff2}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: ${LATIN_UNICODE_RANGE};
}
@font-face {
  font-family: '${family}';
  src: url('${latinExtWoff2}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: ${LATIN_EXT_UNICODE_RANGE};
}`
  document.head.appendChild(style)
}

function bootstrapFonts(): void {
  for (const font of NW_FONTS) {
    if (FONT_FAMILY[font.family] == null) {
      Object.assign(FONT_FAMILY, { [font.family]: font.id })
    }
    ensureFontFace(font.family, font.latinWoff2, font.latinExtWoff2)
  }

  const maybeFonts = (ExcalidrawLib as unknown as { Fonts?: any }).Fonts
  if (maybeFonts && typeof maybeFonts.register === 'function') {
    for (const font of NW_FONTS) {
      maybeFonts.register(
        font.family,
        { metrics: font.metrics },
        { uri: font.latinWoff2, descriptors: { weight: '400', unicodeRange: LATIN_UNICODE_RANGE } },
        { uri: font.latinExtWoff2, descriptors: { weight: '400', unicodeRange: LATIN_EXT_UNICODE_RANGE } }
      )
    }
    const excalifont = maybeFonts.registered.get(FONT_FAMILY.Excalifont) as
      | { metadata?: Record<string, unknown> }
      | undefined
    if (excalifont?.metadata) {
      excalifont.metadata = { ...excalifont.metadata, deprecated: true }
    }
  }
}

bootstrapFonts()

/**
 * Patch the internal Fonts registry after the Excalidraw component has mounted.
 * In the production build, `Fonts` is not exported so module-level registration
 * only mutates FONT_FAMILY and injects @font-face CSS. This function reaches
 * the internal registry through the React fiber tree and completes registration
 * so custom fonts appear in the picker and Excalifont is hidden.
 */
export function patchFontsFromContainer(container: HTMLElement): void {
  const excalidrawEl = container.querySelector('.excalidraw')
  if (!excalidrawEl) return

  const fiberKey = Object.keys(excalidrawEl).find(
    k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  )
  if (!fiberKey) return

  let fiber = (excalidrawEl as any)[fiberKey]

  let fontsMap: Map<number, { metadata: Record<string, unknown>; fontFaces: unknown[] }> | null = null

  while (fiber) {
    const inst = fiber.stateNode
    if (inst?.fonts?.constructor?.registered instanceof Map) {
      fontsMap = inst.fonts.constructor.registered
      break
    }
    fiber = fiber.return
  }

  if (!fontsMap) return

  for (const font of NW_FONTS) {
    if (fontsMap.has(font.id)) continue
    fontsMap.set(font.id, {
      metadata: {
        metrics: font.metrics
      },
      fontFaces: [
        {
          fontFace: new FontFace(font.family, `url(${font.latinWoff2})`, {
            display: 'swap',
            style: 'normal',
            weight: '400',
            unicodeRange: LATIN_UNICODE_RANGE
          }),
          urls: [font.latinWoff2]
        },
        {
          fontFace: new FontFace(font.family, `url(${font.latinExtWoff2})`, {
            display: 'swap',
            style: 'normal',
            weight: '400',
            unicodeRange: LATIN_EXT_UNICODE_RANGE
          }),
          urls: [font.latinExtWoff2]
        }
      ]
    })
  }

  const excalifontEntry = fontsMap.get(FONT_FAMILY.Excalifont)
  if (excalifontEntry?.metadata) {
    excalifontEntry.metadata = { ...excalifontEntry.metadata, deprecated: true }
  }
}

export const NW_PROFESSIONAL_DEFAULT_FONTS = [
  NW_FUNNEL_DISPLAY_FONT_FAMILY,
  NW_INTER_FONT_FAMILY,
  NW_MANROPE_FONT_FAMILY,
  NW_DM_SANS_FONT_FAMILY
] as const
