// Mock the metafile renderer so this suite never pays the cost of loading
// rtf.js and its bundles. The renderer has its own tests covering the
// happy/error paths; here we only care that extractAllMedia picks the right
// preview source in this order: rendered SVG, embedded raster, placeholder.
jest.mock('../metafileRenderer', () => ({
  renderMetafileToSvgDataUrl: jest.fn().mockResolvedValue(undefined)
}))

import JSZip from 'jszip'
import { renderMetafileToSvgDataUrl } from '../metafileRenderer'
import {
  resolveSlideRelationships,
  resolveLayoutRelationships,
  resolveMasterRelationships,
  extractAllMedia,
  extractEmbeddedRasterFromMetafile,
  METAFILE_PLACEHOLDER_DATA_URL,
  isMetafileExtension
} from '../resolveRelationships'

const mockRenderMetafileToSvgDataUrl = renderMetafileToSvgDataUrl as jest.MockedFunction<
  typeof renderMetafileToSvgDataUrl
>

function makeRelsXml(entries: Array<{ id: string; type: string; target: string }>): string {
  const body = entries.map(e => `<Relationship Id="${e.id}" Type="${e.type}" Target="${e.target}"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${body}
</Relationships>`
}

const REL = {
  image: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  hyperlink: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
  notes: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide',
  chart: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
  layout: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
  master: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster'
}

describe('resolveSlideRelationships', () => {
  it('returns empty maps when rels file is missing', async () => {
    const zip = new JSZip()
    const rels = await resolveSlideRelationships(zip, 1)
    expect(rels.images.size).toBe(0)
    expect(rels.hyperlinks.size).toBe(0)
    expect(rels.chartPaths.size).toBe(0)
    expect(rels.layoutPath).toBeUndefined()
  })

  it('resolves image, hyperlink, notes, chart, and layout paths', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      makeRelsXml([
        { id: 'rId1', type: REL.image, target: '../media/image1.png' },
        { id: 'rId2', type: REL.hyperlink, target: 'https://example.com' },
        { id: 'rId3', type: REL.notes, target: '../notesSlides/notesSlide1.xml' },
        { id: 'rId4', type: REL.chart, target: '../charts/chart1.xml' },
        { id: 'rId5', type: REL.layout, target: '../slideLayouts/slideLayout2.xml' }
      ])
    )

    const rels = await resolveSlideRelationships(zip, 1)
    expect(rels.images.get('rId1')).toBe('ppt/media/image1.png')
    expect(rels.hyperlinks.get('rId2')).toBe('https://example.com')
    expect(rels.notesSlidePath).toBe('ppt/notesSlides/notesSlide1.xml')
    expect(rels.chartPaths.get('rId4')).toBe('ppt/charts/chart1.xml')
    expect(rels.layoutPath).toBe('ppt/slideLayouts/slideLayout2.xml')
  })

  it('normalizes absolute and URI-escaped package targets for embedded images', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      makeRelsXml([{ id: 'rId1', type: REL.image, target: '/ppt/media/Brand%20Hero.png' }])
    )

    const rels = await resolveSlideRelationships(zip, 1)
    expect(rels.images.get('rId1')).toBe('ppt/media/Brand Hero.png')
  })

  it('ignores unknown relationship types', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      makeRelsXml([{ id: 'rId10', type: 'unknown-type', target: '../media/x.png' }])
    )
    const rels = await resolveSlideRelationships(zip, 1)
    expect(rels.images.size).toBe(0)
  })
})

describe('resolveLayoutRelationships', () => {
  it('resolves layout images and master path', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/slideLayouts/_rels/slideLayout2.xml.rels',
      makeRelsXml([
        { id: 'rId1', type: REL.image, target: '../media/layoutImg.png' },
        { id: 'rId2', type: REL.master, target: '../slideMasters/slideMaster1.xml' }
      ])
    )

    const result = await resolveLayoutRelationships(zip, 'ppt/slideLayouts/slideLayout2.xml')
    expect(result.images.get('rId1')).toBe('ppt/media/layoutImg.png')
    expect(result.masterPath).toBe('ppt/slideMasters/slideMaster1.xml')
  })

  it('returns empty when layout rels file missing', async () => {
    const zip = new JSZip()
    const result = await resolveLayoutRelationships(zip, 'ppt/slideLayouts/slideLayout2.xml')
    expect(result.images.size).toBe(0)
    expect(result.masterPath).toBeUndefined()
  })
})

describe('extractAllMedia metafile fallback', () => {
  beforeEach(() => {
    mockRenderMetafileToSvgDataUrl.mockReset()
    mockRenderMetafileToSvgDataUrl.mockResolvedValue(undefined)
  })

  it('flags EMF/WMF extensions', () => {
    expect(isMetafileExtension('emf')).toBe(true)
    expect(isMetafileExtension('WMF')).toBe(true)
    expect(isMetafileExtension('png')).toBe(false)
  })

  it('falls back to the neutral placeholder when the metafile has no embedded raster', async () => {
    const zip = new JSZip()
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])
    zip.file('ppt/media/image1.png', pngBytes)
    zip.file('ppt/media/diagram.emf', new Uint8Array([1, 2, 3, 4]))
    zip.file('ppt/media/legacy.wmf', new Uint8Array([5, 6, 7, 8]))

    const media = await extractAllMedia(zip)

    expect(media.get('diagram.emf')).toBe(METAFILE_PLACEHOLDER_DATA_URL)
    expect(media.get('legacy.wmf')).toBe(METAFILE_PLACEHOLDER_DATA_URL)
    expect(media.get('image1.png')).toMatch(/^data:image\/png;base64,/)
  })

  it('prefers a rendered SVG over an embedded raster fallback when both are available', async () => {
    mockRenderMetafileToSvgDataUrl.mockResolvedValueOnce('data:image/svg+xml;base64,RENDERED')

    const header = new Uint8Array(64).fill(0)
    const pngStart = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const pngBody = new Array(400).fill(0x42)
    const pngEnd = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]
    const embeddedPng = [...pngStart, ...pngBody, ...pngEnd]
    const emfBytes = new Uint8Array(header.length + embeddedPng.length)
    emfBytes.set(header, 0)
    emfBytes.set(embeddedPng, header.length)

    const zip = new JSZip()
    zip.file('ppt/media/diagram.emf', emfBytes)

    const media = await extractAllMedia(zip)

    expect(media.get('diagram.emf')).toBe('data:image/svg+xml;base64,RENDERED')
    expect(mockRenderMetafileToSvgDataUrl).toHaveBeenCalledWith(emfBytes, 'emf')
  })

  it('extracts an embedded PNG fallback bitmap from an EMF+ metafile so the image shows in the editor', async () => {
    // Build a pretend EMF+ payload: a tiny EMF header followed by a valid PNG
    // blob (padded to pass the minimum-size guard so we don't mistake GDI
    // raster fragments for the fallback image).
    const header = new Uint8Array(64).fill(0)
    const pngStart = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const pngBody = new Array(400).fill(0x42)
    const pngEnd = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]
    const embeddedPng = [...pngStart, ...pngBody, ...pngEnd]
    const trailer = new Uint8Array(32).fill(0)

    const emfBytes = new Uint8Array(header.length + embeddedPng.length + trailer.length)
    emfBytes.set(header, 0)
    emfBytes.set(embeddedPng, header.length)
    emfBytes.set(trailer, header.length + embeddedPng.length)

    const zip = new JSZip()
    zip.file('ppt/media/diagram.emf', emfBytes)

    const media = await extractAllMedia(zip)
    const url = media.get('diagram.emf')
    expect(url).toBeDefined()
    expect(url!.startsWith('data:image/png;base64,')).toBe(true)
    expect(url).not.toBe(METAFILE_PLACEHOLDER_DATA_URL)
    expect(mockRenderMetafileToSvgDataUrl).toHaveBeenCalledWith(emfBytes, 'emf')
  })

  it('extractEmbeddedRasterFromMetafile finds an embedded JPEG fallback', () => {
    const header = new Uint8Array(32).fill(0)
    const jpegStart = [0xff, 0xd8, 0xff, 0xe0]
    const jpegBody = new Array(400).fill(0x37)
    const jpegEnd = [0xff, 0xd9]
    const embedded = [...jpegStart, ...jpegBody, ...jpegEnd]
    const emfBytes = new Uint8Array(header.length + embedded.length)
    emfBytes.set(header, 0)
    emfBytes.set(embedded, header.length)

    const url = extractEmbeddedRasterFromMetafile(emfBytes)
    expect(url).toBeDefined()
    expect(url!.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('extractEmbeddedRasterFromMetafile returns undefined when no raster is embedded', () => {
    const bytes = new Uint8Array(512).fill(0)
    expect(extractEmbeddedRasterFromMetafile(bytes)).toBeUndefined()
  })

  it('ignores tiny byte sequences that happen to match a magic number', () => {
    // Defensive: a 5-byte buffer cannot possibly carry a real fallback image,
    // so we reject it instead of emitting a data URL that would render as
    // broken bytes in the editor.
    const tiny = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])
    expect(extractEmbeddedRasterFromMetafile(tiny)).toBeUndefined()
  })

  it('extracts an embedded BMP file when the metafile carries one directly', () => {
    // Build a minimal 24bpp BMP with a small payload wrapped in metafile noise.
    const width = 4
    const height = 4
    const rowStride = Math.floor((width * 24 + 31) / 32) * 4
    const pixelSize = rowStride * height
    const dibSize = 40
    const fileSize = 14 + dibSize + pixelSize

    const bmp = new Uint8Array(fileSize)
    bmp[0] = 0x42
    bmp[1] = 0x4d
    // bfSize
    bmp[2] = fileSize & 0xff
    bmp[3] = (fileSize >> 8) & 0xff
    // bfOffBits = 14 + 40 = 54
    bmp[10] = 54
    // DIB header: size=40
    bmp[14] = 40
    // width
    bmp[18] = width
    // height
    bmp[22] = height
    // planes
    bmp[26] = 1
    // bitCount
    bmp[28] = 24

    // Wrap with 512 bytes of leading noise and 128 trailing bytes.
    const prefix = new Uint8Array(512).fill(0x11)
    const suffix = new Uint8Array(128).fill(0x22)
    const emf = new Uint8Array(prefix.length + bmp.length + suffix.length)
    emf.set(prefix, 0)
    emf.set(bmp, prefix.length)
    emf.set(suffix, prefix.length + bmp.length)

    const url = extractEmbeddedRasterFromMetafile(emf)
    expect(url).toBeDefined()
    expect(url!.startsWith('data:image/bmp;base64,')).toBe(true)
  })

  it('synthesizes a BMP wrapper around a raw DIB embedded via GDI raster records', () => {
    // PowerPoint's EMF StretchDIBits records carry a raw BITMAPINFOHEADER +
    // pixel data without a BMP file header. The importer must wrap that with
    // a synthetic BITMAPFILEHEADER so the browser can decode it.
    const width = 8
    const height = 8
    const bitCount = 24
    const rowStride = Math.floor((width * bitCount + 31) / 32) * 4
    const pixelSize = rowStride * height
    const dibSize = 40 + pixelSize

    const dib = new Uint8Array(dibSize)
    // BITMAPINFOHEADER: size=40
    dib[0] = 40
    // width
    dib[4] = width
    // height
    dib[8] = height
    // planes
    dib[12] = 1
    // bitCount
    dib[14] = bitCount

    // Pad the DIB high enough to clear the MIN_EMBEDDED_RASTER_BYTES floor and
    // wrap it in metafile-style surrounding records.
    const padding = new Uint8Array(400).fill(0xaa)
    const header = new Uint8Array(32).fill(0x00)
    const combined = new Uint8Array(header.length + dib.length + padding.length)
    combined.set(header, 0)
    combined.set(dib, header.length)
    combined.set(padding, header.length + dib.length)

    const url = extractEmbeddedRasterFromMetafile(combined)
    expect(url).toBeDefined()
    expect(url!.startsWith('data:image/bmp;base64,')).toBe(true)
  })

  it('stores media under both package-path and basename aliases', async () => {
    const zip = new JSZip()
    zip.file('ppt/media/Brand Hero.png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]))

    const media = await extractAllMedia(zip)

    expect(media.get('ppt/media/Brand Hero.png')).toMatch(/^data:image\/png;base64,/)
    expect(media.get('Brand Hero.png')).toMatch(/^data:image\/png;base64,/)
  })

  it('never emits application/octet-stream URLs, even for extension-less files', async () => {
    // Regression: the importer historically fell back to
    // `data:application/octet-stream` when the file extension wasn't in the
    // lookup table. SlideCanvas / SlideThumbnail / SlideExportRenderer all
    // reject that MIME as unsafe, so the imported image silently disappeared
    // in the editor even though the bytes were a valid PNG / JPEG.
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
    const zip = new JSZip()
    zip.file('ppt/media/mystery1', pngBytes)
    zip.file('ppt/media/mystery2', jpegBytes)

    const media = await extractAllMedia(zip)

    const pngUrl = media.get('mystery1')
    const jpegUrl = media.get('mystery2')
    expect(pngUrl).toBeDefined()
    expect(jpegUrl).toBeDefined()
    expect(pngUrl!.startsWith('data:image/png')).toBe(true)
    expect(jpegUrl!.startsWith('data:image/jpeg')).toBe(true)
    expect(pngUrl!.startsWith('data:application/octet-stream')).toBe(false)
    expect(jpegUrl!.startsWith('data:application/octet-stream')).toBe(false)
  })

  it('falls back to image/png for bytes it cannot sniff, so the renderer never rejects the URL outright', async () => {
    const unknownBytes = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05])
    const zip = new JSZip()
    zip.file('ppt/media/opaque.bin', unknownBytes)

    const media = await extractAllMedia(zip)

    const url = media.get('opaque.bin')
    expect(url).toBeDefined()
    expect(url!.startsWith('data:image/')).toBe(true)
  })
})

describe('resolveMasterRelationships', () => {
  it('resolves master images only', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      makeRelsXml([
        { id: 'rId1', type: REL.image, target: '../media/master.png' },
        { id: 'rId2', type: REL.hyperlink, target: 'https://example.com' }
      ])
    )

    const result = await resolveMasterRelationships(zip, 'ppt/slideMasters/slideMaster1.xml')
    expect(result.images.get('rId1')).toBe('ppt/media/master.png')
    expect(result.images.size).toBe(1)
  })
})
