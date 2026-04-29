import React from 'react'
import { render } from '@testing-library/react'
import { SlideChartRenderer } from '../SlideChartRenderer'
import type { ChartElement } from '../slideElements'

const mockLine = jest.fn()

jest.mock('@newwork/nw-design-system', () => ({
  ChartContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null
}))

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: (props: Record<string, unknown> & { dataKey: string }) => {
    mockLine(props)
    return <div data-testid={`line-${props.dataKey}`} />
  },
  AreaChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  PieChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  RadarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Radar: () => null,
  RadialBarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  RadialBar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  Cell: () => null
}))

function makeChartElement(overrides: Partial<ChartElement> = {}): ChartElement {
  return {
    id: 'chart-1',
    type: 'chart',
    position: { x: 100, y: 100 },
    size: { width: 500, height: 300 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    chartType: 'line',
    title: 'Chart Title',
    data: [
      { label: 'Jan', value1: 186, value2: 80 },
      { label: 'Feb', value1: 305, value2: 200 }
    ],
    series: [
      { key: 'value1', label: 'Series 1' },
      { key: 'value2', label: 'Series 2' }
    ],
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    backgroundColor: 'transparent',
    borderRadius: 8,
    ...overrides
  }
}

describe('SlideChartRenderer', () => {
  beforeEach(() => {
    mockLine.mockClear()
  })

  it('disables line animation for embedded slide charts', () => {
    render(<SlideChartRenderer element={makeChartElement()} width={500} height={300} />)

    expect(mockLine).toHaveBeenCalledTimes(2)
    for (const [props] of mockLine.mock.calls) {
      expect(props.isAnimationActive).toBe(false)
    }
  })
})
