/**
 * Mock for @newwork/nw-design-system
 * Used in Jest tests to avoid ES module parsing issues
 */
import React from 'react'

export const LocalizationProvider = ({ children }: any) => <div>{children}</div>

let mockLocale = 'en-US'
const mockLocaleListeners = new Set<() => void>()

const subscribeMockLocale = (onStoreChange: () => void) => {
  mockLocaleListeners.add(onStoreChange)
  return () => {
    mockLocaleListeners.delete(onStoreChange)
  }
}

const getMockLocaleSnapshot = () => mockLocale

export const useLocale = () => {
  const locale = React.useSyncExternalStore(subscribeMockLocale, getMockLocaleSnapshot, getMockLocaleSnapshot)

  return {
    locale,
    setLocale: (nextLocale: string) => {
      mockLocale = nextLocale
      mockLocaleListeners.forEach(listener => listener())
    },
    dateFnsLocale: undefined,
    dateTimeFormat: new Intl.DateTimeFormat(locale)
  }
}

export const resetMockLocale = () => {
  mockLocale = 'en-US'
  mockLocaleListeners.forEach(listener => listener())
}

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

export const SelectItem = ({ children, value, ...props }: any) => (
  <option value={value} {...props}>
    {children}
  </option>
)

const flattenSelectChildren = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement(child)) return []
    const childType = child.type as any
    if (childType === SelectItem) return [child]
    return flattenSelectChildren(child.props?.children)
  })

export const SelectTrigger = ({ children }: any) => <>{children}</>

function extractSelectTriggerProps(children: React.ReactNode): Record<string, unknown> {
  let rest: Record<string, unknown> = {}
  const walk = (node: React.ReactNode): void => {
    React.Children.forEach(node, child => {
      if (!React.isValidElement(child)) return
      if (child.type === SelectTrigger) {
        const p = { ...(child.props as any) }
        delete p.children
        rest = p
        return
      }
      walk((child.props as any)?.children)
    })
  }
  walk(children)
  return rest
}

export const Input = React.forwardRef((props: any, ref) => <input ref={ref as any} {...props} />)
export const Textarea = React.forwardRef((props: any, ref) => <textarea ref={ref as any} {...props} />)

export const SelectValue = ({ placeholder }: any) => <>{placeholder}</>
export const SelectContent = ({ children }: any) => <>{children}</>

export const Select = ({ children, value, onValueChange, ...props }: any) => {
  const triggerProps = extractSelectTriggerProps(children)
  return (
    <select value={value} onChange={e => onValueChange?.(e.target.value)} {...triggerProps} {...props}>
      {flattenSelectChildren(children)}
    </select>
  )
}

export const DateInput = (props: any) => <input type="date" {...props} />
export const Button = ({ children, onClick, disabled, type = 'button', asChild, ...props }: any) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, ...children.props })
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}

export const Separator = (props: any) => <hr {...props} />
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

// Chart primitives — render children so recharts trees mount under jsdom.
export const ChartContainer = ({ children, className, ...props }: any) => (
  <div className={className} {...props}>
    {children}
  </div>
)
export const ChartTooltip = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const ChartTooltipContent = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const ChartLegend = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const ChartLegendContent = ({ children, ...props }: any) => <div {...props}>{children}</div>

export const Dialog = ({ children, open = true }: any) => (open ? <div>{children}</div> : null)
export const DialogContent = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const DialogHeader = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const DialogTitle = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const DialogDescription = ({ children, ...props }: any) => <div {...props}>{children}</div>
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
export const Switch = ({ checked, onCheckedChange, ...props }: any) => (
  <input type="checkbox" checked={checked} onChange={e => onCheckedChange?.(e.target.checked)} {...props} />
)
export const TooltipProvider = ({ children }: any) => <>{children}</>
export const Tooltip = ({ children }: any) => <>{children}</>
export const TooltipTrigger = ({ children }: any) => <>{children}</>
export const TooltipContent = ({ children }: any) => <div>{children}</div>

export const Avatar = ({ children }: any) => <div>{children}</div>
export const AvatarImage = ({ alt = '', ...props }: any) => <img alt={alt} {...props} />
export const AvatarFallback = ({ children }: any) => <div>{children}</div>
export const IconAvatar = ({ label, ...props }: any) => <div aria-label={label} {...props} />

export const Alert = ({ children, ...props }: any) => <div {...props}>{children}</div>
export const AlertDescription = ({ children, ...props }: any) => <div {...props}>{children}</div>

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
export const TabNav = ({ children, showBorder, orientation, verticalIndicatorSide, ...props }: any) => {
  // Strip styling-only props so they never reach the DOM in tests.
  void showBorder
  void orientation
  void verticalIndicatorSide
  return (
    <div role="tablist" {...props}>
      {children}
    </div>
  )
}
export const TabNavLink = ({ children, active, href, startIcon, endAdornment, ...props }: any) => (
  <a role="tab" aria-selected={active} href={href} {...props}>
    {startIcon}
    {children}
    {endAdornment}
  </a>
)
export const TabsBadge = ({ children, ...props }: any) => <span {...props}>{children}</span>

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
  Separator,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DateInput,
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
  DialogDescription,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Checkbox,
  Switch,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  Alert,
  AlertDescription,
  Spinner,
  SectionHero,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabNav,
  TabNavLink,
  TabsBadge
}
