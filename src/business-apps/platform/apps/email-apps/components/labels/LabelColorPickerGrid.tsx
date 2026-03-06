import React from 'react'
import { LABEL_COLOR_PALETTE } from '../../utils/labelUtils'

interface LabelColorPickerGridProps {
  selectedColor: string | null
  onToggleColor: (hex: string) => void
  testIdPrefix: string
}

export const LabelColorPickerGrid: React.FC<LabelColorPickerGridProps> = ({
  selectedColor,
  onToggleColor,
  testIdPrefix
}) => {
  return (
    <div className="gba:grid gba:w-fit gba:grid-cols-4 gba:gap-x-5 gba:gap-y-1">
      {LABEL_COLOR_PALETTE.map(option => (
        <button
          key={option.id}
          type="button"
          className={`gba:h-5 gba:w-5 gba:rounded-sm gba:border ${option.swatchClassName} ${
            selectedColor === option.hex ? 'gba:ring-2 gba:ring-primary-ring gba:ring-offset-1' : ''
          }`}
          onClick={() => onToggleColor(option.hex)}
          data-testid={`${testIdPrefix}-${option.id}`}
        />
      ))}
    </div>
  )
}
