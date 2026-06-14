import React, { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { readCustomer360Route, type Customer360Route } from './app/customer360Route'
import Customer360Home from './home/Customer360Home'
import Customer360Record from './record/Customer360Record'

interface Customer360Props extends BusinessAppContextProps {
  id?: string
}

const RECORD_QUERY_PARAMS = ['id', 'tab']

/**
 * Top-level Customer360 router. With no `?id` it renders the portfolio Home
 * product; with an `?id` it renders the 360° detail. A popstate listener keeps
 * the two in sync so browser back/forward and in-app navigation both work.
 */
const Customer360: React.FC<Customer360Props> = props => {
  const [route, setRoute] = useState<Customer360Route>(() => readCustomer360Route(props))

  useEffect(() => {
    if (globalThis.window === undefined) return
    const onPopState = () => setRoute(readCustomer360Route(props))
    globalThis.window.addEventListener('popstate', onPopState)
    return () => globalThis.window.removeEventListener('popstate', onPopState)
  }, [props.id])

  const openCustomer = useCallback((id: string) => {
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.window.location.search)
    params.set('id', id)
    params.set('tab', 'overview')
    globalThis.window.history.pushState(null, '', `${globalThis.window.location.pathname}?${params.toString()}`)
    setRoute({ id })
  }, [])

  const closeCustomer = useCallback(() => {
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.window.location.search)
    RECORD_QUERY_PARAMS.forEach(param => params.delete(param))
    const search = params.toString()
    globalThis.window.history.replaceState(
      null,
      '',
      search ? `${globalThis.window.location.pathname}?${search}` : globalThis.window.location.pathname
    )
    setRoute({})
  }, [])

  if (!route.id) {
    return <Customer360Home {...props} openCustomer={openCustomer} />
  }

  return <Customer360Record {...props} subjectId={route.id} onBack={closeCustomer} />
}

export { Customer360 }
export type { Customer360Props }

export default Customer360
