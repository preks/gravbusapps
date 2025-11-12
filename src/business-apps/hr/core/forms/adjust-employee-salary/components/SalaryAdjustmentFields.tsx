import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import { getCatalogValue } from '@/common/utils/windowUtils'
import type { AdjustEmployeeSalaryFormValues, CatalogEntry } from '../types'
import translations from '../../../apps/employee-record/_i18n'

interface SalaryAdjustmentFieldsProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  catalogs: {
    currency?: CatalogEntry[]
  }
}

const SalaryAdjustmentFields: React.FC<SalaryAdjustmentFieldsProps> = ({ control, catalogs }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = t('action-select-placeholder', { defaultValue: 'Please Select' })
  const placeholderEnter = t('action-enter-placeholder', { defaultValue: 'Please Enter' })

  const adjustmentReasons = [
    { value: 'promotion', label: t('adjust-salary-reason-promotion') },
    { value: 'merit_increase', label: t('adjust-salary-reason-merit-increase') },
    { value: 'market_adjustment', label: t('adjust-salary-reason-market-adjustment') },
    { value: 'other', label: t('adjust-salary-reason-other') }
  ]

  return (
    <>
      {/* Currency */}
      <FormField
        control={control}
        name={'currencyRef' as Path<AdjustEmployeeSalaryFormValues>}
        rules={{
          required: t('adjust-salary-currency-required')
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="adjust-employee-salary-currency-label">
              {t('adjust-salary-currency')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value && field.value !== '' ? String(field.value) : ''}
              onValueChange={v => field.onChange(v || '')}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:block gba:w-full! gba:min-w-0 gba:max-w-none!"
                  data-testid="adjust-employee-salary-currency-select"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.currency || []).map((entry: CatalogEntry) => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`adjust-employee-salary-currency-option-${entry.id}`}
                  >
                    {getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

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
                  onChange={(v?: string) => field.onChange(v || '')}
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
                <SelectTrigger
                  className="gba:block gba:w-full! gba:min-w-0 gba:max-w-none!"
                  data-testid="adjust-employee-salary-reason-select"
                >
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

      {/* Description */}
      <FormField
        control={control}
        name={'description' as Path<AdjustEmployeeSalaryFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="adjust-employee-salary-description-label">
              {t('adjust-salary-description')}
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                placeholder={placeholderEnter}
                data-testid="adjust-employee-salary-description-input"
              />
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
            <FormLabel data-testid="adjust-employee-salary-notes-label">{t('adjust-salary-notes')}</FormLabel>
            <FormControl>
              <Textarea
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                placeholder={placeholderEnter}
                rows={4}
                data-testid="adjust-employee-salary-notes-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export default SalaryAdjustmentFields
