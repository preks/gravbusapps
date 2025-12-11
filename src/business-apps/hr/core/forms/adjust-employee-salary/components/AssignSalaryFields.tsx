import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import translations from '../../_i18n'

interface AssignSalaryFieldsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
}

const AssignSalaryFields: React.FC<AssignSalaryFieldsProps> = ({ control }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  return (
    <>
      {/* Start Date */}
      <FormField
        control={control}
        name={'effectiveDate' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{
          required: t('assign-salary-start-date-required')
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="assign-employee-salary-start-date-label">
              {t('assign-salary-start-date')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <div data-testid="assign-employee-salary-start-date-input">
                <DateInput
                  type="date"
                  value={(field.value as string) || ''}
                  onChange={(v: string | [string | null, string | null] | null) => {
                    const value = typeof v === 'string' ? v : ''
                    field.onChange(value)
                  }}
                  placeholder={placeholderSelect}
                  className="gba:w-full"
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
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
                data-testid="assign-employee-salary-notes-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export default AssignSalaryFields
