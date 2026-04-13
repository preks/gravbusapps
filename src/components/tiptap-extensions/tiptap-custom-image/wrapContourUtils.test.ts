import { analyzeImageWrapContour, areImageWrapContoursEqual, resolveContourSlicesForWrapMode } from './wrapContourUtils'

describe('wrapContourUtils', () => {
  it('treats contours with the same geometry as equal', () => {
    const contour = {
      polygon: {
        points: [
          { x: 0, y: 0 },
          { x: 0.5, y: 1 },
          { x: 1, y: 0 },
          { x: 0, y: 0 }
        ],
        source: 'alpha-mask-outer' as const,
        supportsInnerContours: false
      },
      slices: [
        {
          top: 0,
          bottom: 1,
          spans: [{ start: 0.1, end: 0.9 }]
        }
      ],
      hasInteriorOpenings: false
    }

    expect(areImageWrapContoursEqual(contour, { ...contour, polygon: { ...contour.polygon } })).toBe(true)
    expect(
      areImageWrapContoursEqual(contour, {
        ...contour,
        slices: [
          {
            top: 0,
            bottom: 1,
            spans: [{ start: 0.2, end: 0.9 }]
          }
        ]
      })
    ).toBe(false)
  })

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
