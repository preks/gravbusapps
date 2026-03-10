import React from 'react'

type DebuggableValue = Record<string, unknown> | undefined

const DEBUG_QUERY_PARAM = 'catalogSelectDebug'

const formatDebugValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return { type: 'array', length: value.length }
  }

  if (value && typeof value === 'object') {
    return value
  }

  return value
}

export const isCatalogSelectDebugEnabled = (): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  return params.get(DEBUG_QUERY_PARAM) === '1'
}

export const getChangedDebugKeys = (previousValue: DebuggableValue, nextValue: DebuggableValue): string[] => {
  const previousEntries = previousValue ?? {}
  const nextEntries = nextValue ?? {}
  const keys = new Set([...Object.keys(previousEntries), ...Object.keys(nextEntries)])

  return Array.from(keys).filter(key => previousEntries[key] !== nextEntries[key])
}

export const logCatalogSelectDebug = (eventName: string, payload: Record<string, unknown>) => {
  if (!isCatalogSelectDebugEnabled()) return
  console.debug(`[CatalogSelectDebug] ${eventName} ${JSON.stringify(payload)}`)
}

export const getDebugCallerLabel = (): string | undefined => {
  if (!isCatalogSelectDebugEnabled()) return undefined

  const stackTrace = new Error().stack?.split('\n').map(line => line.trim()) ?? []
  const callerLine = stackTrace.find(
    line =>
      line &&
      !line.includes('catalogSelectDebug.ts') &&
      !line.includes('getDebugCallerLabel') &&
      !line.includes('logCatalogSelectDebug')
  )

  return callerLine
}

export const summarizeCatalogSelectState = (state: {
  value?: string
  loading?: boolean
  options?: Array<unknown>
  total?: number
  limit?: number
  offset?: number
  search?: string
  variant?: string
  filterSignature?: string
  manuallyCleared?: boolean
  disabled?: boolean
  hasOptions?: boolean
}) => ({
  value: state.value || '',
  loading: Boolean(state.loading),
  optionsLength: state.options?.length || 0,
  total: state.total || 0,
  limit: state.limit || 0,
  offset: state.offset || 0,
  search: state.search,
  variant: state.variant,
  filterSignature: state.filterSignature,
  manuallyCleared: Boolean(state.manuallyCleared),
  disabled: Boolean(state.disabled),
  hasOptions: Boolean(state.hasOptions)
})

export const useCatalogSelectRenderDebug = (
  componentName: string,
  fieldName: string | undefined,
  trackedValues: Record<string, unknown>
) => {
  const previousValuesRef = React.useRef<Record<string, unknown> | null>(null)

  React.useEffect(() => {
    if (!isCatalogSelectDebugEnabled()) return

    const previousValues = previousValuesRef.current
    if (!previousValues) {
      logCatalogSelectDebug('render:mount', {
        componentName,
        fieldName: fieldName || 'unknown',
        trackedValues: formatDebugValue(trackedValues)
      })
      previousValuesRef.current = trackedValues
      return
    }

    const changedKeys = getChangedDebugKeys(previousValues, trackedValues)
    if (changedKeys.length === 0) return

    logCatalogSelectDebug('render:update', {
      componentName,
      fieldName: fieldName || 'unknown',
      changedKeys,
      trackedValues: formatDebugValue(trackedValues)
    })
    previousValuesRef.current = trackedValues
  })
}
