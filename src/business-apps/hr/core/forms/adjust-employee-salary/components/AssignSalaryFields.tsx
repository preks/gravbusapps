import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { useWatch } from 'react-hook-form'
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import translations from '../../_i18n'
import { SALARY_FORM_VALIDATION } from '../constants/salaryFormValidation'
import EffectiveDateField from './EffectiveDateField'

interface AssignSalaryFieldsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  hireDate?: string
}

const AssignSalaryFields: React.FC<AssignSalaryFieldsProps> = ({ control, hireDate }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  // Watch notes field for character count
  const notes = useWatch({ control, name: 'notes' }) || ''

  return (
    <>
      <EffectiveDateField
        control={control}
        label={t('assign-salary-start-date')}
        requiredMessage={t('assign-salary-start-date-required')}
        monthStartMessage={t('assign-salary-start-date-month-start', {
          defaultValue: 'Only the first day of a month can be selected.'
        })}
        placeholder={placeholderSelect}
        labelTestId="assign-employee-salary-start-date-label"
        inputTestId="assign-employee-salary-start-date-input"
        allowedNonMonthStartDate={hireDate}
      />

      {/* Notes */}
      <FormField
        control={control}
        name={'notes' as Path<AdjustEmployeeSalaryFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="assign-employee-salary-notes-label">{t('adjust-salary-notes')}</FormLabel>
            <FormControl>
              <Textarea
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                placeholder={placeholderEnter}
                rows={4}
                maxLength={SALARY_FORM_VALIDATION.NOTES_MAX_LENGTH}
                data-testid="assign-employee-salary-notes-input"
              />
            </FormControl>
            <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
              {notes.length} / {SALARY_FORM_VALIDATION.NOTES_MAX_LENGTH} {t('common-characters')}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export default AssignSalaryFields
