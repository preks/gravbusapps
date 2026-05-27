import { parseChartConfig, unwrapProviderChartPayload } from '../chartRenderers'

describe('unwrapProviderChartPayload', () => {
  it('unwraps provider team distribution shape', () => {
    const out = unwrapProviderChartPayload({
      kind: 'chart',
      title: 'Employees by team',
      content: {
        chart_type: 'bar',
        x_key: 'team_name',
        y_key: 'count',
        data: [
          { team_name: 'Product', count: 11 },
          { team_name: 'Engineering', count: 20 }
        ]
      }
    })
    expect(out.chartType).toBe('bar')
    expect(out.xAxisKey).toBe('team_name')
    expect(out.dataKeys).toEqual(['count'])
  })
})

describe('parseChartConfig', () => {
  it('parses provider-wrapped payload', () => {
    const cfg = parseChartConfig({
      kind: 'chart',
      title: 'Employees by team',
      content: {
        chart_type: 'bar',
        x_key: 'team_name',
        y_key: 'count',
        data: [{ team_name: 'Product', count: 11 }]
      }
    })
    expect(cfg).not.toBeNull()
    expect(cfg?.chartType).toBe('bar')
    expect(cfg?.dataKeys).toEqual(['count'])
  })
})
