import { resolveOfficeFileLeadVisual } from '../utils'

describe('resolveOfficeFileLeadVisual', () => {
  it('returns Drive-aligned success tint for spreadsheets', () => {
    expect(resolveOfficeFileLeadVisual('FileXls')).toEqual({
      iconClass: 'gba:text-success',
      containerClass: 'gba:bg-success/10'
    })
  })

  it('returns info tint for Word-style docs', () => {
    expect(resolveOfficeFileLeadVisual('FileDoc')).toEqual({
      iconClass: 'gba:text-info',
      containerClass: 'gba:bg-info/10'
    })
  })

  it('returns null for unknown phosphor names', () => {
    expect(resolveOfficeFileLeadVisual(undefined)).toBeNull()
    expect(resolveOfficeFileLeadVisual('Star')).toBeNull()
  })
})
