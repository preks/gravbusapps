import { useCatalogEntriesOptions, type CatalogOption } from './useCatalogEntriesOptions'

export type SanitizationMethodOption = CatalogOption

const SANITIZATION_METHOD_CONFIG = {
  catalogIdentifier: 'SanitizationMethod',
  version: 'v1' as const,
  errorMessage: 'Failed to fetch sanitization methods'
}

export const useSanitizationMethodCatalog = (accessToken: string) => {
  return useCatalogEntriesOptions(accessToken, SANITIZATION_METHOD_CONFIG)
}
