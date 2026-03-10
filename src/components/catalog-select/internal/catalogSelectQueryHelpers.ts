import type { ListFilter } from '../CatalogSelect'

export const buildListFilterParams = (
  codeFilter?: ListFilter<string>,
  typeFilter?: ListFilter<string>
): {
  excludeCodes?: string[]
  includeCodes?: string[]
  excludeTypes?: string[]
  includeTypes?: string[]
} => {
  const params: {
    excludeCodes?: string[]
    includeCodes?: string[]
    excludeTypes?: string[]
    includeTypes?: string[]
  } = {}

  if (codeFilter) {
    switch (codeFilter.mode) {
      case 'omit':
        params.excludeCodes = codeFilter.values
        break
      case 'only':
        params.includeCodes = codeFilter.values
        break
      case 'none':
        params.excludeCodes = ['*']
        break
      default:
        break
    }
  }

  if (typeFilter) {
    switch (typeFilter.mode) {
      case 'omit':
        params.excludeTypes = typeFilter.values
        break
      case 'only':
        params.includeTypes = typeFilter.values
        break
      case 'none':
        params.excludeTypes = ['*']
        break
      default:
        break
    }
  }

  return params
}

export const parseCatalogIdentifier = (catalogIdentifier: string): { identifier: string; version: string } => {
  const [identifier, version = 'v1'] = catalogIdentifier.split(':')
  return { identifier, version }
}
