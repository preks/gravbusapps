import React from 'react'
import { Textarea, useTranslation } from '@newwork/nw-design-system'
import { TextFieldProps } from '../types/FormTypes'
import translations from '../_i18n'

type NotesFieldProps = TextFieldProps

const NotesField: React.FC<NotesFieldProps> = ({
  value,
  onChange,
  disabled,
  'data-testid': dataTestId = 'request-advance-payment-notes-field'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:mb-6" data-testid={dataTestId}>
      <label className="gba:block gba:text-xs gba:font-medium gba:text-black gba:px-3 gba:py-1">
        {t('notes-label')}
      </label>
      <Textarea
        placeholder={t('notes-placeholder')}
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
