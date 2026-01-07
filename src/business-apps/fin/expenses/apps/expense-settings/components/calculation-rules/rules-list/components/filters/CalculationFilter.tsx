import React from 'react'
import { Checkbox } from '@newwork/nw-design-system'
import { getCatalogValue } from '@/common/utils/windowUtils'

interface CalculationFilterProps {
  options: { id: string; code: string; value: string; translations?: any[] }[]
  selectedCodes: string[]
  onChange: (codes: string[]) => void
  'data-testid'?: string
}

const CalculationFilter: React.FC<CalculationFilterProps> = ({
  options,
  selectedCodes,
  onChange,
  'data-testid': dataTestId
}) => {
  const toggle = (code: string) => (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true
    const next = isChecked ? Array.from(new Set([...selectedCodes, code])) : selectedCodes.filter(c => c !== code)
    onChange(next)
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3 gba:py-3" data-testid={dataTestId || 'calculation-filter'}>
      {options.map(o => (
        <label key={o.id} className="gba:flex gba:items-center gba:gap-2">
          <Checkbox
            checked={selectedCodes.includes(o.code)}
            onCheckedChange={toggle(o.code)}
            data-testid={(dataTestId || 'calculation-filter') + '-' + o.code}
          />
          <span className="gba:text-sm">{getCatalogValue(o)}</span>
        </label>
      ))}
    </div>
  )
}

export default CalculationFilter
