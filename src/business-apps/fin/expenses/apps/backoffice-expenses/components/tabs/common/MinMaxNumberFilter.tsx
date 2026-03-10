import React from 'react'

interface MinMaxNumberFilterProps {
  readonly minValue: string
  readonly maxValue: string
  readonly onMinChange: (value: string) => void
  readonly onMaxChange: (value: string) => void
  readonly testIdPrefix: string
  readonly onPageReset?: () => void
}

const MinMaxNumberFilter: React.FC<MinMaxNumberFilterProps> = ({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  testIdPrefix,
  onPageReset
}) => (
  <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
    {[
      { label: 'Min', value: minValue, onChange: onMinChange, suffix: 'min' },
      { label: 'Max', value: maxValue, onChange: onMaxChange, suffix: 'max' }
    ].map(input => (
      <div key={input.suffix} className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:text-muted-foreground gba:w-8">{input.label}</span>
        <input
          type="number"
          value={input.value}
          onChange={event => {
            input.onChange(event.target.value)
            onPageReset?.()
          }}
          className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
          placeholder={input.label}
          data-testid={`${testIdPrefix}-${input.suffix}-filter-input`}
        />
      </div>
    ))}
  </div>
)

export default MinMaxNumberFilter
