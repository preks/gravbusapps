import {
  CHART_OTHER_CATEGORY_LABEL,
  formatValueLabel,
  parseChartConfig,
  sumSeries,
  unwrapProviderChartPayload
} from '../chartRenderers'

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

  it('preserves optional presentation metadata for dense category charts', () => {
    const cfg = parseChartConfig({
      chartType: 'bar',
      data: Array.from({ length: 20 }, (_, idx) => ({ name: `Very long category ${idx + 1}`, value: idx + 1 })),
      dataKeys: ['value'],
      layout: 'horizontal',
      denseCategoryChart: true,
      recommendedHeight: 420,
      showValueLabels: false,
      categoryLimit: 10,
      displayData: [
        { name: 'Very long category 20', value: 20 },
        { name: CHART_OTHER_CATEGORY_LABEL, value: 190 }
      ]
    })

    expect(cfg).not.toBeNull()
    expect(cfg?.layout).toBe('horizontal')
    expect(cfg?.denseCategoryChart).toBe(true)
    expect(cfg?.recommendedHeight).toBe(420)
    expect(cfg?.showValueLabels).toBe(false)
    expect(cfg?.categoryLimit).toBe(10)
    expect(cfg?.displayData).toEqual([
      { name: 'Very long category 20', value: 20 },
      { name: CHART_OTHER_CATEGORY_LABEL, value: 190 }
    ])
    expect(cfg?.data).toHaveLength(20)
  })
})

describe('sumSeries (donut center total)', () => {
  it('sums the default value key', () => {
    expect(
      sumSeries([
        { name: 'New', value: 495 },
        { name: 'Contacted', value: 405 },
        { name: 'Qualified', value: 300 },
        { name: 'Closed', value: 300 }
      ])
    ).toBe(1500)
  })

  it('sums a custom key and ignores non-numeric values', () => {
    expect(
      sumSeries(
        [
          { name: 'A', value: 1, count: 10 },
          { name: 'B', value: 2, count: 'x' as unknown as number }
        ],
        'count'
      )
    ).toBe(10)
  })

  it('returns 0 for empty data', () => {
    expect(sumSeries([])).toBe(0)
  })
})

describe('formatValueLabel (on-chart labels)', () => {
  it('compacts thousands and millions', () => {
    expect(formatValueLabel(1500)).toBe('1.5K')
    expect(formatValueLabel(2_000_000)).toBe('2.0M')
  })

  it('respects percentage unit and passes through small numbers', () => {
    expect(formatValueLabel(42, '%')).toBe('42%')
    expect(formatValueLabel(7)).toBe('7')
  })
})
