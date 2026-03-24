import { resolveWordLikeImageLayout } from './wrapLayoutEngine'

describe('wrapLayoutEngine', () => {
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
    expect(layout.wrapperStyle).toMatchObject({
      float: 'right',
      width: 148,
      minHeight: 97
    })
    expect(layout.runtimeAttributes['data-image-exclusion-mode']).toBe('square')
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
    expect(layout.wrapperStyle).toMatchObject({
      clear: 'both',
      width: '100%'
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
    expect(typeof tightLayout.wrapperStyle.shapeOutside).toBe('string')
    expect(throughLayout.wrapPolygon?.source).toBe('through-fallback')
    expect(throughLayout.fallbackStrategy).toBe('through-outer-contour-fallback')
    expect(throughLayout.wrapTextSide).toBe('bothSides')
  })
})
