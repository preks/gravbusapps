import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { Control, FieldValues, Path } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DynamicFieldDefinition } from '../DynamicFormField'

interface PercentageFieldProps<TFieldValues extends FieldValues = FieldValues> {
  field: DynamicFieldDefinition
  fieldName: string
  control: Control<TFieldValues>
  testIdPrefix: string
}

export function PercentageField<TFieldValues extends FieldValues = FieldValues>({
  field,
  fieldName,
  control,
  testIdPrefix
}: PercentageFieldProps<TFieldValues>) {
  return (
    <FormField
      key={fieldName}
      control={control}
      name={fieldName as Path<TFieldValues>}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label} {field.required && <span className="gba:text-destructive">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...formField}
              value={formField.value ?? ''}
              onChange={e => {
                const value = e.target.value === '' ? '' : e.target.value
                formField.onChange(value)
              }}
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0"
              endAddOn={<span className="gba:text-muted-foreground">%</span>}
              data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
