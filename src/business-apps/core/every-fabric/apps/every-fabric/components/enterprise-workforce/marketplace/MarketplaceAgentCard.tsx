// Grid card for a single marketplace catalog agent.

import { useTranslation } from '@newwork/nw-design-system'
import { CheckIcon, StarIcon } from '@phosphor-icons/react'
import React from 'react'
import translations from '../../../_i18n'
import { type MarketplaceCatalogItem, valuePackLabelKey } from './marketplaceCatalogTypes'

interface MarketplaceAgentCardProps {
  agent: MarketplaceCatalogItem
  selected: boolean
  selectionMode: boolean
  onSelect: (agent: MarketplaceCatalogItem) => void
  onToggleSelect: (agent: MarketplaceCatalogItem) => void
}

export const MarketplaceAgentCard: React.FC<MarketplaceAgentCardProps> = ({
  agent,
  selected,
  selectionMode,
  onSelect,
  onToggleSelect
}) => {
  const { t } = useTranslation(translations)
  const Icon = agent.icon

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect(agent)
      return
    }
    onSelect(agent)
  }

  const footerActionLabel = selectionMode
    ? selected
      ? t('marketplace-card-selected')
      : t('marketplace-card-select')
    : t('marketplace-card-view-profile')

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`gba:group gba:relative gba:flex gba:h-full gba:flex-col gba:gap-3 gba:rounded-2xl gba:border gba:bg-card gba:p-4 gba:text-left gba:transition-colors ${
        selected
          ? 'gba:border-primary gba:bg-primary/5'
          : 'gba:border-border gba:hover:border-foreground/30 gba:hover:bg-muted/30'
      }`}
      data-testid={`marketplace-card-${agent.id}`}
    >
      {selectionMode ? (
        <span
          className={`gba:absolute gba:right-3 gba:top-3 gba:flex gba:h-5 gba:w-5 gba:items-center gba:justify-center gba:rounded-full gba:border ${
            selected
              ? 'gba:border-primary gba:bg-primary gba:text-primary-foreground'
              : 'gba:border-border gba:bg-background'
          }`}
        >
          {selected ? <CheckIcon className="gba:h-3 gba:w-3" weight="bold" /> : null}
        </span>
      ) : null}

      <div className="gba:flex gba:items-start gba:gap-3">
        <div className="gba:flex gba:h-11 gba:w-11 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-primary/10 gba:text-primary">
          {agent.iconEmoji ? (
            <span className="gba:text-xl">{agent.iconEmoji}</span>
          ) : (
            <Icon className="gba:h-6 gba:w-6" weight="duotone" />
          )}
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
          {t(valuePackLabelKey(agent.valuePack))}
        </span>
        {agent.isLegacyTemplate ? (
          agent.skills.slice(0, 2).map(skill => (
            <span
              key={skill}
              className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-foreground"
            >
              {skill}
            </span>
          ))
        ) : (
          <>
            <span className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-foreground">
              {t('marketplace-card-skills-count', { count: agent.skillCount })}
            </span>
            <span className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-foreground">
              {t('marketplace-card-tools-count', { count: agent.toolCount })}
            </span>
          </>
        )}
      </div>

      <div className="gba:mt-auto gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border/60 gba:pt-2.5">
        <span className="gba:text-[11px] gba:text-muted-foreground">
          {t('marketplace-card-installs-count', { installs: agent.installCount.toLocaleString() })}
        </span>
        <span className="gba:text-[11px] gba:font-medium gba:text-primary gba:group-hover:underline">
          {footerActionLabel}
        </span>
      </div>
    </button>
  )
}
