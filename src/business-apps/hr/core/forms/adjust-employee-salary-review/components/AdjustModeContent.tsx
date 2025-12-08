import React from 'react'
import ReviewRows from '../../components/ReviewRows'
import type { ReviewRow } from '../../components/ReviewRows'
import type { AdjustmentDetails } from '../buildRows'
import type { TranslationFunction } from '../utils/salaryFormatters'

interface AdjustModeContentProps {
  comparisonRows: ReviewRow[]
  adjustmentDetails: AdjustmentDetails | null
  t: TranslationFunction
}

/**
 * Content section for "adjust" mode - shows salary comparison (old vs new)
 * and adjustment details including increase summary
 */
export const AdjustModeContent: React.FC<AdjustModeContentProps> = ({ comparisonRows, adjustmentDetails, t }) => {
  return (
    <>
      {/* Salary Comparison (Side-by-Side) */}
      <div className="gba:mb-6" data-testid="review-employee-salary-change-comparison-section">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
          {t('adjust-salary-review-salary-comparison', { defaultValue: 'Salary Comparison' })}
        </h3>
        <ReviewRows
          rows={comparisonRows}
          dataTestIdPrefix="review-employee-salary-change-row"
          oldDataText={t('adjust-salary-review-current-salary', { defaultValue: 'Current Salary' })}
          currentDataText={t('adjust-salary-review-new-salary', { defaultValue: 'New Salary' })}
          mode="diff"
        />
      </div>

      {/* Adjustment Details Section */}
      {adjustmentDetails && (
        <div className="gba:mb-4 gba:space-y-3" data-testid="adjust-employee-salary-review-details-section">
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
            {t('adjust-salary-review-adjustment-details', { defaultValue: 'Adjustment Details' })}
          </h3>

          {/* Increase Summary - Highlighted */}
          <div
            className="gba:bg-card gba:text-card-foreground gba:border gba:border-foreground gba:p-3 gba:rounded-md"
            data-testid="adjust-employee-salary-review-increase-summary"
          >
            <div className="gba:text-sm gba:font-medium gba:mb-1">
              {t('adjust-salary-review-total-increase', { defaultValue: 'Total Increase' })}
            </div>
            <div className="gba:text-lg gba:font-semibold">{adjustmentDetails.increaseSummary}</div>
          </div>

          {/* Effective Date */}
          <div data-testid="adjust-employee-salary-review-effective-date">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
              {t('adjust-salary-review-effective-date', { defaultValue: 'Effective Date' })}
            </div>
            <div className="gba:font-medium">{adjustmentDetails.effectiveDate}</div>
          </div>

          {/* Reason */}
          <div data-testid="adjust-employee-salary-review-reason">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
              {t('adjust-salary-review-reason', { defaultValue: 'Reason' })}
            </div>
            <div className="gba:font-medium">{adjustmentDetails.reason}</div>
          </div>

          {/* Notes - Only if present */}
          {adjustmentDetails.notes && (
            <div data-testid="adjust-employee-salary-review-notes">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                {t('adjust-salary-review-notes', { defaultValue: 'Notes' })}
              </div>
              <div className="gba:font-medium gba:whitespace-pre-wrap">{adjustmentDetails.notes}</div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default AdjustModeContent
