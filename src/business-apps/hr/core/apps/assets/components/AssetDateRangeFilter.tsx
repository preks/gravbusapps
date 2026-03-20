import React from 'react'
import { DateInput } from '@newwork/nw-design-system'

export interface AssetDateRangeFilterProps {
  /** Selected range [from, to] as YYYY-MM-DD; null when both empty */
  value: [string | null, string | null] | null
  onRangeChange: (value: string | [string | null, string | null] | null) => void
  testIdPrefix: string
}

/**
 * Single date range control (design system range mode) for asset sidebar filters.
 */
export const AssetDateRangeFilter: React.FC<AssetDateRangeFilterProps> = ({ value, onRangeChange, testIdPrefix }) => {
  return (
    <div
      className="gba:w-full gba:min-w-0 gba:max-w-full gba:mt-1 gba:overflow-hidden"
      data-testid={`${testIdPrefix}-container`}
    >
      <DateInput
        type="date"
        mode="range"
        value={value}
        onChange={onRangeChange}
        showClearButton
        className="gba:w-full gba:min-w-0 gba:max-w-full"
        data-testid={`${testIdPrefix}-range`}
      />
    </div>
  )
}
