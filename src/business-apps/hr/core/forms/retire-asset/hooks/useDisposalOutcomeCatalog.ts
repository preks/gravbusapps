import { useCatalogEntriesOptions, type CatalogOption } from './useCatalogEntriesOptions'

export type DisposalOutcomeOption = CatalogOption

const DISPOSAL_OUTCOME_CONFIG = {
  catalogIdentifier: 'DisposalOutcome',
  version: 'v1' as const,
  errorMessage: 'Failed to fetch disposal outcomes'
}

export const useDisposalOutcomeCatalog = (accessToken: string) => {
  return useCatalogEntriesOptions(accessToken, DISPOSAL_OUTCOME_CONFIG)
}
