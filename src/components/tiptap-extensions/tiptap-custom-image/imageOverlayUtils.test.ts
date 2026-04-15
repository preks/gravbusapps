import { areImageOverlayMountsEqual, resolveImageOverlayFigureStyle } from './imageOverlayUtils'

describe('imageOverlayUtils', () => {
  it('keeps fixed floating images page-positioned instead of paragraph-positioned', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'square',
        align: 'right',
        anchorMode: 'fixed',
        frameWidth: 120,
        figureLeft: 0,
        figureTop: 0,
        flowMode: 'float',
        layoutWidth: 120,
        floatingSide: 'right'
      },
      attributes: {
        align: 'right',
        anchorMode: 'fixed',
        offsetX: 18,
        offsetY: 24,
        distanceRight: 12,
        zIndex: 3
      },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 160,
        anchorTop: 80,
        anchorWidth: 120,
        anchorHeight: 90,
        anchorLeftInLayer: 160,
        anchorTopInLayer: 80,
        blockLeftInLayer: 0,
        blockTopInLayer: 0,
        blockTop: 0,
        blockLeft: 0,
        blockWidth: 0,
        wrapperOffsetLeft: 0,
        wrapperOffsetTop: 0
      }
    })

    expect(style.top).toBe(24)
    expect(style.right).toBe('-6px')
    expect(style.left).toBeUndefined()
  })

  it('uses pointer-events none and z-index 0 for behind-text overlay figures', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'behind',
        align: 'left',
        anchorMode: 'move-with-text',
        frameWidth: 120,
        figureLeft: 0,
        figureTop: 0,
        flowMode: 'overlay-anchor',
        layoutWidth: 120
      },
      attributes: { zIndex: 5 },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 0,
        anchorTop: 40,
        anchorWidth: 0,
        anchorHeight: 0,
        anchorLeftInLayer: 0,
        anchorTopInLayer: 40,
        blockLeftInLayer: 0,
        blockTopInLayer: 0,
        blockTop: 0,
        blockLeft: 0,
        blockWidth: 0,
        wrapperOffsetLeft: 0,
        wrapperOffsetTop: 0
      }
    })

    expect(style.pointerEvents).toBe('none')
    expect(style.zIndex).toBe(0)
  })

  it('uses pointer-events auto and positive z-index for in-front-of-text overlay figures', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'front',
        align: 'left',
        anchorMode: 'move-with-text',
        frameWidth: 120,
        figureLeft: 0,
        figureTop: 0,
        flowMode: 'overlay-anchor',
        layoutWidth: 120
      },
      attributes: { zIndex: 2 },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 0,
        anchorTop: 40,
        anchorWidth: 0,
        anchorHeight: 0,
        anchorLeftInLayer: 0,
        anchorTopInLayer: 40,
        blockLeftInLayer: 0,
        blockTopInLayer: 0,
        blockTop: 0,
        blockLeft: 0,
        blockWidth: 0,
        wrapperOffsetLeft: 0,
        wrapperOffsetTop: 0
      }
    })

    expect(style.pointerEvents).toBe('auto')
    expect(style.zIndex).toBe(2)
  })

  it('places polygon float overlay from paragraph top while keeping inline horizontal anchoring', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'tight',
        align: 'left',
        anchorMode: 'move-with-text',
        frameWidth: 120,
        figureLeft: 10,
        figureTop: 4,
        flowMode: 'float',
        layoutWidth: 132,
        floatingSide: 'left'
      },
      attributes: { align: 'left', wrapTextSide: 'bothSides', offsetX: 0, offsetY: 0 },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 100,
        anchorTop: 92,
        anchorWidth: 0,
        anchorHeight: 0,
        anchorLeftInLayer: 100,
        anchorTopInLayer: 92,
        blockLeftInLayer: 40,
        blockTopInLayer: 24,
        blockTop: 24,
        blockLeft: 40,
        blockWidth: 280,
        wrapperOffsetLeft: 0,
        wrapperOffsetTop: 0
      }
    })

    expect(style.left).toBe(110)
    expect(style.top).toBe(28)
  })

  it('anchors move-with-text behind-text images to the paragraph width instead of the page layer', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'behind',
        align: 'right',
        anchorMode: 'move-with-text',
        frameWidth: 120,
        figureLeft: 0,
        figureTop: 0,
        flowMode: 'overlay-anchor',
        layoutWidth: 120
      },
      attributes: {
        align: 'right',
        anchorMode: 'move-with-text',
        offsetX: 8,
        offsetY: 6,
        distanceRight: 12
      },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 380,
        anchorTop: 24,
        anchorWidth: 600,
        anchorHeight: 18,
        anchorLeftInLayer: 380,
        anchorTopInLayer: 24,
        blockLeftInLayer: 380,
        blockTopInLayer: 24,
        blockTop: 24,
        blockLeft: 380,
        blockWidth: 600,
        wrapperOffsetLeft: 0,
        wrapperOffsetTop: 0
      }
    })

    expect(style.left).toBe(856)
    expect(style.top).toBe(30)
    expect(style.right).toBeUndefined()
  })

  it('centers move-with-text front-text images within the paragraph anchor', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'front',
        align: 'center',
        anchorMode: 'move-with-text',
        frameWidth: 120,
        figureLeft: 0,
        figureTop: 0,
        flowMode: 'overlay-anchor',
        layoutWidth: 120
      },
      attributes: {
        align: 'center',
        anchorMode: 'move-with-text',
        offsetX: -10,
        offsetY: 4
      },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 200,
        anchorTop: 32,
        anchorWidth: 500,
        anchorHeight: 18,
        anchorLeftInLayer: 200,
        anchorTopInLayer: 32,
        blockLeftInLayer: 200,
        blockTopInLayer: 32,
        blockTop: 32,
        blockLeft: 200,
        blockWidth: 500,
        wrapperOffsetLeft: 0,
        wrapperOffsetTop: 0
      }
    })

    expect(style.left).toBe(440)
    expect(style.top).toBe(36)
    expect(style.transform).toBe('translateX(-50%)')
  })

  it('treats overlay mounts with the same geometry and layer as equal', () => {
    const layer = document.createElement('div')
    const leftMount = {
      layer,
      pageNumber: 2,
      anchorLeft: 100,
      anchorTop: 40,
      anchorWidth: 120,
      anchorHeight: 80,
      anchorLeftInLayer: 20,
      anchorTopInLayer: 10,
      blockLeftInLayer: 12,
      blockTopInLayer: 8,
      blockTop: 8,
      blockLeft: 12,
      blockWidth: 240,
      wrapperOffsetLeft: 3,
      wrapperOffsetTop: 4
    }
    const rightMount = {
      ...leftMount
    }

    expect(areImageOverlayMountsEqual(leftMount, rightMount)).toBe(true)
    expect(areImageOverlayMountsEqual(leftMount, { ...rightMount, pageNumber: 3 })).toBe(false)
    expect(areImageOverlayMountsEqual(leftMount, { ...rightMount, layer: document.createElement('div') })).toBe(false)
  })
})
