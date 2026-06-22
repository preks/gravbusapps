import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { ActionSummary } from '../../../types/enterpriseAgent'
import translations from '../../../_i18n'

export interface ActionsTakenPanelProps {
  actions: ActionSummary[]
  expanded: boolean
  onToggle: () => void
}

export const ActionsTakenPanel: React.FC<ActionsTakenPanelProps> = ({ actions, expanded, onToggle }) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:mt-4 gba:border-t gba:border-border/70">
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:py-2.5 gba:hover:bg-muted/15 gba:transition-colors gba:text-left"
        onClick={onToggle}
        data-testid="enterprise-agent-final-actions-toggle"
      >
        <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
          {t('renderer-final-actions-taken')}
        </span>
        {expanded ? (
          <CaretDownIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
        ) : (
          <CaretRightIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="gba:pb-3 gba:space-y-1">
          {actions.map((action, index) => (
            <div
              key={`${index}-${action.step}-${action.tool ?? 'none'}-${action.outcome}`}
              className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
            >
              <span className="gba:text-muted-foreground/50 gba:shrink-0">{index + 1}.</span>
              <span className="gba:flex-1">{action.step}</span>
              {action.tool && (
                <span className="gba:text-xs gba:font-mono gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded gba:text-muted-foreground gba:shrink-0">
                  {action.tool}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
