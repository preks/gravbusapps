import { Button } from '@newwork/nw-design-system'
import { CircleNotchIcon, TrashIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useState } from 'react'
import type {
  MarketplacePackageSummary,
  PromptManagerClient
} from '@/common/network/ai/prompt-manager/PromptManagerClient'

interface ManageCatalogPanelProps {
  client: PromptManagerClient
  onReloadCatalog?: () => void
}

export const ManageCatalogPanel: React.FC<ManageCatalogPanelProps> = ({ client, onReloadCatalog }) => {
  const [packages, setPackages] = useState<MarketplacePackageSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadPackages = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const page = await client.listMarketplacePackages({ limit: 200, isActive: true })
      setPackages(page.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadPackages()
  }, [loadPackages])

  const handleUnpublish = async (entry: MarketplacePackageSummary) => {
    setBusyId(entry.package_id)
    setError(null)
    try {
      await client.marketplaceUnpublish(entry.package_id, entry.version)
      await loadPackages()
      onReloadCatalog?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unpublish failed')
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-16 gba:text-sm gba:text-muted-foreground">
        <CircleNotchIcon className="gba:h-4 gba:w-4 gba:animate-spin" />
        Loading catalog…
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-1 gba:flex-col gba:overflow-hidden" data-testid="manage-catalog-panel">
      <div className="gba:border-b gba:border-border/60 gba:px-5 gba:py-3">
        <p className="gba:text-xs gba:text-muted-foreground">
          Published packages visible in the hire marketplace on this tenant. Unpublish removes a listing.
        </p>
        {error ? <p className="gba:mt-2 gba:text-xs gba:text-destructive">{error}</p> : null}
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
        {packages.length === 0 ? (
          <p className="gba:py-12 gba:text-center gba:text-sm gba:text-muted-foreground">No published packages yet.</p>
        ) : (
          <ul className="gba:flex gba:flex-col gba:gap-2">
            {packages.map(entry => (
              <li
                key={`${entry.package_id}@${entry.version}`}
                className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:rounded-xl gba:border gba:border-border gba:p-3"
                data-testid={`manage-catalog-row-${entry.package_id}`}
              >
                <div className="gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">{entry.name}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {entry.package_id} · {entry.category} · {entry.skill_count} skills · {entry.tool_count} tools ·{' '}
                    {entry.install_count} installs
                  </p>
                  {entry.description ? (
                    <p className="gba:mt-1 gba:line-clamp-2 gba:text-xs gba:text-muted-foreground">
                      {entry.description}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === entry.package_id}
                  onClick={() => void handleUnpublish(entry)}
                  data-testid={`manage-catalog-unpublish-${entry.package_id}`}
                >
                  <TrashIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
                  Unpublish
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
