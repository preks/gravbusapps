import { bakeCropIntoSignatureSvg, buildBakedSignatureAttrsAfterCrop } from './signatureSnapshotCropBake'

describe('signatureSnapshotCropBake', () => {
  const simpleSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" width="200" height="80"></svg>'

  it('narrows viewBox when cropping from the right', () => {
    const out = bakeCropIntoSignatureSvg(simpleSvg, {
      top: 0,
      right: 0.305,
      bottom: 0,
      left: 0
    })
    expect(out).toContain('viewBox="0 0 139 80"')
    expect(out).toContain('width="139"')
    expect(out).toContain('height="80"')
  })

  it('returns baked attrs with smaller frame and zero crop', () => {
    const baked = buildBakedSignatureAttrsAfterCrop(200, 80, simpleSvg, { top: 0, right: 0.305, bottom: 0, left: 0 })
    expect(baked).not.toBeNull()
    expect(baked?.width).toBe(139)
    expect(baked?.height).toBe(80)
    expect(baked?.cropTop).toBe(0)
    expect(baked?.snapshotSvg).toContain('viewBox="0 0 139 80"')
  })

  it('returns null when there is no crop', () => {
    expect(buildBakedSignatureAttrsAfterCrop(200, 80, simpleSvg, { top: 0, right: 0, bottom: 0, left: 0 })).toBeNull()
  })
})
