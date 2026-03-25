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
})
