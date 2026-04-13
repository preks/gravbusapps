import { areSignatureRenderPositionsEqual } from './SignatureView'

describe('SignatureView', () => {
  it('treats identical render positions as equal', () => {
    expect(areSignatureRenderPositionsEqual({ left: 120, top: 80 }, { left: 120, top: 80 })).toBe(true)
  })

  it('treats different render positions as different', () => {
    expect(areSignatureRenderPositionsEqual({ left: 120, top: 80 }, { left: 121, top: 80 })).toBe(false)
    expect(areSignatureRenderPositionsEqual({ left: 120, top: 80 }, null)).toBe(false)
  })
})
