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
  Textarea
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import { getCatalogValue } from '@/common/utils/windowUtils'
import type { GrantEmployeeBonusFormValues, CatalogEntry } from '../types'

type FormFieldValue = string | number | null

export interface BonusDetailsGroupProps {
  control: Control<GrantEmployeeBonusFormValues>
  catalogs: {
    bonusType?: CatalogEntry[]
    currency?: CatalogEntry[]
  }
  t: (key: string, params?: any) => string
}

const BonusDetailsGroup: React.FC<BonusDetailsGroupProps> = ({ control, catalogs, t }) => {
  const placeholderSelect = t('placeholder-select')
  const placeholderEnter = t('placeholder-enter')

  return (
    <div className="gba:space-y-4" data-testid="grant-employee-bonus-details-group">
      {/* Employee Bonus Type */}
      <FormField
        control={control}
        name={'employeeBonusTypeRef' as Path<GrantEmployeeBonusFormValues>}
        rules={{
          required: t('validation-bonus-type-required')
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-type-label">
              {t('field-bonus-type')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value && field.value !== '' ? String(field.value) : ''}
              onValueChange={v => field.onChange(v || '')}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:block gba:w-full! gba:min-w-0 gba:max-w-none!"
                  data-testid="grant-employee-bonus-type-select"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.bonusType || []).map((entry: CatalogEntry) => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`grant-employee-bonus-type-option-${entry.id}`}
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

      {/* Amount */}
      <FormField
        control={control}
        name={'amount' as Path<GrantEmployeeBonusFormValues>}
        rules={{
          required: t('validation-amount-required'),
          validate: (value: FormFieldValue) => {
            if (value === null || value === undefined) {
              return t('validation-amount-required')
            }
            const numValue = typeof value === 'string' ? Number.parseFloat(value) : value
            if (typeof numValue === 'number' && (Number.isNaN(numValue) || numValue <= 0)) {
              return t('validation-amount-positive')
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-amount-label">
              {t('field-amount')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                onChange={e => {
                  const val = e.target.value
                  if (val === '') {
                    field.onChange(null)
                    return
                  }
                  const parsed = Number.parseFloat(val)
                  const finalValue = Number.isNaN(parsed) ? null : parsed
                  field.onChange(finalValue)
                }}
                placeholder={placeholderEnter}
                data-testid="grant-employee-bonus-amount-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Currency */}
      <FormField
        control={control}
        name={'currencyRef' as Path<GrantEmployeeBonusFormValues>}
        rules={{
          required: t('validation-currency-required')
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-currency-label">
              {t('field-currency')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value && field.value !== '' ? String(field.value) : ''}
              onValueChange={v => field.onChange(v || '')}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:block gba:w-full! gba:min-w-0 gba:max-w-none!"
                  data-testid="grant-employee-bonus-currency-select"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.currency || []).map((entry: CatalogEntry) => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`grant-employee-bonus-currency-option-${entry.id}`}
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

      {/* Payment Date */}
      <FormField
        control={control}
        name={'paymentDate' as Path<GrantEmployeeBonusFormValues>}
        rules={{
          required: t('validation-payment-date-required'),
          validate: (value: FormFieldValue) => {
            if (!value || value === '') {
              return t('validation-payment-date-required')
            }
            const dateValue = typeof value === 'number' ? String(value) : value
            const date = new Date(dateValue)
            if (Number.isNaN(date.getTime())) {
              return t('validation-payment-date-invalid')
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-payment-date-label">
              {t('field-payment-date')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <div data-testid="grant-employee-bonus-payment-date-input">
                <DateInput
                  type="date"
                  value={(field.value as string) || ''}
                  onChange={v => field.onChange(v || '')}
                  placeholder={placeholderSelect}
                  className="gba:w-full"
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Fiscal Year */}
      <FormField
        control={control}
        name={'fiscalYear' as Path<GrantEmployeeBonusFormValues>}
        rules={{
          required: t('validation-fiscal-year-required'),
          validate: (value: FormFieldValue) => {
            if (!value) {
              return t('validation-fiscal-year-required')
            }
            const numValue = typeof value === 'string' ? Number.parseInt(String(value), 10) : value
            if (typeof numValue !== 'number' || Number.isNaN(numValue)) {
              return t('validation-fiscal-year-required')
            }
            const currentYear = new Date().getFullYear()
            const minYear = currentYear - 10
            const maxYear = currentYear + 10
            if (numValue < minYear || numValue > maxYear) {
              return t('validation-fiscal-year-range', { minYear, maxYear })
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-fiscal-year-label">
              {t('field-fiscal-year')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                min={new Date().getFullYear() - 10}
                max={new Date().getFullYear() + 10}
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                onChange={e => {
                  const val = e.target.value
                  if (val === '') {
                    field.onChange(null)
                    return
                  }
                  const parsed = Number.parseInt(val, 10)
                  const finalValue = Number.isNaN(parsed) ? null : parsed
                  field.onChange(finalValue)
                }}
                placeholder={placeholderEnter}
                data-testid="grant-employee-bonus-fiscal-year-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={control}
        name={'description' as Path<GrantEmployeeBonusFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-description-label">{t('field-description')}</FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                placeholder={placeholderEnter}
                data-testid="grant-employee-bonus-description-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Notes */}
      <FormField
        control={control}
        name={'notes' as Path<GrantEmployeeBonusFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-notes-label">{t('field-notes')}</FormLabel>
            <FormControl>
              <Textarea
                className="gba:w-full"
                {...field}
                value={field.value ?? ''}
                placeholder={placeholderEnter}
                rows={4}
                data-testid="grant-employee-bonus-notes-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default BonusDetailsGroup
