/**
 * TimeSeriesFields - form fields for the timeseries widget type.
 * Extracted from AddWidgetV2Fields for file size management.
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

export interface TimeSeriesFieldsProps {
  columns: BoardColumn[]
  dateColumn: string
  onDateColumnChange: (v: string) => void
  bucket: string
  onBucketChange: (v: string) => void
  chartType: string
  onChartTypeChange: (v: string) => void
  series: SeriesDef[]
  onSeriesChange: (s: SeriesDef[]) => void
  testId: string
}

export const TimeSeriesFields: React.FC<TimeSeriesFieldsProps> = ({
  columns,
  dateColumn,
  onDateColumnChange,
  bucket,
  onBucketChange,
  chartType,
  onChartTypeChange,
  series,
  onSeriesChange,
  testId
}) => {
  const dateCols = columns.filter(c => c.type === 'date' || c.type === 'datetime')
  const addSeries = () => onSeriesChange([...series, { column: '', aggregation: 'count', label: '' }])
  const removeSeries = (i: number) => onSeriesChange(series.filter((_, idx) => idx !== i))
  const updateSeries = (i: number, updates: Partial<SeriesDef>) =>
    onSeriesChange(series.map((s, idx) => (idx === i ? { ...s, ...updates } : s)))

  return (
    <div className="gba:space-y-2">
      <div className="gba:grid gba:grid-cols-3 gba:gap-2">
        <div>
          <Label className="gba:text-xs">Date column</Label>
          <Select value={dateColumn} onValueChange={onDateColumnChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-ts-date`}>
              <SelectValue placeholder="Pick date" />
            </SelectTrigger>
            <SelectContent>
              {dateCols.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{HINTS.tsDate}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Bucket</Label>
          <Select value={bucket} onValueChange={onBucketChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <Hint>{HINTS.tsBucket}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Chart type</Label>
          <Select value={chartType} onValueChange={onChartTypeChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>
          <Hint>{HINTS.tsChartType}</Hint>
        </div>
      </div>
      <div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
          <Label className="gba:text-xs">Series</Label>
          <Button variant="ghost" size="sm" className="gba:h-6 gba:text-xs gba:gap-1" onClick={addSeries}>
            <Plus className="gba:w-3 gba:h-3" /> Add
          </Button>
        </div>
        <Hint>{HINTS.tsSeries}</Hint>
        <div className="gba:space-y-1 gba:max-h-24 gba:overflow-auto gba:mt-1">
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
