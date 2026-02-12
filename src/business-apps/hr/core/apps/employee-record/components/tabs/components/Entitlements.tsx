import React from 'react'
import { IconAvatar } from '@newwork/nw-design-system'
import { EntitlementsProps } from '../../../queries/types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

const Entitlements: React.FC<EntitlementsProps> = ({ entitlements, loading, error }) => {
  if (loading) {
    return (
      <div
        className="gba:loading-skeleton gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
        data-testid="entitlements-loading"
      >
        {['skeleton-1', 'skeleton-2', 'skeleton-3'].map(skeletonId => (
          <div key={skeletonId} className="gba:h-40 gba:bg-muted gba:rounded gba:animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:error-container gba:text-center gba:py-8" data-testid="entitlements-error">
        <div className="gba:text-destructive gba:text-lg gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.error_loading', 'Failed to load entitlements data.')}
        </div>
        <div className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try again.')}
        </div>
      </div>
    )
  }

  if (entitlements.length === 0) {
    return (
      <div
        className="gba:no-entitlements gba:text-center gba:text-muted-foreground gba:py-8"
        data-testid="no-entitlements"
      >
        {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data found')}
      </div>
    )
  }

  return (
    <div
      className="gba:entitlements-grid gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
      data-testid="entitlements-grid"
    >
      {entitlements.map((entitlement, idx) => (
        <div
          key={entitlement.typeId || entitlement.type}
          className="gba:entitlement-card gba:border gba:rounded gba:p-4"
          data-testid={`entitlement-card-${idx}`}
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <IconAvatar icon={entitlement.icon} variant="decorative" size="md" />
            <h4 className="gba:text-lg gba:font-medium">{entitlement.type}</h4>
          </div>

          <div className="gba:entitlement-details gba:mt-4">
            <div className="gba:flex gba:justify-between gba:mb-1">
              <span className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used_annual_leave', 'Used')}
              </span>
              <span className="gba:font-medium">
                {entitlement.used} / {entitlement.total}
              </span>
            </div>

            <div className="gba:progress-bar gba:bg-border gba:rounded-full gba:h-2 gba:mb-3">
              <div
                className="gba:progress gba:h-full gba:rounded-full"
                style={{
                  width: `${entitlement.total > 0 ? (entitlement.used / entitlement.total) * 100 : 0}%`,
                  backgroundColor: `#${entitlement.color}`
                }}
              ></div>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
              </span>
              <span className="gba:font-medium gba:text-lg gba:text-card-foreground">{entitlement.available}</span>
            </div>

            {entitlement.pending > 0 && (
              <div className="gba:flex gba:justify-between gba:mt-2 gba:items-center">
                <span className="gba:text-amber-500">{getAbsenceStatusLabel('PENDING')}</span>
                <div className="gba:flex gba:items-center gba:gap-1">
                  <span className="gba:text-amber-500 gba:font-medium">{entitlement.pending}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.status_in_approval', 'days in approval')}
                  </span>
                </div>
              </div>
            )}

            {entitlement.checkEntitlement && (
              <div className="gba:entitlement-note gba:mt-3 gba:text-xs gba:text-muted-foreground gba:border-t gba:pt-2">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.entitlement_note',
                  'Entitlement is checked before approval'
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Entitlements
