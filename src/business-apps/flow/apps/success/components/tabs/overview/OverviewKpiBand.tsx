import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import { SuccessKpiGrid, type SuccessKpiItem } from '../../shared'

interface OverviewKpiBandProps {
  items: SuccessKpiItem[]
  isLoading?: boolean
  actions?: React.ReactNode
  eyebrow?: string
  title?: string
  description?: string
  emptyDescription?: string
  hideHeader?: boolean
  'data-testid'?: string
}

export const OverviewKpiBand: React.FC<OverviewKpiBandProps> = ({
  items,
  isLoading = false,
  actions,
  eyebrow,
  title,
  description,
  emptyDescription,
  hideHeader = false,
  'data-testid': testId = 'flow-success-overview-kpis'
}) => {
  const { t } = useTranslation(translations)
  const resolvedDescription = description || t('overview-description')

  return (
    <section className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      {!hideHeader ? (
        <div className="gba:flex gba:flex-col gba:gap-4 gba:lg:flex-row gba:lg:items-start gba:lg:justify-between">
          <div className="gba:flex gba:flex-col gba:gap-1">
            <span className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
              {eyebrow || t('overview-summary-eyebrow')}
            </span>
            <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground">{title || t('overview-title')}</h2>
            <p className="gba:max-w-3xl gba:text-sm gba:text-muted-foreground">{resolvedDescription}</p>
          </div>
          {actions ? <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">{actions}</div> : null}
        </div>
      ) : null}
      <SuccessKpiGrid
        items={items}
        isLoading={isLoading}
        emptyTitle={t('state-empty')}
        emptyDescription={emptyDescription || resolvedDescription}
        data-testid={`${testId}-grid`}
      />
    </section>
  )
}
