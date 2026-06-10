const LOCAL_DEVTOOLS_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export const isLocalEveryFabricDevToolsHost = (): boolean => {
  if (globalThis.location === undefined) return false
  return LOCAL_DEVTOOLS_HOSTS.has(globalThis.location.hostname)
}

export const isEveryFabricDevToolsEnabled = (featureValue: boolean | undefined): boolean =>
  featureValue === true || isLocalEveryFabricDevToolsHost()
