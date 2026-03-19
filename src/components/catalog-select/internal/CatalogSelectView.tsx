import React from 'react'
import { Combobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import type { CatalogSelectOption, CatalogSelectProps } from '../CatalogSelect'
import { useCatalogSelectController } from '../CatalogSelectProvider'
import { useCatalogSelectRenderDebug } from './catalogSelectDebug'
import { renderCatalogSelectOptionLabel } from './catalogSelectOptionLabel'

type Variant = 'combobox' | 'select'

/** Context from useFormField() when CatalogSelect is used inside FormField; applied to trigger for validation/ARIA. */
export type FormFieldContextValue = {
  ref?: React.Ref<unknown>
  id?: string
  invalid?: boolean
  error?: { id?: string }
}

export type CatalogSelectViewProps = {
  fieldName?: string
  formFieldContext?: FormFieldContextValue
  isSubmitted?: boolean
  variant?: Variant
  mode?: CatalogSelectProps['mode']
  value?: CatalogSelectProps['value']
  onValueChange?: CatalogSelectProps['onValueChange']
  onCreateTag?: CatalogSelectProps['onCreateTag']
  className?: string
  dataTestId?: string
  selectedOption?: CatalogSelectOption
  allowClear?: boolean
  autoSelectFirst?: boolean
  disabled?: boolean
  multiple?: boolean
  props: Record<string, unknown>
}

export const CatalogSelectView = React.memo(
  ({
    fieldName,
    formFieldContext,
    isSubmitted = false,
    variant,
    mode: propMode,
    value,
    onValueChange,
    onCreateTag,
    className,
    dataTestId,
    selectedOption: propSelectedOption,
    allowClear = true,
    autoSelectFirst = false,
    disabled: propDisabled = false,
    multiple,
    props
  }: CatalogSelectViewProps) => {
    const formMethods = useFormContext()
    const [localCreatedOptions, setLocalCreatedOptions] = React.useState<CatalogSelectOption[]>([])

    const controller = useCatalogSelectController(fieldName || '')
    const mode = propMode ?? (multiple ? 'multiple' : 'default')
    const baseVariant = variant ?? controller?.variant ?? 'combobox'
    const wiredVariant = mode !== 'default' ? 'combobox' : baseVariant
    const wiredOptions = controller?.options ?? []
    const wiredLoading = controller?.loading ?? false
    const wiredHasMore = controller?.hasMore ?? false
    const wiredOnLoadMore = controller?.onLoadMore
    const wiredOnSearch = controller?.onSearch
    const wiredDisabled = propDisabled || (controller?.disabled ?? false)
    const wiredControllerValue = controller?.value ?? ''
    const isControlled = value !== undefined

    const triggerFormProps = formFieldContext
      ? {
          ref: formFieldContext.ref,
          id: formFieldContext.id,
          'aria-invalid': !!formFieldContext.invalid,
          'aria-describedby': formFieldContext.error?.id
        }
      : {}

    const effectiveValue = React.useMemo(() => {
      if (value === undefined) {
        return mode !== 'default' ? [] : wiredControllerValue || ''
      }
      if (mode !== 'default') {
        return Array.isArray(value) ? value : value ? [value] : []
      }
      return Array.isArray(value) ? value[0] || '' : value || ''
    }, [value, mode, wiredControllerValue])

    const latestTagsValueRef = React.useRef<string[]>([])
    latestTagsValueRef.current = Array.isArray(effectiveValue) ? effectiveValue : []

    const mergedOptions = React.useMemo(() => {
      if (mode !== 'default') return wiredOptions
      if (propSelectedOption && String(propSelectedOption.value) === String(effectiveValue)) {
        const existsInWired = wiredOptions.some(option => String(option.value) === String(propSelectedOption.value))
        if (!existsInWired) return [propSelectedOption, ...wiredOptions]
      }
      return wiredOptions
    }, [mode, wiredOptions, effectiveValue, propSelectedOption, localCreatedOptions])

    useCatalogSelectRenderDebug('CatalogSelectView', fieldName, {
      value: Array.isArray(value) ? value.join('|') : value || '',
      isSubmitted,
      wiredControllerValue,
      wiredLoading,
      wiredDisabled,
      wiredVariant,
      wiredOptionsLength: wiredOptions.length,
      mergedOptionsLength: mergedOptions.length,
      isControlled,
      mode: propMode ?? (multiple ? 'multiple' : 'default')
    })

    React.useEffect(() => {
      if (wiredDisabled && fieldName && formMethods && isSubmitted) {
        void formMethods.trigger(fieldName)
      }
    }, [fieldName, formMethods, isSubmitted, wiredDisabled])

    const hasInitializedRef = React.useRef(false)
    React.useEffect(() => {
      if (!isControlled && !hasInitializedRef.current && controller?.setValue && mode === 'default') {
        const singleValue = Array.isArray(effectiveValue) ? effectiveValue[0] : effectiveValue
        if (singleValue) {
          controller.setValue(String(singleValue))
          hasInitializedRef.current = true
        }
      }
    }, [controller, effectiveValue, isControlled, mode])

    const hasAutoSelectedRef = React.useRef(false)
    const autoSelectScopeRef = React.useRef<string | null>(null)
    const currentAutoSelectScope = controller?.filterSignature || 'unfiltered'

    React.useEffect(() => {
      if (mode !== 'default' || !autoSelectFirst) return
      if (!effectiveValue && mergedOptions.length === 0) {
        hasAutoSelectedRef.current = false
        autoSelectScopeRef.current = null
      }
    }, [mode, autoSelectFirst, effectiveValue, mergedOptions.length])

    React.useEffect(() => {
      if (
        mode === 'default' &&
        autoSelectFirst &&
        !hasAutoSelectedRef.current &&
        autoSelectScopeRef.current !== currentAutoSelectScope &&
        !effectiveValue &&
        mergedOptions.length > 0 &&
        !wiredLoading &&
        !wiredDisabled
      ) {
        hasAutoSelectedRef.current = true
        autoSelectScopeRef.current = currentAutoSelectScope
        const firstOption = mergedOptions[0]
        if (firstOption?.value) {
          const firstValue = String(firstOption.value)
          if (isControlled) {
            onValueChange?.(firstValue)
          } else {
            controller?.setValue?.(firstValue)
            onValueChange?.(firstValue)
          }
        }
      }
    }, [
      mode,
      autoSelectFirst,
      effectiveValue,
      mergedOptions,
      currentAutoSelectScope,
      wiredLoading,
      wiredDisabled,
      controller,
      isControlled,
      onValueChange
    ])

    const lastControllerValueRef = React.useRef<string>(wiredControllerValue)
    React.useEffect(() => {
      if (!isControlled || !onValueChange || mode !== 'default') return
      const lastControllerValue = lastControllerValueRef.current
      lastControllerValueRef.current = wiredControllerValue
      if (wiredControllerValue === lastControllerValue) return

      const normalizedControllerValue = wiredControllerValue || ''
      const normalizedControlledValue = Array.isArray(value) ? value[0] || '' : value || ''
      if (normalizedControllerValue !== normalizedControlledValue) {
        onValueChange(normalizedControllerValue)
      }
    }, [isControlled, onValueChange, wiredControllerValue, value, mode])

    const testId = dataTestId || `catalog-select-${fieldName}-${wiredVariant}`

    const handleExternalValueChange = React.useCallback(
      (nextValue: string | string[] | null | undefined) => {
        if (mode !== 'default') {
          onValueChange?.(Array.isArray(nextValue) ? nextValue : [])
          return
        }

        const normalizedValue = nextValue && typeof nextValue === 'string' && nextValue.length > 0 ? nextValue : ''

        if (hasAutoSelectedRef.current && !normalizedValue) return
        if (!isControlled) {
          controller?.setValue?.(normalizedValue)
        }
        onValueChange?.(normalizedValue)
      },
      [controller, isControlled, onValueChange, mode]
    )

    const comboboxOptions = React.useMemo(
      () =>
        mergedOptions.map(option => ({
          value: String(option.value),
          label: renderCatalogSelectOptionLabel(
            typeof option.label === 'string' ? option.label : String(option.label || ''),
            option.icon,
            'gba:block'
          ) as any,
          icon: option.icon
        })),
      [mergedOptions]
    )

    const selectedLabelCacheRef = React.useRef<Record<string, string>>({})
    React.useEffect(() => {
      if (mergedOptions.length === 0) return

      for (const option of mergedOptions) {
        const optionValue = String(option.value)
        const optionLabel = typeof option.label === 'string' ? option.label : String(option.label || option.value)
        selectedLabelCacheRef.current[optionValue] = optionLabel
      }
    }, [mergedOptions])

    const selectedLabelsSignature = React.useMemo(() => {
      const selectedValues =
        mode !== 'default'
          ? Array.isArray(effectiveValue)
            ? effectiveValue
            : []
          : effectiveValue
            ? [String(effectiveValue)]
            : []
      if (selectedValues.length === 0) return 'empty'

      const labelByValue = new Map(
        mergedOptions.map(option => [String(option.value), String(option.label || option.value)])
      )

      return selectedValues
        .map(selectedValue => {
          const resolvedLabel =
            labelByValue.get(selectedValue) || selectedLabelCacheRef.current[selectedValue] || selectedValue
          return `${selectedValue}:${resolvedLabel}`
        })
        .join('|')
    }, [effectiveValue, mergedOptions, mode])

    const findScrollableParent = React.useCallback((element: Element | null): Element | undefined => {
      let currentElement: Element | null = element
      while (currentElement) {
        const { overflowY } = globalThis.getComputedStyle(currentElement)
        if (overflowY === 'auto' || overflowY === 'scroll') return currentElement
        currentElement = currentElement.parentElement
      }
      return undefined
    }, [])

    const observerRef = React.useRef<IntersectionObserver | null>(null)
    const setSentinelRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        observerRef.current?.disconnect()
        observerRef.current = null
        if (!node || !wiredOnLoadMore || !wiredHasMore) return

        const root = findScrollableParent(node.parentElement)
        const observer = new IntersectionObserver(
          entries => {
            if (entries[0]?.isIntersecting) wiredOnLoadMore()
          },
          { root }
        )

        observerRef.current = observer
        observer.observe(node)
      },
      [wiredHasMore, wiredOnLoadMore, findScrollableParent]
    )

    const stableKey = `${fieldName}-${wiredVariant}-${selectedLabelsSignature}`

    if (wiredVariant === 'combobox') {
      const baseProps = {
        ...triggerFormProps,
        className:
          'gba:w-full gba:max-w-full gba:h-auto gba:[&_button]:max-w-full gba:[&_button]:min-w-0 gba:[&_button]:overflow-hidden gba:[&_button_span]:truncate',
        options: comboboxOptions,
        placeholder: 'Select...',
        searchPlaceholder: 'Type to search...',
        emptyText: wiredLoading ? 'Loading...' : 'No results',
        ...(wiredOnSearch ? { onSearch: wiredOnSearch, searchDebounce: 300 } : {}),
        loading: Boolean(wiredLoading),
        onLoadMore: wiredOnLoadMore,
        hasMore: Boolean(wiredHasMore),
        'data-testid': testId,
        align: 'start' as const,
        disabled: wiredDisabled,
        showClearButton: allowClear
      }

      if (mode === 'tags') {
        if (!onCreateTag) throw new Error('onCreateTag is required when mode="tags"')
        const tagsValue: string[] = Array.isArray(effectiveValue) ? effectiveValue : []

        const handleCreateTag = (tag: string): void => {
          const normalizedTag = tag.trim()
          if (!normalizedTag) return

          const result = onCreateTag(normalizedTag)

          setLocalCreatedOptions(previousOptions =>
            previousOptions.some(option => option.value === normalizedTag)
              ? previousOptions
              : [...previousOptions, { value: normalizedTag, label: normalizedTag }]
          )

          const currentValues = latestTagsValueRef.current
          if (!currentValues.includes(normalizedTag)) {
            handleExternalValueChange([...currentValues, normalizedTag])
          }

          if (!(result instanceof Promise)) return

          result
            .then(newId => {
              if (newId && typeof newId === 'string' && newId !== normalizedTag) {
                setLocalCreatedOptions(previousOptions => [
                  ...previousOptions.filter(option => option.value !== normalizedTag),
                  { value: newId, label: normalizedTag }
                ])
                handleExternalValueChange(
                  latestTagsValueRef.current.map(currentValue =>
                    currentValue === normalizedTag ? newId : currentValue
                  )
                )
              }
            })
            .catch(error => {
              console.error('Error creating tag:', error)
              setLocalCreatedOptions(previousOptions =>
                previousOptions.filter(option => option.value !== normalizedTag)
              )
              handleExternalValueChange(
                latestTagsValueRef.current.filter(currentValue => currentValue !== normalizedTag)
              )
            })
        }

        return (
          <div className={`gba:w-full gba:max-w-full gba:overflow-hidden ${className || ''}`}>
            <Combobox
              key={stableKey}
              {...baseProps}
              mode="tags"
              value={tagsValue}
              createdOptions={localCreatedOptions}
              onValueChange={(nextValue: string[]) => handleExternalValueChange(nextValue)}
              onCreateTag={handleCreateTag}
            />
          </div>
        )
      }

      if (mode === 'multiple') {
        const multipleValue: string[] = Array.isArray(effectiveValue) ? effectiveValue : []
        return (
          <div className={`gba:w-full gba:max-w-full gba:overflow-hidden ${className || ''}`}>
            <Combobox
              key={stableKey}
              {...baseProps}
              mode="multiple"
              value={multipleValue}
              onValueChange={(nextValue: string[]) => handleExternalValueChange(nextValue)}
            />
          </div>
        )
      }

      const defaultValue: string = Array.isArray(effectiveValue) ? effectiveValue[0] || '' : effectiveValue || ''
      return (
        <div className={`gba:w-full gba:max-w-full gba:overflow-hidden ${className || ''}`}>
          <Combobox
            key={stableKey}
            {...baseProps}
            mode="default"
            value={defaultValue}
            onValueChange={(nextValue: string) => handleExternalValueChange(nextValue)}
          />
        </div>
      )
    }

    const selectValue = Array.isArray(effectiveValue) ? effectiveValue[0] || '' : effectiveValue || ''
    const singleOption = mergedOptions.find(option => String(option.value) === String(selectValue))
    const cachedSingleOptionLabel = selectValue ? selectedLabelCacheRef.current[selectValue] : undefined

    return (
      <Select
        key={stableKey}
        value={selectValue}
        onValueChange={(nextValue: string) => handleExternalValueChange(nextValue)}
        disabled={wiredDisabled}
        showClearButton={allowClear}
      >
        <SelectTrigger
          className={`gba:w-full gba:max-w-full ${className || ''}`}
          data-testid={testId}
          {...triggerFormProps}
          {...props}
        >
          <SelectValue placeholder="Select..." className="gba:max-w-full gba:overflow-hidden">
            {singleOption?.label
              ? renderCatalogSelectOptionLabel(
                  typeof singleOption.label === 'string' ? singleOption.label : String(singleOption.label),
                  singleOption.icon,
                  'gba:block'
                )
              : cachedSingleOptionLabel
                ? renderCatalogSelectOptionLabel(cachedSingleOptionLabel, undefined, 'gba:block')
                : 'Select...'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="gba:max-h-[300px] gba:overflow-y-auto gba:min-w-0 gba:max-w-[var(--radix-select-trigger-width)]">
          {mergedOptions.map(option => (
            <SelectItem
              key={String(option.value)}
              value={String(option.value)}
              data-testid={`${testId}-item-${String(option.value)}`}
              title={option.label}
              className="gba:max-w-full gba:overflow-hidden"
            >
              {renderCatalogSelectOptionLabel(option.label, option.icon, 'gba:block')}
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
)
