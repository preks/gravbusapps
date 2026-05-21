import React, { useEffect, useMemo, useState } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  DateInput
} from '@newwork/nw-design-system'
import { useFormContext, useWatch } from 'react-hook-form'
import type { Control, Path } from 'react-hook-form'
import type { GrantEmployeeBonusFormValues, CatalogEntry } from '../types'
import { CatalogSelectField } from './CatalogSelectField'
import { NumberInputField } from './NumberInputField'

type FormFieldValue = string | number | null

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/

const parseIsoDateParts = (value: string): { year: number; month: number; day: number } | null => {
  const match = ISO_DATE_REGEX.exec(value)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || !month || !day) {
    return null
  }

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

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
  const { setValue, getValues, trigger, setError, clearErrors } = useFormContext<GrantEmployeeBonusFormValues>()
  const paymentMonth = useWatch({ control, name: 'paymentMonth' })
  const fiscalYear = useWatch({ control, name: 'fiscalYear' })
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const minYear = currentYear - 10
  const maxYear = currentYear + 10
  const dateInputMin = `${minYear}-01-01`
  const dateInputMax = `${maxYear}-12-01`
  const paymentDateValue = useMemo(() => {
    if (!paymentMonth || !fiscalYear) {
      return ''
    }

    return `${fiscalYear}-${String(paymentMonth).padStart(2, '0')}-01`
  }, [fiscalYear, paymentMonth])
  const disabledDates = useMemo(() => {
    return (date: Date) => date.getDate() !== 1
  }, [])
  const [paymentDateDraft, setPaymentDateDraft] = useState<string>(paymentDateValue)

  useEffect(() => {
    setPaymentDateDraft(paymentDateValue)
  }, [paymentDateValue])

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

      {/* Payment Date (first day of month only) */}
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
            if (typeof numValue !== 'number' || Number.isNaN(numValue) || numValue < 1 || numValue > 12) {
              return t('validation-payment-month-invalid')
            }

            const selectedFiscalYear = Number(getValues('fiscalYear'))
            if (!selectedFiscalYear || Number.isNaN(selectedFiscalYear)) {
              return t('validation-fiscal-year-required')
            }
            if (selectedFiscalYear < minYear || selectedFiscalYear > maxYear) {
              return t('validation-fiscal-year-range', { minYear, maxYear })
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
              <div data-testid="grant-employee-bonus-payment-month-select">
                <DateInput
                  type="date"
                  showOutsideDays={false}
                  captionLayout={'dropdown'}
                  value={paymentDateDraft}
                  min={dateInputMin}
                  max={dateInputMax}
                  disabledDates={disabledDates}
                  placeholder={placeholderSelect}
                  className="gba:w-full"
                  onChange={v => {
                    const value = typeof v === 'string' ? v : ''
                    if (!value) {
                      clearErrors('paymentMonth')
                      field.onChange(0)
                      setValue('fiscalYear', 0, { shouldDirty: true, shouldValidate: true })
                      trigger(['paymentMonth', 'fiscalYear']).catch(() => undefined)
                      return
                    }

                    const [year = '', month = '', day = ''] = value.split('-')
                    const numericYear = Number(year)
                    const numericMonth = Number(month)
                    const numericDay = Number(day)
                    if (!numericYear || !numericMonth || numericDay !== 1) {
                      setError('paymentMonth', {
                        type: 'validate',
                        message: t('validation-payment-month-invalid')
                      })
                      return
                    }

                    clearErrors('paymentMonth')
                    field.onChange(numericMonth)
                    setValue('fiscalYear', numericYear, { shouldDirty: true, shouldValidate: true })
                    trigger(['paymentMonth', 'fiscalYear']).catch(() => undefined)
                  }}
                  onDraftChange={(value: string) => {
                    setPaymentDateDraft(value)

                    if (!value) {
                      clearErrors('paymentMonth')
                      field.onChange(0)
                      setValue('fiscalYear', 0, { shouldDirty: true, shouldValidate: true })
                      trigger(['paymentMonth', 'fiscalYear']).catch(() => undefined)
                      return
                    }

                    const parsedValue = parseIsoDateParts(value)
                    if (!parsedValue) {
                      setError('paymentMonth', {
                        type: 'validate',
                        message: t('validation-payment-month-invalid')
                      })
                      return
                    }

                    if (parsedValue.day !== 1) {
                      setError('paymentMonth', {
                        type: 'validate',
                        message: t('validation-payment-month-invalid')
                      })
                      return
                    }

                    clearErrors('paymentMonth')
                    field.onChange(parsedValue.month)
                    setValue('fiscalYear', parsedValue.year, { shouldDirty: true, shouldValidate: true })
                    trigger(['paymentMonth', 'fiscalYear']).catch(() => undefined)
                  }}
                />
              </div>
            </FormControl>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('grant-bonus-payment-date-month-start-hint', {
                defaultValue: 'The submitted date is always the 1st day of the month.'
              })}
            </p>
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
