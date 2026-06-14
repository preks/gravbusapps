// Detail / profile panel for a marketplace catalog agent.

import { Button } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  LightningIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StarIcon
} from '@phosphor-icons/react'
import React from 'react'
import { formatMonthlyFee } from './marketplaceAgents'
import { type MarketplaceCatalogItem, valuePackLabel } from './marketplaceCatalogTypes'

interface MarketplaceAgentDetailProps {
  agent: MarketplaceCatalogItem
  onBack: () => void
  onHire: (agent: MarketplaceCatalogItem) => void
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
  <section className="gba:flex gba:flex-col gba:gap-2">
    <h3 className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
      {icon}
      {title}
    </h3>
    {children}
  </section>
)

const Chips: React.FC<{ items: string[]; testId: string }> = ({ items, testId }) => (
  <div className="gba:flex gba:flex-wrap gba:gap-1.5" data-testid={testId}>
    {items.map(item => (
      <span
        key={item}
        className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:bg-card gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:text-foreground"
      >
        {item}
      </span>
    ))}
  </div>
)

export const MarketplaceAgentDetail: React.FC<MarketplaceAgentDetailProps> = ({ agent, onBack, onHire }) => {
  const Icon = agent.icon
  const legacy = agent.legacyTemplate

  return (
    <div className="gba:flex gba:h-full gba:flex-col" data-testid={`marketplace-detail-${agent.id}`}>
      <div className="gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
        <button
          type="button"
          onClick={onBack}
          className="gba:mb-3 gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground"
          data-testid="marketplace-detail-back"
        >
          <ArrowLeftIcon className="gba:h-3.5 gba:w-3.5" />
          Back to marketplace
        </button>
        <div className="gba:flex gba:items-start gba:gap-4">
          <div className="gba:flex gba:h-14 gba:w-14 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-2xl gba:bg-primary/10 gba:text-primary">
            {agent.iconEmoji ? (
              <span className="gba:text-2xl">{agent.iconEmoji}</span>
            ) : (
              <Icon className="gba:h-8 gba:w-8" weight="duotone" />
            )}
          </div>
          <div className="gba:min-w-0 gba:flex-1">
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{agent.displayName}</h2>
            <p className="gba:text-sm gba:text-muted-foreground">
              {agent.role} · {agent.department}
            </p>
            <div className="gba:mt-2 gba:flex gba:flex-wrap gba:items-center gba:gap-2">
              <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                {valuePackLabel(agent.valuePack)}
              </span>
              <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                <StarIcon className="gba:h-3 gba:w-3 gba:text-amber-500" weight="fill" />
                {agent.rating.toFixed(1)} · {agent.installCount.toLocaleString('en-US')} installs
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
        <div className="gba:flex gba:flex-col gba:gap-5">
          <p className="gba:text-sm gba:leading-relaxed gba:text-foreground">{agent.description}</p>

          <Section title="Skills" icon={<SparkleIcon className="gba:h-3.5 gba:w-3.5" />}>
            {agent.isLegacyTemplate ? (
              <Chips items={agent.skills} testId="marketplace-detail-skills" />
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground">{agent.skillCount} bundled skills included</p>
            )}
          </Section>

          <Section title="Tools & integrations" icon={<PlugsConnectedIcon className="gba:h-3.5 gba:w-3.5" />}>
            {agent.isLegacyTemplate ? (
              <Chips items={agent.tools} testId="marketplace-detail-tools" />
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground">{agent.toolCount} tools wired via skills</p>
            )}
          </Section>

          {legacy ? (
            <>
              <Section title="Governance" icon={<ShieldCheckIcon className="gba:h-3.5 gba:w-3.5" />}>
                <ul className="gba:flex gba:flex-col gba:gap-1.5">
                  {legacy.governance.highlights.map(highlight => (
                    <li
                      key={highlight}
                      className="gba:flex gba:items-start gba:gap-1.5 gba:text-xs gba:text-muted-foreground"
                    >
                      <CheckCircleIcon
                        className="gba:mt-0.5 gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-emerald-600"
                        weight="fill"
                      />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Reacts to" icon={<LightningIcon className="gba:h-3.5 gba:w-3.5" />}>
                <Chips items={legacy.sampleTriggers} testId="marketplace-detail-triggers" />
              </Section>

              <div className="gba:rounded-2xl gba:border gba:border-border gba:bg-muted/20 gba:p-4">
                <div className="gba:flex gba:items-baseline gba:justify-between">
                  <span className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
                    Pricing
                  </span>
                  <span className="gba:text-lg gba:font-semibold gba:text-foreground">
                    {formatMonthlyFee(legacy.pricing)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
        <span className="gba:text-xs gba:text-muted-foreground">
          {agent.isLegacyTemplate ? 'Starts paused for your review.' : 'Installs agent, skills and tools immediately.'}
        </span>
        <Button onClick={() => onHire(agent)} data-testid="marketplace-detail-hire">
          Hire {agent.displayName}
        </Button>
      </div>
    </div>
  )
}
