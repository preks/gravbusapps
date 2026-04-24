import {
  Combobox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { Control, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'

interface BaseFieldProps<T extends FieldValues> {
  name: FieldPath<T>
  control?: Control<T>
  label: string
  required?: boolean
  dataTestId?: string
}

interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
  validate?: (value: string) => string | boolean
  transform?: (value: string) => string
  rules?: RegisterOptions<T>
}

export function TextField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  placeholder,
  maxLength,
  pattern,
  patternMessage,
  validate,
  transform,
  dataTestId,
  rules: customRules
}: Readonly<TextFieldProps<T>>) {
  const rules = {
    ...customRules,
    ...(required && { required: `${label} is required` }),
    ...(maxLength && {
      maxLength: {
        value: maxLength,
        message: `${label} must be less than ${maxLength} characters`
      }
    }),
    ...(pattern && {
      pattern: {
        value: pattern,
        message: patternMessage || `Invalid ${label} format`
      }
    }),
    ...(validate && { validate })
  }

  return (
    <FormField
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && ' *'}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              {...field}
              onChange={e => {
                const value = transform ? transform(e.target.value) : e.target.value
                field.onChange({ ...e, target: { ...e.target, value } })
              }}
              data-testid={dataTestId}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface NumberFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string
  min?: number
  max?: number
  step?: number
  validate?: (value: number) => string | boolean
  rules?: RegisterOptions<T>
}

export function NumberField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  placeholder,
  min,
  max,
  step,
  validate,
  dataTestId,
  rules: customRules
}: Readonly<NumberFieldProps<T>>) {
  const rules = {
    ...customRules,
    ...(required && { required: `${label} is required` }),
    ...(min !== undefined && {
      min: {
        value: min,
        message: `${label} must be at least ${min}`
      }
    }),
    ...(max !== undefined && {
      max: {
        value: max,
        message: `${label} must be at most ${max}`
      }
    }),
    ...(validate && { validate })
  }

  return (
    <FormField
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && ' *'}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              {...field}
              onChange={e => {
                const value = e.target.value === '' ? '' : Number(e.target.value)
                field.onChange(value)
              }}
              data-testid={dataTestId}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface TextAreaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string
  rows?: number
  maxLength?: number
  rules?: RegisterOptions<T>
}

export function TextAreaField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  placeholder,
  rows = 3,
  maxLength,
  dataTestId,
  rules: customRules
}: Readonly<TextAreaFieldProps<T>>) {
  const rules = {
    ...customRules,
    ...(required && { required: `${label} is required` }),
    ...(maxLength && {
      maxLength: {
        value: maxLength,
        message: `${label} must be less than ${maxLength} characters`
      }
    })
  }

  return (
    <FormField
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && ' *'}
          </FormLabel>
          <FormControl>
            <Textarea placeholder={placeholder} rows={rows} {...field} data-testid={dataTestId} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: Array<{ value: string; label: string }>
  placeholder?: string
  rules?: RegisterOptions<T>
}

export function SelectField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  options,
  placeholder,
  dataTestId,
  rules: customRules
}: Readonly<SelectFieldProps<T>>) {
  const rules = {
    ...customRules,
    ...(required && { required: `${label} is required` })
  }

  return (
    <FormField
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && ' *'}
          </FormLabel>
          <FormControl>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger data-testid={dataTestId}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface ComboboxFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: Array<{ value: string; label: string }>
  placeholder?: string
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  emptyText?: string
  onValueChange?: (value: string, field: any) => void
  value?: string
  rules?: RegisterOptions<T>
  /**
   * When this string changes, the inner Combobox remounts. Use with `onSearch` when options
   * are loaded asynchronously: @newwork/nw-design-system keeps a stale options ref if the
   * parent passes an empty list while search text is empty (empty API result looks like “loading”).
   */
  comboboxKeySuffix?: string
  disabled?: boolean
}

export function ComboboxField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  disabled = false,
  options,
  placeholder,
  searchPlaceholder,
  onSearch,
  emptyText,
  dataTestId,
  onValueChange,
  value,
  comboboxKeySuffix,
  rules: customRules
}: Readonly<ComboboxFieldProps<T>>) {
  const rules = {
    ...customRules,
    ...(required && { required: `${label} is required` })
  }

  return (
    <FormField
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && ' *'}
          </FormLabel>
          <FormControl>
            <Combobox
              key={`${name}-combobox-${comboboxKeySuffix ? `${comboboxKeySuffix}-` : ''}${value || field.value?.id || 'empty'}`}
              options={options}
              disabled={disabled}
              value={value || field.value?.id || ''}
              onValueChange={selectedId => {
                if (onValueChange) {
                  onValueChange(selectedId, field)
                } else {
                  // For simple string values, just pass the selectedId
                  field.onChange(selectedId)
                }
              }}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              onSearch={onSearch}
              searchDebounce={300}
              emptyText={emptyText}
              className="gba:w-full!"
              data-testid={dataTestId}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── Read-Only Field Component ──────────────────────────────────────────────

interface ReadOnlyFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  value?: string
  placeholder?: string
  rules?: RegisterOptions<T>
}

export function ReadOnlyField<T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  value,
  placeholder = 'Not specified',
  dataTestId,
  rules: customRules
}: Readonly<ReadOnlyFieldProps<T>>) {
  const rules = {
    required: required ? `${label} is required` : false,
    ...customRules
  }

  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label} {required && <span className="gba:text-destructive">*</span>}
          </FormLabel>
          <FormControl>
            <div
              className="gba:flex gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-muted/30 gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground"
              data-testid={dataTestId}
            >
              {value || field.value || placeholder}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
