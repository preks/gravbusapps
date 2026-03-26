import { analyzeImageWrapContour, resolveContourSlicesForWrapMode } from './wrapContourUtils'

describe('wrapContourUtils', () => {
  it('extracts outer contours and interior openings from alpha data', () => {
    const canvas = document.createElement('canvas')
    const alphaRows = [
      [0, 0, 255, 255, 255, 255, 0, 0],
      [0, 0, 255, 255, 255, 255, 0, 0],
      [0, 0, 255, 255, 0, 0, 255, 255],
      [0, 0, 255, 255, 0, 0, 255, 255],
      [0, 0, 255, 255, 255, 255, 0, 0],
      [0, 0, 255, 255, 255, 255, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
    const imageData = new Uint8ClampedArray(8 * 8 * 4)

    alphaRows.forEach((row, y) => {
      row.forEach((alpha, x) => {
        imageData[(y * 8 + x) * 4 + 3] = alpha
      })
    })

    const getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: imageData
      }))
    }))

    Object.defineProperty(canvas, 'getContext', {
      configurable: true,
      value: getContext
    })

    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return canvas
      }

      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement
    })

    const contour = analyzeImageWrapContour(
      {
        naturalWidth: 8,
        naturalHeight: 8
      } as HTMLImageElement,
      {
        rotation: 0,
        cropTop: 0,
        cropRight: 0,
        cropBottom: 0,
        cropLeft: 0
      }
    )

    createElementSpy.mockRestore()

    expect(contour?.hasInteriorOpenings).toBe(true)
    expect(contour?.polygon.source).toBe('alpha-mask-outer')
    const tightSlices = resolveContourSlicesForWrapMode(contour ?? null, 'tight')
    const throughSlices = resolveContourSlicesForWrapMode(contour ?? null, 'through')

    expect(tightSlices[1]?.spans).toEqual([{ start: 0.25, end: 1 }])
    expect(throughSlices[1]?.spans).toEqual([
      { start: 0.25, end: 0.5 },
      { start: 0.75, end: 1 }
    ])
  })
})
