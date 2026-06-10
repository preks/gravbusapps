// Agent marketplace modal.
//
// A browse-and-hire catalog of predefined "Value Pack" agents. Customers can
// search, filter by value pack, open an agent profile, and hire — which hands
// the chosen template back so it can prefill the existing create flow.
//
// Forward-looking mockup: the catalog data is presentational (see
// marketplaceAgents.ts). No marketplace backend is called here.

import { MagnifyingGlassIcon, StorefrontIcon, UsersThreeIcon, XIcon } from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'
import { MarketplaceAgentCard } from './MarketplaceAgentCard'
import { MarketplaceAgentDetail } from './MarketplaceAgentDetail'
import {
  VALUE_PACKS,
  marketplaceAgentsByPack,
  searchMarketplaceAgents,
  type MarketplaceAgentTemplate,
  type MarketplaceValuePack
} from './marketplaceAgents'

interface AgentMarketplaceModalProps {
  open: boolean
  onClose: () => void
  onHire: (agent: MarketplaceAgentTemplate) => void
}

type PackFilter = MarketplaceValuePack | 'all'

interface FilterChip {
  id: PackFilter
  label: string
}

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All' },
  ...VALUE_PACKS.map(p => ({ id: p.id, label: p.label }))
]

export const AgentMarketplaceModal: React.FC<AgentMarketplaceModalProps> = ({ open, onClose, onHire }) => {
  const [search, setSearch] = useState('')
  const [pack, setPack] = useState<PackFilter>('all')
  const [selected, setSelected] = useState<MarketplaceAgentTemplate | null>(null)

  const results = useMemo(() => searchMarketplaceAgents(marketplaceAgentsByPack(pack), search), [pack, search])

  if (!open) return null

  return (
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
                Hire a ready-made digital employee. Skills, tools and governance included.
              </p>
            </div>
          </div>
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

        {selected ? (
          <MarketplaceAgentDetail agent={selected} onBack={() => setSelected(null)} onHire={onHire} />
        ) : (
          <>
            <div className="gba:flex gba:flex-col gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-3">
              <div className="gba:relative">
                <MagnifyingGlassIcon className="gba:pointer-events-none gba:absolute gba:left-3 gba:top-1/2 gba:h-4 gba:w-4 gba:-translate-y-1/2 gba:text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
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
            </div>

            <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
              {results.length === 0 ? (
                <div
                  className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:py-16 gba:text-center"
                  data-testid="agent-marketplace-empty"
                >
                  <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted/40">
                    <UsersThreeIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
                  </div>
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">No agents match your search</p>
                  <p className="gba:text-xs gba:text-muted-foreground">Try a different keyword or value pack.</p>
                </div>
              ) : (
                <div
                  className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2 gba:lg:grid-cols-3"
                  data-testid="agent-marketplace-grid"
                >
                  {results.map(agent => (
                    <MarketplaceAgentCard key={agent.id} agent={agent} onSelect={setSelected} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
