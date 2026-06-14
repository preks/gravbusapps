export interface Customer360Route {
  id?: string
}

export interface Customer360RouteProps {
  id?: string
}

export function readCustomer360Route(props: Customer360RouteProps): Customer360Route {
  if (globalThis.window === undefined) {
    return { id: props.id || undefined }
  }
  const params = new URLSearchParams(globalThis.window.location.search)
  const id = props.id || params?.get('id') || undefined
  return { id }
}
