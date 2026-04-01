import { embedImagesInHtml } from './exportUtils'

function signatureDivHtml(svg: string): string {
  const esc = svg.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  return `<div data-signature-node="" data-snapshot-svg="${esc}" data-width="100" data-height="40"></div>`
}

describe('embedImagesInHtml signature materialization', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="black"/></svg>'

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('embeds signature as PNG data URL when canvas rasterization succeeds', async () => {
    class MockImage {
      onload: (() => void) | null = null
      naturalWidth = 100
      naturalHeight = 50
      set src(_: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image

    const drawImage = jest.fn()
    const ctx = {
      drawImage,
      translate: jest.fn(),
      rotate: jest.fn(),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    }
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
    jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,abc')

    const out = await embedImagesInHtml(signatureDivHtml(svg), async () => null)
    expect(out).toContain('data:image/png;base64,abc')
    expect(drawImage).toHaveBeenCalled()
  })

  it('falls back to SVG data URL when canvas context is unavailable', async () => {
    class MockImage {
      onload: (() => void) | null = null
      naturalWidth = 100
      naturalHeight = 50
      set src(_: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image

    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const out = await embedImagesInHtml(signatureDivHtml(svg), async () => null)
    expect(out).toContain('data:image/svg+xml;base64,')
    expect(out).toContain('class="signature-export-image"')
  })
})
