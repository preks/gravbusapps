// Render EMF/WMF metafiles to inline SVG using rtf.js's WMFJS + EMFJS
// bundles. This is the "vector fidelity" fallback that runs when our
// embedded-raster extractor (PNG/JPEG/BMP/DIB inside the metafile) has
// nothing to work with — which is the common case for WMFs produced by
// pre-2016 PowerPoint and third-party tools.
//
// The rtf.js library ships three UMD bundles (RTFJS ≈ 2 MB, EMFJS ≈ 56 KB,
// WMFJS ≈ 56 KB). We never touch RTFJS and we lazy-load the other two via
// dynamic import() so the metafile rendering code only hits the wire when
// a deck actually contains a vector picture. Failed imports or library
// errors degrade gracefully to `undefined` so the caller falls back to the
// existing SVG placeholder — never a broken image icon.

type RendererCtor = new (blob: ArrayBuffer) => {
  render: (settings: Record<string, unknown>) => SVGElement
}
type MetafileNamespace = {
  Renderer: RendererCtor
  loggingEnabled?: (enabled: boolean) => void
}

// Cache the dynamic import() promises so we don't pay the parse cost for
// every picture in a deck with hundreds of metafiles.
let wmfjsPromise: Promise<MetafileNamespace | undefined> | undefined
let emfjsPromise: Promise<MetafileNamespace | undefined> | undefined

function silenceLogging(ns: MetafileNamespace): MetafileNamespace {
  // rtf.js logs extensively to console (record-by-record trace). The
  // importer runs this on hundreds of images per deck, so leaving it on
  // drowns the console and can make the browser feel sluggish.
  try {
    ns.loggingEnabled?.(false)
  } catch {
    // Silencing is best-effort; proceed regardless.
  }
  return ns
}

async function loadWmfjs(): Promise<MetafileNamespace | undefined> {
  if (!wmfjsPromise) {
    wmfjsPromise = import(
      // @vite-ignore
      'rtf.js/dist/WMFJS.bundle'
    )
      .then(mod => {
        const ns = ((mod as { default?: unknown }).default ?? mod) as MetafileNamespace
        return ns && ns.Renderer ? silenceLogging(ns) : undefined
      })
      .catch(error => {
        // Null out the cache so retries on subsequent imports are possible;
        // also swallow the error so the orchestrator can fall back cleanly.
        wmfjsPromise = undefined
        console.warn('[pptxImport] Failed to load WMFJS bundle:', error)
        return undefined
      })
  }
  return wmfjsPromise
}

async function loadEmfjs(): Promise<MetafileNamespace | undefined> {
  if (!emfjsPromise) {
    emfjsPromise = import(
      // @vite-ignore
      'rtf.js/dist/EMFJS.bundle'
    )
      .then(mod => {
        const ns = ((mod as { default?: unknown }).default ?? mod) as MetafileNamespace
        return ns && ns.Renderer ? silenceLogging(ns) : undefined
      })
      .catch(error => {
        emfjsPromise = undefined
        console.warn('[pptxImport] Failed to load EMFJS bundle:', error)
        return undefined
      })
  }
  return emfjsPromise
}

// Long edge of the virtual render surface in pixels. The SVG's intrinsic
// dimensions are kept in the `viewBox` so the slide can scale the image
// freely; this number mainly controls internal precision of the rtf.js
// renderer. 2048 gives crisp output for text-heavy logos without bloating
// path data noticeably.
const RENDER_LONG_EDGE_PX = 2048

// Fallback canvas ratio when the metafile header does not declare one.
const DEFAULT_ASPECT = 4 / 3

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Uint8Array may be a view into a larger buffer. Slice to produce a tight
  // ArrayBuffer so the parser doesn't walk off the end while reading
  // records that span the tail of the file.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function readI16LE(bytes: Uint8Array, offset: number): number {
  const v = bytes[offset] | (bytes[offset + 1] << 8)
  return v & 0x8000 ? v - 0x10000 : v
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
}

/**
 * Read the canvas aspect ratio declared by a WMF file. Placeable WMFs (the
 * common on-disk format) start with the Aldus APM magic 0x9AC6CDD7 and
 * include left/top/right/bottom bounds that give us the true drawing
 * extents; non-placeable WMFs do not declare their own size, so we let the
 * caller fall back to a sensible default aspect.
 */
function readWmfAspect(bytes: Uint8Array): number | undefined {
  if (bytes.length < 22) return undefined
  const magic = readU32LE(bytes, 0)
  if (magic !== 0x9ac6cdd7) return undefined

  const left = readI16LE(bytes, 6)
  const top = readI16LE(bytes, 8)
  const right = readI16LE(bytes, 10)
  const bottom = readI16LE(bytes, 12)

  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return undefined
  return width / height
}

/**
 * Read the canvas aspect ratio declared by an EMF header record. EMF files
 * start with an EMR_HEADER record (type = 0x00000001) that includes both
 * rclBounds (device units) and rclFrame (0.01mm units). We prefer rclFrame
 * because it is authored at the metafile's natural scale; rclBounds is the
 * inked bounding box and can be smaller than the intended frame.
 */
function readEmfAspect(bytes: Uint8Array): number | undefined {
  if (bytes.length < 44) return undefined
  const recordType = readU32LE(bytes, 0)
  if (recordType !== 0x1) return undefined
  // rclFrame lives at offset 24..40 (left, top, right, bottom), int32 each.
  const frameLeft = readI32LE(bytes, 24)
  const frameTop = readI32LE(bytes, 28)
  const frameRight = readI32LE(bytes, 32)
  const frameBottom = readI32LE(bytes, 36)

  const frameW = frameRight - frameLeft
  const frameH = frameBottom - frameTop
  if (frameW > 0 && frameH > 0) return frameW / frameH

  // Fall back to rclBounds (device units) if rclFrame is degenerate.
  if (bytes.length < 24) return undefined
  const boundsLeft = readI32LE(bytes, 8)
  const boundsTop = readI32LE(bytes, 12)
  const boundsRight = readI32LE(bytes, 16)
  const boundsBottom = readI32LE(bytes, 20)
  const boundsW = boundsRight - boundsLeft
  const boundsH = boundsBottom - boundsTop
  if (boundsW > 0 && boundsH > 0) return boundsW / boundsH

  return undefined
}

function clampAspect(aspect: number): number {
  // Guard against pathological ratios that would make the virtual canvas
  // absurdly long on one side; 10:1 is still far wider than any real logo.
  if (!Number.isFinite(aspect) || aspect <= 0) return DEFAULT_ASPECT
  return Math.min(10, Math.max(0.1, aspect))
}

function resolveRenderDimensions(bytes: Uint8Array, kind: 'emf' | 'wmf'): { width: number; height: number } {
  const rawAspect = kind === 'emf' ? readEmfAspect(bytes) : readWmfAspect(bytes)
  const aspect = clampAspect(rawAspect ?? DEFAULT_ASPECT)
  if (aspect >= 1) {
    return { width: RENDER_LONG_EDGE_PX, height: Math.round(RENDER_LONG_EDGE_PX / aspect) }
  }
  return { width: Math.round(RENDER_LONG_EDGE_PX * aspect), height: RENDER_LONG_EDGE_PX }
}

function serializeSvg(svg: SVGElement): string {
  if (typeof XMLSerializer === 'undefined') return svg.outerHTML
  return new XMLSerializer().serializeToString(svg)
}

function svgToDataUrl(svgMarkup: string): string {
  // Base64 encode via the UTF-8 safe path so non-ASCII text inside the SVG
  // (labels, unicode symbols, etc.) doesn't throw in btoa().
  const utf8 = unescape(encodeURIComponent(svgMarkup))
  return `data:image/svg+xml;base64,${btoa(utf8)}`
}

/**
 * Post-process the SVG rtf.js returns so it behaves well inside a
 * slide-sized <img>:
 *
 *   1. Remove the absolute `width`/`height` attributes. rtf.js sets them
 *      to the `info.width`/`info.height` strings we passed in, which
 *      means a 2048×1024 SVG gets rendered at 2048×1024 *regardless* of
 *      its <img> frame — browsers don't scale <img src="data:image/svg…">
 *      to fit when the SVG has explicit pixel dimensions. Stripping them
 *      leaves the viewBox in control and lets the slide-frame CSS decide
 *      the final size.
 *   2. Ensure preserveAspectRatio is set so the image doesn't distort
 *      when the slide slot's aspect ratio differs from the metafile's.
 *   3. Ensure the SVG has an explicit xmlns so the data URL decodes
 *      cross-browser.
 */
function normalizeRenderedSvg(svg: SVGElement, width: number, height: number): void {
  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  if (!svg.getAttribute('preserveAspectRatio')) {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  }
  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }
}

/**
 * Pluggable preprocessor for metafile bytes. A host (server-side
 * microservice, Tauri native helper, etc.) can register a processor that
 * turns EMF/WMF bytes into a regular PNG or SVG data URL — those formats
 * browsers render natively, sidestepping rtf.js's EMFJS/WMFJS which cannot
 * parse most EMF+ records. When the processor returns a data URL we use
 * it; otherwise we fall back to the in-browser rtf.js path.
 *
 * Typical implementation (future roadmap): call a backend endpoint that
 * runs `libreoffice --headless --convert-to svg` on the metafile and
 * returns the resulting SVG. For the 16 `image18.emf` checkmarks on
 * slide 6 of the Enterprise AI deck, LibreOffice produces a faithful
 * rendering that the browser can embed directly.
 */
export type MetafilePreprocessor = (bytes: Uint8Array, kind: 'emf' | 'wmf') => Promise<string | undefined>

let registeredPreprocessor: MetafilePreprocessor | undefined

/**
 * Register (or clear) a global metafile preprocessor. Passing `undefined`
 * restores the rtf.js-only behavior. The preprocessor is shared by every
 * ongoing import, so it should be idempotent and resilient to concurrent
 * calls with different bytes.
 */
export function setMetafilePreprocessor(preprocessor: MetafilePreprocessor | undefined): void {
  registeredPreprocessor = preprocessor
}

export function getMetafilePreprocessor(): MetafilePreprocessor | undefined {
  return registeredPreprocessor
}

/**
 * Render a WMF/EMF byte stream to an `image/svg+xml` data URL. Returns
 * `undefined` when the library fails to load (SSR, network error) or when
 * the metafile contains records the renderer cannot handle — callers
 * should treat `undefined` as "use the placeholder".
 *
 * This function requires a DOM because the rtf.js renderer calls
 * `document.createElementNS` to build the SVG. In test environments
 * jsdom satisfies that requirement; at runtime the editor always has a
 * DOM available.
 *
 * A registered {@link MetafilePreprocessor} (see {@link setMetafilePreprocessor})
 * is consulted first; its output is returned as-is when it produces a
 * data URL. Only metafiles the preprocessor refuses fall through to
 * rtf.js's EMFJS/WMFJS.
 */
export async function renderMetafileToSvgDataUrl(bytes: Uint8Array, kind: 'emf' | 'wmf'): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined

  if (registeredPreprocessor) {
    try {
      const preprocessed = await registeredPreprocessor(bytes, kind)
      if (preprocessed) return preprocessed
    } catch (error) {
      console.warn(`[pptxImport] Metafile preprocessor threw on ${kind}, falling back:`, error)
    }
  }

  try {
    const ns = kind === 'emf' ? await loadEmfjs() : await loadWmfjs()
    if (!ns) return undefined

    const { width, height } = resolveRenderDimensions(bytes, kind)
    const buffer = toArrayBuffer(bytes)
    const renderer = new ns.Renderer(buffer)

    // mapMode 8 = MM_ISOTROPIC, which the official WMFJS sample uses.
    // Matching xExt/yExt to width/height produces an SVG whose viewBox
    // already encodes the correct aspect ratio (rtf.js sets
    // viewBox="0 0 xExt yExt"). We pass wExt/hExt too; EMF needs them
    // and WMFJS ignores the extras.
    const svg = renderer.render({
      width: `${width}px`,
      height: `${height}px`,
      xExt: width,
      yExt: height,
      wExt: width,
      hExt: height,
      mapMode: 8
    })

    if (!svg) return undefined
    normalizeRenderedSvg(svg, width, height)

    const markup = serializeSvg(svg)
    if (!markup || markup.length < 80) return undefined
    return svgToDataUrl(markup)
  } catch (error) {
    // rtf.js throws on unsupported records; treat as "can't render" and
    // let the caller fall back to the placeholder.
    console.warn(`[pptxImport] ${kind.toUpperCase()} render failed:`, error)
    return undefined
  }
}

export function __resetMetafileRendererCacheForTests(): void {
  wmfjsPromise = undefined
  emfjsPromise = undefined
  registeredPreprocessor = undefined
}
