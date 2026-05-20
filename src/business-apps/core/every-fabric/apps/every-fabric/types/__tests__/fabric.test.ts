import { resolveRendererType } from '../fabric'

describe('resolveRendererType', () => {
  it('routes provider table and dashboard artifacts to first-class renderers', () => {
    expect(resolveRendererType('application/json', 'provider/list.table.json')).toBe('table')
    expect(resolveRendererType('application/json', 'provider/pipeline.dashboard.json')).toBe('chart')
  })

  it('routes .chart.json files to chart renderer', () => {
    expect(resolveRendererType('application/json', 'revenue.chart.json')).toBe('chart')
    expect(resolveRendererType('application/json', 'viz_expert_chart.chart.json')).toBe('chart')
  })

  it('routes .dashboard.json files to chart renderer', () => {
    expect(resolveRendererType('application/json', 'sales.dashboard.json')).toBe('chart')
    expect(resolveRendererType('application/json', 'viz_expert_dashboard.dashboard.json')).toBe('chart')
  })

  it('routes chart MIME types to chart renderer regardless of filename', () => {
    expect(resolveRendererType('application/vnd.newwork.chart+json', 'any_file.json')).toBe('chart')
    expect(resolveRendererType('application/vnd.newwork.dashboard+json', 'any_file.json')).toBe('chart')
  })

  it('does not route plain .json to chart renderer', () => {
    expect(resolveRendererType('application/json', 'config.json')).not.toBe('chart')
  })

  it('routes .html files to html renderer', () => {
    expect(resolveRendererType('text/html', 'hyperframe.html')).toBe('html')
  })

  it('routes .timeline.html artefacts to html renderer', () => {
    expect(resolveRendererType('text/html', 'acme-crm.timeline.html')).toBe('html')
    expect(resolveRendererType('application/octet-stream', 'rollout.timeline.html')).toBe('html')
  })
})
