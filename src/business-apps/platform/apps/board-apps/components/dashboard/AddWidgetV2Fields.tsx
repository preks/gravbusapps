/**
 * Form fields for v2 widget types (multi_chart, timeseries).
 * Scatter and Histogram are in AddWidgetSimpleFields.tsx.
 */

import React from 'react'
import {
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button
} from '@newwork/nw-design-system'
import { Plus, X } from 'lucide-react'
import type { BoardColumn } from '../../types'
import { Hint, HINTS } from './widgetFieldHelpers'

interface SeriesDef {
  column: string
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
  label: string
}

export interface MultiChartFieldsProps {
  columns: BoardColumn[]
  groupBy: string
  onGroupByChange: (v: string) => void
  chartType: string
  onChartTypeChange: (v: string) => void
  series: SeriesDef[]
  onSeriesChange: (s: SeriesDef[]) => void
  breakdown: string
  onBreakdownChange: (v: string) => void
  timeBucket: string
  onTimeBucketChange: (v: string) => void
  sortDir: string
  onSortDirChange: (v: string) => void
  limit: number | ''
  onLimitChange: (v: number | '') => void
  testId: string
}

export const MultiChartFields: React.FC<MultiChartFieldsProps> = ({
  columns,
  groupBy,
  onGroupByChange,
  chartType,
  onChartTypeChange,
  series,
  onSeriesChange,
  breakdown,
  onBreakdownChange,
  timeBucket,
  onTimeBucketChange,
  sortDir,
  onSortDirChange,
  limit,
  onLimitChange,
  testId
}) => {
  const addSeries = () => onSeriesChange([...series, { column: '', aggregation: 'count', label: '' }])
  const removeSeries = (i: number) => onSeriesChange(series.filter((_, idx) => idx !== i))
  const updateSeries = (i: number, updates: Partial<SeriesDef>) =>
    onSeriesChange(series.map((s, idx) => (idx === i ? { ...s, ...updates } : s)))

  return (
    <div className="gba:space-y-2">
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div>
          <Label className="gba:text-xs">Chart type</Label>
          <Select value={chartType} onValueChange={onChartTypeChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-multi-chart-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Multi Bar</SelectItem>
              <SelectItem value="line">Multi Line</SelectItem>
              <SelectItem value="area">Multi Area</SelectItem>
              <SelectItem value="stacked_bar">Stacked Bar</SelectItem>
              <SelectItem value="stacked_area">Stacked Area</SelectItem>
            </SelectContent>
          </Select>
          <Hint>{HINTS.multiChartType}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Group by (X axis)</Label>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-multi-groupby`}>
              <SelectValue placeholder="Pick column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{HINTS.multiGroupBy}</Hint>
        </div>
      </div>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div>
          <Label className="gba:text-xs">Breakdown</Label>
          <Select value={breakdown || '_none'} onValueChange={v => onBreakdownChange(v === '_none' ? '' : v)}>
            <SelectTrigger className="gba:h-8 gba:text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {columns.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{HINTS.multiBreakdown}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Time bucket</Label>
          <Select value={timeBucket || '_none'} onValueChange={v => onTimeBucketChange(v === '_none' ? '' : v)}>
            <SelectTrigger className="gba:h-8 gba:text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <Hint>{HINTS.multiTimeBucket}</Hint>
        </div>
      </div>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div>
          <Label className="gba:text-xs">Sort</Label>
          <Select value={sortDir || '_none'} onValueChange={v => onSortDirChange(v === '_none' ? '' : v)}>
            <SelectTrigger className="gba:h-8 gba:text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              <SelectItem value="desc">Highest first</SelectItem>
              <SelectItem value="asc">Lowest first</SelectItem>
            </SelectContent>
          </Select>
          <Hint>{HINTS.multiSort}</Hint>
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
          />
          <Hint>{HINTS.multiLimit}</Hint>
        </div>
      </div>
      <div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
          <Label className="gba:text-xs">Series (metrics)</Label>
          <Button variant="ghost" size="sm" className="gba:h-6 gba:text-xs gba:gap-1" onClick={addSeries}>
            <Plus className="gba:w-3 gba:h-3" /> Add
          </Button>
        </div>
        <Hint>{HINTS.multiSeries}</Hint>
        <div className="gba:space-y-1 gba:max-h-28 gba:overflow-auto gba:mt-1">
          {series.map((s, i) => (
            <div key={i} className="gba:flex gba:items-center gba:gap-1">
              <Select value={s.column || '_'} onValueChange={v => updateSeries(i, { column: v === '_' ? '' : v })}>
                <SelectTrigger className="gba:h-7 gba:text-xs gba:flex-1">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={s.aggregation} onValueChange={v => updateSeries(i, { aggregation: v as any })}>
                <SelectTrigger className="gba:h-7 gba:text-xs gba:w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="avg">Avg</SelectItem>
                  <SelectItem value="min">Min</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={s.label}
                onChange={e => updateSeries(i, { label: e.target.value })}
                placeholder="Label"
                className="gba:h-7 gba:text-xs gba:w-20"
              />
              {series.length > 1 && (
                <Button variant="ghost" size="icon" className="gba:h-6 gba:w-6" onClick={() => removeSeries(i)}>
                  <X className="gba:w-3 gba:h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { TimeSeriesFields } from './AddWidgetTimeSeriesFields'
export type { TimeSeriesFieldsProps } from './AddWidgetTimeSeriesFields'
export { ScatterFields, HistogramFields } from './AddWidgetSimpleFields'
export type { ScatterFieldsProps, HistogramFieldsProps } from './AddWidgetSimpleFields'
