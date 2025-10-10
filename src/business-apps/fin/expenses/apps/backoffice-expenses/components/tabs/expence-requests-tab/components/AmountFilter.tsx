import React from 'react'

interface AmountFilterProps {
  localAmountMin: string
  setLocalAmountMin: (value: string) => void
  localAmountMax: string
  setLocalAmountMax: (value: string) => void
  debouncedAmountFilter: (min: string, max: string) => void
}

const AmountFilter: React.FC<AmountFilterProps> = ({
  localAmountMin,
  setLocalAmountMin,
  localAmountMax,
  setLocalAmountMax,
  debouncedAmountFilter
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2" onClick={e => e.stopPropagation()}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:text-gray-600 gba:w-8">Min</span>
        <input
          type="number"
          value={localAmountMin}
          onChange={e => {
            e.stopPropagation()
            const value = e.target.value
            setLocalAmountMin(value)
            debouncedAmountFilter(value, localAmountMax)
          }}
          onFocus={e => e.stopPropagation()}
          className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
          placeholder="Min"
          data-testid="amount-min-filter-input"
        />
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:text-gray-600 gba:w-8">Max</span>
        <input
          type="number"
          value={localAmountMax}
          onChange={e => {
            e.stopPropagation()
            const value = e.target.value
            setLocalAmountMax(value)
            debouncedAmountFilter(localAmountMin, value)
          }}
          onFocus={e => e.stopPropagation()}
          className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
          placeholder="Max"
          data-testid="amount-max-filter-input"
        />
      </div>
    </div>
  )
}

export default AmountFilter
