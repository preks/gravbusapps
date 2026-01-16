import {
  BenefitCatalogItem,
  ProviderEntry
} from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

/**
 * Get BenefitProvider entries for a specific benefit.
 *
 * ✅ FIX: Uses providers already fetched via GraphQL (selectedBenefit.availableProviders)
 * instead of making a separate REST API call to Catalog Manager which requires special permissions.
 *
 * The providers are already included as child entries when the benefit catalog is loaded,
 * so no additional API call is needed.
 */
export const fetchBenefitProvidersForBenefit = async (
  selectedBenefit: BenefitCatalogItem | undefined | null
): Promise<ProviderEntry[]> => {
  if (!selectedBenefit) return []

  // Return providers that are already available from the benefit catalog
  // These were fetched via GraphQL as child entries when loading the benefit types
  const providers = selectedBenefit.availableProviders || []

  return providers
}
