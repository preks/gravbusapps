import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { Control, FieldValues, Path } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DynamicFieldDefinition } from '../DynamicFormField'

interface AmountFieldProps<TFieldValues extends FieldValues = FieldValues> {
  field: DynamicFieldDefinition
  fieldName: string
  control: Control<TFieldValues>
  testIdPrefix: string
  currencySymbol?: string
}

/**
 * Format a number to exactly 2 decimal places
 */
function formatAmount(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return ''
  }

  // Format to exactly 2 decimal places
  return num.toFixed(2)
}

export function AmountField<TFieldValues extends FieldValues = FieldValues>({
  field,
  fieldName,
  control,
  testIdPrefix,
  currencySymbol
}: AmountFieldProps<TFieldValues>) {
  return (
    <FormField
      key={fieldName}
      control={control}
      name={fieldName as Path<TFieldValues>}
      render={({ field: formField }) => {
        return (
          <FormItem>
            <FormLabel>
              {field.label} {field.required && <span className="gba:text-destructive">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                {...formField}
                value={formField.value || ''}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                endAddOn={
                  currencySymbol ? (
                    <span
                      className="gba:text-muted-foreground gba:font-mono"
                      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Currency`)}
                      title={`Currency: ${currencySymbol}`}
                    >
                      {currencySymbol}
                    </span>
                  ) : (
                    <span
                      className="gba:text-muted-foreground gba:opacity-50"
                      data-testid={formatDataTestId(testIdPrefix, `${fieldName}CurrencyPlaceholder`)}
                      title="Select a currency to see symbol"
                    >
                      ?
                    </span>
                  )
                }
                data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
                onChange={e => {
                  // Store the raw value while typing
                  formField.onChange(e.target.value)
                }}
                onBlur={e => {
                  // Format to 2 decimal places when user leaves the field
                  const formatted = formatAmount(e.target.value)
                  if (formatted !== '') {
                    formField.onChange(formatted)
                  }
                  formField.onBlur()
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
