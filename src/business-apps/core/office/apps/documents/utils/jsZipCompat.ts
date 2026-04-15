// Normalizes JSZip module resolution for browser bundles.

import JSZipModule from 'jszip'

type JSZipConstructor = typeof JSZipModule

function isJsZipConstructor(value: unknown): value is JSZipConstructor {
  return typeof value === 'function' && typeof (value as { loadAsync?: unknown }).loadAsync === 'function'
}

export function resolveJsZipConstructor(moduleValue: unknown): JSZipConstructor {
  if (isJsZipConstructor(moduleValue)) {
    return moduleValue
  }

  const defaultExport = (moduleValue as { default?: unknown } | null)?.default
  if (isJsZipConstructor(defaultExport)) {
    return defaultExport
  }

  throw new TypeError('[documents] JSZip module did not resolve to a constructor')
}

export const JSZipCompat = resolveJsZipConstructor(JSZipModule)

export function createJSZip(): InstanceType<JSZipConstructor> {
  return new JSZipCompat()
}
