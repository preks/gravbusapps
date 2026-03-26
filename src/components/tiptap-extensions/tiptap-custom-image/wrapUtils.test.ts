import { isFloatingWrapMode, resolveFloatingSide, resolveImageWrapPreset, resolveWordWrapTextSide } from './wrapUtils'

describe('wrapUtils', () => {
  it('treats top and bottom as a floating wrap mode', () => {
    expect(isFloatingWrapMode('top-bottom')).toBe(true)
    expect(isFloatingWrapMode('inline')).toBe(false)
  })

  it('resolves shared wrap presets for inline and floating modes', () => {
    expect(resolveImageWrapPreset('inline', { align: 'right', anchorMode: 'fixed' })).toMatchObject({
      wrapMode: 'inline',
      display: 'inline',
      anchorMode: 'inline',
      allowOverlap: false,
      offsetX: 0,
      offsetY: 0,
      align: 'right'
    })

    expect(resolveImageWrapPreset('square-right', { align: 'left', anchorMode: 'inline' })).toMatchObject({
      wrapMode: 'square-right',
      display: 'block',
      anchorMode: 'move-with-text',
      allowOverlap: false,
      align: 'right'
    })

    expect(resolveImageWrapPreset('behind', { align: 'center', anchorMode: 'fixed' })).toMatchObject({
      wrapMode: 'behind',
      display: 'block',
      anchorMode: 'fixed',
      allowOverlap: true,
      align: 'center'
    })
  })

  it('resolves floating side and Word wrap side consistently', () => {
    expect(resolveFloatingSide({ wrapMode: 'square-right', align: 'left' })).toBe('right')
    expect(resolveFloatingSide({ wrapMode: 'tight', align: 'right' })).toBe('right')
    expect(resolveFloatingSide({ wrapMode: 'tight', align: 'center' })).toBe('left')

    expect(resolveWordWrapTextSide({ wrapMode: 'square-left', align: 'left' })).toBe('right')
    expect(resolveWordWrapTextSide({ wrapMode: 'square-right', align: 'right' })).toBe('left')
    expect(resolveWordWrapTextSide({ wrapMode: 'tight', align: 'right' })).toBe('bothSides')
  })
})
