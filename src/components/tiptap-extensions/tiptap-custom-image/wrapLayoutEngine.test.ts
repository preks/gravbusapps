import { resolveWordLikeImageLayout } from './wrapLayoutEngine'

describe('wrapLayoutEngine', () => {
  it('computes floating square geometry for square-left', () => {
    const layout = resolveWordLikeImageLayout({
      width: 120,
      height: 80,
      wrapMode: 'square-left',
      align: 'left',
      distanceTop: 4,
      distanceRight: 6,
      distanceBottom: 8,
      distanceLeft: 10,
      offsetX: -12,
      offsetY: 5
    })

    expect(layout.floatingSide).toBe('left')
    expect(layout.wrapTextSide).toBe('right')
    expect(layout.exclusionMode).toBe('square')
    expect(layout.runtimeAttributes['data-image-exclusion-mode']).toBe('square')
    expect(layout.runtimeAttributes['data-image-wrap-text-side']).toBe('right')
  })

  it('computes floating square geometry from image attrs', () => {
    const layout = resolveWordLikeImageLayout({
      width: 120,
      height: 80,
      wrapMode: 'square-right',
      align: 'right',
      distanceTop: 4,
      distanceRight: 6,
      distanceBottom: 8,
      distanceLeft: 10,
      offsetX: 12,
      offsetY: -5
    })

    expect(layout.floatingSide).toBe('right')
    expect(layout.anchorReference).toBe('paragraph')
    expect(layout.layoutWidth).toBe(148)
    expect(layout.layoutHeight).toBe(97)
    expect(layout.figureLeft).toBe(22)
    expect(layout.figureTop).toBe(4)
    expect(layout.measurementMode).toBe('overlay')
    expect(layout.wrapperStyle).toMatchObject({
      width: 0,
      height: 0,
      minHeight: 0
    })
    expect(layout.renderMode).toBe('overlay')
    expect(layout.flowMode).toBe('float')
    expect(layout.overlayLayer).toBe('floating')
    expect(layout.runtimeAttributes['data-image-exclusion-mode']).toBe('square')
    expect(layout.runtimeAttributes['data-image-wrap-text-side']).toBe('left')
  })

  it('resolves page anchoring for fixed top-bottom layouts', () => {
    const layout = resolveWordLikeImageLayout({
      width: 200,
      height: 100,
      wrapMode: 'top-bottom',
      anchorMode: 'fixed',
      align: 'center',
      offsetX: 24
    })

    expect(layout.anchorReference).toBe('page')
    expect(layout.exclusionMode).toBe('top-bottom')
    expect(layout.renderMode).toBe('overlay')
    expect(layout.flowMode).toBe('block')
    expect(layout.measurementMode).toBe('overlay')
    expect(layout.overlayLayer).toBe('floating')
    expect(layout.runtimeAttributes['data-image-wrap-text-side']).toBe('none')
    expect(layout.wrapperStyle).toMatchObject({
      width: 0,
      height: 0
    })
    expect(layout.figureStyle.left).toBe('calc(50% + 24px)')
    expect(layout.figureStyle.transform).toBe('translateX(-50%)')
  })

  it('falls back to deterministic outer contours for tight and through wraps', () => {
    const tightLayout = resolveWordLikeImageLayout({
      width: 120,
      height: 80,
      wrapMode: 'tight',
      cropTop: 0.1
    })
    const throughLayout = resolveWordLikeImageLayout({
      width: 120,
      height: 80,
      wrapMode: 'through'
    })

    expect(tightLayout.wrapPolygon?.source).toBe('cropped-frame-rect')
    expect(tightLayout.exclusionMode).toBe('polygon')
    expect(tightLayout.wrapperStyle.shapeOutside).toBeUndefined()
    expect(throughLayout.wrapPolygon?.source).toBe('through-fallback')
    expect(throughLayout.fallbackStrategy).toBe('through-outer-contour-fallback')
    expect(throughLayout.wrapTextSide).toBe('bothSides')
  })

  it('marks behind-text images as overlay-rendered with no flow measurement footprint', () => {
    const layout = resolveWordLikeImageLayout({
      width: 180,
      height: 90,
      wrapMode: 'behind',
      align: 'center',
      zIndex: 4
    })

    expect(layout.renderMode).toBe('overlay')
    expect(layout.flowMode).toBe('overlay-anchor')
    expect(layout.measurementMode).toBe('overlay')
    expect(layout.overlayLayer).toBe('behind')
    expect(layout.overlayZIndex).toBe(4)
    expect(layout.wrapperStyle).toMatchObject({
      display: 'inline-block',
      width: 0,
      height: 0,
      minHeight: 0
    })
    expect(layout.runtimeAttributes['data-image-layout-height']).toBe('0')
    expect(layout.runtimeAttributes['data-image-visual-bottom']).toBe('0')
    expect(layout.runtimeAttributes['data-image-render-mode']).toBe('overlay')
  })
})
