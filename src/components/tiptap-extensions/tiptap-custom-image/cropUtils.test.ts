import { convertCropRatioToWordValue, hasImageCrop, normalizeImageCrop, resolveImageCropDimensions } from './cropUtils'

describe('cropUtils', () => {
  it('normalizes crop values and preserves a visible picture area', () => {
    expect(
      normalizeImageCrop({
        cropTop: -0.1,
        cropRight: 0.7,
        cropBottom: 0.7,
        cropLeft: 0.7
      })
    ).toEqual({
      top: 0,
      right: 0.475,
      bottom: 0.7,
      left: 0.475
    })
  })

  it('resolves rendered crop dimensions relative to the visible frame', () => {
    expect(
      resolveImageCropDimensions({
        width: 200,
        height: 100,
        crop: {
          top: 0.1,
          right: 0.2,
          bottom: 0.1,
          left: 0.1
        }
      })
    ).toEqual({
      visibleWidthRatio: 0.7,
      visibleHeightRatio: 0.8,
      renderedWidth: 286,
      renderedHeight: 125,
      offsetX: -29,
      offsetY: -12
    })
  })

  it('reports whether a crop is active and converts ratios to Word units', () => {
    expect(hasImageCrop({ cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 })).toBe(false)
    expect(hasImageCrop({ cropTop: 0.15, cropRight: 0, cropBottom: 0, cropLeft: 0 })).toBe(true)
    expect(convertCropRatioToWordValue(0.125)).toBe('12500')
  })
})
