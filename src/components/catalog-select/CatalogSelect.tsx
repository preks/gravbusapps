import React from 'react'
import { Combobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

type Variant = 'combobox' | 'select'

export interface CatalogSelectProps extends Partial<BusinessAppContextProps> {
  // Required
  catalogInstanceId: string // unique instance id (e.g. "birthCountry", "residenceCountry")

  // Self-registration config props (optional - if provided, registers automatically)
  catalogIdentifier?: string // e.g. "Country:v1" - triggers auto-registration
  prefetch?: boolean // include in batch prefetch
  pageSize?: number // default 25
  parentConfigId?: string // dependency on parent catalog
  childConfigId?: string // bi-directional dependency
  requireSourceForEnable?: boolean // disable until source has value
  externalEqualsFilters?: Array<{ externalKey: string; field: string }> // external filtering

  // UI props
  variant?: Variant // optional; auto-detected when using provider
  value?: string | null
  onValueChange?: (value: string) => void // ✅ Always returns empty string instead of null
  ['data-testid']?: string
}

import { useCatalogSelectController, CatalogSelectContext } from './CatalogSelectProvider'

const CatalogSelect: React.FC<CatalogSelectProps> = ({
  catalogInstanceId,
  // Self-registration config props
  catalogIdentifier,
  prefetch,
  pageSize,
  parentConfigId,
  childConfigId,
  requireSourceForEnable,
  externalEqualsFilters,
  // UI props
  variant,
  value,
  onValueChange,
  'data-testid': dataTestId
}) => {
  // Get registration API from context
  const context = React.useContext(CatalogSelectContext)

  // ✅ Self-registration: Register ONCE on mount
  const registeredRef = React.useRef(false)
  React.useLayoutEffect(() => {
    if (!registeredRef.current && catalogIdentifier && context?.registerCatalog) {
      context.registerCatalog({
        id: catalogInstanceId,
        catalogIdentifier,
        prefetch,
        pageSize,
        parentConfigId,
        childConfigId,
        requireSourceForEnable,
        externalEqualsFilters
      })
      registeredRef.current = true
    }
  }, [
    catalogInstanceId,
    catalogIdentifier,
    prefetch,
    pageSize,
    parentConfigId,
    childConfigId,
    requireSourceForEnable,
    externalEqualsFilters
    // NOTE: context NOT in deps to avoid infinite loops
  ])

  // Wire up via provider
  const controller = useCatalogSelectController(catalogInstanceId)
  const wiredVariant = variant ?? controller?.variant ?? 'combobox'
  const wiredOptions = controller?.options ?? []
  const wiredLoading = controller?.loading ?? false
  const wiredHasMore = controller?.hasMore ?? false
  const wiredOnLoadMore = controller?.onLoadMore
  const wiredOnSearch = controller?.onSearch
  const wiredDisabled = controller?.disabled ?? false
  const wiredControllerValue = controller?.value ?? ''
  const effectiveValue = value !== undefined ? value : wiredControllerValue

  // If parent passes a controlled value but provider updates internally (e.g., bi-directional auto-select),
  // sync the controlled prop back by invoking onValueChange to keep external state in sync.
  const isControlled = value !== undefined
  React.useEffect(() => {
    if (!isControlled || !onValueChange) return

    // Simple sync: if controller and controlled values differ, notify parent
    const ctrl = wiredControllerValue
    const controlled = value

    // Normalize both values for comparison (null vs '' are equivalent)
    const normalizedCtrl = ctrl || ''
    const normalizedControlled = controlled || ''

    if (normalizedCtrl !== normalizedControlled) {
      onValueChange(normalizedCtrl)
    }
  }, [isControlled, onValueChange, wiredControllerValue, value])
  const testId = dataTestId || `catalog-select-${catalogInstanceId}-${wiredVariant}`

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
      let root: Element | undefined = undefined
      const parent = node.parentElement
      if (parent) {
        // find nearest scrollable parent
        let cur: Element | null = parent
        while (cur) {
          const style = window.getComputedStyle(cur)
          const overflowY = style.overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') {
            root = cur
            break
          }
          cur = cur.parentElement
        }
      }
      const obs = new IntersectionObserver(
        entries => {
          const entry = entries[0]
          if (entry && entry.isIntersecting) {
            wiredOnLoadMore()
          }
        },
        { root }
      )
      observerRef.current = obs
      obs.observe(node)
    },
    [wiredHasMore, wiredOnLoadMore]
  )

  const comboboxOptions = React.useMemo(() => {
    return wiredOptions.map(o => ({ value: String(o.value), label: typeof o.label === 'string' ? o.label : '' }))
  }, [wiredOptions])

  // Use a more stable key that doesn't change during search
  const stableKey = `${catalogInstanceId}-${wiredVariant}-${wiredDisabled ? 'd' : 'e'}`

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
      if (controller?.setValue) {
        controller.setValue(normalized)
      }
      onValueChange?.(normalized)
    },
    [controller, onValueChange]
  )

  // Clear value when field becomes disabled
  React.useEffect(() => {
    if (wiredDisabled && effectiveValue) {
      handleExternalValueChange('')
    }
  }, [wiredDisabled, effectiveValue, handleExternalValueChange])

  if (wiredVariant === 'combobox') {
    return (
      <Combobox
        key={stableKey}
        className="gba:w-full gba:h-auto"
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
      />
    )
  }

  return (
    <Select
      key={stableKey}
      value={effectiveValue || ''}
      onValueChange={v => handleExternalValueChange(v)}
      disabled={wiredDisabled}
    >
      <SelectTrigger className="gba:w-full" data-testid={testId}>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent className="gba:max-h-[300px] gba:overflow-y-auto">
        {wiredOptions.map(opt => (
          <SelectItem
            key={String(opt.value)}
            value={String(opt.value)}
            data-testid={`${testId}-item-${String(opt.value)}`}
          >
            {opt.label}
          </SelectItem>
        ))}
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
