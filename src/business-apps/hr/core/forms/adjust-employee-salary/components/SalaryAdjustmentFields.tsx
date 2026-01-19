import React, { useMemo } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { useWatch } from 'react-hook-form'
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'
import { getCatalogValue } from '@/common/utils/windowUtils'
import translations from '../../_i18n'
import { SALARY_FORM_VALIDATION } from '../constants/salaryFormValidation'

interface SalaryAdjustReasonEntry {
  id: string
  code: string
  value: string
  displayOrder: number | null
  translations: Array<{
    localeCode: string
    value: string
  }>
  catalog: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

interface SalaryAdjustmentFieldsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  salaryAdjustReasonEntries?: SalaryAdjustReasonEntry[]
}

const SalaryAdjustmentFields: React.FC<SalaryAdjustmentFieldsProps> = ({ control, salaryAdjustReasonEntries = [] }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  // Watch notes field for character count
  const notes = useWatch({ control, name: 'notes' }) || ''

  // Build adjustment reasons from catalog entries
  const adjustmentReasons = useMemo(() => {
    const sortedEntries = [...salaryAdjustReasonEntries].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    return sortedEntries.map(entry => {
      // Build catalog reference format: SalaryAdjustReason:v1:promotion
      const catalogRef = `${entry.catalog.identifier}:${entry.catalog.version}:${entry.code}`
      const displayValue = getCatalogValue(entry) || entry.value || entry.code

      return {
        value: catalogRef, // Store full catalog reference
        label: displayValue
      }
    })
  }, [salaryAdjustReasonEntries])

  return (
    <>
      {/* Effective Date */}
      <FormField
        control={control}
        name={'effectiveDate' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{
          required: t('adjust-salary-effective-date-required')
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="adjust-employee-salary-effective-date-label">
              {t('adjust-salary-effective-date')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <div data-testid="adjust-employee-salary-effective-date-input">
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

      {/* Reason */}
      <FormField
        control={control}
        name={'reason' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{
          required: t('adjust-salary-reason-required')
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="adjust-employee-salary-reason-label">
              {t('adjust-salary-reason')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value && field.value !== '' ? String(field.value) : ''}
              onValueChange={v => field.onChange(v || '')}
            >
              <FormControl>
                <SelectTrigger className="gba:w-full" data-testid="adjust-employee-salary-reason-select">
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {adjustmentReasons.map(reason => (
                  <SelectItem
                    key={reason.value}
                    value={reason.value}
                    data-testid={`adjust-employee-salary-reason-option-${reason.value}`}
                  >
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <FormLabel data-testid="adjust-employee-salary-notes-label">{t('adjust-salary-notes')}</FormLabel>
            <FormControl>
              <Textarea
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                placeholder={placeholderEnter}
                rows={4}
                maxLength={SALARY_FORM_VALIDATION.NOTES_MAX_LENGTH}
                data-testid="adjust-employee-salary-notes-input"
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

export default SalaryAdjustmentFields
