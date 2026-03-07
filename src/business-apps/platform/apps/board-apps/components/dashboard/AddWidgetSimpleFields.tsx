/**
 * Form fields for scatter and histogram widget types.
 * Split from AddWidgetV2Fields to keep file sizes under 300 lines.
 */

import React from 'react'
import { Label, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import type { BoardColumn } from '../../types'
import { Hint, HINTS } from './widgetFieldHelpers'

export interface ScatterFieldsProps {
  columns: BoardColumn[]
  xColumn: string
  onXColumnChange: (v: string) => void
  yColumn: string
  onYColumnChange: (v: string) => void
  labelColumn: string
  onLabelColumnChange: (v: string) => void
  sizeColumn: string
  onSizeColumnChange: (v: string) => void
  colorColumn: string
  onColorColumnChange: (v: string) => void
  testId: string
}

export const ScatterFields: React.FC<ScatterFieldsProps> = ({
  columns,
  xColumn,
  onXColumnChange,
  yColumn,
  onYColumnChange,
  labelColumn,
  onLabelColumnChange,
  sizeColumn,
  onSizeColumnChange,
  colorColumn,
  onColorColumnChange,
  testId
}) => {
  const numCols = columns.filter(c => c.type === 'number' || c.type === 'currency' || c.type === 'percentage')
  const catCols = columns.filter(c => ['select', 'multiselect', 'status', 'text', 'tags'].includes(c.type))
  return (
    <div className="gba:space-y-2">
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div>
          <Label className="gba:text-xs">X axis</Label>
          <Select value={xColumn} onValueChange={onXColumnChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-scatter-x`}>
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              {numCols.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{HINTS.scatterX}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Y axis</Label>
          <Select value={yColumn} onValueChange={onYColumnChange}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-scatter-y`}>
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              {numCols.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{HINTS.scatterY}</Hint>
        </div>
      </div>
      <div className="gba:grid gba:grid-cols-3 gba:gap-2">
        <div>
          <Label className="gba:text-xs">Label</Label>
          <Select value={labelColumn || '_none'} onValueChange={v => onLabelColumnChange(v === '_none' ? '' : v)}>
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
          <Hint>{HINTS.scatterLabel}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Size</Label>
          <Select value={sizeColumn || '_none'} onValueChange={v => onSizeColumnChange(v === '_none' ? '' : v)}>
            <SelectTrigger className="gba:h-8 gba:text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {numCols.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{HINTS.scatterSize}</Hint>
        </div>
        <div>
          <Label className="gba:text-xs">Color</Label>
          <Select value={colorColumn || '_none'} onValueChange={v => onColorColumnChange(v === '_none' ? '' : v)}>
            <SelectTrigger className="gba:h-8 gba:text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {catCols.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{HINTS.scatterColor}</Hint>
        </div>
      </div>
    </div>
  )
}

export interface HistogramFieldsProps {
  columns: BoardColumn[]
  column: string
  onColumnChange: (v: string) => void
  bins: number
  onBinsChange: (v: number) => void
  testId: string
}

export const HistogramFields: React.FC<HistogramFieldsProps> = ({
  columns,
  column,
  onColumnChange,
  bins,
  onBinsChange,
  testId
}) => {
  const numCols = columns.filter(c => c.type === 'number' || c.type === 'currency' || c.type === 'percentage')
  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-2">
      <div>
        <Label className="gba:text-xs">Column</Label>
        <Select value={column} onValueChange={onColumnChange}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-hist-col`}>
            <SelectValue placeholder="Pick numeric column" />
          </SelectTrigger>
          <SelectContent>
            {numCols.map(c => (
              <SelectItem key={c.name} value={c.name}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Hint>{HINTS.histColumn}</Hint>
      </div>
      <div>
        <Label className="gba:text-xs">Bins</Label>
        <Input
          type="number"
          value={bins}
          onChange={e => onBinsChange(Math.max(2, Number(e.target.value) || 10))}
          className="gba:h-8 gba:text-xs gba:w-20"
          min={2}
          max={100}
          data-testid={`${testId}-hist-bins`}
        />
        <Hint>{HINTS.histBins}</Hint>
      </div>
    </div>
  )
}
