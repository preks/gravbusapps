import React from 'react'

export interface SelectableChartTileProps {
  testId: string
  isSelected: boolean
  onSelect: () => void
  selectedLabel: string
  children: React.ReactNode
}

/**
 * Lightweight selectable wrapper for analytics chart tiles (div-based, no Card).
 * Used by Employment tab for pie and heatmap charts to reduce duplication.
 */
const SelectableChartTile: React.FC<SelectableChartTileProps> = ({
  testId,
  isSelected,
  onSelect,
  selectedLabel,
  children
}) => (
  <div
    data-testid={`${testId}-card`}
    className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-lg ${
      isSelected ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
    }`}
    onClick={onSelect}
    onKeyDown={e => e.key === 'Enter' && onSelect()}
    role="button"
    tabIndex={0}
  >
    {children}
    {isSelected && (
      <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-info-secondary gba:text-info-secondary-foreground gba:px-2 gba:py-1 gba:rounded gba:text-xs">
        ✓ {selectedLabel}
      </div>
    )}
  </div>
)

export default SelectableChartTile
