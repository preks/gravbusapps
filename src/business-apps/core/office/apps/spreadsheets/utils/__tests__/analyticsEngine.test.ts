import {
  computePivotTable,
  computeChartData,
  summarizeColumn,
  createAnalyticsMemo,
  getChartableValueColumns,
  type PivotRequest,
  type ChartRequest
} from '../analyticsEngine'

describe('analyticsEngine', () => {
  const rows = [
    { Month: 'Oct', Region: 'EMEA', Revenue: 100, COGS: 50, Product: 'A' },
    { Month: 'Oct', Region: 'EMEA', Revenue: 130, COGS: 65, Product: 'B' },
    { Month: 'Nov', Region: 'EMEA', Revenue: 200, COGS: 80, Product: 'A' },
    { Month: 'Nov', Region: 'APAC', Revenue: 90, COGS: 40, Product: 'B' }
  ]

  it('computes pivot table grouped by row and column fields', () => {
    const request: PivotRequest = {
      rowField: 'Month',
      columnField: 'Region',
      valueField: 'Revenue',
      aggregation: 'sum'
    }
    const result = computePivotTable(rows, request)

    expect(result.rows).toEqual([
      { Month: 'Nov', APAC: 90, EMEA: 200 },
      { Month: 'Oct', APAC: 0, EMEA: 230 }
    ])
  })

  it('computes chart data from rows with Univer cell objects { v }', () => {
    const rowsWithUniver = [
      { Month: { v: 'Oct' }, Revenue: { v: 100 }, COGS: { v: 50 } },
      { Month: { v: 'Nov' }, Revenue: { v: 200 }, COGS: { v: 80 } }
    ]
    const result = computeChartData(rowsWithUniver, {
      xAxis: 'Month',
      yAxes: ['Revenue', 'COGS'],
      aggregation: 'sum',
      chartType: 'bar'
    })
    expect(result.rows).toHaveLength(2)
    expect(result.rows.map(r => r.Month)).toEqual(expect.arrayContaining(['Oct', 'Nov']))
    const octRow = result.rows.find(r => r.Month === 'Oct')
    const novRow = result.rows.find(r => r.Month === 'Nov')
    expect(octRow).toMatchObject({ Revenue: 100, COGS: 50 })
    expect(novRow).toMatchObject({ Revenue: 200, COGS: 80 })
  })

  it('computes chart data with selected y-axis metrics', () => {
    const request: ChartRequest = {
      xAxis: 'Month',
      yAxes: ['Revenue', 'COGS'],
      aggregation: 'sum',
      chartType: 'bar'
    }
    const result = computeChartData(rows, request)
    expect(result.rows).toEqual([
      { Month: 'Nov', Revenue: 290, COGS: 120 },
      { Month: 'Oct', Revenue: 230, COGS: 115 }
    ])
  })

  it('summarizes top values and mode for a column', () => {
    const summary = summarizeColumn(rows, 'Product')
    expect(summary.count).toBe(4)
    expect(summary.unique).toBe(2)
    expect(summary.mode).toBe('A')
    expect(summary.topValues[0]).toEqual({ label: 'A', count: 2 })
  })

  it('getChartableValueColumns infers numeric columns from data when type is missing', () => {
    const textColumns = [
      { id: 'c1', name: 'Month', type: 'text' as const },
      { id: 'c2', name: 'Revenue', type: 'text' as const }
    ]
    const rowsWithNumbers = [
      { Month: 'Oct', Revenue: 100 },
      { Month: 'Nov', Revenue: 200 }
    ]
    const result = getChartableValueColumns(textColumns as any, rowsWithNumbers)
    expect(result.map(c => c.name)).toContain('Revenue')
  })

  it('memoizes pivot and chart computation by key', () => {
    const memo = createAnalyticsMemo()
    const pivotRequest: PivotRequest = {
      rowField: 'Month',
      valueField: 'Revenue',
      aggregation: 'count'
    }
    const chartRequest: ChartRequest = {
      xAxis: 'Month',
      yAxes: ['Revenue'],
      aggregation: 'sum',
      chartType: 'line'
    }

    const pivotA = memo.computePivot('pivot-key', rows, pivotRequest)
    const pivotB = memo.computePivot('pivot-key', rows, pivotRequest)
    const chartA = memo.computeChart('chart-key', rows, chartRequest)
    const chartB = memo.computeChart('chart-key', rows, chartRequest)

    expect(pivotA).toBe(pivotB)
    expect(chartA).toBe(chartB)
  })
})
