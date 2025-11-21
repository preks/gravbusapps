import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface PurposeFieldProps {
  value: string
  onChange: (value: string) => void
}

export const PurposeField: React.FC<PurposeFieldProps> = ({ value, onChange }) => {
  return (
    <div className="gba:space-y-2">
      <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.purpose', 'Purpose')}*
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="gba:w-full" data-testid="flw_changePrivateCommunication_currentPurpose">
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:communication_form.selectPurpose',
              'Select Purpose'
            )}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PRIVATE">
            {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.purpose.private', 'Private')}
          </SelectItem>
          <SelectItem value="INTERNAL">
            {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.purpose.internal', 'Internal')}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
