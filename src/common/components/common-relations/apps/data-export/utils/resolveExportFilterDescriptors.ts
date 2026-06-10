import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

const isValidFilterPath = (path: unknown): path is string =>
  typeof path === 'string' && path.length > 0 && !path.includes('undefined')

/** Descriptors that can drive a filter-groups GraphQL query (have option select paths). */
export function getQueryableFilterDescriptors(descriptors: Descriptor[]): Descriptor[] {
  return descriptors.filter(descriptor => descriptor.optionSelectPaths?.some(isValidFilterPath))
}

function collectFilterFields(filterConfig: FilterConfiguration): Set<string> {
  const fields = filterConfig.groups.flatMap(group => group.filters.map(filter => filter.field))
  return new Set(fields.filter((field): field is string => Boolean(field)))
}

/**
 * Resolves descriptor-driven filter options for export pages only.
 * Limits to filters present in the export UI and deduplicates by key (last wins),
 * avoiding duplicate GraphQL selections when domain descriptor lists overlap.
 */
export function resolveExportFilterDescriptors(
  allDescriptors: Descriptor[],
  filterConfig: FilterConfiguration
): Descriptor[] {
  const filterFields = collectFilterFields(filterConfig)
  const byKey = new Map<string, Descriptor>()

  for (const descriptor of allDescriptors) {
    if (!filterFields.has(descriptor.key)) {
      continue
    }

    const optionSelectPaths = descriptor.optionSelectPaths?.filter(isValidFilterPath)
    if (!optionSelectPaths?.length) {
      continue
    }

    byKey.set(descriptor.key, {
      ...descriptor,
      optionSelectPaths,
      optionSearchPaths: descriptor.optionSearchPaths?.filter(isValidFilterPath),
      optionDistinctOn: descriptor.optionDistinctOn?.filter(isValidFilterPath)
    })
  }

  return Array.from(byKey.values())
}

/** Apply export-only descriptor overrides after {@link resolveExportFilterDescriptors}. */
export function patchExportFilterDescriptors(
  descriptors: Descriptor[],
  patches: Record<string, Partial<Descriptor>>
): Descriptor[] {
  return descriptors.map(descriptor => {
    const patch = patches[descriptor.key]
    return patch ? { ...descriptor, ...patch } : descriptor
  })
}
