import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface WorkingHoursSummaryProps {
  fte?: number
  weeklySum?: number
  workingDays?: number
  exceedsWeeklyLimit: boolean
  exceedsWorkingDaysLimit: boolean
}

export const WorkingHoursSummary: React.FC<WorkingHoursSummaryProps> = ({
  fte,
  weeklySum,
  workingDays,
  exceedsWeeklyLimit,
  exceedsWorkingDaysLimit
}) => {
  const showFte = typeof fte === 'number'
  const showWeekly = typeof weeklySum === 'number'
  const showDays = typeof workingDays === 'number'

  return (
    <div className="gba:mt-6 gba:flex gba:flex-col gba:gap-6" data-testid="working-hours-summary">
      <div data-testid="working-hours-fte">
        <div className="gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.fte_label', 'FTE (Full Time Equivalent)')}
        </div>
        <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base">
          <span data-testid="flw_updateWorkingHours_fteInput">{showFte ? fte : '-'}</span>
        </div>
      </div>

      <div data-testid="working-hours-weekly-hours">
        <div className="gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:working_hours_form.weekly_working_hours_label',
            'Weekly Working Hours'
          )}
        </div>
        <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base">
          <span data-testid="flw_updateWorkingHours_weeklyWorkingHours">{showWeekly ? weeklySum : '-'}</span>
        </div>
        {showWeekly && exceedsWeeklyLimit && (
          <div
            className="gba:mt-2 gba:text-destructive"
            data-testid="flw_updateWorkingHours_weeklyWorkingHoursValidation"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:working_hours_form.working_hours_limit_exceeded_error',
              'Warning: The total hours entered exceed the maximum allowable limit of 48 hours per week. Please adjust your working hours to comply with legal regulations.'
            )}
          </div>
        )}
      </div>

      <div data-testid="working-hours-working-days">
        <div className="gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:working_hours_form.working_days_week_label',
            'Working Days / Week'
          )}
        </div>
        <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base">
          <span data-testid="flw_updateWorkingHours_workingDaysInput">{showDays ? workingDays : '-'}</span>
        </div>
        {showDays && exceedsWorkingDaysLimit && (
          <div
            className="gba:mt-2 gba:text-destructive"
            data-testid="flw_updateWorkingHours_weeklyWorkingDaysValidation"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:working_hours_form.working_days_limit_exceeded_error',
              'Warning: The total days entered exceed the maximum allowable limit of 6 days per week. Please adjust your working days to comply with legal regulations.'
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkingHoursSummary
