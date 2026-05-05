import { resolveRendererType } from '../fabric'

describe('resolveRendererType', () => {
  it('routes provider table and dashboard artifacts to first-class renderers', () => {
    expect(resolveRendererType('application/json', 'provider/list.table.json')).toBe('table')
    expect(resolveRendererType('application/json', 'provider/pipeline.dashboard.json')).toBe('chart')
  })
})
