/**
 * Shared loading state component for lifecycle charts
 * Reduces duplication across Accounts, Leads, Contacts, and Opportunities charts
 */

import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
  IconAvatar,
  Spinner
} from '@newwork/nw-design-system'
import { ChartLineIcon, CalendarIcon, EyeIcon } from '@phosphor-icons/react'
import { TIME_FILTER_OPTIONS, TimeFilter } from './lifecycleChartUtils'

export interface LineOption {
  key: string
  label: string
}

export interface LifecycleChartLoadingStateProps {
  title: string
  selectedTimeFilter: TimeFilter
  lineOptions: LineOption[]
  moduleColor?: string
  dataTestIdPrefix: string
}

export const LifecycleChartLoadingState: React.FC<LifecycleChartLoadingStateProps> = ({
  title,
  selectedTimeFilter,
  lineOptions,
  moduleColor = 'primary',
  dataTestIdPrefix
}) => {
  return (
    <Card data-testid={`${dataTestIdPrefix}-loading`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
            {title}
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2 gba:opacity-50 gba:pointer-events-none">
            <CalendarIcon size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1">
              {TIME_FILTER_OPTIONS.map(option => (
                <Button
                  key={option.key}
                  variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
                  size="sm"
                  disabled
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="gba:mt-4 gba:border-t gba:pt-4 gba:opacity-50">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <EyeIcon size={16} className="gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Data:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4">
              {lineOptions.map(line => (
                <label key={line.key} className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox checked disabled />
                  <div className="gba:w-3 gba:h-3 gba:rounded gba:bg-gray-300" />
                  <span className="gba:text-sm gba:text-gray-700">{line.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:items-center gba:justify-center gba:h-[400px]">
          <Spinner size="lg" />
        </div>
      </CardContent>
    </Card>
  )
}
