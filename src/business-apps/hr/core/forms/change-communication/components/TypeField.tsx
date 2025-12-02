import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TypeFieldProps {
  value?: string
  onChange: (value: string) => void
  types: Array<{ id: string; label: string; value?: string }>
  loading: boolean
  error?: string
  touched: boolean
  secondaryTypeId?: string
  hasPrimaryForSelection: boolean
}

export const TypeField: React.FC<TypeFieldProps> = ({
  value,
  onChange,
  types,
  loading,
  error,
  touched,
  secondaryTypeId,
  hasPrimaryForSelection
}) => {
  return (
    <div className="gba:space-y-2">
      <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.type', 'Type')}*
      </div>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="gba:w-full" data-testid="flw_changePrivateCommunication_currentType">
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.selectType', 'Select Type')}
          />
        </SelectTrigger>
        <SelectContent>
          {types.map(t => {
            const isSecondary = t.id === secondaryTypeId || (t.label || t.value)?.toLowerCase() === 'secondary'
            const disabled = isSecondary && !hasPrimaryForSelection
            return (
              <SelectItem key={t.id} value={t.id} disabled={disabled}>
                {t.label}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      {touched && error && (
        <div className="gba:mt-1 gba:text-destructive" data-testid="change-communication-type-error">
          {error}
        </div>
      )}
    </div>
  )
}
