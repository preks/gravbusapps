import React from 'react'
import { useFormField } from '@newwork/nw-design-system'
import { useFormContext, useFormState } from 'react-hook-form'
import { CatalogSelectContext } from './CatalogSelectProvider'
import { useCatalogSelectRenderDebug } from './internal/catalogSelectDebug'
import { CatalogSelectView } from './internal/CatalogSelectView'

type Variant = 'combobox' | 'select'

export interface CatalogSelectOption {
  value: string
  label: string
  code?: string
  type?: string
  icon?: string
}

export type ListFilter<T extends string = string> =
  | { mode: 'all' }
  | { mode: 'only'; values: T[] }
  | { mode: 'omit'; values: T[] }
  | { mode: 'none' }

export interface CatalogSelectConfig {
  code?: ListFilter<string>
  type?: ListFilter<string>
  orderBy?: Array<{
    field: string
    direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC_NULLS_FIRST' | 'DESC_NULLS_FIRST'
  }>
}

export interface CatalogSelectProps {
  catalogIdentifier?: string
  prefetch?: boolean
  pageSize?: number
  parentField?: string
  childField?: string
  requireSourceForEnable?: boolean
  filterField?: string | Array<{ from: string; on: string }>
  variant?: Variant
  mode?: 'default' | 'multiple' | 'tags'
  value?: string | string[] | null
  onValueChange?: (value: string | string[]) => void
  onCreateTag?: (tag: string) => void | Promise<string | void>
  className?: string
  ['data-testid']?: string
  allowClear?: boolean
  autoSelectFirst?: boolean
  disabled?: boolean
  /** @deprecated Use mode="multiple" or mode="tags" instead */
  multiple?: boolean
  selectedOption?: CatalogSelectOption
  config?: CatalogSelectConfig
}

const parseFilterField = (
  filterField?: CatalogSelectProps['filterField']
): Array<{ from: string; on: string }> | undefined => {
  if (!filterField) return undefined
  if (typeof filterField === 'string') {
    const [from, on] = filterField.split(':')
    return [{ from, on }]
  }
  return filterField
}

const CatalogSelect: React.FC<CatalogSelectProps> = ({
  catalogIdentifier,
  prefetch,
  pageSize,
  parentField,
  childField,
  requireSourceForEnable,
  filterField,
  variant,
  mode,
  value,
  onValueChange,
  onCreateTag,
  className,
  'data-testid': dataTestId,
  selectedOption,
  allowClear = true,
  autoSelectFirst = false,
  disabled = false,
  multiple,
  config,
  ...props
}) => {
  const context = React.useContext(CatalogSelectContext)
  const formMethods = useFormContext()
  const { isSubmitted } = useFormState({ control: formMethods?.control })

  let fieldName: string | undefined
  let formFieldContext: ReturnType<typeof useFormField> | undefined
  try {
    formFieldContext = useFormField()
    fieldName = formFieldContext?.name
  } catch {
    // Not inside a FormField, that's ok
  }

  const parsedFilterField = React.useMemo(() => parseFilterField(filterField), [filterField])

  const registeredFieldNameRef = React.useRef<string | undefined>(undefined)
  React.useLayoutEffect(() => {
    if (catalogIdentifier && context?.registerCatalog && fieldName && registeredFieldNameRef.current !== fieldName) {
      context.registerCatalog({
        id: fieldName,
        catalogIdentifier,
        prefetch,
        pageSize,
        parentField,
        childField,
        requireSourceForEnable,
        filterField: parsedFilterField,
        codeFilter: config?.code,
        typeFilter: config?.type,
        orderBy: config?.orderBy
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
    parsedFilterField,
    config?.code,
    config?.type,
    config?.orderBy
  ])

  useCatalogSelectRenderDebug('CatalogSelect', fieldName, {
    value: Array.isArray(value) ? value.join('|') : value || '',
    isSubmitted,
    disabled
  })

  return (
    <CatalogSelectView
      fieldName={fieldName}
      formFieldContext={formFieldContext}
      isSubmitted={isSubmitted}
      variant={variant}
      mode={mode}
      value={value}
      onValueChange={onValueChange}
      onCreateTag={onCreateTag}
      className={className}
      dataTestId={dataTestId}
      selectedOption={selectedOption}
      allowClear={allowClear && !autoSelectFirst}
      autoSelectFirst={autoSelectFirst}
      disabled={disabled}
      multiple={multiple}
      props={props}
    />
  )
}

export default CatalogSelect
