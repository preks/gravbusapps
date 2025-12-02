import React from 'react'
import {
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useFormField,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { getPhosphorIcon } from '@/common/utils/phosphorIconUtils'
import * as PhosphorIcons from '@phosphor-icons/react'

type Variant = 'combobox' | 'select'

export interface CatalogSelectOption {
  value: string
  label: string
  icon?: string
}

export interface CatalogSelectProps {
  // Self-registration config props (optional - if provided, registers automatically)
  catalogIdentifier?: string // e.g. "Country:v1" - triggers auto-registration
  prefetch?: boolean // include in batch prefetch
  pageSize?: number // default 25
  parentField?: string // dependency on parent catalog
  childField?: string // bi-directional dependency
  requireSourceForEnable?: boolean // disable until source has value
  filterField?: string | Array<{ from: string; on: string }> // external filtering: "formField:catalogField" or array

  // UI props
  variant?: Variant // optional; auto-detected when using provider
  value?: string | null
  onValueChange?: (value: string) => void // ✅ Always returns empty string instead of null
  className?: string
  ['data-testid']?: string
  allowClear?: boolean // default: true
  autoSelectFirst?: boolean // auto-select first entry when value is empty and options are available

  // Pre-selected option data (from account query) - ensures immediate display without loading
  selectedOption?: CatalogSelectOption
}

import { useCatalogSelectController, CatalogSelectContext } from './CatalogSelectProvider'

// Component for truncated text with conditional tooltip (only shows tooltip if actually truncated)
const TruncatedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const textRef = React.useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = React.useState(false)

  React.useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const isTextTruncated = textRef.current.scrollWidth > textRef.current.clientWidth
        setIsTruncated(isTextTruncated)
      }
    }

    // Check after a small delay to ensure DOM is ready
    const timer = setTimeout(checkTruncation, 0)
    // Re-check on resize
    window.addEventListener('resize', checkTruncation)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkTruncation)
    }
  }, [text])

  const textSpan = (
    <span ref={textRef} className={`gba:block gba:truncate ${className || ''}`}>
      {text}
    </span>
  )

  if (!isTruncated) {
    return textSpan
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{textSpan}</TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const CatalogSelect: React.FC<CatalogSelectProps> = ({
  // Self-registration config props
  catalogIdentifier,
  prefetch,
  pageSize,
  parentField,
  childField,
  requireSourceForEnable,
  filterField,
  // UI props
  variant,
  value,
  onValueChange,
  className,
  'data-testid': dataTestId,
  selectedOption: propSelectedOption,
  allowClear = true,
  autoSelectFirst = false,
  ...props
}) => {
  // Get registration API from context
  const context = React.useContext(CatalogSelectContext)

  // Try to get form context for validation trigger (optional)
  const formContext = useFormContext()
  const formState = formContext?.formState

  // Auto-detect field name from FormField context
  let fieldName: string | undefined
  try {
    const fieldContext = useFormField()
    fieldName = fieldContext?.name
  } catch {
    // Not inside a FormField, that's ok
  }

  // Parse filterField: string "formField:catalogField" or array
  const parsedFilterField = React.useMemo(() => {
    if (!filterField) return undefined
    if (typeof filterField === 'string') {
      const [from, on] = filterField.split(':')
      return [{ from, on }]
    }
    return filterField
  }, [filterField])

  // ✅ Self-registration: Register when fieldName changes (supports dynamic fields)
  const registeredFieldNameRef = React.useRef<string | undefined>(undefined)
  React.useLayoutEffect(() => {
    // Only register if fieldName is available and has changed
    if (catalogIdentifier && context?.registerCatalog && fieldName && registeredFieldNameRef.current !== fieldName) {
      context.registerCatalog({
        id: fieldName,
        catalogIdentifier,
        prefetch,
        pageSize,
        parentField,
        childField,
        requireSourceForEnable,
        filterField: parsedFilterField
      })
      registeredFieldNameRef.current = fieldName
    }
  }, [
    fieldName,
    catalogIdentifier,
    prefetch,
    pageSize,
    parentField,
    childField,
    requireSourceForEnable,
    parsedFilterField
    // NOTE: context NOT in deps to avoid infinite loops
  ])

  // Wire up via provider
  const controller = useCatalogSelectController(fieldName || '')
  const wiredVariant = variant ?? controller?.variant ?? 'combobox'
  const wiredOptions = controller?.options ?? []
  const wiredLoading = controller?.loading ?? false
  const wiredHasMore = controller?.hasMore ?? false
  const wiredOnLoadMore = controller?.onLoadMore
  const wiredOnSearch = controller?.onSearch
  const wiredDisabled = controller?.disabled ?? false
  const wiredControllerValue = controller?.value ?? ''
  const effectiveValue = value !== undefined ? value : wiredControllerValue

  // Get selected option for icon display (prioritize propSelectedOption if value matches)
  const selectedOption = React.useMemo(() => {
    // If propSelectedOption matches current value, use it for display
    if (propSelectedOption && String(propSelectedOption.value) === String(effectiveValue)) {
      return propSelectedOption
    }
    // Otherwise, find in wiredOptions (which are already filtered by dependencies)
    return wiredOptions.find(opt => String(opt.value) === effectiveValue)
  }, [wiredOptions, effectiveValue, propSelectedOption])

  // For options list: Use wiredOptions (filtered by dependencies)
  // Add propSelectedOption only if it matches current value and is not already in wiredOptions
  // This ensures the selected value is visible even if it's not yet in the filtered list
  const mergedOptions = React.useMemo(() => {
    // If propSelectedOption matches current value and is not in wiredOptions, add it
    if (propSelectedOption && String(propSelectedOption.value) === String(effectiveValue)) {
      const existsInWired = wiredOptions.some(opt => String(opt.value) === String(propSelectedOption.value))
      if (!existsInWired) {
        return [propSelectedOption, ...wiredOptions]
      }
    }
    return wiredOptions
  }, [wiredOptions, propSelectedOption, effectiveValue])

  // Initial sync: Set controller value from form's initial value (only once on mount)
  const hasInitializedRef = React.useRef(false)
  React.useEffect(() => {
    if (!hasInitializedRef.current && controller?.setValue && effectiveValue) {
      controller.setValue(effectiveValue)
      hasInitializedRef.current = true
    }
  }, [controller, effectiveValue, fieldName])

  // Auto-select first entry when value is empty and options are available
  const hasAutoSelectedRef = React.useRef(false)
  React.useEffect(() => {
    if (
      autoSelectFirst &&
      !hasAutoSelectedRef.current &&
      !effectiveValue &&
      mergedOptions.length > 0 &&
      !wiredLoading
    ) {
      hasAutoSelectedRef.current = true
      const firstOption = mergedOptions[0]
      if (firstOption?.value) {
        const firstValue = String(firstOption.value)
        if (controller?.setValue) {
          controller.setValue(firstValue)
        }
        onValueChange?.(firstValue)
      }
    }
  }, [autoSelectFirst, effectiveValue, mergedOptions, wiredLoading, controller, onValueChange])

  // If parent passes a controlled value but provider updates internally (e.g., bi-directional auto-select),
  // sync the controlled prop back by invoking onValueChange to keep external state in sync.
  // BUT: Only sync Controller → Form, not Form → Controller (to avoid overwriting initial form values)
  const isControlled = value !== undefined
  const lastControllerValueRef = React.useRef<string>(wiredControllerValue)

  React.useEffect(() => {
    if (!isControlled || !onValueChange) return

    // Only sync if CONTROLLER changed (not if form changed)
    const ctrl = wiredControllerValue
    const lastCtrl = lastControllerValueRef.current

    // Update tracked value
    lastControllerValueRef.current = ctrl

    // Only proceed if controller actually changed
    if (ctrl === lastCtrl) return

    const controlled = value

    // Normalize both values for comparison (null vs '' are equivalent)
    const normalizedCtrl = ctrl || ''
    const normalizedControlled = controlled || ''

    if (normalizedCtrl !== normalizedControlled) {
      onValueChange(normalizedCtrl)
    }
  }, [isControlled, onValueChange, wiredControllerValue, value])
  const testId = dataTestId || `catalog-select-${fieldName}-${wiredVariant}`

  // Helper: Find nearest scrollable parent element
  const findScrollableParent = React.useCallback((element: Element | null): Element | undefined => {
    let cur: Element | null = element
    while (cur) {
      const style = globalThis.getComputedStyle(cur)
      const overflowY = style.overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return cur
      }
      cur = cur.parentElement
    }
    return undefined
  }, [])

  // Helper: Create intersection observer for load more sentinel
  const createLoadMoreObserver = React.useCallback(
    (root: Element | undefined) => {
      return new IntersectionObserver(
        entries => {
          const entry = entries[0]
          if (entry?.isIntersecting) {
            wiredOnLoadMore?.()
          }
        },
        { root }
      )
    },
    [wiredOnLoadMore]
  )

  // Do not force a no-op search; rely on prefetched options and sentinel observer
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const setSentinelRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!node || !wiredOnLoadMore || !wiredHasMore) return

      // Use dropdown viewport as root if available to get correct intersection behavior
      const parent = node.parentElement
      const root = findScrollableParent(parent)

      const obs = createLoadMoreObserver(root)
      observerRef.current = obs
      obs.observe(node)
    },
    [wiredHasMore, wiredOnLoadMore, findScrollableParent, createLoadMoreObserver]
  )

  // Render truncated text with tooltip (shared for both Combobox and Select)
  const renderTruncatedText = React.useCallback((text: string, className?: string) => {
    if (!text) return null
    return <TruncatedText text={text} className={className} />
  }, [])

  // Helper to check if icon name is valid (exists in PhosphorIcons)
  const isValidIconName = React.useCallback((iconName: string): boolean => {
    if (!iconName?.trim()) return false

    // Check if icon exists in PhosphorIcons
    if ((PhosphorIcons as any)[iconName]) return true

    // Try without "Icon" suffix
    const nameWithoutIcon = iconName.replace(/Icon$/, '')
    if ((PhosphorIcons as any)[nameWithoutIcon]) return true

    // Try case-insensitive match
    const lowerName = iconName.toLowerCase()
    const foundKey = Object.keys(PhosphorIcons).find(key => key.toLowerCase() === lowerName && /^[A-Z]/.test(key))

    return !!foundKey
  }, [])

  // Helper: Render SelectValue content with icon support
  const renderSelectValueContent = React.useCallback(() => {
    if (!selectedOption?.label) {
      return 'Select...'
    }
    const labelText =
      typeof selectedOption.label === 'string' ? selectedOption.label : String(selectedOption.label || '')
    if (selectedOption.icon && isValidIconName(selectedOption.icon)) {
      const IconComponent = getPhosphorIcon(selectedOption.icon)
      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:max-w-full">
          <IconComponent className="gba:w-4 gba:h-4 gba:flex-shrink-0" aria-label={labelText} />
          {renderTruncatedText(labelText, 'gba:flex-1 gba:min-w-0')}
        </div>
      )
    }
    return renderTruncatedText(labelText, 'gba:block')
  }, [selectedOption, isValidIconName, renderTruncatedText])

  const comboboxOptions = React.useMemo(() => {
    return mergedOptions.map(o => {
      const labelText = typeof o.label === 'string' ? o.label : String(o.label || '')
      // Only get icon if it's a valid icon name
      const IconComponent = o.icon && isValidIconName(o.icon) ? getPhosphorIcon(o.icon) : null

      return {
        value: String(o.value),
        label: (IconComponent ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:w-full">
            <IconComponent className="gba:w-4 gba:h-4 gba:flex-shrink-0" aria-label={labelText} />
            {renderTruncatedText(labelText, 'gba:flex-1 gba:min-w-0')}
          </div>
        ) : (
          renderTruncatedText(labelText, 'gba:block')
        )) as any,
        icon: o.icon
      }
    })
  }, [mergedOptions, renderTruncatedText, isValidIconName])

  // Use a stable key that doesn't change during search or loading
  const stableKey = `${fieldName}-${wiredVariant}`

  // Stable handlers for internal Combobox
  const handleLoadMore = React.useCallback(() => {
    wiredOnLoadMore?.()
  }, [wiredOnLoadMore])

  const handleSearch = React.useCallback(
    (q: string) => {
      wiredOnSearch?.(q)
    },
    [wiredOnSearch]
  )

  const handleExternalValueChange = React.useCallback(
    (v: string | null | undefined) => {
      // ✅ For React Hook Form, use empty string instead of null for string fields
      const normalized = v && v.length > 0 ? v : ''

      // Skip empty value changes if we just auto-selected
      // This prevents the Combobox/Select from resetting auto-selected values
      if (hasAutoSelectedRef.current && !normalized) {
        return
      }

      if (controller?.setValue) {
        controller.setValue(normalized)
      }
      onValueChange?.(normalized)
    },
    [controller, onValueChange]
  )

  // Trigger validation when field becomes disabled (if form context available)
  React.useEffect(() => {
    if (wiredDisabled && fieldName && formContext && formState?.isSubmitted) {
      // Trigger validation after a tick to allow value to clear first
      const timer = setTimeout(() => {
        formContext.trigger(fieldName)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [wiredDisabled, fieldName, formContext, formState?.isSubmitted])

  if (wiredVariant === 'combobox') {
    return (
      <div className="gba:w-full gba:max-w-full gba:overflow-hidden">
        <Combobox
          key={stableKey}
          className="gba:w-full gba:max-w-full gba:h-auto gba:[&_button]:max-w-full gba:[&_button]:min-w-0 gba:[&_button]:overflow-hidden gba:[&_button_span]:truncate"
          options={comboboxOptions}
          value={effectiveValue || ''}
          onValueChange={v => handleExternalValueChange(v)}
          placeholder="Select..."
          searchPlaceholder="Type to search..."
          emptyText={wiredLoading ? 'Loading...' : 'No results'}
          onSearch={handleSearch}
          searchDebounce={300}
          loading={Boolean(wiredLoading)}
          onLoadMore={handleLoadMore}
          hasMore={Boolean(wiredHasMore)}
          data-testid={testId}
          align="start"
          disabled={wiredDisabled}
          allowClear={allowClear}
          {...props}
        />
      </div>
    )
  }

  return (
    <Select
      key={stableKey}
      value={effectiveValue || ''}
      onValueChange={v => handleExternalValueChange(v)}
      disabled={wiredDisabled}
      allowClear={allowClear}
    >
      <SelectTrigger className={className ?? 'gba:w-full gba:max-w-full'} data-testid={testId} {...props}>
        <SelectValue placeholder="Select..." className="gba:max-w-full gba:overflow-hidden">
          {renderSelectValueContent()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="gba:max-h-[300px] gba:overflow-y-auto gba:min-w-0 gba:max-w-[var(--radix-select-trigger-width)]">
        {mergedOptions.map(opt => {
          // Only get icon if it's a valid icon name
          const IconComponent = opt.icon && isValidIconName(opt.icon) ? getPhosphorIcon(opt.icon) : null
          return (
            <SelectItem
              key={String(opt.value)}
              value={String(opt.value)}
              data-testid={`${testId}-item-${String(opt.value)}`}
              title={opt.label}
              className="gba:max-w-full gba:overflow-hidden"
            >
              {IconComponent ? (
                <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:max-w-full">
                  <IconComponent className="gba:w-4 gba:h-4 gba:flex-shrink-0" aria-label={opt.label} />
                  {renderTruncatedText(opt.label, 'gba:flex-1 gba:min-w-0')}
                </div>
              ) : (
                renderTruncatedText(opt.label, 'gba:block')
              )}
            </SelectItem>
          )
        })}
        {wiredHasMore ? (
          <div ref={setSentinelRef} data-testid={`${testId}-load-more-sentinel`}>
            {wiredLoading ? 'Loading...' : ''}
          </div>
        ) : null}
      </SelectContent>
    </Select>
  )
}

export default CatalogSelect
