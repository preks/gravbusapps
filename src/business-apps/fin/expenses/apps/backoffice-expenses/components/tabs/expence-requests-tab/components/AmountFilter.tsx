import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'

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
  const { t } = useTranslation(translations)

  const renderAmountInputRow = (config: {
    label: string
    value: string
    setValue: (value: string) => void
    counterpartValue: string
    isMin: boolean
    testId: string
  }) => (
    <div className="gba:flex gba:items-center gba:gap-2">
      <span className="gba:text-sm gba:text-gray-600 gba:w-8">{config.label}</span>
      <input
        type="number"
        value={config.value}
        onChange={e => {
          e.stopPropagation()
          const value = e.target.value
          config.setValue(value)
          if (config.isMin) {
            debouncedAmountFilter(value, config.counterpartValue)
          } else {
            debouncedAmountFilter(config.counterpartValue, value)
          }
        }}
        onFocus={e => e.stopPropagation()}
        className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
        placeholder={config.label}
        data-testid={config.testId}
      />
    </div>
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2" onClick={e => e.stopPropagation()}>
      {renderAmountInputRow({
        label: t('common-min'),
        value: localAmountMin,
        setValue: setLocalAmountMin,
        counterpartValue: localAmountMax,
        isMin: true,
        testId: 'amount-min-filter-input'
      })}
      {renderAmountInputRow({
        label: t('common-max'),
        value: localAmountMax,
        setValue: setLocalAmountMax,
        counterpartValue: localAmountMin,
        isMin: false,
        testId: 'amount-max-filter-input'
      })}
    </div>
  )
}

export default AmountFilter
