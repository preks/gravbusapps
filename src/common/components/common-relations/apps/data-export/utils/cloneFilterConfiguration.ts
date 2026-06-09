import type { FilterConfiguration } from '@newwork/nw-design-system'

type FilterConfigRecord = Record<string, unknown>

function cloneFilterConfigRecord(config: FilterConfigRecord | undefined): FilterConfigRecord | undefined {
  if (!config) {
    return config
  }

  const cloned: FilterConfigRecord = { ...config }

  if (Array.isArray(config.options)) {
    cloned.options = config.options.map(option =>
      typeof option === 'object' && option !== null ? { ...(option as FilterConfigRecord) } : option
    )
  }

  return cloned
}

/**
 * Shallow-clones filter configuration for safe option injection.
 * Unlike structuredClone, preserves non-serializable callbacks (e.g. onSearch from buildDynamicFilterConfig).
 */
export function cloneFilterConfiguration(configuration: FilterConfiguration): FilterConfiguration {
  return {
    ...configuration,
    groups: configuration.groups.map(group => ({
      ...group,
      filters: group.filters.map(filter => ({
        ...filter,
        config: cloneFilterConfigRecord(filter.config as FilterConfigRecord | undefined) as typeof filter.config
      }))
    }))
  }
}
