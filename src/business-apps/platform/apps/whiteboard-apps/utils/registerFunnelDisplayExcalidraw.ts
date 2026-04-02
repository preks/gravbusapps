import { FONT_FAMILY, Fonts } from '@excalidraw/excalidraw'

const FUNNEL_DISPLAY = 'Funnel Display'
const INTER = 'Inter'
const MANROPE = 'Manrope'
const DM_SANS = 'DM Sans'
const LATIN_UNICODE_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
const LATIN_EXT_UNICODE_RANGE =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'

/** Excalidraw reserves numeric id 4 for custom / former Assistant fonts. */
export const NW_FUNNEL_DISPLAY_FONT_FAMILY = 4 as const
export const NW_INTER_FONT_FAMILY = 10 as const
export const NW_MANROPE_FONT_FAMILY = 11 as const
export const NW_DM_SANS_FONT_FAMILY = 12 as const

function registerModernFont(
  family: string,
  id: number,
  metrics: { unitsPerEm: number; ascender: number; descender: number; lineHeight: number },
  latinWoff2: string,
  latinExtWoff2: string
): void {
  const fam = FONT_FAMILY as Record<string, number>
  if (fam[family] == null) {
    Object.assign(FONT_FAMILY, { [family]: id })
  }
  Fonts.register(
    family,
    { metrics },
    {
      uri: latinWoff2,
      descriptors: { weight: '400', unicodeRange: LATIN_UNICODE_RANGE }
    },
    {
      uri: latinExtWoff2,
      descriptors: { weight: '400', unicodeRange: LATIN_EXT_UNICODE_RANGE }
    }
  )
}

/**
 * Registers Google "Funnel Display" (hero / AI assistant title font) with Excalidraw so it
 * appears in the font picker, renders on canvas, and participates in export font-face generation.
 */
export function registerFunnelDisplayFont(): void {
  registerModernFont(
    FUNNEL_DISPLAY,
    NW_FUNNEL_DISPLAY_FONT_FAMILY,
    { unitsPerEm: 1000, ascender: 950, descender: -280, lineHeight: 1.2 },
    'https://fonts.gstatic.com/s/funneldisplay/v3/B50WF7FGv37QNVWgE0ga--4Pbb6dDYs.woff2',
    'https://fonts.gstatic.com/s/funneldisplay/v3/B50WF7FGv37QNVWgE0ga--4Pbb6TDYsmgQ.woff2'
  )

  registerModernFont(
    INTER,
    NW_INTER_FONT_FAMILY,
    { unitsPerEm: 1000, ascender: 969, descender: -241, lineHeight: 1.25 },
    'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2',
    'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2'
  )

  registerModernFont(
    MANROPE,
    NW_MANROPE_FONT_FAMILY,
    { unitsPerEm: 1000, ascender: 1060, descender: -340, lineHeight: 1.28 },
    'https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2',
    'https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggmxSuXd.woff2'
  )

  registerModernFont(
    DM_SANS,
    NW_DM_SANS_FONT_FAMILY,
    { unitsPerEm: 1000, ascender: 1015, descender: -350, lineHeight: 1.3 },
    'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
    'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu6-K6h9Q.woff2'
  )

  // Hide hand-drawn Excalifont from picker unless deprecated fonts are explicitly shown.
  const excalifont = Fonts.registered.get(FONT_FAMILY.Excalifont) as { metadata?: Record<string, unknown> } | undefined
  if (excalifont?.metadata) {
    excalifont.metadata = { ...excalifont.metadata, deprecated: true }
  }
}

export const NW_PROFESSIONAL_DEFAULT_FONTS = [
  NW_FUNNEL_DISPLAY_FONT_FAMILY,
  NW_INTER_FONT_FAMILY,
  NW_MANROPE_FONT_FAMILY,
  NW_DM_SANS_FONT_FAMILY
] as const

registerFunnelDisplayFont()
