import { useCallback, useEffect, useState } from 'react'
import {
  CUSTOMER_360_HOME_VIEWS,
  DEFAULT_HOME_VIEW,
  type Customer360HomeNavigateOptions,
  type Customer360HomeViewKey
} from './types'

const ATTENTION_FILTER_PARAM = 'attention'
const ATTENTION_FILTER_VALUE = 'needs-attention'

function readViewFromUrl(): Customer360HomeViewKey {
  if (globalThis.window === undefined) return DEFAULT_HOME_VIEW
  const view = new URLSearchParams(globalThis.window.location.search).get('view') || DEFAULT_HOME_VIEW
  return (CUSTOMER_360_HOME_VIEWS as readonly string[]).includes(view)
    ? (view as Customer360HomeViewKey)
    : DEFAULT_HOME_VIEW
}

export function useCustomer360HomeRoute() {
  const [activeView, setActiveView] = useState<Customer360HomeViewKey>(readViewFromUrl)

  useEffect(() => {
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.window.location.search)
    if (!params.get('view')) {
      params.set('view', activeView)
      globalThis.window.history.replaceState(null, '', `${globalThis.window.location.pathname}?${params.toString()}`)
    }
  }, []) // seed default view in URL on initial mount

  useEffect(() => {
    if (globalThis.window === undefined) return
    const onPopState = () => setActiveView(readViewFromUrl())
    globalThis.window.addEventListener('popstate', onPopState)
    return () => globalThis.window.removeEventListener('popstate', onPopState)
  }, [])

  const handleViewChange = useCallback((value: string, options?: Customer360HomeNavigateOptions) => {
    if (!(CUSTOMER_360_HOME_VIEWS as readonly string[]).includes(value)) return
    const next = value as Customer360HomeViewKey
    setActiveView(next)
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.window.location.search)
    params.set('view', next)
    if (next === 'explorer' && options?.attentionFilter) {
      params.set(ATTENTION_FILTER_PARAM, ATTENTION_FILTER_VALUE)
    } else {
      params.delete(ATTENTION_FILTER_PARAM)
    }
    globalThis.window.history.replaceState(null, '', `${globalThis.window.location.pathname}?${params.toString()}`)
  }, [])

  return { activeView, handleViewChange }
}
