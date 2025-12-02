import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { Control, Path } from 'react-hook-form'
import type { GrantEmployeeBonusFormValues, CatalogEntry } from '../types'
import { CatalogSelectField } from './CatalogSelectField'
import { NumberInputField } from './NumberInputField'

type FormFieldValue = string | number | null

const MONTH_KEYS = [
  { value: 1, key: 'month-january' },
  { value: 2, key: 'month-february' },
  { value: 3, key: 'month-march' },
  { value: 4, key: 'month-april' },
  { value: 5, key: 'month-may' },
  { value: 6, key: 'month-june' },
  { value: 7, key: 'month-july' },
  { value: 8, key: 'month-august' },
  { value: 9, key: 'month-september' },
  { value: 10, key: 'month-october' },
  { value: 11, key: 'month-november' },
  { value: 12, key: 'month-december' }
]

export interface BonusDetailsGroupProps {
  control: Control<GrantEmployeeBonusFormValues>
  catalogs: {
    bonusType?: CatalogEntry[]
  }
  currencyDisplay: string
  t: (key: string, params?: any) => string
}

const BonusDetailsGroup: React.FC<BonusDetailsGroupProps> = ({ control, catalogs, currencyDisplay, t }) => {
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

      {/* Amount & Currency - Side by Side */}
      <div className="gba:flex gba:gap-4 gba:items-end">
        {/* Amount */}
        <div className="gba:flex-1">
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
        </div>

        {/* Currency (Read-only) */}
        <div className="gba:w-24">
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-currency-label">{t('field-currency')}</FormLabel>
            <FormControl>
              <Input
                className="gba:w-full gba:text-center"
                value={currencyDisplay || '-'}
                disabled
                data-testid="grant-employee-bonus-currency-input"
              />
            </FormControl>
          </FormItem>
        </div>
      </div>

      {/* Payment Month & Fiscal Year - Side by Side */}
      <div className="gba:flex gba:gap-4">
        {/* Payment Month */}
        <div className="gba:flex-1">
          <FormField
            control={control}
            name={'paymentMonth' as Path<GrantEmployeeBonusFormValues>}
            rules={{
              required: t('validation-payment-month-required'),
              validate: (value: FormFieldValue) => {
                if (!value || value === '' || value === 0) {
                  return t('validation-payment-month-required')
                }
                const numValue = typeof value === 'string' ? Number.parseInt(value, 10) : value
                if (typeof numValue !== 'number' || numValue < 1 || numValue > 12) {
                  return t('validation-payment-month-invalid')
                }
                return true
              }
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="grant-employee-bonus-payment-month-label">
                  {t('field-payment-month')}
                  <span className="gba:text-destructive"> *</span>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={v => field.onChange(Number.parseInt(v, 10))}
                  >
                    <SelectTrigger className="gba:w-full" data-testid="grant-employee-bonus-payment-month-select">
                      <SelectValue placeholder={placeholderSelect} />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_KEYS.map(month => (
                        <SelectItem
                          key={month.value}
                          value={String(month.value)}
                          data-testid={`grant-employee-bonus-payment-month-option-${month.value}`}
                        >
                          {t(month.key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Fiscal Year */}
        <div className="gba:flex-1">
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
        </div>
      </div>

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
