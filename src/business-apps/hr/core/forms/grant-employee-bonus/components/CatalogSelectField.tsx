import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import type { Control, Path, FieldValues } from 'react-hook-form'
import { getCatalogValue } from '@/common/utils/windowUtils'
import type { CatalogEntry } from '../types'

interface CatalogSelectFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  placeholder: string
  required?: boolean
  catalogEntries?: CatalogEntry[]
  validationMessage?: string
  dataTestIdPrefix: string
  t: (key: string) => string
}

/**
 * Reusable catalog select field component
 * Reduces duplication between bonusType and currency fields
 */
export const CatalogSelectField = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required = false,
  catalogEntries = [],
  validationMessage,
  dataTestIdPrefix,
  t
}: CatalogSelectFieldProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      rules={
        required
          ? {
              required: validationMessage || t('validation-field-required')
            }
          : undefined
      }
      render={({ field }) => (
        <FormItem>
          <FormLabel data-testid={`${dataTestIdPrefix}-label`}>
            {label}
            {required && <span className="gba:text-destructive"> *</span>}
          </FormLabel>
          <Select
            value={field.value && field.value !== '' ? String(field.value) : ''}
            onValueChange={v => field.onChange(v || '')}
          >
            <FormControl>
              <SelectTrigger className="gba:w-full" data-testid={`${dataTestIdPrefix}-select`}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {catalogEntries.map((entry: CatalogEntry) => (
                <SelectItem
                  key={entry.id}
                  value={String(entry.id)}
                  data-testid={`${dataTestIdPrefix}-option-${entry.id}`}
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
  )
}
