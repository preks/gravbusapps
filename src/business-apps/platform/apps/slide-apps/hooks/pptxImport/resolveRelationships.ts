// Resolve OOXML relationship files into typed maps.

import type JSZip from 'jszip'
import type { SlideRelationships } from './types'
import { parseXML } from './ooxmlUtils'
import { renderMetafileToSvgDataUrl } from './metafileRenderer'
import { sanitizeSlideImageUrl, sanitizeSlideVideoUrl } from '../../utils/slideMediaUrl'

const REL_TYPE_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
const REL_TYPE_HYPERLINK = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'
const REL_TYPE_NOTES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide'
const REL_TYPE_CHART = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
const REL_TYPE_SLIDE_LAYOUT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout'
const REL_TYPE_SLIDE_MASTER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster'
const REL_TYPE_VIDEO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/video'
const REL_TYPE_MEDIA = 'http://schemas.microsoft.com/office/2007/relationships/media'

function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isExternalTarget(target: string, targetMode?: string | null): boolean {
  return targetMode === 'External' || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)
}

export function normalizePackagePath(packagePath: string): string {
  const pathOnly = packagePath.split('#', 1)[0]?.split('?', 1)[0] || ''
  const stripped = pathOnly.replace(/\\/g, '/').replace(/^\/+/, '')
  const decoded = stripped
    .split('/')
    .filter(Boolean)
    .map(segment => safeDecodeUriComponent(segment))

  const resolved: string[] = []
  for (const segment of decoded) {
    if (segment === '.') continue
    if (segment === '..') {
      resolved.pop()
      continue
    }
    resolved.push(segment)
  }

  return resolved.join('/')
}

function normalizeRelTarget(target: string, baseDir: string): string {
  const strippedTarget = target.replace(/^\/+/, '')
  if (strippedTarget.startsWith('ppt/')) return normalizePackagePath(strippedTarget)
  return normalizePackagePath(`${baseDir}${target}`)
}

export function resolveMediaData(mediaPath: string | undefined, mediaData: Map<string, string>): string | undefined {
  if (!mediaPath) return undefined

  const candidates = new Set<string>()
  const addCandidate = (candidate: string | undefined) => {
    if (!candidate) return
    candidates.add(candidate)

    const normalized = normalizePackagePath(candidate)
    if (normalized) {
      candidates.add(normalized)
      const baseName = normalized.split('/').pop()
      if (baseName) candidates.add(baseName)
    }

    const decoded = safeDecodeUriComponent(candidate)
    if (decoded && decoded !== candidate) {
      candidates.add(decoded)
      const decodedNormalized = normalizePackagePath(decoded)
      if (decodedNormalized) {
        candidates.add(decodedNormalized)
        const decodedBaseName = decodedNormalized.split('/').pop()
        if (decodedBaseName) candidates.add(decodedBaseName)
      }
    }
  }

  addCandidate(mediaPath)
  addCandidate(mediaPath.replace(/^\/+/, ''))

  for (const candidate of candidates) {
    const match = mediaData.get(candidate)
    if (match) return match
  }

  const caseInsensitiveLookup = new Map<string, string>()
  for (const [key, value] of mediaData.entries()) {
    caseInsensitiveLookup.set(key.toLowerCase(), value)
  }

  for (const candidate of candidates) {
    const match = caseInsensitiveLookup.get(candidate.toLowerCase())
    if (match) return match
  }

  return undefined
}

export function resolveImportedImageUrl(
  mediaPath: string | undefined,
  mediaData: Map<string, string>
): string | undefined {
  const embedded = resolveMediaData(mediaPath, mediaData)
  if (embedded) return embedded

  const external = sanitizeSlideImageUrl(mediaPath)
  return external || undefined
}

export function resolveImportedVideoUrl(
  mediaPath: string | undefined,
  mediaData: Map<string, string>
): string | undefined {
  const embedded = resolveMediaData(mediaPath, mediaData)
  if (embedded) return embedded

  const external = sanitizeSlideVideoUrl(mediaPath)
  return external || undefined
}

export async function resolveSlideRelationships(zip: JSZip, slideNumber: number): Promise<SlideRelationships> {
  const result: SlideRelationships = {
    images: new Map(),
    videos: new Map(),
    hyperlinks: new Map(),
    chartPaths: new Map()
  }

  const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`
  const relsFile = zip.file(relsPath)
  if (!relsFile) return result

  const relsContent = await relsFile.async('text')
  const relsXml = parseXML(relsContent)
  const rels = relsXml.getElementsByTagName('Relationship')

  for (const rel of Array.from(rels)) {
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target') || ''
    const type = rel.getAttribute('Type') || ''
    const targetMode = rel.getAttribute('TargetMode')

    if (!id) continue
    if (isExternalTarget(target, targetMode)) {
      if (type === REL_TYPE_HYPERLINK) result.hyperlinks.set(id, target)
      else if (type === REL_TYPE_IMAGE) result.images.set(id, target)
      else if (type === REL_TYPE_VIDEO || type === REL_TYPE_MEDIA) result.videos?.set(id, target)
      continue
    }

    const normalizedTarget = normalizeRelTarget(target, 'ppt/slides/')

    switch (type) {
      case REL_TYPE_IMAGE:
        result.images.set(id, normalizedTarget)
        break
      case REL_TYPE_VIDEO:
      case REL_TYPE_MEDIA:
        result.videos?.set(id, normalizedTarget)
        break
      case REL_TYPE_HYPERLINK:
        result.hyperlinks.set(id, target)
        break
      case REL_TYPE_NOTES:
        result.notesSlidePath = normalizedTarget
        break
      case REL_TYPE_CHART:
        result.chartPaths.set(id, normalizedTarget)
        break
      case REL_TYPE_SLIDE_LAYOUT:
        result.layoutPath = normalizedTarget
        break
    }
  }

  return result
}

export async function resolveLayoutRelationships(
  zip: JSZip,
  layoutPath: string
): Promise<{ images: Map<string, string>; masterPath?: string }> {
  const images = new Map<string, string>()
  let masterPath: string | undefined

  const fileName = layoutPath.split('/').pop() || ''
  const relsPath = `ppt/slideLayouts/_rels/${fileName}.rels`
  const relsFile = zip.file(relsPath)
  if (!relsFile) return { images }

  const relsContent = await relsFile.async('text')
  const relsXml = parseXML(relsContent)
  const rels = relsXml.getElementsByTagName('Relationship')

  for (const rel of Array.from(rels)) {
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target') || ''
    const type = rel.getAttribute('Type') || ''
    const targetMode = rel.getAttribute('TargetMode')
    if (!id) continue
    if (isExternalTarget(target, targetMode)) {
      if (type === REL_TYPE_IMAGE) images.set(id, target)
      continue
    }

    const normalizedTarget = normalizeRelTarget(target, 'ppt/slideLayouts/')

    if (type === REL_TYPE_IMAGE) {
      images.set(id, normalizedTarget)
    } else if (type === REL_TYPE_SLIDE_MASTER) {
      masterPath = normalizedTarget
    }
  }

  return { images, masterPath }
}

export async function resolveMasterRelationships(
  zip: JSZip,
  masterPath: string
): Promise<{ images: Map<string, string> }> {
  const images = new Map<string, string>()

  const fileName = masterPath.split('/').pop() || ''
  const relsPath = `ppt/slideMasters/_rels/${fileName}.rels`
  const relsFile = zip.file(relsPath)
  if (!relsFile) return { images }

  const relsContent = await relsFile.async('text')
  const relsXml = parseXML(relsContent)
  const rels = relsXml.getElementsByTagName('Relationship')

  for (const rel of Array.from(rels)) {
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target') || ''
    const type = rel.getAttribute('Type') || ''
    const targetMode = rel.getAttribute('TargetMode')
    if (!id) continue
    if (isExternalTarget(target, targetMode)) {
      if (type === REL_TYPE_IMAGE) images.set(id, target)
      continue
    }

    if (type === REL_TYPE_IMAGE) {
      images.set(id, normalizeRelTarget(target, 'ppt/slideMasters/'))
    }
  }

  return { images }
}

const EXTENSION_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  emf: 'image/x-emf',
  wmf: 'image/x-wmf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',
  wmv: 'video/x-ms-wmv'
}

/**
 * Detect an image MIME type from leading bytes. Browsers (and SlideCanvas'
 * sanitizer) refuse `data:application/octet-stream;...` URLs, so when a media
 * file has a missing/unknown extension we sniff magic bytes instead of
 * falling through to a generic octet-stream, which the renderer would reject.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  // GIF87a / GIF89a: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif'
  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp'
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  ("RIFF....WEBP")
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  // SVG: starts with '<?xml' or '<svg'
  if (bytes[0] === 0x3c) return 'image/svg+xml'
  // TIFF: 49 49 2A 00 (little-endian) or 4D 4D 00 2A (big-endian)
  if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) return 'image/tiff'
  if (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a) return 'image/tiff'
  return null
}

export function sniffVideoMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  // MP4 / QuickTime family: size + 'ftyp'
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase()
    if (brand.startsWith('qt')) return 'video/quicktime'
    return 'video/mp4'
  }
  // WebM / Matroska: 1A 45 DF A3
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'video/webm'
  }
  // Ogg: "OggS"
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'video/ogg'
  }
  // RIFF/AVI: "RIFF....AVI "
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x41 &&
    bytes[9] === 0x56 &&
    bytes[10] === 0x49 &&
    bytes[11] === 0x20
  ) {
    return 'video/x-msvideo'
  }
  return null
}

// Browsers cannot decode raw EMF/WMF metafiles. When an EMF+ file carries an
// embedded PNG/JPEG fallback bitmap (PowerPoint routinely authors these for
// web compatibility), we extract it so the image shows in the editor. When no
// embedded raster is available we still substitute a neutral SVG placeholder
// so the layout and bounding box are preserved instead of painting a broken
// image icon.
const METAFILE_EXTENSIONS = new Set(['emf', 'wmf'])

export const METAFILE_PLACEHOLDER_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa(
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">',
      '<rect width="100" height="100" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>',
      '<g fill="#94a3b8" font-family="system-ui,sans-serif" font-size="10" text-anchor="middle">',
      '<text x="50" y="48">Vector image</text>',
      '<text x="50" y="62">(EMF/WMF)</text>',
      '</g>',
      '</svg>'
    ].join('')
  )

export function isMetafileExtension(ext: string): boolean {
  return METAFILE_EXTENSIONS.has(ext.toLowerCase())
}

/**
 * Minimum embedded raster size we will accept as a preview. PowerPoint's
 * EMF+ "fallback bitmap" records usually carry the full image, but GDI
 * record streams can contain tiny cursor/icon bitmaps we don't want to
 * surface as the preview.
 */
const MIN_EMBEDDED_RASTER_BYTES = 256

function indexOfSequence(bytes: Uint8Array, needle: number[], fromIndex: number): number {
  const limit = bytes.length - needle.length
  for (let i = fromIndex; i <= limit; i++) {
    let match = true
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}

/**
 * Scan metafile bytes for an embedded raster payload and return it as a
 * browser-displayable data URL. Handles three cases in order of fidelity:
 *
 *   1. PNG/JPEG fallback bitmaps (EMF+ authored by PowerPoint for web viewers)
 *   2. Complete BMP file blobs (some deck tooling embeds BMPs directly)
 *   3. Raw DIB data from GDI raster records (<StretchDIBits>, <BitBlt>, etc.)
 *      which are wrapped with a synthesized BITMAPFILEHEADER so the browser
 *      can decode them.
 *
 * Returns `undefined` when no usable raster is found so the caller can fall
 * back to the placeholder.
 */
export function extractEmbeddedRasterFromMetafile(bytes: Uint8Array): string | undefined {
  if (bytes.length < MIN_EMBEDDED_RASTER_BYTES) return undefined

  const png = findEmbeddedPng(bytes)
  if (png) return png

  const jpeg = findEmbeddedJpeg(bytes)
  if (jpeg) return jpeg

  const bmp = findEmbeddedBmp(bytes)
  if (bmp) return bmp

  const dibAsBmp = findEmbeddedDib(bytes)
  if (dibAsBmp) return dibAsBmp

  return undefined
}

function findEmbeddedPng(bytes: Uint8Array): string | undefined {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const pngEndSignature = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]

  const start = indexOfSequence(bytes, pngSignature, 0)
  if (start === -1) return undefined
  const end = indexOfSequence(bytes, pngEndSignature, start + pngSignature.length)
  if (end === -1) return undefined

  const payload = bytes.subarray(start, end + pngEndSignature.length)
  if (payload.byteLength < MIN_EMBEDDED_RASTER_BYTES) return undefined
  return `data:image/png;base64,${bytesToBase64(payload)}`
}

function findEmbeddedJpeg(bytes: Uint8Array): string | undefined {
  const jpegSignature = [0xff, 0xd8, 0xff]
  const jpegEndSignature = [0xff, 0xd9]

  const start = indexOfSequence(bytes, jpegSignature, 0)
  if (start === -1) return undefined
  // Search for JPEG End-Of-Image from the tail so we don't stop at a false
  // positive inside compressed scan data.
  const end = lastIndexOfSequence(bytes, jpegEndSignature, start + jpegSignature.length)
  if (end === -1) return undefined

  const payload = bytes.subarray(start, end + jpegEndSignature.length)
  if (payload.byteLength < MIN_EMBEDDED_RASTER_BYTES) return undefined
  return `data:image/jpeg;base64,${bytesToBase64(payload)}`
}

/**
 * Look for a complete BMP file embedded inside the metafile. A valid BMP
 * starts with `BM` followed by a 4-byte little-endian file size that, for a
 * plausible image, is both larger than the fixed 14-byte file header and
 * no larger than the surrounding metafile.
 */
function findEmbeddedBmp(bytes: Uint8Array): string | undefined {
  for (let i = 0; i <= bytes.length - 14; i++) {
    if (bytes[i] !== 0x42 || bytes[i + 1] !== 0x4d) continue
    const fileSize = readU32LE(bytes, i + 2)
    if (fileSize < 54 || fileSize > bytes.length - i) continue

    const offBits = readU32LE(bytes, i + 10)
    if (offBits < 54 || offBits > fileSize) continue

    // Structural validation of the DIB header is a strong signal; no
    // additional size floor is needed here (a legitimate 4×4×24bpp BMP is
    // ~102 bytes).
    const dib = parseDibHeader(bytes, i + 14)
    if (!dib) continue

    const payload = bytes.subarray(i, i + fileSize)
    return `data:image/bmp;base64,${bytesToBase64(payload)}`
  }
  return undefined
}

/**
 * DIB headers inside EMF `StretchDIBits` / `BitBlt` records live without a
 * BMP file header. We synthesize one so the browser can decode the image.
 * Typical BITMAPINFOHEADER is 40 bytes (`0x28 00 00 00`) but we also accept
 * the v2/v3/v4/v5 header sizes PowerPoint occasionally emits.
 */
const DIB_HEADER_SIZES = [40, 52, 56, 108, 124]

function findEmbeddedDib(bytes: Uint8Array): string | undefined {
  const limit = bytes.length - 40
  for (let i = 0; i <= limit; i++) {
    const dib = parseDibHeader(bytes, i)
    if (!dib) continue

    const paletteSize = computePaletteSize(dib)
    const rowStride = Math.floor((dib.width * dib.bitCount + 31) / 32) * 4
    const pixelSize = rowStride * Math.abs(dib.height)
    const dibSize = dib.headerSize + paletteSize + pixelSize

    // The DIB must fit in the remaining buffer. We don't require an exact
    // match (EMF records often pad trailing bytes), but we refuse obviously
    // truncated DIBs so we never hand the browser half a bitmap. No blanket
    // size floor — parseDibHeader's structural checks are stricter than a
    // byte count.
    if (i + dibSize > bytes.length) continue

    const fileSize = 14 + dibSize
    const bmp = new Uint8Array(fileSize)
    bmp[0] = 0x42
    bmp[1] = 0x4d
    writeU32LE(bmp, 2, fileSize)
    writeU32LE(bmp, 6, 0)
    writeU32LE(bmp, 10, 14 + dib.headerSize + paletteSize)
    bmp.set(bytes.subarray(i, i + dibSize), 14)

    return `data:image/bmp;base64,${bytesToBase64(bmp)}`
  }
  return undefined
}

interface DibHeaderInfo {
  headerSize: number
  width: number
  height: number
  bitCount: number
  compression: number
  colorsUsed: number
}

function parseDibHeader(bytes: Uint8Array, offset: number): DibHeaderInfo | null {
  if (offset + 16 > bytes.length) return null

  const headerSize = readU32LE(bytes, offset)
  if (!DIB_HEADER_SIZES.includes(headerSize)) return null

  const width = readI32LE(bytes, offset + 4)
  const height = readI32LE(bytes, offset + 8)
  const planes = readU16LE(bytes, offset + 12)
  const bitCount = readU16LE(bytes, offset + 14)

  if (planes !== 1) return null
  if (bitCount !== 1 && bitCount !== 4 && bitCount !== 8 && bitCount !== 16 && bitCount !== 24 && bitCount !== 32) {
    return null
  }
  if (width <= 0 || width > 20000) return null
  const absHeight = Math.abs(height)
  if (absHeight === 0 || absHeight > 20000) return null

  let compression = 0
  let colorsUsed = 0
  if (offset + 36 <= bytes.length && headerSize >= 40) {
    compression = readU32LE(bytes, offset + 16)
    colorsUsed = readU32LE(bytes, offset + 32)
  }
  // Only uncompressed and BITFIELDS-style DIBs (compression 0 or 3) are safe
  // to ship to the browser without a decoder. Reject JPEG-in-DIB (4) and
  // PNG-in-DIB (5) here since those should already have been picked up by
  // findEmbeddedPng/findEmbeddedJpeg above.
  if (compression !== 0 && compression !== 3) return null

  return { headerSize, width, height, bitCount, compression, colorsUsed }
}

function computePaletteSize(dib: DibHeaderInfo): number {
  if (dib.bitCount > 8) {
    // BI_BITFIELDS (compression=3) precedes the pixels with three DWORDs at
    // 16/32 bpp; simpler compressions don't have a palette at all.
    return dib.compression === 3 ? 12 : 0
  }
  const defaultColors = 1 << dib.bitCount
  const colors = dib.colorsUsed > 0 ? dib.colorsUsed : defaultColors
  return colors * 4
}

function readU16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
}

function writeU32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

function lastIndexOfSequence(bytes: Uint8Array, needle: number[], fromIndex: number): number {
  for (let i = bytes.length - needle.length; i >= fromIndex; i--) {
    let match = true
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCodePoint(...Array.from(chunk))
  }
  return btoa(binary)
}

export async function extractAllMedia(zip: JSZip): Promise<Map<string, string>> {
  const images = new Map<string, string>()
  const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'))

  for (const fileName of mediaFiles) {
    const file = zip.files[fileName]
    if (file && !file.dir) {
      try {
        const imageName = fileName.split('/').pop() || ''
        const ext = imageName.split('.').pop()?.toLowerCase() || ''

        if (isMetafileExtension(ext)) {
          // EMF/WMF resolution fidelity, in order of preference:
          //
          //   1. True vector rendering via WMFJS/EMFJS (rtf.js) for files
          //      that contain only GDI drawing records. This is the only
          //      path that works for older WMFs and third-party authored
          //      vector content; the library is dynamically imported so
          //      it never ships with decks that have no metafiles.
          //   2. Embedded raster fallback (PNG/JPEG/BMP/DIB inside the
          //      metafile) — present in many PowerPoint-authored EMF+ files,
          //      but can be visibly blurry compared to the real vector.
          //   3. Neutral SVG placeholder — preserves the bounding box and
          //      lets the user see that something was there, even when
          //      the first two paths failed.
          const metafileBytes = new Uint8Array(await file.async('arraybuffer'))
          let preview = await renderMetafileToSvgDataUrl(metafileBytes, ext === 'emf' ? 'emf' : 'wmf')
          if (!preview) {
            preview = extractEmbeddedRasterFromMetafile(metafileBytes)
          }
          preview = preview ?? METAFILE_PLACEHOLDER_DATA_URL

          const normalizedPath = normalizePackagePath(fileName)
          images.set(fileName, preview)
          images.set(normalizedPath, preview)
          images.set(imageName, preview)
          continue
        }

        const arrayBuf = await file.async('arraybuffer')
        const headerBytes = new Uint8Array(arrayBuf, 0, Math.min(16, arrayBuf.byteLength))

        // Prefer the extension map (accurate in well-formed decks), then fall
        // back to magic-byte sniffing, and only as a last resort assume PNG.
        // The renderer rejects `data:application/octet-stream`, so producing
        // one here used to strand valid images as a blank frame.
        let mime = EXTENSION_MIME[ext]
        if (!mime) {
          const sniffed = sniffImageMime(headerBytes)
          mime = sniffed || sniffVideoMime(headerBytes) || 'image/png'
        }

        const typedBlob = new Blob([arrayBuf], { type: mime })
        const base64 = await blobToBase64(typedBlob)
        const normalizedPath = normalizePackagePath(fileName)
        images.set(fileName, base64)
        images.set(normalizedPath, base64)
        images.set(imageName, base64)
      } catch {
        // Skip unreadable media files
      }
    }
  }

  return images
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
