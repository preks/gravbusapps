import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'

const KPI_SKELETON_KEYS = ['kpi-total', 'kpi-market-value', 'kpi-performance', 'kpi-count']
const TABLE_COLUMN_KEYS = ['investment', 'group', 'type', 'amount', 'owner', 'status']
const TABLE_ROW_KEYS = ['row-one', 'row-two', 'row-three', 'row-four', 'row-five', 'row-six', 'row-seven', 'row-eight']

export const InvestmentViewSkeleton: React.FC = () => (
  <div data-testid="investment-view-skeleton" className="gba:space-y-6">
    <div className="gba:space-y-3">
      <Skeleton className="gba:h-8 gba:w-64" />
      <Skeleton className="gba:h-5 gba:w-96 gba:max-w-full" />
    </div>

    <div className="gba:grid gba:grid-cols-1 gba:gap-4 md:gba:grid-cols-2 lg:gba:grid-cols-4">
      {KPI_SKELETON_KEYS.map(key => (
        <div key={key} className="gba:rounded-lg gba:border gba:bg-card gba:p-4 gba:space-y-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Skeleton className="gba:h-5 gba:w-32" />
            <Skeleton className="gba:h-8 gba:w-8 gba:rounded-full" />
          </div>
          <Skeleton className="gba:h-8 gba:w-28" />
          <Skeleton className="gba:h-4 gba:w-40" />
        </div>
      ))}
    </div>

    <div className="gba:rounded-lg gba:border gba:bg-card">
      <div className="gba:border-b gba:p-4 gba:space-y-4">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Skeleton className="gba:h-9 gba:w-28" />
            <Skeleton className="gba:h-9 gba:w-28" />
            <Skeleton className="gba:h-9 gba:w-28" />
          </div>
          <Skeleton className="gba:h-9 gba:w-36" />
        </div>

        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
          <Skeleton className="gba:h-10 gba:w-80 gba:max-w-full" />
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Skeleton className="gba:h-10 gba:w-28" />
            <Skeleton className="gba:h-10 gba:w-24" />
            <Skeleton className="gba:h-10 gba:w-24" />
          </div>
        </div>
      </div>

      <div className="gba:overflow-hidden">
        <div className="gba:grid gba:grid-cols-6 gba:gap-4 gba:border-b gba:bg-muted/40 gba:px-4 gba:py-3">
          {TABLE_COLUMN_KEYS.map(key => (
            <Skeleton key={key} className="gba:h-4 gba:w-24" />
          ))}
        </div>

        {TABLE_ROW_KEYS.map(rowKey => (
          <div key={rowKey} className="gba:grid gba:grid-cols-6 gba:gap-4 gba:border-b gba:px-4 gba:py-4">
            {TABLE_COLUMN_KEYS.map(columnKey => (
              <Skeleton key={`${rowKey}-${columnKey}`} className="gba:h-4 gba:w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default InvestmentViewSkeleton
