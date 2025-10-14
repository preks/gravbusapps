import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { Control, FieldValues, Path } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DynamicFieldDefinition } from '../DynamicFormField'

interface TextFieldProps<TFieldValues extends FieldValues = FieldValues> {
  field: DynamicFieldDefinition
  fieldName: string
  control: Control<TFieldValues>
  testIdPrefix: string
}

export function TextField<TFieldValues extends FieldValues = FieldValues>({
  field,
  fieldName,
  control,
  testIdPrefix
}: TextFieldProps<TFieldValues>) {
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
              value={formField.value || ''}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
