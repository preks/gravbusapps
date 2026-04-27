// Compressing requires the browser Image decode loop (HTMLImageElement +
// canvas.toDataURL), which jsdom only partially emulates. We mock both to
// exercise the branching logic (keep smaller, keep original on decode fail,
// placeholder on size-strip) without relying on real decoding.

import type { SlideData } from '../../../components/slideElements'
import type { CompressionWarning } from '../compressSlideImages'

type ImageCtor = typeof HTMLImageElement

const originalImage = globalThis.Image

function mockImageWithOutcome(outcome: 'success' | 'error') {
  ;(globalThis as unknown as { Image: unknown }).Image = class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 800
    naturalHeight = 600
    set src(_value: string) {
      setTimeout(() => {
        if (outcome === 'success' && this.onload) this.onload()
        if (outcome === 'error' && this.onerror) this.onerror()
      }, 0)
    }
  } as unknown as ImageCtor
}

function restoreImage() {
  if (originalImage) {
    ;(globalThis as unknown as { Image: unknown }).Image = originalImage
  }
}

function mockCanvas(output: string | Record<string, string>, options?: { hasTransparency?: boolean }) {
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: () => undefined,
    getImageData: () => ({
      data: new Uint8ClampedArray(options?.hasTransparency ? [0, 0, 0, 0] : [0, 0, 0, 255])
    })
  } as unknown as CanvasRenderingContext2D)
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation((mime?: string) => {
    if (typeof output === 'string') return output
    if (mime && output[mime]) return output[mime]
    return output.default || ''
  })
}

function makeSlide(src: string): SlideData {
  return {
    id: 's1',
    background: { type: 'solid', color: '#fff' },
    elements: [
      {
        id: 'img-1',
        type: 'image',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        rotation: 0,
        opacity: 1,
        locked: false,
        zIndex: 1,
        src,
        alt: '',
        objectFit: 'contain',
        borderRadius: 0
      } as SlideData['elements'][number]
    ]
  }
}

describe('compressSlideImages', () => {
  afterEach(() => {
    restoreImage()
    jest.restoreAllMocks()
  })

  it('returns the original slides untouched when no base64 images are present', async () => {
    const { compressSlideImages } = await import('../compressSlideImages')
    const slides: SlideData[] = [
      {
        id: 's1',
        background: { type: 'solid', color: '#fff' },
        elements: []
      }
    ]

    const result = await compressSlideImages(slides)
    expect(result).toBe(slides)
  })

  it('keeps the smaller of compressed vs original payload for large images', async () => {
    mockImageWithOutcome('success')
    // The first pass only re-encodes images above ~256KB so we don't blur
    // crisp UI screenshots unnecessarily. Use a payload that crosses that
    // threshold to exercise the compression path.
    const largeOriginal = 'data:image/png;base64,' + 'A'.repeat(400_000)
    const shorterCompressed = 'data:image/jpeg;base64,' + 'B'.repeat(500)
    mockCanvas(shorterCompressed)

    const slides = [makeSlide(largeOriginal)]
    const { compressSlideImages } = await import('../compressSlideImages')
    const result = await compressSlideImages(slides)

    expect(result).not.toBe(slides)
    const resultSrc = (result[0].elements[0] as { src: string }).src
    expect(resultSrc).toBe(shorterCompressed)
  })

  it('keeps the original when compression does not save bytes', async () => {
    mockImageWithOutcome('success')
    const shortOriginal = 'data:image/png;base64,' + 'A'.repeat(400_000)
    const longCompressed = 'data:image/jpeg;base64,' + 'B'.repeat(500_000)
    mockCanvas(longCompressed)

    const slides = [makeSlide(shortOriginal)]
    const { compressSlideImages } = await import('../compressSlideImages')
    const result = await compressSlideImages(slides)

    const resultSrc = (result[0].elements[0] as { src: string }).src
    expect(resultSrc).toBe(shortOriginal)
  })

  it('preserves alpha images as PNG so transparent PPTX assets do not gain black backgrounds', async () => {
    mockImageWithOutcome('success')
    const transparentOriginal = 'data:image/png;base64,' + 'A'.repeat(400_000)
    const shorterTransparentPng = 'data:image/png;base64,' + 'B'.repeat(500)
    mockCanvas(
      {
        'image/png': shorterTransparentPng,
        'image/jpeg': 'data:image/jpeg;base64,SHOULD_NOT_BE_USED'
      },
      { hasTransparency: true }
    )

    const slides = [makeSlide(transparentOriginal)]
    const { compressSlideImages } = await import('../compressSlideImages')
    const result = await compressSlideImages(slides)

    const resultSrc = (result[0].elements[0] as { src: string }).src
    expect(resultSrc).toBe(shorterTransparentPng)
  })

  it('skips re-encoding small images in the first pass so crisp UI screenshots stay sharp', async () => {
    mockImageWithOutcome('success')
    const smallOriginal = 'data:image/png;base64,' + 'A'.repeat(1000)
    const blurryCompressed = 'data:image/jpeg;base64,TINY'
    mockCanvas(blurryCompressed)

    const slides = [makeSlide(smallOriginal)]
    const { compressSlideImages } = await import('../compressSlideImages')
    const result = await compressSlideImages(slides)

    const resultSrc = (result[0].elements[0] as { src: string }).src
    expect(resultSrc).toBe(smallOriginal)
  })

  it('keeps the original src when the browser cannot decode the image and reports a warning', async () => {
    // Regression: compression used to blank src to '' on decode failure, which
    // was the main cause of "imported deck shows blank images even when the
    // preview looked fine". The importer now preserves the original bytes and
    // lets the canvas renderer try to decode (and fall back to its own visible
    // placeholder on final failure).
    mockImageWithOutcome('error')
    // Must be large enough to cross the first-pass compression threshold
    // (small images are skipped so sharp icons stay sharp), otherwise we
    // never attempt to decode and therefore never surface the warning.
    const original = 'data:image/png;base64,' + 'Z'.repeat(400_000)
    const slides = [makeSlide(original)]

    const warnings: CompressionWarning[] = []
    const { compressSlideImages } = await import('../compressSlideImages')
    const result = await compressSlideImages(slides, undefined, w => warnings.push(w))

    const resultSrc = (result[0].elements[0] as { src: string }).src
    expect(resultSrc).toBe(original)
    expect(warnings).toEqual([{ type: 'decode-failed', slideIndex: 0, elementIndex: 0 }])
  })

  it('reports progress to the onProgress callback', async () => {
    mockImageWithOutcome('success')
    mockCanvas('data:image/jpeg;base64,SHORT')

    const slides = [
      makeSlide('data:image/png;base64,' + 'A'.repeat(2000)),
      makeSlide('data:image/png;base64,' + 'A'.repeat(2000))
    ]

    const progressCalls: Array<{ done: number; total: number }> = []
    const { compressSlideImages } = await import('../compressSlideImages')
    await compressSlideImages(slides, (done, total) => {
      progressCalls.push({ done, total })
    })

    expect(progressCalls[0]).toEqual({ done: 0, total: 2 })
    expect(progressCalls[progressCalls.length - 1]).toEqual({ done: 2, total: 2 })
  })

  it('exposes STRIPPED_IMAGE_PLACEHOLDER_DATA_URL as a data:image/... URL that passes sanitization', async () => {
    const { STRIPPED_IMAGE_PLACEHOLDER_DATA_URL } = await import('../compressSlideImages')
    const { sanitizeSlideImageUrl } = await import('../../../utils/slideMediaUrl')

    expect(STRIPPED_IMAGE_PLACEHOLDER_DATA_URL.startsWith('data:image/')).toBe(true)
    expect(sanitizeSlideImageUrl(STRIPPED_IMAGE_PLACEHOLDER_DATA_URL)).toBe(STRIPPED_IMAGE_PLACEHOLDER_DATA_URL)
  })

  it('leaves SVG data URLs untouched so the canvas → JPEG pipeline cannot rasterize imported vectors', async () => {
    // Regression: previously SVG assets (real PPTX SVGs, EMF/WMF embedded
    // fallback previews, and our own metafile placeholder) were fed into the
    // <img> + canvas pipeline. That threw away the vector advantage, and in
    // some browsers tainted the canvas and produced `decode-failed` warnings
    // for fully valid images. Vector data URLs now bypass compression.
    const svgOriginal =
      'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'.repeat(200))

    const image = jest.fn()
    ;(globalThis as unknown as { Image: unknown }).Image = image as unknown

    const canvasSpy = jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL')

    const slides = [makeSlide(svgOriginal)]
    const { compressSlideImages } = await import('../compressSlideImages')
    const result = await compressSlideImages(slides)

    const resultSrc = (result[0].elements[0] as { src: string }).src
    expect(resultSrc).toBe(svgOriginal)
    expect(image).not.toHaveBeenCalled()
    expect(canvasSpy).not.toHaveBeenCalled()
  })
})
