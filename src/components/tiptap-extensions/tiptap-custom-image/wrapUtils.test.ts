import {
  isFloatingWrapMode,
  resolveFloatingSide,
  resolveImageWrapPreset,
  resolveSquareWrapTextSideSelection,
  resolveWordStyleWrapPreset,
  resolveWordStyleWrapPresetUpdate,
  resolveWordWrapTextSide
} from './wrapUtils'

describe('wrapUtils', () => {
  it('treats top and bottom as a floating wrap mode', () => {
    expect(isFloatingWrapMode('top-bottom')).toBe(true)
    expect(isFloatingWrapMode('inline')).toBe(false)
  })

  it('resolves shared wrap presets for inline and floating modes', () => {
    expect(resolveImageWrapPreset('inline', { align: 'right', anchorMode: 'fixed' })).toMatchObject({
      wrapMode: 'inline',
      wrapTextSide: null,
      display: 'inline',
      anchorMode: 'inline',
      allowOverlap: false,
      offsetX: 0,
      offsetY: 0,
      align: 'right'
    })

    expect(resolveImageWrapPreset('square', { align: 'left', anchorMode: 'inline' })).toMatchObject({
      wrapMode: 'square',
      wrapTextSide: 'bothSides',
      display: 'block',
      anchorMode: 'move-with-text',
      allowOverlap: false,
      align: 'left'
    })

    expect(resolveImageWrapPreset('behind', { align: 'center', anchorMode: 'fixed' })).toMatchObject({
      wrapMode: 'behind',
      wrapTextSide: null,
      display: 'block',
      anchorMode: 'fixed',
      allowOverlap: true,
      align: 'center'
    })

    expect(resolveSquareWrapTextSideSelection('left', { align: 'left', anchorMode: 'inline' })).toMatchObject({
      wrapMode: 'square',
      wrapTextSide: 'left',
      display: 'block',
      anchorMode: 'move-with-text',
      allowOverlap: false,
      align: 'right'
    })
  })

  it('resolves floating side and Word wrap side consistently', () => {
    expect(resolveFloatingSide({ wrapMode: 'square', align: 'left', wrapTextSide: 'left' })).toBe('right')
    expect(resolveFloatingSide({ wrapMode: 'square', align: 'right', wrapTextSide: 'right' })).toBe('left')
    expect(resolveFloatingSide({ wrapMode: 'tight', align: 'right' })).toBe('right')
    expect(resolveFloatingSide({ wrapMode: 'tight', align: 'center' })).toBe('left')

    expect(resolveWordWrapTextSide({ wrapMode: 'square', align: 'left', wrapTextSide: 'right' })).toBe('right')
    expect(resolveWordWrapTextSide({ wrapMode: 'square', align: 'right', wrapTextSide: null })).toBe('left')
    expect(resolveWordWrapTextSide({ wrapMode: 'tight', align: 'right' })).toBe('bothSides')
  })

  it('maps Word-style wrap presets to the current layout model', () => {
    expect(resolveWordStyleWrapPreset({ wrapMode: 'inline', align: 'left', wrapTextSide: null })).toBe('inline')
    expect(resolveWordStyleWrapPreset({ wrapMode: 'square', align: 'left', wrapTextSide: 'right' })).toBe('square-left')
    expect(resolveWordStyleWrapPreset({ wrapMode: 'tight', align: 'right', wrapTextSide: 'bothSides' })).toBe(
      'square-right'
    )
    expect(resolveWordStyleWrapPreset({ wrapMode: 'behind', align: 'center', wrapTextSide: null })).toBe('behind-text')

    expect(resolveWordStyleWrapPresetUpdate('square-left', { align: 'right', anchorMode: 'inline' })).toMatchObject({
      wrapMode: 'square',
      wrapTextSide: 'right',
      align: 'left',
      anchorMode: 'move-with-text'
    })
    expect(
      resolveWordStyleWrapPresetUpdate('in-front-of-text', { align: 'center', anchorMode: 'fixed' })
    ).toMatchObject({
      wrapMode: 'front',
      allowOverlap: true,
      anchorMode: 'fixed'
    })
  })
})
