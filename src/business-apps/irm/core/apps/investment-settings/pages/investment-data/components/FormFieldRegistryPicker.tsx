import React, { useMemo, useState } from 'react'
import { Combobox, Label } from '@newwork/nw-design-system'
import type { FieldGroup, RequiredSubtypeKey } from '../types'
import {
  getPickableFieldsForRequiredSubtype,
  type InvestmentFormFieldRegistryEntry
} from '../utils/investmentFormFieldRegistry'

function sectionHeading(section: InvestmentFormFieldRegistryEntry['section']): string {
  switch (section) {
    case 'investment':
      return 'Investment'
    case 'equityInvestment':
      return 'Equity'
    case 'realEstateInvestment':
      return 'Real estate'
    case 'liquidFundInvestment':
      return 'Liquid fund'
    default:
      return 'Field'
  }
}

function collectUsedProperties(groups: FieldGroup[]): Set<string> {
  const used = new Set<string>()
  for (const g of groups) {
    for (const f of g.fields || []) {
      if (f.property) used.add(f.property)
    }
  }
  return used
}

export interface FormFieldRegistryPickerProps {
  requiredSubtypeKey: RequiredSubtypeKey
  fieldGroups: FieldGroup[]
  onPick: (entry: InvestmentFormFieldRegistryEntry) => void
  disabled?: boolean
  prefixDataTestId?: string
}

export const FormFieldRegistryPicker: React.FC<FormFieldRegistryPickerProps> = ({
  requiredSubtypeKey,
  fieldGroups,
  onPick,
  disabled = false,
  prefixDataTestId = 'form-field-registry-picker'
}) => {
  const [value, setValue] = useState('')

  const used = useMemo(() => collectUsedProperties(fieldGroups), [fieldGroups])

  const pickable = useMemo(
    () => getPickableFieldsForRequiredSubtype(requiredSubtypeKey).filter(e => !used.has(e.property)),
    [requiredSubtypeKey, used]
  )

  const options = useMemo(
    () =>
      pickable.map(entry => ({
        value: entry.id,
        label: `${sectionHeading(entry.section)} — ${entry.label}`
      })),
    [pickable]
  )

  const isDisabled = disabled || pickable.length === 0

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:min-w-0 gba:flex-1" data-testid={prefixDataTestId}>
      <Label className="gba:text-sm">{`Add from catalog`}</Label>
      <Combobox
        value={value}
        onValueChange={next => {
          setValue(next)
          const entry = pickable.find(e => e.id === next)
          if (entry) {
            onPick(entry)
            setValue('')
          }
        }}
        options={options}
        placeholder={pickable.length === 0 ? 'All catalog fields are already added' : 'Search or pick a field…'}
        emptyText="No matching fields"
        searchPlaceholder="Search fields…"
        disabled={isDisabled}
        data-testid={`${prefixDataTestId}-combobox`}
      />
    </div>
  )
}
