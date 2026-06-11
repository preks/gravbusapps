/**
 * Self-hosted font assets copied to /platform/assets/fonts (from @newwork/assets).
 * Same origin on gravity-platform; GBA dev syncs public/platform/assets for Vite.
 */

export const PLATFORM_FONTS_PRELOAD_BASE = '/platform/assets/fonts/preload'
export const PLATFORM_FONTS_WOFF2_BASE = '/platform/assets/fonts/woff2'
export const PLATFORM_FONTS_TTF_BASE = '/platform/assets/fonts/ttf'

export const PLATFORM_FONTS_SLIDES_CSS = '/platform/assets/fonts/slides.css'
export const PLATFORM_FONTS_NOTES_CSS = '/platform/assets/fonts/notes.css'
export const PLATFORM_FONTS_SIGNATURES_CSS = '/platform/assets/fonts/signatures.css'
export const PLATFORM_FONTS_WHITEBOARDS_CSS = '/platform/assets/fonts/whiteboards.css'
export const PLATFORM_FONTS_NOTO_SANS_TTF = `${PLATFORM_FONTS_TTF_BASE}/noto-sans-regular.ttf`

/** Stable latin / latin-ext paths for Excalidraw font registration. */
export const PLATFORM_WHITEBOARD_FONT_WOFF2 = {
  funnelDisplay: {
    latin: `${PLATFORM_FONTS_PRELOAD_BASE}/funnel-display.woff2`,
    latinExt: `${PLATFORM_FONTS_WOFF2_BASE}/funnel-display-400-latin-ext.woff2`
  },
  inter: {
    latin: `${PLATFORM_FONTS_WOFF2_BASE}/inter-400-latin.woff2`,
    latinExt: `${PLATFORM_FONTS_WOFF2_BASE}/inter-400-latin-ext.woff2`
  },
  manrope: {
    latin: `${PLATFORM_FONTS_WOFF2_BASE}/manrope-400-latin.woff2`,
    latinExt: `${PLATFORM_FONTS_WOFF2_BASE}/manrope-400-latin-ext.woff2`
  },
  dmSans: {
    latin: `${PLATFORM_FONTS_WOFF2_BASE}/dm-sans-400-latin.woff2`,
    latinExt: `${PLATFORM_FONTS_WOFF2_BASE}/dm-sans-400-latin-ext.woff2`
  }
} as const
