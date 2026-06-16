import React, { useEffect, useMemo, useState } from 'react'
import { DateInput, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@newwork/nw-design-system'
import { useFormContext, useWatch } from 'react-hook-form'
import type { Control, Path } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from '../types'

interface EffectiveDateFieldProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  label: string
  requiredMessage: string
  monthStartMessage: string
  placeholder: string
  labelTestId: string
  inputTestId: string
  min?: string
  helperText?: string
  allowedNonMonthStartDate?: string
  extraValidate?: (value: string) => true | string
}

const isCompleteIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const EffectiveDateField: React.FC<EffectiveDateFieldProps> = ({
  control,
  label,
  requiredMessage,
  monthStartMessage,
  placeholder,
  labelTestId,
  inputTestId,
  min,
  helperText,
  allowedNonMonthStartDate,
  extraValidate
}) => {
  const { trigger } = useFormContext<AdjustEmployeeSalaryFormValues>()
  const effectiveDate = useWatch({ control, name: 'effectiveDate' }) || ''
  const [effectiveDateDraft, setEffectiveDateDraft] = useState<string>(String(effectiveDate))
  const disabledDates = useMemo(() => {
    return (date: Date) => date.getDate() !== 1 && toDateInputValue(date) !== allowedNonMonthStartDate
  }, [allowedNonMonthStartDate])

  const triggerEffectiveDateValidation = () => {
    trigger('effectiveDate').catch(() => undefined)
  }

  useEffect(() => {
    setEffectiveDateDraft(String(effectiveDate || ''))
  }, [effectiveDate])

  useEffect(() => {
    if (effectiveDate) {
      triggerEffectiveDateValidation()
    }
  }, [effectiveDate])

  return (
    <FormField
      control={control}
      name={'effectiveDate' as Path<AdjustEmployeeSalaryFormValues>}
      rules={{
        required: requiredMessage,
        validate: value => {
          if (!value) return true

          const day = Number(String(value).split('-')[2] || '')
          if (day !== 1 && value !== allowedNonMonthStartDate) {
            return monthStartMessage
          }

          if (!extraValidate) {
            return true
          }

          return extraValidate(String(value))
        }
      }}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel data-testid={labelTestId}>
            {label}
            <span className="gba:text-destructive"> *</span>
          </FormLabel>
          <FormControl>
            <div data-testid={inputTestId}>
              <DateInput
                type="date"
                showOutsideDays={false}
                captionLayout={'dropdown'}
                value={effectiveDateDraft}
                min={min}
                placeholder={placeholder}
                className="gba:w-full"
                disabledDates={disabledDates}
                onChange={(v: string | [string | null, string | null] | null) => {
                  const value = typeof v === 'string' ? v : ''
                  setEffectiveDateDraft(value)
                  field.onChange(value)
                  triggerEffectiveDateValidation()
                }}
                onDraftChange={(value: string) => {
                  setEffectiveDateDraft(value)
                  if (value === '') {
                    field.onChange('')
                    triggerEffectiveDateValidation()
                    return
                  }

                  if (isCompleteIsoDate(value)) {
                    field.onChange(value)
                  } else {
                    field.onChange('')
                  }

                  triggerEffectiveDateValidation()
                }}
              />
            </div>
          </FormControl>
          {helperText && !fieldState.error && (
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{helperText}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default EffectiveDateField
