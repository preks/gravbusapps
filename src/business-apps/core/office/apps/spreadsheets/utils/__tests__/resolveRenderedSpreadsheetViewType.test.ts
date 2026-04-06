import { resolveRenderedSpreadsheetViewType } from '../resolveRenderedSpreadsheetViewType'

describe('resolveRenderedSpreadsheetViewType', () => {
  it.each(['table', 'form', 'dashboard', 'kanban'] as const)('passes through %s', kind => {
    expect(resolveRenderedSpreadsheetViewType(kind)).toBe(kind)
  })

  it('maps calendar to table so the main pane is not empty', () => {
    expect(resolveRenderedSpreadsheetViewType('calendar')).toBe('table')
  })

  it('maps unknown strings to table', () => {
    expect(resolveRenderedSpreadsheetViewType('future-widget')).toBe('table')
  })

  it('maps undefined to table', () => {
    expect(resolveRenderedSpreadsheetViewType(undefined)).toBe('table')
  })
})
