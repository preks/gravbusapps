/**
 * Rollup `external` predicate for remote screen CJS builds.
 * Contract: `@newwork/remote-component-loader/remoteVendorManifest` (generated from bootstrap).
 * Local rules only: bundle @newwork/nw-design-system and @newwork/icons into the remote chunk.
 *
 * Host resolves externals via `window.require` (installDependenciesBootstrap); CJS build does not use Rollup `output.globals`.
 */
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const fallbackRemoteVendors = [
  '@ant-design/icons',
  '@dnd-kit/core',
  '@dnd-kit/sortable',
  '@dnd-kit/utilities',
  '@newwork/gravity-ui-catalog',
  '@phosphor-icons/react',
  '@remixicon/react',
  'antd',
  'class-variance-authority',
  'clsx',
  'lucide-react',
  'react',
  'react-dom',
  'react-i18next',
  'react-icons',
  'tailwind-merge',
  'zustand'
]

const manualRemoteVendor = ['@graphiql/plugin-explorer', '@graphiql/react', 'graphiql', 'graphql']

function isManualRemoteVendor(moduleId: string): boolean {
  return manualRemoteVendor.some(vendor => moduleId === vendor || moduleId.startsWith(`${vendor}/`))
}

function fallbackIsRemoteVendorExternal(moduleId: string): boolean {
  return fallbackRemoteVendors.some(vendor => moduleId === vendor || moduleId.startsWith(`${vendor}/`))
}

let isRemoteVendorExternal: (moduleId: string) => boolean = fallbackIsRemoteVendorExternal

try {
  const remoteVendorManifestModule = require('@newwork/remote-component-loader/remoteVendorManifest') as {
    isRemoteVendorExternal?: (moduleId: string) => boolean
  }

  if (typeof remoteVendorManifestModule.isRemoteVendorExternal === 'function') {
    isRemoteVendorExternal = remoteVendorManifestModule.isRemoteVendorExternal
  }
} catch {
  isRemoteVendorExternal = fallbackIsRemoteVendorExternal
}

function stripQuery(id: string): string {
  const q = id.indexOf('?')
  return q === -1 ? id : id.slice(0, q)
}

/** Bare specifier or path after …/node_modules/ (POSIX slashes). */
function moduleSpecifierFromResolvedId(resolvedId: string): string | null {
  const id = stripQuery(resolvedId).replace(/\\/g, '/')
  const key = '/node_modules/'
  const idx = id.lastIndexOf(key)
  if (idx === -1) {
    if (id.startsWith('@/')) return null
    if (id.startsWith('./') || id.startsWith('../')) return null
    if (path.isAbsolute(id)) return null
    return id
  }
  return id.slice(idx + key.length)
}

/**
 * Returns true when the dependency must not be bundled into the remote `index.js`
 * because the host loads it once via remote-deps / installDependenciesBootstrap.
 */
export function isRemoteBundleExternal(rawId: string): boolean {
  const id = stripQuery(rawId).replace(/\\/g, '/')
  if (!id || id.startsWith('\0') || id.startsWith('virtual:')) return false
  if (isManualRemoteVendor(rawId) || isManualRemoteVendor(id)) return true
  if (id.startsWith('@/')) return false
  if ((id.startsWith('./') || id.startsWith('../') || path.isAbsolute(id)) && !id.includes('node_modules')) {
    return false
  }

  if (id.includes('node_modules/@newwork/nw-design-system') || id.includes('/@newwork/nw-design-system')) {
    return false
  }
  if (id.includes('node_modules/@newwork/icons') || id.includes('/@newwork/icons')) {
    return false
  }

  const spec = moduleSpecifierFromResolvedId(id)
  if (spec) {
    if (isManualRemoteVendor(spec)) return true
    return isRemoteVendorExternal(spec)
  }

  if (!spec && (isRemoteVendorExternal(rawId) || isRemoteVendorExternal(id))) return true

  return false
}
