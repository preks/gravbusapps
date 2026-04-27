/**
 * Font family resolution for slide rendering.
 *
 * PowerPoint decks reference fonts that usually do not exist on the web
 * (Calibri, Aptos, Cambria, ...). If we pipe the raw name straight into CSS,
 * the browser falls back to its default serif/sans heuristic which is almost
 * always wrong — Calibri (a humanist sans-serif) ends up rendered as Times
 * New Roman on many systems.
 *
 * This module categorizes a font name as sans / serif / mono and returns a
 * full CSS font-family stack that keeps the intended feel even when the
 * primary face is unavailable. The stacks are intentionally biased toward
 * Windows/macOS system fonts because that is what PowerPoint users actually
 * see when they designed their decks.
 */

// Sans-serif stack prioritizing system UI fonts (Segoe UI on Windows, San
// Francisco on macOS/iOS) so PPTX decks keep their "Calibri-like" feel.
const SANS_STACK = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// Serif stack for Cambria, Georgia, and similar. Prefer fonts that actually
// ship on modern systems so the fallback stays crisp.
const SERIF_STACK = "'Iowan Old Style', 'Apple Garamond', Baskerville, 'Times New Roman', Times, serif"

// Monospace stack — Menlo/SF Mono on Apple, Consolas on Windows.
const MONO_STACK = "'SF Mono', Menlo, Consolas, 'Courier New', monospace"

type FontCategory = 'sans' | 'serif' | 'mono'

/**
 * Manual classification of PowerPoint/Office fonts. Keys are lowercased and
 * stripped of surrounding quotes. Only register fonts whose category we are
 * confident about — unknown names fall through to the heuristic below.
 */
const NAME_TO_CATEGORY: Record<string, FontCategory> = {
  // Office sans-serif families.
  calibri: 'sans',
  'calibri light': 'sans',
  aptos: 'sans',
  'aptos display': 'sans',
  'aptos narrow': 'sans',
  'aptos serif': 'serif',
  corbel: 'sans',
  candara: 'sans',
  'segoe ui': 'sans',
  'segoe ui light': 'sans',
  'segoe ui semibold': 'sans',
  'segoe ui symbol': 'sans',
  arial: 'sans',
  'arial narrow': 'sans',
  'arial black': 'sans',
  'arial rounded mt bold': 'sans',
  helvetica: 'sans',
  'helvetica neue': 'sans',
  verdana: 'sans',
  tahoma: 'sans',
  'trebuchet ms': 'sans',
  'franklin gothic': 'sans',
  'franklin gothic book': 'sans',
  'franklin gothic medium': 'sans',
  'century gothic': 'sans',
  // Google Fonts commonly embedded in modern PPTX decks. We classify them as
  // sans so the fallback chain gives the right line metrics even when the
  // webfont has not loaded yet (or is unavailable offline). The actual
  // webfont is loaded via `ensureImportedWebFonts()` on slide-app mount.
  roboto: 'sans',
  'roboto condensed': 'sans',
  'roboto mono': 'mono',
  'roboto slab': 'serif',
  'funnel display': 'sans',
  'funnel sans': 'sans',
  inter: 'sans',
  'inter tight': 'sans',
  poppins: 'sans',
  montserrat: 'sans',
  lato: 'sans',
  'open sans': 'sans',
  nunito: 'sans',
  'nunito sans': 'sans',
  'source sans pro': 'sans',
  'source sans 3': 'sans',
  'source serif pro': 'serif',
  'source code pro': 'mono',
  ubuntu: 'sans',
  'ubuntu mono': 'mono',
  raleway: 'sans',
  'work sans': 'sans',
  'fira sans': 'sans',
  'fira code': 'mono',
  'lucida sans': 'sans',
  'lucida sans unicode': 'sans',
  'microsoft sans serif': 'sans',
  'ms sans serif': 'sans',
  'gill sans': 'sans',
  'gill sans mt': 'sans',
  // Serif families.
  cambria: 'serif',
  'cambria math': 'serif',
  constantia: 'serif',
  georgia: 'serif',
  'times new roman': 'serif',
  times: 'serif',
  'book antiqua': 'serif',
  'bookman old style': 'serif',
  'palatino linotype': 'serif',
  palatino: 'serif',
  garamond: 'serif',
  'goudy old style': 'serif',
  rockwell: 'serif',
  // Monospace families.
  courier: 'mono',
  'courier new': 'mono',
  consolas: 'mono',
  'lucida console': 'mono',
  'ms gothic': 'mono'
}

function classifyHeuristic(name: string): FontCategory {
  const lower = name.toLowerCase()
  if (/(mono|console|courier|code|typewriter|terminal)/.test(lower)) return 'mono'
  if (
    /(serif|roman|times|georgia|cambria|garamond|baskerville|caslon|didot|bodoni|palatino|minion|sabon)/.test(lower)
  ) {
    return 'serif'
  }
  return 'sans'
}

function stripQuotes(raw: string): string {
  return raw.replace(/^['"]|['"]$/g, '')
}

/**
 * Convert a raw font-family value into a CSS font-family string with
 * system-appropriate fallbacks. Pass-through behavior:
 *   - `undefined`/empty → SANS_STACK (a safe UI default)
 *   - value already containing commas → returned as-is (caller supplied stack)
 *   - known Office font → primary + matching category stack
 *   - unknown font → heuristic classification based on name
 */
export function resolveFontStack(fontFamily: string | undefined): string {
  if (!fontFamily) return SANS_STACK
  const trimmed = fontFamily.trim()
  if (!trimmed) return SANS_STACK

  // Caller already built a stack; respect it verbatim.
  if (trimmed.includes(',')) return trimmed

  const bare = stripQuotes(trimmed)
  if (!bare) return SANS_STACK

  const category = NAME_TO_CATEGORY[bare.toLowerCase()] ?? classifyHeuristic(bare)
  const primary = /\s/.test(bare) ? `'${bare}'` : bare

  switch (category) {
    case 'serif':
      return `${primary}, ${SERIF_STACK}`
    case 'mono':
      return `${primary}, ${MONO_STACK}`
    default:
      return `${primary}, ${SANS_STACK}`
  }
}

/** Exposed for tests so we don't duplicate the strings. */
export const FONT_FALLBACK_STACKS = {
  sans: SANS_STACK,
  serif: SERIF_STACK,
  mono: MONO_STACK
}

/**
 * Google Fonts stylesheet URL covering the Latin subsets of every webfont we
 * classify as "commonly embedded in imported PPTX decks". Loaded once per
 * document so importers see correct glyph metrics for `Roboto`, `Funnel
 * Display`, `Source Sans Pro`, etc. — otherwise the editor renders against
 * Segoe UI/SF and text wrapping drifts relative to PowerPoint (symptom seen
 * on slides 4/5/12/17 of the Enterprise AI deck where titles overflow and
 * pill widths stop matching their labels).
 *
 * We use `display=swap` so existing system-fallback text keeps rendering
 * while the webfont downloads, then re-flows when it lands.
 */
const IMPORTED_WEBFONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Roboto:wght@300;400;500;700;900' +
  '&family=Roboto+Condensed:wght@300;400;700' +
  '&family=Roboto+Mono:wght@300;400;500;700' +
  '&family=Roboto+Slab:wght@300;400;500;700' +
  '&family=Funnel+Display:wght@300..800' +
  '&family=Funnel+Sans:wght@300..800' +
  '&family=Inter:wght@300..800' +
  '&family=Poppins:wght@300;400;500;600;700' +
  '&family=Montserrat:wght@300;400;500;600;700' +
  '&family=Lato:wght@300;400;700;900' +
  '&family=Open+Sans:wght@300..800' +
  '&family=Nunito:wght@300..900' +
  '&family=Nunito+Sans:wght@300..900' +
  '&family=Source+Sans+3:wght@300..900' +
  '&family=Source+Serif+4:wght@300..900' +
  '&family=Source+Code+Pro:wght@300..900' +
  '&family=Ubuntu:wght@300;400;500;700' +
  '&family=Ubuntu+Mono:wght@400;700' +
  '&family=Raleway:wght@300..900' +
  '&family=Work+Sans:wght@300..900' +
  '&family=Fira+Sans:wght@300;400;500;600;700' +
  '&family=Fira+Code:wght@300..700' +
  '&display=swap'

const IMPORTED_WEBFONTS_LINK_ID = 'gba-slide-imported-webfonts'

/**
 * Idempotently append the imported-webfonts stylesheet to the document head.
 * Safe to call from every slide-apps entry point — we check for an existing
 * `<link id="…">` before injecting. No-op on the server (SSR) where
 * `document` is unavailable.
 */
export function ensureImportedWebFonts(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(IMPORTED_WEBFONTS_LINK_ID)) return
  const head = document.head
  if (!head) return

  // Preconnect hints cut the TTFB on first load; they're cheap when the link
  // is already warm from earlier navigations.
  const preconnects = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']
  for (const origin of preconnects) {
    const existing = head.querySelector(`link[rel="preconnect"][href="${origin}"]`)
    if (existing) continue
    const pre = document.createElement('link')
    pre.rel = 'preconnect'
    pre.href = origin
    if (origin.includes('gstatic')) pre.crossOrigin = 'anonymous'
    head.appendChild(pre)
  }

  const link = document.createElement('link')
  link.id = IMPORTED_WEBFONTS_LINK_ID
  link.rel = 'stylesheet'
  link.href = IMPORTED_WEBFONTS_HREF
  head.appendChild(link)
}
