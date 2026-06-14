import { useCallback, useEffect, useState } from 'react'

export const CUSTOMER_360_TABS = [
  'overview',
  'contracts',
  'service-tickets',
  'service-cases',
  'transactions-fibu',
  'invoices',
  'journal',
  'agent'
] as const

export type Customer360TabKey = (typeof CUSTOMER_360_TABS)[number]

const DEFAULT_TAB: Customer360TabKey = 'overview'

function isCustomer360Tab(value: string): value is Customer360TabKey {
  return (CUSTOMER_360_TABS as readonly string[]).includes(value)
}

function readTabFromUrl(): Customer360TabKey {
  if (globalThis.window === undefined) return DEFAULT_TAB
  const tab = new URLSearchParams(globalThis.window.location.search).get('tab') || DEFAULT_TAB
  return isCustomer360Tab(tab) ? tab : DEFAULT_TAB
}

export function useCustomer360RecordRoute() {
  const [activeTab, setActiveTab] = useState<Customer360TabKey>(readTabFromUrl)

  useEffect(() => {
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.window.location.search)
    if (!params.get('tab')) {
      params.set('tab', activeTab)
      globalThis.window.history.replaceState(null, '', `${globalThis.window.location.pathname}?${params.toString()}`)
    }
  }, []) // seed default tab in URL on initial mount

  useEffect(() => {
    if (globalThis.window === undefined) return
    const onPopState = () => setActiveTab(readTabFromUrl())
    globalThis.window.addEventListener('popstate', onPopState)
    return () => globalThis.window.removeEventListener('popstate', onPopState)
  }, [])

  const handleTabChange = useCallback((value: string) => {
    if (!isCustomer360Tab(value)) return
    setActiveTab(value)
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.window.location.search)
    params.set('tab', value)
    globalThis.window.history.replaceState(null, '', `${globalThis.window.location.pathname}?${params.toString()}`)
  }, [])

  return { activeTab, handleTabChange }
}
