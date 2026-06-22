// Agent marketplace modal — browse catalog, multi-select hire, publish-to-tenant (provider).

import { Button } from '@newwork/nw-design-system'
import {
  GearSixIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  StorefrontIcon,
  UsersThreeIcon,
  XIcon
} from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'
import type {
  MarketplaceBatchInstallReport,
  MarketplacePreflightReport,
  PromptManagerClient
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { VALUE_PACKS, type MarketplaceAgentTemplate, type MarketplaceValuePack } from './marketplaceAgents'
import { MarketplaceAgentCard } from './MarketplaceAgentCard'
import { MarketplaceAgentDetail } from './MarketplaceAgentDetail'
import { ManageCatalogPanel } from './ManageCatalogPanel'
import { MarketplaceInstallSummary } from './MarketplaceInstallSummary'
import { MarketplacePreflightDialog } from './MarketplacePreflightDialog'
import { PushToTenantDialog } from './PushToTenantDialog'
import { catalogItemsByPack, searchCatalogItems, type MarketplaceCatalogItem } from './marketplaceCatalogTypes'
import { useAgentMarketplace, type PublishToTenantResult } from './useAgentMarketplace'

interface AgentMarketplaceModalProps {
  open: boolean
  client: PromptManagerClient
  devModeEnabled?: boolean
  onClose: () => void
  onHireLegacy?: (agent: MarketplaceAgentTemplate) => void
  onInstalled?: () => void
}

type PackFilter = MarketplaceValuePack | 'general' | 'all'
type ModalView = 'browse' | 'manage'

interface FilterChip {
  id: PackFilter | 'all'
  label: string
}

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All' },
  ...VALUE_PACKS.map(p => ({ id: p.id, label: p.label }))
]

export const AgentMarketplaceModal: React.FC<AgentMarketplaceModalProps> = ({
  open,
  client,
  devModeEnabled = false,
  onClose,
  onHireLegacy,
  onInstalled
}) => {
  const {
    items,
    isLoading,
    error,
    reload,
    getPackageBundle,
    preflightPackages,
    installPackages,
    publishPackagesToTenant
  } = useAgentMarketplace({
    client,
    enabled: open
  })

  const [view, setView] = useState<ModalView>('browse')
  const [search, setSearch] = useState('')
  const [pack, setPack] = useState<PackFilter | 'all'>('all')
  const [selected, setSelected] = useState<MarketplaceCatalogItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [installReport, setInstallReport] = useState<MarketplaceBatchInstallReport | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishResults, setPublishResults] = useState<PublishToTenantResult[] | null>(null)
  const [preflightOpen, setPreflightOpen] = useState(false)
  const [preflightReports, setPreflightReports] = useState<MarketplacePreflightReport[]>([])
  const [pendingInstallIds, setPendingInstallIds] = useState<string[]>([])

  const results = useMemo(() => {
    const filtered = catalogItemsByPack(items, pack)
    return searchCatalogItems(filtered, search)
  }, [items, pack, search])

  const selectedPackageIds = useMemo(() => Array.from(selectedIds), [selectedIds])

  const toggleSelect = (agent: MarketplaceCatalogItem) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(agent.packageId)) {
        next.delete(agent.packageId)
      } else {
        next.add(agent.packageId)
      }
      return next
    })
  }

  const runInstall = async (packageIds: string[], skipPreflightErrors = false) => {
    setIsBusy(true)
    setActionError(null)
    try {
      const report = await installPackages(packageIds, { skipPreflightErrors })
      setInstallReport(report)
      if (report.succeeded > 0) {
        onInstalled?.()
      }
      setSelectedIds(new Set())
      setSelectionMode(false)
      setPreflightOpen(false)
      setPendingInstallIds([])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Install failed')
    } finally {
      setIsBusy(false)
    }
  }

  const beginInstall = async (packageIds: string[]) => {
    if (packageIds.length === 0) return

    setIsBusy(true)
    setActionError(null)
    try {
      const reports = await preflightPackages(packageIds)
      const allReady = reports.every(report => report.ready)
      if (allReady) {
        await runInstall(packageIds)
        return
      }
      setPreflightReports(reports)
      setPendingInstallIds(packageIds)
      setPreflightOpen(true)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Preflight failed')
    } finally {
      setIsBusy(false)
    }
  }

  const handleHireOne = async (agent: MarketplaceCatalogItem) => {
    if (agent.isLegacyTemplate && agent.legacyTemplate && onHireLegacy) {
      onHireLegacy(agent.legacyTemplate)
      onClose()
      return
    }

    await beginInstall([agent.packageId])
  }

  const handleInstallSelected = async () => {
    if (selectedPackageIds.length === 0) return

    const legacySelected = results.filter(item => selectedIds.has(item.packageId) && item.isLegacyTemplate)
    if (legacySelected.length > 0 && onHireLegacy && legacySelected.length === 1 && selectedPackageIds.length === 1) {
      const legacy = legacySelected[0].legacyTemplate
      if (legacy) {
        onHireLegacy(legacy)
        onClose()
        return
      }
    }

    await beginInstall(selectedPackageIds)
  }

  const apiBackedPackageIds = useMemo(
    () =>
      selectedPackageIds.filter(packageId => {
        const item = items.find(entry => entry.packageId === packageId)
        return item && !item.isLegacyTemplate
      }),
    [items, selectedPackageIds]
  )

  const handlePublishToTenant = async (target: { baseUrl: string; token: string }) => {
    if (apiBackedPackageIds.length === 0) {
      setActionError('Select catalog packages that exist on this deployment (offline demo agents cannot be published).')
      return
    }

    setIsBusy(true)
    setActionError(null)
    try {
      const results = await publishPackagesToTenant(target.baseUrl, target.token, apiBackedPackageIds)
      setPublishResults(results)
      if (results.every(result => result.success)) {
        setSelectedIds(new Set())
        setSelectionMode(false)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setIsBusy(false)
    }
  }

  const closePublishDialog = () => {
    setPublishOpen(false)
    setPublishResults(null)
    setActionError(null)
  }

  if (!open) return null

  return (
    <>
      <div
        className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
        data-testid="agent-marketplace-modal"
      >
        <div className="gba:flex gba:max-h-[90vh] gba:w-full gba:max-w-5xl gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:mt-0.5 gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-primary/10 gba:text-primary">
                <StorefrontIcon className="gba:h-5 gba:w-5" weight="duotone" />
              </div>
              <div>
                <h2 className="gba:text-base gba:font-semibold gba:text-foreground">Agent marketplace</h2>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Hire ready-made agents with skills, tools and governance included.
                </p>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              {devModeEnabled ? (
                <>
                  <Button
                    variant={view === 'manage' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setView(current => (current === 'manage' ? 'browse' : 'manage'))
                      setSelected(null)
                    }}
                    data-testid="agent-marketplace-manage"
                  >
                    <GearSixIcon className="gba:mr-1 gba:h-4 gba:w-4" />
                    Manage catalog
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectionMode(true)
                      setPublishOpen(true)
                    }}
                    disabled={selectedPackageIds.length === 0 || isBusy}
                    data-testid="agent-marketplace-publish-tenant"
                  >
                    <PaperPlaneTiltIcon className="gba:mr-1 gba:h-4 gba:w-4" />
                    Publish to tenant
                  </Button>
                </>
              ) : null}
              {view === 'browse' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(current => !current)}
                  data-testid="agent-marketplace-select-mode"
                >
                  {selectionMode ? 'Done selecting' : 'Select multiple'}
                </Button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
                aria-label="Close"
                data-testid="agent-marketplace-close"
              >
                <XIcon className="gba:h-4 gba:w-4" />
              </button>
            </div>
          </div>

          {view === 'manage' ? (
            <ManageCatalogPanel client={client} onReloadCatalog={() => void reload()} />
          ) : selected ? (
            <MarketplaceAgentDetail
              agent={selected}
              onBack={() => setSelected(null)}
              onHire={agent => void handleHireOne(agent)}
              onLoadBundle={getPackageBundle}
            />
          ) : (
            <>
              <div className="gba:flex gba:flex-col gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-3">
                <div className="gba:relative">
                  <MagnifyingGlassIcon className="gba:pointer-events-none gba:absolute gba:left-3 gba:top-1/2 gba:h-4 gba:w-4 gba:-translate-y-1/2 gba:text-muted-foreground" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search by role, skill or tool…"
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:py-2 gba:pl-9 gba:pr-3 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    data-testid="agent-marketplace-search"
                  />
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                  {FILTER_CHIPS.map(chip => {
                    const active = pack === chip.id
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setPack(chip.id)}
                        className={`gba:inline-flex gba:items-center gba:rounded-full gba:border gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors ${
                          active
                            ? 'gba:border-foreground/30 gba:bg-muted gba:text-foreground'
                            : 'gba:border-border gba:text-muted-foreground gba:hover:text-foreground'
                        }`}
                        data-testid={`agent-marketplace-filter-${chip.id}`}
                      >
                        {chip.label}
                      </button>
                    )
                  })}
                </div>
                {error ? <p className="gba:text-xs gba:text-muted-foreground">Using offline catalog: {error}</p> : null}
                {actionError ? <p className="gba:text-xs gba:text-destructive">{actionError}</p> : null}
              </div>

              <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
                {isLoading ? (
                  <p className="gba:py-16 gba:text-center gba:text-sm gba:text-muted-foreground">Loading catalog…</p>
                ) : results.length === 0 ? (
                  <div
                    className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:py-16 gba:text-center"
                    data-testid="agent-marketplace-empty"
                  >
                    <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted/40">
                      <UsersThreeIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
                    </div>
                    <p className="gba:text-sm gba:font-medium gba:text-foreground">No agents match your search</p>
                  </div>
                ) : (
                  <div
                    className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2 gba:lg:grid-cols-3"
                    data-testid="agent-marketplace-grid"
                  >
                    {results.map(agent => (
                      <MarketplaceAgentCard
                        key={agent.id}
                        agent={agent}
                        selected={selectedIds.has(agent.packageId)}
                        selectionMode={selectionMode}
                        onSelect={setSelected}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </div>
                )}
              </div>

              {selectionMode && selectedPackageIds.length > 0 ? (
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
                  <span className="gba:text-xs gba:text-muted-foreground">{selectedPackageIds.length} selected</span>
                  <Button
                    onClick={() => void handleInstallSelected()}
                    disabled={isBusy}
                    data-testid="marketplace-install-selected"
                  >
                    {isBusy ? 'Installing…' : `Install selected (${selectedPackageIds.length})`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <PushToTenantDialog
        open={publishOpen}
        selectedCount={apiBackedPackageIds.length || selectedPackageIds.length}
        isBusy={isBusy}
        errorMessage={actionError}
        publishResults={publishResults}
        onClose={closePublishDialog}
        onPublish={target => void handlePublishToTenant(target)}
      />

      <MarketplacePreflightDialog
        open={preflightOpen}
        reports={preflightReports}
        isBusy={isBusy}
        onClose={() => {
          setPreflightOpen(false)
          setPendingInstallIds([])
        }}
        onConfirmInstall={() => void runInstall(pendingInstallIds, true)}
      />

      <MarketplaceInstallSummary
        open={installReport !== null}
        report={installReport}
        onClose={() => setInstallReport(null)}
      />
    </>
  )
}
