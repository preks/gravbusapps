import React from 'react'
import type { DeactivationDetails } from '../types'

interface DeactivationDetailsListProps {
  details: DeactivationDetails
  dataTestIdPrefix: string
  t: (key: string, options?: { defaultValue?: string }) => string
}

/**
 * Display component for deactivation request details
 * Shows the requested end date and deactivation reason for HR review
 */
export const DeactivationDetailsList: React.FC<DeactivationDetailsListProps> = ({ details, dataTestIdPrefix, t }) => {
  return (
    <div className="gba:space-y-4" data-testid={`${dataTestIdPrefix}-deactivation-list`}>
      {/* Requested End Date */}
      <div data-testid={`${dataTestIdPrefix}-end-date`}>
        <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
          {t('deactivate-benefit-review-end-date', { defaultValue: 'Requested End Date' })}
        </div>
        <div className="gba:text-xl gba:font-bold">{details.requestedEndDate || '-'}</div>
      </div>

      {/* Deactivation Reason */}
      <div data-testid={`${dataTestIdPrefix}-reason`}>
        <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
          {t('deactivate-benefit-review-reason', { defaultValue: 'Reason for Deactivation' })}
        </div>
        <div className="gba:font-medium gba:whitespace-pre-wrap">{details.deactivationReason || '-'}</div>
      </div>
    </div>
  )
}
