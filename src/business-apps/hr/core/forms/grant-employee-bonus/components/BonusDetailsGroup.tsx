import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  DateInput,
  Textarea
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import type { GrantEmployeeBonusFormValues, CatalogEntry } from '../types'
import { CatalogSelectField } from './CatalogSelectField'
import { NumberInputField } from './NumberInputField'

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
      <CatalogSelectField
        control={control}
        name={'employeeBonusTypeRef' as Path<GrantEmployeeBonusFormValues>}
        label={t('field-bonus-type')}
        placeholder={placeholderSelect}
        required
        catalogEntries={catalogs.bonusType}
        validationMessage={t('validation-bonus-type-required')}
        dataTestIdPrefix="grant-employee-bonus-type"
        t={t}
      />

      {/* Amount */}
      <NumberInputField
        control={control}
        name={'amount' as Path<GrantEmployeeBonusFormValues>}
        label={t('field-amount')}
        placeholder={placeholderEnter}
        required
        step="0.01"
        min={0}
        validationRules={{
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
        dataTestIdPrefix="grant-employee-bonus-amount"
      />

      {/* Currency */}
      <CatalogSelectField
        control={control}
        name={'currencyRef' as Path<GrantEmployeeBonusFormValues>}
        label={t('field-currency')}
        placeholder={placeholderSelect}
        required
        catalogEntries={catalogs.currency}
        validationMessage={t('validation-currency-required')}
        dataTestIdPrefix="grant-employee-bonus-currency"
        t={t}
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
      <NumberInputField
        control={control}
        name={'fiscalYear' as Path<GrantEmployeeBonusFormValues>}
        label={t('field-fiscal-year')}
        placeholder={placeholderEnter}
        required
        min={new Date().getFullYear() - 10}
        max={new Date().getFullYear() + 10}
        validationRules={{
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
        dataTestIdPrefix="grant-employee-bonus-fiscal-year"
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
