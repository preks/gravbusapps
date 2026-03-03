/**
 * Legacy widget form fields (KPI, Chart).
 * TableFields extracted to AddWidgetTableFields.tsx for file size management.
 */

import React from 'react'
import { Label, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import type { BoardColumn } from '../../types'
import { Hint, HINTS } from './widgetFieldHelpers'

export interface KpiFieldsProps {
  columns: BoardColumn[]
  aggregation: string
  onAggregationChange: (v: string) => void
  format: string
  onFormatChange: (v: string) => void
  kpiColumn: string
  onKpiColumnChange: (v: string) => void
  testId: string
}

export const KpiFields: React.FC<KpiFieldsProps> = ({
  columns,
  aggregation,
  onAggregationChange,
  format,
  onFormatChange,
  kpiColumn,
  onKpiColumnChange,
  testId
}) => {
  const kpiTargetColumns = columns.filter(c =>
    ['number', 'currency', 'percentage', 'text', 'select', 'status'].includes(c.type)
  )
  return (
    <>
      <div>
        <Label className="gba:text-xs">Column</Label>
        <Select value={kpiColumn} onValueChange={onKpiColumnChange}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-column`}>
            <SelectValue placeholder="Pick column" />
          </SelectTrigger>
          <SelectContent>
            {kpiTargetColumns.map(c => (
              <SelectItem key={c.id || c.name} value={c.name}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Hint>{HINTS.kpiColumn}</Hint>
      </div>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div>
          <Label className="gba:text-xs">Aggregation</Label>
          <Select value={aggregation} onValueChange={onAggregationChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-aggregation`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="sum">Sum</SelectItem>
              <SelectItem value="avg">Average</SelectItem>
              <SelectItem value="min">Min</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
          <Hint>{HINTS.kpiAggregation}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Format</Label>
          <Select value={format} onValueChange={onFormatChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-format`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
          <Hint>{HINTS.kpiFormat}</Hint>
        </div>
      </div>
    </>
  )
}

export interface ChartFieldsProps {
  columns: BoardColumn[]
  chartType: string
  onChartTypeChange: (v: string) => void
  xAxis: string
  onXAxisChange: (v: string) => void
  yAxis: string
  onYAxisChange: (v: string) => void
  chartAgg: string
  onChartAggChange: (v: string) => void
  sortDir: string
  onSortDirChange: (v: string) => void
  limit: number | ''
  onLimitChange: (v: number | '') => void
  testId: string
}

export const ChartFields: React.FC<ChartFieldsProps> = ({
  columns,
  chartType,
  onChartTypeChange,
  xAxis,
  onXAxisChange,
  yAxis,
  onYAxisChange,
  chartAgg,
  onChartAggChange,
  sortDir,
  onSortDirChange,
  limit,
  onLimitChange,
  testId
}) => (
  <>
    <div>
      <Label className="gba:text-xs">Chart type</Label>
      <Select value={chartType} onValueChange={onChartTypeChange}>
        <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-chart-type`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bar">Bar</SelectItem>
          <SelectItem value="line">Line</SelectItem>
          <SelectItem value="area">Area</SelectItem>
          <SelectItem value="pie">Pie</SelectItem>
          <SelectItem value="donut">Donut</SelectItem>
        </SelectContent>
      </Select>
      <Hint>{HINTS.chartType}</Hint>
    </div>
    <div className="gba:grid gba:grid-cols-2 gba:gap-2">
      <div>
        <Label className="gba:text-xs">Group by (X axis)</Label>
        <Select value={xAxis} onValueChange={onXAxisChange}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-x-axis`}>
            <SelectValue placeholder="Pick column" />
          </SelectTrigger>
          <SelectContent>
            {columns.map(c => (
              <SelectItem key={c.id || c.name} value={c.name}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Hint>{HINTS.chartGroupBy}</Hint>
      </div>
      <div>
        <Label className="gba:text-xs">Value (Y axis)</Label>
        <Select value={yAxis} onValueChange={onYAxisChange}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-y-axis`}>
            <SelectValue placeholder="Pick column" />
          </SelectTrigger>
          <SelectContent>
            {columns.map(c => (
              <SelectItem key={c.id || c.name} value={c.name}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Hint>{HINTS.chartValue}</Hint>
      </div>
    </div>
    <div>
      <Label className="gba:text-xs">Aggregation</Label>
      <Select value={chartAgg} onValueChange={onChartAggChange}>
        <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-chart-agg`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="count">Count</SelectItem>
          <SelectItem value="sum">Sum</SelectItem>
          <SelectItem value="avg">Average</SelectItem>
          <SelectItem value="min">Min</SelectItem>
          <SelectItem value="max">Max</SelectItem>
        </SelectContent>
      </Select>
      <Hint>{HINTS.chartAgg}</Hint>
    </div>
    <div className="gba:grid gba:grid-cols-2 gba:gap-2">
      <div>
        <Label className="gba:text-xs">Sort</Label>
        <Select value={sortDir || '_none'} onValueChange={v => onSortDirChange(v === '_none' ? '' : v)}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-chart-sort`}>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            <SelectItem value="desc">Highest first</SelectItem>
            <SelectItem value="asc">Lowest first</SelectItem>
          </SelectContent>
        </Select>
        <Hint>{HINTS.chartSort}</Hint>
      </div>
      <div>
        <Label className="gba:text-xs">Show top N</Label>
        <Input
          type="number"
          value={limit === '' ? '' : limit}
          onChange={e => {
            const v = e.target.value
            onLimitChange(v === '' ? '' : Math.max(1, Number(v) || 0))
          }}
          placeholder="All"
          className="gba:h-8 gba:text-xs gba:w-full"
          min={1}
          max={100}
          data-testid={`${testId}-chart-limit`}
        />
        <Hint>{HINTS.chartLimit}</Hint>
      </div>
    </div>
  </>
)

export { TableFields } from './AddWidgetTableFields'
export type { TableFieldsProps } from './AddWidgetTableFields'
