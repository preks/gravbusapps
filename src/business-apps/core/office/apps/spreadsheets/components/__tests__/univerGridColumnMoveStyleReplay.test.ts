import { buildColumnMoveStyleReplayPlan } from '../univerGridColumnMoveStyleReplay'

describe('buildColumnMoveStyleReplayPlan', () => {
  it('builds bounded style replay cells with style refs, inline formatting, and explicit unsets', () => {
    const plan = buildColumnMoveStyleReplayPlan({
      snapshot: {
        styles: {
          'style-a': { bg: { rgb: '#ff0000' } }
        },
        sheets: {
          'sheet-1': {
            cellData: {
              0: {
                0: { s: 'style-a' },
                1: { bg: { rgb: '#00ff00' } }
              },
              1: {
                1: { s: { bl: 1 } }
              }
            }
          }
        }
      },
      sheetId: 'sheet-1',
      moves: [{ sourceStartColumn: 1, count: 1, destinationStartColumn: 0 }],
      rowCountHint: 2
    })

    expect(plan?.styles).toEqual({
      'style-a': { bg: { rgb: '#ff0000' } }
    })
    expect(plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          stylePatch: { set: { s: 'style-a' } }
        }),
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 1,
          stylePatch: { set: { bg: { rgb: '#00ff00' } } }
        }),
        expect.objectContaining({
          rowIndex: 1,
          colIndex: 0,
          stylePatch: expect.objectContaining({
            unset: expect.arrayContaining(['s', 'bg', 'bl'])
          })
        }),
        expect.objectContaining({
          rowIndex: 1,
          colIndex: 1,
          stylePatch: { set: { bl: 1 } }
        })
      ])
    )
  })
})
