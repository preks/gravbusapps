import { getNormalizedTableSurfaceStyleAttributes, getTableStyle, getTableSurfaceStyle } from '../styleUtils'

describe('table surface styles', () => {
  it('keeps layout styles independent from table shell visuals', () => {
    expect(getTableStyle('100%', 'left', 'manual')).toContain('width: 100%')
    expect(getTableStyle('100%', 'left', 'manual')).not.toContain('border: none')
  })

  it('builds table shell styles from stored table attributes', () => {
    const style = getTableSurfaceStyle({
      tableBackgroundColor: '#ffffff',
      tableBorderStyle: 'solid',
      tableBorderWidth: '1pt',
      tableBorderColor: '#d0d0d0',
      tableBorderRadius: '4pt'
    })

    expect(style).toContain('background-color: #ffffff')
    expect(style).toContain('border-style: solid')
    expect(style).toContain('border-width: 1pt')
    expect(style).toContain('border-color: #d0d0d0')
    expect(style).toContain('border-radius: 4pt')
  })

  it('normalizes persisted table shell attributes', () => {
    expect(
      getNormalizedTableSurfaceStyleAttributes({
        tableBackgroundColor: '#fff',
        tableBorderStyle: 'dashed',
        tableBorderWidth: '2pt',
        tableBorderColor: '#123456',
        tableBorderRadius: '6pt'
      })
    ).toEqual({
      tableBackgroundColor: '#fff',
      tableBorderStyle: 'dashed',
      tableBorderWidth: '2pt',
      tableBorderColor: '#123456',
      tableBorderRadius: '6pt'
    })
  })
})
