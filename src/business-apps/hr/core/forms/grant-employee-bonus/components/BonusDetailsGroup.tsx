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
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import type { GrantEmployeeBonusFormValues, CatalogEntry } from '../types'

export interface BonusDetailsGroupProps {
  control: Control<GrantEmployeeBonusFormValues>
  catalogs: {
    bonusType?: CatalogEntry[]
    currency?: CatalogEntry[]
  }
}

const BonusDetailsGroup: React.FC<BonusDetailsGroupProps> = ({ control, catalogs }) => {
  const placeholderSelect = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
    'Please Select'
  )
  const placeholderEnter = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
    'Please Enter'
  )

  return (
    <div className="gba:space-y-4" data-testid="grant-employee-bonus-details-group">
      {/* Employee Bonus Type */}
      <FormField
        control={control}
        name={'employeeBonusTypeRef' as Path<GrantEmployeeBonusFormValues>}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:grant_employee_bonus.bonus_type_required',
            'Bonus type is required. Please select a bonus type.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-type-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:grant_employee_bonus.bonus_type', 'Bonus Type')}
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
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:grant_employee_bonus.amount_required',
            'Amount is required. Please enter the bonus amount.'
          ),
          validate: (value: string | number | null) => {
            if (value === null || value === undefined) {
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:grant_employee_bonus.amount_required',
                'Amount is required. Please enter the bonus amount.'
              )
            }
            const numValue = typeof value === 'string' ? parseFloat(value) : value
            if (typeof numValue === 'number' && (Number.isNaN(numValue) || numValue <= 0)) {
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:grant_employee_bonus.amount_positive',
                'Amount must be greater than zero.'
              )
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-amount-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:grant_employee_bonus.amount', 'Amount')}
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
                  const parsed = parseFloat(val)
                  field.onChange(val === '' ? null : Number.isNaN(parsed) ? null : parsed)
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
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:grant_employee_bonus.currency_required',
            'Currency is required. Please select a currency.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-currency-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:grant_employee_bonus.currency', 'Currency')}
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
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:grant_employee_bonus.payment_date_required',
            'Payment date is required. Please select a payment date.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-payment-date-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:grant_employee_bonus.payment_date', 'Payment Date')}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <div data-testid="grant-employee-bonus-payment-date-input">
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

      {/* Fiscal Year */}
      <FormField
        control={control}
        name={'fiscalYear' as Path<GrantEmployeeBonusFormValues>}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:grant_employee_bonus.fiscal_year_required',
            'Fiscal year is required. Please enter the fiscal year.'
          ),
          validate: (value: string | number | null) => {
            if (!value) {
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:grant_employee_bonus.fiscal_year_required',
                'Fiscal year is required. Please enter the fiscal year.'
              )
            }
            const numValue = typeof value === 'string' ? parseInt(String(value), 10) : value
            if (typeof numValue !== 'number' || Number.isNaN(numValue)) {
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:grant_employee_bonus.fiscal_year_required',
                'Fiscal year is required. Please enter the fiscal year.'
              )
            }
            const currentYear = new Date().getFullYear()
            const minYear = currentYear - 10
            const maxYear = currentYear + 10
            if (numValue < minYear || numValue > maxYear) {
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:grant_employee_bonus.fiscal_year_range',
                `Fiscal year must be between ${minYear} and ${maxYear}.`
              )
            }
            return true
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="grant-employee-bonus-fiscal-year-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:grant_employee_bonus.fiscal_year', 'Fiscal Year')}
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
                  const parsed = parseInt(val, 10)
                  field.onChange(val === '' ? null : Number.isNaN(parsed) ? null : parsed)
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
            <FormLabel data-testid="grant-employee-bonus-description-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:grant_employee_bonus.description', 'Description')}
            </FormLabel>
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
            <FormLabel data-testid="grant-employee-bonus-notes-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:grant_employee_bonus.notes', 'Notes')}
            </FormLabel>
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
