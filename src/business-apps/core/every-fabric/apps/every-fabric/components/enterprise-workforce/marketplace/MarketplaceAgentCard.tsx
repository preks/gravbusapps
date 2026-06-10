// Grid card for a single marketplace agent template.
//
// Presentational only: clicking the card surfaces the detail panel where
// the customer reviews skills, tools, governance and fees before hiring.

import { StarIcon } from '@phosphor-icons/react'
import React from 'react'
import { formatMonthlyFee, valuePackLabel, type MarketplaceAgentTemplate } from './marketplaceAgents'

interface MarketplaceAgentCardProps {
  agent: MarketplaceAgentTemplate
  onSelect: (agent: MarketplaceAgentTemplate) => void
}

export const MarketplaceAgentCard: React.FC<MarketplaceAgentCardProps> = ({ agent, onSelect }) => {
  const Icon = agent.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(agent)}
      className="gba:group gba:flex gba:h-full gba:flex-col gba:gap-3 gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:p-4 gba:text-left gba:transition-colors gba:hover:border-foreground/30 gba:hover:bg-muted/30"
      data-testid={`marketplace-card-${agent.id}`}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        <div className="gba:flex gba:h-11 gba:w-11 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-primary/10 gba:text-primary">
          <Icon className="gba:h-6 gba:w-6" weight="duotone" />
        </div>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <p className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{agent.displayName}</p>
            <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
              <StarIcon className="gba:h-3 gba:w-3 gba:text-amber-500" weight="fill" />
              {agent.rating.toFixed(1)}
            </span>
          </div>
          <p className="gba:truncate gba:text-xs gba:text-muted-foreground">
            {agent.role} · {agent.department}
          </p>
        </div>
      </div>

      <p className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground">{agent.tagline}</p>

      <div className="gba:flex gba:flex-wrap gba:gap-1.5">
        <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground">
          {valuePackLabel(agent.valuePack)}
        </span>
        {agent.skills.slice(0, 2).map(skill => (
          <span
            key={skill}
            className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-foreground"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="gba:mt-auto gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border/60 gba:pt-2.5">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground">{formatMonthlyFee(agent.pricing)}</span>
        <span className="gba:text-[11px] gba:font-medium gba:text-primary gba:group-hover:underline">View profile</span>
      </div>
    </button>
  )
}
