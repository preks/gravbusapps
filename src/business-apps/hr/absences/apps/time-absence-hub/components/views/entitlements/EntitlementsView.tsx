import React, { useState } from 'react'
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import UpdateEmployeeEntitlements from '@/business-apps/hr/core/forms/update-employee-entitlements'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import { EntitlementHealthFilter, useEntitlementsOverviewData } from '../../../hooks/useEntitlementsOverviewData'
import { openEmployeeTimeTracking } from '../../../utils/hubNavigation'
import { EntitlementsTable } from './EntitlementsTable'

interface EntitlementsViewProps extends BusinessAppContextProps {
  globalFilters: HubGlobalFilters
  onNavigateToEntitlementsDetails?: () => void
  filterAction?: React.ReactNode
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.entitlements.${key}`, fallback)

const PAGE_SIZE = 50

export const EntitlementsView: React.FC<EntitlementsViewProps> = ({
  accessToken,
  userInfo,
  globalFilters,
  filterAction
}) => {
  const [page, setPage] = useState(1)
  const [updateEmployeeId, setUpdateEmployeeId] = useState<string | null>(null)
  const healthFilter: EntitlementHealthFilter = 'all'

  const overview = useEntitlementsOverviewData({
    accessToken,
    filters: globalFilters,
    healthFilter,
    page,
    pageSize: PAGE_SIZE
  })

  const totalPages = Math.max(1, Math.ceil(overview.total / PAGE_SIZE))
  const pageInfoText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.entitlements.page_info',
    `Page ${page} of ${totalPages}`,
    { page, totalPages }
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="time-absence-hub-entitlements-view">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{tt('title', 'Entitlements')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {tt('description', 'Vacation entitlement balances for the selected filter scope.')}
          </p>
        </div>
        {filterAction}
      </div>

      <EntitlementsTable
        rows={overview.rows}
        isLoading={overview.isLoading}
        error={overview.error}
        onUpdateEntitlement={setUpdateEmployeeId}
        onOpenEmployee={openEmployeeTimeTracking}
      />

      {overview.total > PAGE_SIZE && (
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            data-testid="time-absence-hub-entitlements-prev-page"
          >
            {tt('pagination_previous', 'Previous')}
          </Button>
          <span className="gba:text-xs gba:text-muted-foreground">{pageInfoText}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            data-testid="time-absence-hub-entitlements-next-page"
          >
            {tt('pagination_next', 'Next')}
          </Button>
        </div>
      )}

      <Sheet open={Boolean(updateEmployeeId)} onOpenChange={open => !open && setUpdateEmployeeId(null)}>
        <SheetContent className="gba:w-full gba:max-w-3xl gba:overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{tt('update_sheet_title', 'Update entitlements')}</SheetTitle>
          </SheetHeader>
          {updateEmployeeId && (
            <UpdateEmployeeEntitlements
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={{ employeeId: updateEmployeeId }}
              onSubmit={() => setUpdateEmployeeId(null)}
              onCancel={() => setUpdateEmployeeId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default EntitlementsView
