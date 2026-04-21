/**
 * Skeleton shown on the IRM Data Import index while the `InvestmentGroup`
 * catalog is being fetched. Visual parity with `SettingsLayout` so the
 * page shape doesn't jump when the real cards render.
 */

import React from 'react'
import { Card, PageLayout, Skeleton, useTranslation } from '@newwork/nw-design-system'
import { FileArrowUpIcon } from '@phosphor-icons/react'
import translations from '../_i18n'

interface SkeletonCardSpec {
  id: string
  entries: readonly { id: string }[]
}

const buildEntries = (cardId: string, count: number): readonly { id: string }[] =>
  Array.from({ length: count }, (_, index) => ({ id: `${cardId}-entry-${index}` }))

const STATIC_SKELETON_CARDS: readonly SkeletonCardSpec[] = [
  { id: 'lead', entries: buildEntries('lead', 1) },
  { id: 'contact', entries: buildEntries('contact', 1) },
  { id: 'account', entries: buildEntries('account', 1) },
  { id: 'opportunity', entries: buildEntries('opportunity', 1) },
  { id: 'investments', entries: buildEntries('investments', 3) }
]

export interface DataImportSkeletonProps {
  'data-testid'?: string
}

export const DataImportSkeleton: React.FC<DataImportSkeletonProps> = ({
  'data-testid': testId = 'DataImport-skeleton'
}) => {
  const { t } = useTranslation(translations)
  return (
    <PageLayout headerIcon={FileArrowUpIcon} headerTitle={t('data-import-header-title')} data-testid={testId}>
      <div className="gba:mb-6">
        <Skeleton className="gba:h-10 gba:w-full gba:max-w-md" />
      </div>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
        {STATIC_SKELETON_CARDS.map(card => (
          <Card
            key={`data-import-skeleton-card-${card.id}`}
            className="gba:shadow-md gba:rounded-xl gba:border gba:border-slate-200 gba:overflow-hidden gba:flex gba:flex-col gba:min-h-[280px]"
            data-testid={`${testId}-card-${card.id}`}
          >
            <div className="gba:px-3 gba:pt-4">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                <Skeleton className="gba:h-10 gba:w-10 gba:rounded-full" />
                <Skeleton className="gba:h-4 gba:w-40" />
              </div>
              <Skeleton className="gba:h-3 gba:w-full gba:mb-1" />
              <Skeleton className="gba:h-3 gba:w-5/6 gba:mb-1" />
              <Skeleton className="gba:h-3 gba:w-2/3 gba:mb-4" />
            </div>
            <div className="gba:border-t gba:border-slate-200"></div>
            <div className="gba:px-4 gba:pt-2 gba:pb-4 gba:space-y-2">
              {card.entries.map(entry => (
                <Skeleton key={entry.id} className="gba:h-9 gba:w-full gba:rounded-lg" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  )
}

export default DataImportSkeleton
