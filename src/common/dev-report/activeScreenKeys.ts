/**
 * Window-level registry of active DevReportDot screen keys.
 *
 * Each published screen is a separate bundle, so module-level state is NOT
 * shared between them. We store the set on `window` so every loaded screen
 * can see (and contribute to) the same list.
 */

const REGISTRY_KEY = '__gba_devReportActiveScreenKeys__'

function getRegistry(): Set<string> {
  const win = globalThis.window as any
  if (!win[REGISTRY_KEY]) {
    win[REGISTRY_KEY] = new Set<string>()
  }
  return win[REGISTRY_KEY]
}

export function registerScreenKey(screenKey: string): void {
  getRegistry().add(screenKey)
}

export function unregisterScreenKey(screenKey: string): void {
  getRegistry().delete(screenKey)
}

export function getActiveScreenKeys(): string[] {
  return Array.from(getRegistry()).sort()
}
