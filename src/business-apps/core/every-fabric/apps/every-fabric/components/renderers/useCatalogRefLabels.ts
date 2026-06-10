import { useEffect, useMemo, useState } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import {
  formatPermissionValue,
  type PresentedPermissionAction,
  type PresentedPermissionField
} from './toolPermissionPresenter'

// Catalog refs are stored as ``<Catalog>:v<N>:<CODE>`` (e.g. ``Country:v1:DE``,
// ``AssetCategory:v1:LAPTOP``). FlowBot keeps the raw key as the field value and
// only inlines key->label options for *small* catalogs, so large catalogs (e.g.
// Country) surface the raw key in the approval card. This resolver looks the key
// up against the catalog API so the card can show the friendly label generically
// for any catalog ref, not a hardcoded per-catalog list.
const CATALOG_REF_PATTERN = /^([A-Za-z][A-Za-z0-9_]*):v(\d+):(.+)$/

export interface ParsedCatalogRef {
  raw: string
  catalogIdentifier: string
  version: string
  code: string
}

export const parseCatalogRef = (value: unknown): ParsedCatalogRef | null => {
  if (typeof value !== 'string') return null
  const match = CATALOG_REF_PATTERN.exec(value)
  if (!match) return null
  return { raw: value, catalogIdentifier: match[1], version: `v${match[2]}`, code: match[3] }
}

const eachField = (actions: PresentedPermissionAction[], visit: (field: PresentedPermissionField) => void): void => {
  for (const action of actions) {
    action.visibleFields.forEach(visit)
    action.technicalFields.forEach(visit)
  }
}

export const collectCatalogRefs = (actions: PresentedPermissionAction[]): ParsedCatalogRef[] => {
  const refs = new Map<string, ParsedCatalogRef>()
  eachField(actions, field => {
    // A field already resolved by the presenter (inline option label) is skipped.
    if (field.displayValue) return
    const ref = parseCatalogRef(field.value)
    if (ref) refs.set(ref.raw, ref)
  })
  return Array.from(refs.values())
}

// Inject the resolved label as ``displayValue`` so the existing renderer shows it
// without changing how the underlying value is submitted on approval/edit.
export const applyCatalogLabel = (
  field: PresentedPermissionField,
  labels: Map<string, string>
): PresentedPermissionField => {
  if (field.displayValue) return field
  const label = labels.get(formatPermissionValue(field.value))
  return label ? { ...field, displayValue: label } : field
}

export const applyCatalogLabels = (
  actions: PresentedPermissionAction[],
  labels: Map<string, string>
): PresentedPermissionAction[] => {
  if (labels.size === 0) return actions
  return actions.map(action => ({
    ...action,
    visibleFields: action.visibleFields.map(field => applyCatalogLabel(field, labels)),
    technicalFields: action.technicalFields.map(field => applyCatalogLabel(field, labels))
  }))
}

// Shared across cards/renders so each catalog is fetched at most once per session.
const catalogCache = new Map<string, Promise<Map<string, string>>>()

const flattenEntries = (entries: CatalogEntry[] | undefined, into: Map<string, string>): void => {
  for (const entry of entries ?? []) {
    if (entry.code && entry.value) into.set(entry.code, entry.value)
    if (entry.children?.length) flattenEntries(entry.children, into)
  }
}

type CatalogClient = ReturnType<typeof useCatalogManagerClient>

const loadCatalog = (
  client: CatalogClient,
  catalogIdentifier: string,
  version: string
): Promise<Map<string, string>> => {
  const cacheKey = `${catalogIdentifier}:${version}`
  const cached = catalogCache.get(cacheKey)
  if (cached) return cached

  const promise = client
    .getCatalogEntriesList({ catalogIdentifier, version }, { limit: 1000, includeChildCatalogEntries: true })
    .then(response => {
      const codeToLabel = new Map<string, string>()
      flattenEntries(response.data, codeToLabel)
      return codeToLabel
    })
    .catch(error => {
      // Drop the failed promise so a later render can retry the lookup.
      catalogCache.delete(cacheKey)
      throw error
    })

  catalogCache.set(cacheKey, promise)
  return promise
}

export const useCatalogRefLabels = (
  actions: PresentedPermissionAction[],
  accessToken?: string
): Map<string, string> => {
  const client = useCatalogManagerClient(accessToken)
  const [labels, setLabels] = useState<Map<string, string>>(() => new Map())

  const refs = useMemo(() => collectCatalogRefs(actions), [actions])
  // Stable dependency so the effect only re-runs when the set of refs changes.
  const refsKey = useMemo(
    () =>
      refs
        .map(ref => ref.raw)
        .sort()
        .join('|'),
    [refs]
  )

  useEffect(() => {
    if (!accessToken || refs.length === 0) return

    let cancelled = false
    const resolve = async () => {
      const byCatalog = new Map<string, ParsedCatalogRef[]>()
      for (const ref of refs) {
        const key = `${ref.catalogIdentifier}:${ref.version}`
        const group = byCatalog.get(key)
        if (group) group.push(ref)
        else byCatalog.set(key, [ref])
      }

      const resolved = new Map<string, string>()
      await Promise.all(
        Array.from(byCatalog.values()).map(async group => {
          try {
            const codeToLabel = await loadCatalog(client, group[0].catalogIdentifier, group[0].version)
            for (const ref of group) {
              const label = codeToLabel.get(ref.code) ?? codeToLabel.get(ref.code.toUpperCase())
              if (label) resolved.set(ref.raw, label)
            }
          } catch {
            // Leave unresolved refs showing the raw key rather than failing the card.
          }
        })
      )

      if (!cancelled && resolved.size > 0) setLabels(resolved)
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [refsKey, accessToken])

  return labels
}
