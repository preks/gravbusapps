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
        flowMode: 'float'
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
        anchorHeight: 90
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
        flowMode: 'overlay-anchor'
      },
      attributes: { zIndex: 5 },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 0,
        anchorTop: 40,
        anchorWidth: 0,
        anchorHeight: 0
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
        flowMode: 'overlay-anchor'
      },
      attributes: { zIndex: 2 },
      mount: {
        layer: document.createElement('div'),
        pageNumber: 1,
        anchorLeft: 0,
        anchorTop: 40,
        anchorWidth: 0,
        anchorHeight: 0
      }
    })

    expect(style.pointerEvents).toBe('auto')
    expect(style.zIndex).toBe(2)
  })
})
