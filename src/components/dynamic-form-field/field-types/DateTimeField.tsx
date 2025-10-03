import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@newwork/nw-design-system';
import { Control, FieldValues, Path } from 'react-hook-form';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DynamicFieldDefinition } from '../DynamicFormField';

interface DateTimeFieldProps<TFieldValues extends FieldValues = FieldValues> {
  field: DynamicFieldDefinition;
  fieldName: string;
  control: Control<TFieldValues>;
  testIdPrefix: string;
}

export function DateTimeField<TFieldValues extends FieldValues = FieldValues>({
  field,
  fieldName,
  control,
  testIdPrefix,
}: DateTimeFieldProps<TFieldValues>) {
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
            <div className="gba:flex gba:gap-2">
              <div className="gba:flex-1 gba:space-y-1">
                <FormLabel htmlFor={`${fieldName}Date`} className="gba:text-sm">
                  Date
                </FormLabel>
                <Input
                  id={`${fieldName}Date`}
                  type="date"
                  value={formField.value ? formField.value.split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const timeValue = formField.value ? formField.value.split('T')[1] || '00:00' : '00:00';
                    formField.onChange(`${e.target.value}T${timeValue}`);
                  }}
                  data-testid={formatDataTestId(testIdPrefix, `${fieldName}DateInput`)}
                />
              </div>
              <div className="gba:flex-1 gba:space-y-1">
                <FormLabel htmlFor={`${fieldName}Time`} className="gba:text-sm">
                  Time
                </FormLabel>
                <Input
                  id={`${fieldName}Time`}
                  type="time"
                  value={formField.value ? formField.value.split('T')[1] || '00:00' : '00:00'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const dateValue = formField.value
                      ? formField.value.split('T')[0]
                      : new Date().toISOString().split('T')[0];
                    formField.onChange(`${dateValue}T${e.target.value}`);
                  }}
                  data-testid={formatDataTestId(testIdPrefix, `${fieldName}TimeInput`)}
                />
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

