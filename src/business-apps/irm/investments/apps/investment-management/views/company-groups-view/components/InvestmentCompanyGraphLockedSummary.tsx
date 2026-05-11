import React, { useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { LockIcon, LockOpenIcon, XIcon } from '@phosphor-icons/react'
import type { InvestmentCompanyGraphNode } from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

interface InvestmentCompanyGraphLockedSummaryProps {
  investmentCompanies: InvestmentCompanyGraphNode[]
  focusLockedOnly: boolean
  onFocusLockedOnlyChange: (focusLockedOnly: boolean) => void
  onUnlock: (investmentCompanyId: string) => void
  onUnlockAll: () => void
}

export const InvestmentCompanyGraphLockedSummary: React.FC<InvestmentCompanyGraphLockedSummaryProps> = ({
  investmentCompanies,
  focusLockedOnly,
  onFocusLockedOnlyChange,
  onUnlock,
  onUnlockAll
}) => {
  const { t } = useTranslation(translations)
  const [hoveredUnlockId, setHoveredUnlockId] = useState<string | undefined>()
  const totalOwners = investmentCompanies.reduce((sum, company) => sum + company.data.ownersCount, 0)
  const totalOwnedCompanies = investmentCompanies.reduce((sum, company) => sum + company.data.ownedCompaniesCount, 0)
  const spotlightModeClass = focusLockedOnly
    ? 'gba:border-primary/30 gba:bg-primary/10 gba:shadow-sm'
    : 'gba:border-transparent gba:bg-muted'
  const spotlightModeLabelClass = focusLockedOnly ? 'gba:text-primary' : 'gba:text-foreground'

  return (
    <div className="gba:absolute gba:right-4 gba:top-4 gba:z-10 gba:w-96 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3 gba:text-xs gba:shadow-md">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div className="gba:min-w-0">
          <div className="gba:font-semibold gba:text-foreground">
            {t('locked-node-count', { count: investmentCompanies.length })}
          </div>
          <div className="gba:text-muted-foreground">
            {t('locked-node-summary', {
              owners: totalOwners,
              owns: totalOwnedCompanies
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={onUnlockAll}
          className="gba:inline-flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground gba:transition-colors hover:gba:bg-accent hover:gba:text-foreground"
          aria-label={t('unlock-all-edge-locks')}
          data-testid="investment-company-graph-unlock-all"
        >
          <XIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
      </div>
      <div
        className={`gba:mt-3 gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-full gba:border gba:px-3 gba:py-2 gba:transition-colors ${spotlightModeClass}`}
      >
        <span className={`gba:font-medium ${spotlightModeLabelClass}`}>{t('focus-locked-toggle-label')}</span>
        <button
          type="button"
          onClick={() => onFocusLockedOnlyChange(!focusLockedOnly)}
          className={`gba:relative gba:h-5 gba:w-9 gba:rounded-full gba:transition-colors ${
            focusLockedOnly ? 'gba:bg-primary' : 'gba:bg-muted-foreground/30'
          }`}
          aria-pressed={focusLockedOnly}
          data-testid="investment-company-graph-focus-locked-toggle"
        >
          <span
            className={`gba:absolute gba:left-0.5 gba:top-0.5 gba:h-4 gba:w-4 gba:rounded-full gba:bg-background gba:shadow gba:transition-transform ${
              focusLockedOnly ? 'gba:translate-x-4' : 'gba:translate-x-0'
            }`}
          />
        </button>
      </div>
      <button
        type="button"
        onClick={onUnlockAll}
        className="gba:mt-3 gba:inline-flex gba:w-full gba:items-center gba:justify-center gba:gap-2 gba:rounded-full gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:font-medium gba:text-foreground gba:transition-colors hover:gba:bg-accent"
        data-testid="investment-company-graph-unlock-all-button"
      >
        <LockOpenIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
        {t('unlock-all-edge-locks')}
      </button>
      <div className="gba:mt-3 gba:flex gba:max-h-24 gba:flex-wrap gba:gap-2 gba:overflow-auto">
        {investmentCompanies.map(company => {
          const isHovered = hoveredUnlockId === company.id

          return (
            <button
              key={company.id}
              type="button"
              onClick={() => onUnlock(company.id)}
              onMouseEnter={() => setHoveredUnlockId(company.id)}
              onMouseLeave={() => setHoveredUnlockId(undefined)}
              onFocus={() => setHoveredUnlockId(company.id)}
              onBlur={() => setHoveredUnlockId(undefined)}
              className={`gba:inline-flex gba:max-w-full gba:items-center gba:gap-2 gba:rounded-full gba:border gba:px-2 gba:py-1 gba:transition-colors ${
                isHovered ? 'gba:border-border gba:bg-background' : 'gba:border-success/30 gba:bg-success-secondary/60'
              }`}
              aria-label={t('unlock-company-lock', { name: company.data.name })}
              data-testid={`investment-company-graph-unlock-${company.id}`}
            >
              {isHovered ? (
                <LockOpenIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" />
              ) : (
                <LockIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-success" />
              )}
              <span className="gba:truncate gba:font-medium gba:text-foreground">{company.data.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
