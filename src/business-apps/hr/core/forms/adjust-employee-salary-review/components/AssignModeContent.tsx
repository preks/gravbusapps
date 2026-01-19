import React from 'react'
import type { DetailRow, AssignmentDetailsResult } from '../buildRows'
import type { TranslationFunction } from '../utils/salaryFormatters'

interface AssignModeContentProps {
  newSalaryDetailRows: DetailRow[]
  assignmentDetails: AssignmentDetailsResult | null
  t: TranslationFunction
}

/**
 * Content section for "assign" mode - shows new salary details
 * for employees without existing salary (single-column display)
 */
export const AssignModeContent: React.FC<AssignModeContentProps> = ({ newSalaryDetailRows, assignmentDetails, t }) => {
  return (
    <div className="gba:space-y-6" data-testid="assign-employee-salary-review-content">
      {/* New Salary Section */}
      <div data-testid="assign-employee-salary-review-salary-section">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
          {t('assign-salary-review-salary-details', { defaultValue: 'Salary Details' })}
        </h3>
        <div className="gba:space-y-3">
          {newSalaryDetailRows.map(row => {
            // Only the primary salary row (annual or hourly) gets a border
            const isPrimarySalary = row.key === 'annualSalary' || row.key === 'hourlySalary'
            return (
              <div
                key={row.key}
                className={`gba:p-3 gba:rounded-md ${isPrimarySalary ? 'gba:border gba:border-foreground' : ''}`}
                data-testid={`assign-employee-salary-review-${row.key}`}
              >
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{row.label}</div>
                <div className="gba:font-medium gba:text-foreground">{row.value}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Assignment Details Section */}
      {assignmentDetails && (
        <div className="gba:space-y-3" data-testid="assign-employee-salary-review-details-section">
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
            {t('assign-salary-review-assignment-details', { defaultValue: 'Assignment Details' })}
          </h3>

          {/* Start Date */}
          <div data-testid="assign-employee-salary-review-start-date">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
              {t('assign-salary-review-start-date', { defaultValue: 'Start Date' })}
            </div>
            <div className="gba:font-medium">{assignmentDetails.startDate}</div>
          </div>

          {/* Notes - Only if present */}
          {assignmentDetails.notes && (
            <div data-testid="assign-employee-salary-review-notes">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                {t('assign-salary-review-notes', { defaultValue: 'Notes' })}
              </div>
              <div className="gba:font-medium gba:whitespace-pre-wrap">{assignmentDetails.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AssignModeContent
