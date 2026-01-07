import React from 'react'
import { Textarea } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TextFieldProps } from '../types/FormTypes'

type NotesFieldProps = TextFieldProps

const NotesField: React.FC<NotesFieldProps> = ({
  value,
  onChange,
  disabled,
  'data-testid': dataTestId = 'request-advance-payment-notes-field'
}) => {
  return (
    <div className="gba:mb-6" data-testid={dataTestId}>
      <label className="gba:block gba:text-xs gba:font-medium gba:text-black gba:px-3 gba:py-1">
        {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.notes_area_label', 'Note')}
      </label>
      <Textarea
        placeholder={getTranslationFromI18nKeyAndLabel(
          'lowcoder:request_advance_payment.notes_placeholder',
          'Enter additional notes...'
        )}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="gba:w-full gba:min-h-[80px] gba:border-none gba:rounded-none gba:px-3 gba:py-2 gba:resize-y gba:!bg-gray-100"
        data-testid="request-advance-payment-notes-textarea"
      />
    </div>
  )
}

export default NotesField
