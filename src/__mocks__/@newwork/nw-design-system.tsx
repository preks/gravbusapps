/**
 * Mock for @newwork/nw-design-system
 * Used in Jest tests to avoid ES module parsing issues
 */
import React from 'react'

export const LocalizationProvider = ({ children }: any) => <div>{children}</div>
const mockTranslate = (key: string) => key
export const useTranslation = () => ({
  t: mockTranslate
})

export const FormField = ({ render, name }: any) => {
  const field = { value: '', onChange: () => {}, onBlur: () => {}, name, ref: () => {} }
  return render({ field, fieldState: {}, formState: {} })
}

export const FormItem = ({ children }: any) => <div>{children}</div>
export const FormLabel = ({ children, ...props }: any) => <label {...props}>{children}</label>
export const FormControl = ({ children }: any) => <div>{children}</div>
export const FormMessage = () => <div />

const flattenSelectChildren = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement(child)) return []
    const childType = child.type as any
    if (childType === SelectItem) return [child]
    return flattenSelectChildren(child.props?.children)
  })

export const Input = React.forwardRef((props: any, ref) => <input ref={ref as any} {...props} />)
export const Textarea = React.forwardRef((props: any, ref) => <textarea ref={ref as any} {...props} />)
export const Button = ({ children, ...props }: any) => <button {...props}>{children}</button>

export const Select = ({ children, value, onValueChange, ...props }: any) => (
  <select value={value} onChange={e => onValueChange?.(e.target.value)} {...props}>
    {flattenSelectChildren(children)}
  </select>
)
export const SelectTrigger = ({ children }: any) => <>{children}</>
export const SelectValue = ({ placeholder }: any) => <>{placeholder}</>
export const SelectContent = ({ children }: any) => <>{children}</>
export const SelectItem = ({ children, value, ...props }: any) => (
  <option value={value} {...props}>
    {children}
  </option>
)

export const DateInput = (props: any) => <input type="date" {...props} />
export const Button = ({ children, onClick, disabled, type = 'button', ...props }: any) => (
  <button type={type} onClick={onClick} disabled={disabled} {...props}>
    {children}
  </button>
)
export const Label = ({ children, ...props }: any) => <label {...props}>{children}</label>
export const Badge = ({ children, ...props }: any) => <span {...props}>{children}</span>

export const Card = ({ children, className, ...props }: any) => (
  <div className={className} {...props}>
    {children}
  </div>
)
export const CardHeader = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const CardTitle = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const CardDescription = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const CardContent = ({ children, ...props }: any) => <div {...props}>{children}</div>

export const Dialog = ({ children, open = true }: any) => (open ? <div>{children}</div> : null)
export const DialogContent = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const DialogHeader = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const DialogTitle = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const DialogFooter = ({ children, ...props }: any) => <div {...props}>{children}</div>

export const Table = ({ children, ...props }: any) => <table {...props}>{children}</table>
export const TableHeader = ({ children, ...props }: any) => <thead {...props}>{children}</thead>
export const TableBody = ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>
export const TableRow = ({ children, ...props }: any) => <tr {...props}>{children}</tr>
export const TableHead = ({ children, ...props }: any) => <th {...props}>{children}</th>
export const TableCell = ({ children, ...props }: any) => <td {...props}>{children}</td>

export const Checkbox = ({ checked, onCheckedChange, ...props }: any) => (
  <input type="checkbox" checked={checked} onChange={e => onCheckedChange?.(e.target.checked)} {...props} />
)
export const TooltipProvider = ({ children }: any) => <>{children}</>
export const Tooltip = ({ children }: any) => <>{children}</>
export const TooltipTrigger = ({ children }: any) => <>{children}</>
export const TooltipContent = ({ children }: any) => <div>{children}</div>

export const Avatar = ({ children }: any) => <div>{children}</div>
export const AvatarImage = ({ alt = '', ...props }: any) => <img alt={alt} {...props} />
export const AvatarFallback = ({ children }: any) => <div>{children}</div>

export const Spinner = () => <div>Loading...</div>

export const SectionHero = ({ children, title, subtitle, extra, ...props }: any) => (
  <div {...props}>
    {title && <h2>{title}</h2>}
    {subtitle && <div>{subtitle}</div>}
    {extra}
    {children}
  </div>
)

export const Tabs = ({ children, value, onValueChange, ...props }: any) => (
  <div data-value={value} onChange={() => onValueChange?.('')} {...props}>
    {children}
  </div>
)
export const TabsList = ({ children, ...props }: any) => (
  <div role="tablist" {...props}>
    {children}
  </div>
)
export const TabsTrigger = ({ children, value, ...props }: any) => (
  <button role="tab" onClick={() => props.onClick?.(value)} {...props}>
    {children}
  </button>
)
export const TabsContent = ({ children, value, ...props }: any) => (
  <div role="tabpanel" data-value={value} {...props}>
    {children}
  </div>
)

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
  Button,
  Label,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Checkbox,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  SectionHero,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
}
