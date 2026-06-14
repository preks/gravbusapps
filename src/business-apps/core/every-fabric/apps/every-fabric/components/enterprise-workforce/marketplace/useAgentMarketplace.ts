import { useCallback, useEffect, useState } from 'react'
import {
  createTargetPromptManagerClient,
  type MarketplaceBatchInstallReport,
  type MarketplacePackageSummary,
  type MarketplacePreflightReport,
  type PromptManagerClient
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { MARKETPLACE_AGENTS } from './marketplaceAgents'
import {
  legacyTemplateToCatalogItem,
  packageSummaryToCatalogItem,
  type MarketplaceCatalogItem
} from './marketplaceCatalogTypes'

interface UseAgentMarketplaceOptions {
  client: PromptManagerClient
  enabled?: boolean
}

export interface PublishAgentOptions {
  targetBaseUrl: string
  targetToken: string
  packageId?: string
  publisher?: string
  category?: string
}

export interface PublishToTenantResult {
  packageId: string
  name: string
  version: string
  success: boolean
  error?: string
}

export function useAgentMarketplace({ client, enabled = true }: UseAgentMarketplaceOptions) {
  const [items, setItems] = useState<MarketplaceCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const page = await client.listMarketplacePackages({ limit: 200, isActive: true })
      const mapped = (page.data ?? []).map(packageSummaryToCatalogItem)
      if (mapped.length > 0) {
        setItems(mapped)
      } else {
        setItems(MARKETPLACE_AGENTS.map(legacyTemplateToCatalogItem))
      }
    } catch (err) {
      setItems(MARKETPLACE_AGENTS.map(legacyTemplateToCatalogItem))
      setError(err instanceof Error ? err.message : 'Failed to load marketplace catalog')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (!enabled) return
    void loadCatalog()
  }, [enabled, loadCatalog])

  const preflightPackages = useCallback(
    async (packageIds: string[], catalogUrl?: string): Promise<MarketplacePreflightReport[]> => {
      const reports: MarketplacePreflightReport[] = []
      for (const packageId of packageIds) {
        const report = await client.marketplacePreflight({
          packageId,
          catalogUrl,
          strict: true
        })
        reports.push(report)
      }
      return reports
    },
    [client]
  )

  const installPackages = useCallback(
    async (
      packageIds: string[],
      options?: { catalogUrl?: string; skipPreflightErrors?: boolean }
    ): Promise<MarketplaceBatchInstallReport> => {
      return client.marketplaceInstall({
        packageIds,
        catalogUrl: options?.catalogUrl,
        skipPreflightErrors: options?.skipPreflightErrors ?? false
      })
    },
    [client]
  )

  const publishPackagesToTenant = useCallback(
    async (targetBaseUrl: string, targetToken: string, packageIds: string[]): Promise<PublishToTenantResult[]> => {
      const targetClient = createTargetPromptManagerClient(targetBaseUrl, targetToken)
      const results: PublishToTenantResult[] = []

      for (const packageId of packageIds) {
        try {
          const { bundle } = await client.getMarketplacePackageBundle(packageId)
          const response = await targetClient.publishMarketplacePackage(packageId, { bundle })
          results.push({
            packageId: response.package.package_id,
            name: response.package.name,
            version: response.package.version,
            success: true
          })
        } catch (err) {
          results.push({
            packageId,
            name: packageId,
            version: '',
            success: false,
            error: err instanceof Error ? err.message : 'Publish failed'
          })
        }
      }

      return results
    },
    [client]
  )

  const publishAgentToTenant = useCallback(
    async (agentId: string, options: PublishAgentOptions): Promise<MarketplacePackageSummary | null> => {
      const { bundle } = await client.buildMarketplacePackage({
        agentId,
        packageId: options.packageId,
        publisher: options.publisher ?? 'newwork',
        category: options.category ?? 'general',
        publish: false
      })

      const targetClient = createTargetPromptManagerClient(options.targetBaseUrl, options.targetToken)
      const response = await targetClient.publishMarketplacePackage(bundle.manifest.package_id, { bundle })
      return response.package
    },
    [client]
  )

  const unpublishPackage = useCallback(
    async (packageId: string, version?: string): Promise<void> => {
      await client.marketplaceUnpublish(packageId, version)
      await loadCatalog()
    },
    [client, loadCatalog]
  )

  const listManagedPackages = useCallback(async (): Promise<MarketplacePackageSummary[]> => {
    const page = await client.listMarketplacePackages({ limit: 200, isActive: true })
    return page.data ?? []
  }, [client])

  return {
    items,
    isLoading,
    error,
    reload: loadCatalog,
    preflightPackages,
    installPackages,
    publishPackagesToTenant,
    publishAgentToTenant,
    unpublishPackage,
    listManagedPackages
  }
}
