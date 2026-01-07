import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'
import type { Control, Path, FieldValues } from 'react-hook-form'

type FormFieldValue = string | number | null

interface NumberInputFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  placeholder: string
  required?: boolean
  min?: number
  max?: number
  step?: string
  validationRules?: {
    required?: string
    validate?: (value: FormFieldValue) => string | boolean
  }
  dataTestIdPrefix: string
}

/**
 * Reusable number input field component
 * Reduces duplication between amount and fiscalYear fields
 */
export const NumberInputField = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required = false,
  min,
  max,
  step,
  validationRules,
  dataTestIdPrefix
}: NumberInputFieldProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      rules={validationRules}
      render={({ field }) => (
        <FormItem>
          <FormLabel data-testid={`${dataTestIdPrefix}-label`}>
            {label}
            {required && <span className="gba:text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
              min={min}
              max={max}
              className="gba:w-full"
              {...field}
              value={field.value ?? ''}
              onChange={e => {
                const val = e.target.value
                if (val === '') {
                  field.onChange(null)
                  return
                }
                const parsed = step === '0.01' || step === undefined ? Number.parseFloat(val) : Number.parseInt(val, 10)
                const finalValue = Number.isNaN(parsed) ? null : parsed
                field.onChange(finalValue)
              }}
              placeholder={placeholder}
              data-testid={`${dataTestIdPrefix}-input`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
