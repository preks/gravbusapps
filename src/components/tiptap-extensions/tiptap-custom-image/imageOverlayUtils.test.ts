import { resolveImageOverlayFigureStyle } from './imageOverlayUtils'

describe('imageOverlayUtils', () => {
  it('keeps fixed floating images page-positioned instead of paragraph-positioned', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'square-right',
        align: 'right',
        anchorMode: 'fixed',
        frameWidth: 120,
        figureLeft: 0,
        figureTop: 0,
        flowMode: 'float',
        layoutWidth: 120
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
        blockLeft: 0,
        blockWidth: 0
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
        blockLeft: 0,
        blockWidth: 0
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
        blockLeft: 0,
        blockWidth: 0
      }
    })

    expect(style.pointerEvents).toBe('auto')
    expect(style.zIndex).toBe(2)
  })

  it('places square-right float overlay using the paragraph block width, not the inline anchor', () => {
    const style = resolveImageOverlayFigureStyle({
      layout: {
        wrapMode: 'square-right',
        align: 'right',
        anchorMode: 'move-with-text',
        frameWidth: 120,
        figureLeft: 10,
        figureTop: 4,
        flowMode: 'float',
        layoutWidth: 132
      },
      attributes: { align: 'right', offsetX: 0, offsetY: 0 },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 100,
        anchorTop: 50,
        anchorWidth: 0,
        anchorHeight: 0,
        blockLeft: 40,
        blockWidth: 280
      }
    })

    expect(style.left).toBe(188)
    expect(style.top).toBe(54)
  })
})
