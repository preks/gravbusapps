/**
 * Mock for @newwork/nw-design-system
 * Used in Jest tests to avoid ES module parsing issues
 */
import React from 'react'

export const LocalizationProvider = ({ children }: any) => <div>{children}</div>
export const useTranslation = () => ({
  t: (key: string) => key
})

export const FormField = ({ render, name }: any) => {
  const field = { value: '', onChange: () => {}, onBlur: () => {}, name, ref: () => {} }
  return render({ field, fieldState: {}, formState: {} })
}

export const FormItem = ({ children }: any) => <div>{children}</div>
export const FormLabel = ({ children, ...props }: any) => <label {...props}>{children}</label>
export const FormControl = ({ children }: any) => <div>{children}</div>
export const FormMessage = () => <div />

export const Input = React.forwardRef((props: any, ref) => <input ref={ref as any} {...props} />)
export const Textarea = React.forwardRef((props: any, ref) => <textarea ref={ref as any} {...props} />)
export const Button = ({ children, ...props }: any) => <button {...props}>{children}</button>

export const Select = ({ children, value, onValueChange }: any) => (
  <select value={value} onChange={e => onValueChange?.(e.target.value)}>
    {children}
  </select>
)
export const SelectTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const SelectValue = ({ placeholder }: any) => <div>{placeholder}</div>
export const SelectContent = ({ children }: any) => <div>{children}</div>
export const SelectItem = ({ children, value, ...props }: any) => (
  <option value={value} {...props}>
    {children}
  </option>
)

export const DateInput = (props: any) => <input type="date" {...props} />

export const Card = ({ children, className, ...props }: any) => (
  <div className={className} {...props}>
    {children}
  </div>
)

export const Avatar = ({ children }: any) => <div>{children}</div>
export const AvatarImage = ({ alt = '', ...props }: any) => <img alt={alt} {...props} />
export const AvatarFallback = ({ children }: any) => <div>{children}</div>

export const Spinner = () => <div>Loading...</div>

export default {
  LocalizationProvider,
  useTranslation,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DateInput,
  Card,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner
}
