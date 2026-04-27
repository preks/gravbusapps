/**
 * ChartFormattingTools Component
 *
 * Contextual formatting tools for chart elements.
 * Shows chart type selector and display options.
 */

import React from 'react'
import {
  Button,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { BarChart2, LineChart, PieChart, AreaChart, Activity, Target, LayoutGrid } from 'lucide-react'
import translations from '../../_i18n'
import type { ChartElement, ChartType } from '../slideElements'
import { CHART_TYPES } from '../slideElements'

export interface ChartFormattingToolsProps {
  element: ChartElement
  onUpdateElement: (id: string, updates: Partial<ChartElement>) => void
  testId?: string
}

const CHART_TYPE_ICONS: Record<ChartType, React.ReactNode> = {
  bar: <BarChart2 className="gba:w-4 gba:h-4" />,
  line: <LineChart className="gba:w-4 gba:h-4" />,
  pie: <PieChart className="gba:w-4 gba:h-4" />,
  area: <AreaChart className="gba:w-4 gba:h-4" />,
  radar: <Activity className="gba:w-4 gba:h-4" />,
  radial: <Target className="gba:w-4 gba:h-4" />
}

export function ChartFormattingTools({ element, onUpdateElement, testId }: ChartFormattingToolsProps) {
  const { t } = useTranslation(translations)

  const handleUpdate = (updates: Partial<ChartElement>) => {
    onUpdateElement(element.id, updates)
  }

  return (
    <>
      {/* Chart Type */}
      <Select value={element.chartType} onValueChange={(value: ChartType) => handleUpdate({ chartType: value })}>
        <SelectTrigger className="gba:w-[160px] gba:h-8">
          <SelectValue placeholder={t('props-chart-type') || 'Chart Type'} />
        </SelectTrigger>
        <SelectContent>
          {CHART_TYPES.map(chartType => (
            <SelectItem key={chartType.value} value={chartType.value}>
              <div className="gba:flex gba:items-center gba:gap-2">
                {CHART_TYPE_ICONS[chartType.value]}
                <span>{chartType.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Display Options */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={t('props-display-options') || 'Display Options'}
            data-testid={testId ? `${testId}-display-options` : undefined}
          >
            <LayoutGrid className="gba:w-4 gba:h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-56">
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-sm">{t('props-show-legend') || 'Show Legend'}</Label>
              <Switch checked={element.showLegend} onCheckedChange={checked => handleUpdate({ showLegend: checked })} />
            </div>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-sm">{t('props-show-grid') || 'Show Grid'}</Label>
              <Switch checked={element.showGrid} onCheckedChange={checked => handleUpdate({ showGrid: checked })} />
            </div>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-sm">{t('props-show-tooltip') || 'Show Tooltip'}</Label>
              <Switch
                checked={element.showTooltip}
                onCheckedChange={checked => handleUpdate({ showTooltip: checked })}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick toggle for legend */}
      <Button
        variant={element.showLegend ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ showLegend: !element.showLegend })}
        title={t('props-show-legend') || 'Toggle Legend'}
        data-testid={testId ? `${testId}-toggle-legend` : undefined}
      >
        <span className="gba:text-xs">{t('props-legend') || 'Legend'}</span>
      </Button>
    </>
  )
}
