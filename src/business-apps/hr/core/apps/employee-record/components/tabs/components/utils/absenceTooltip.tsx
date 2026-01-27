import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

/**
 * Function to generate tooltip content for absence segments
 */
export const getAbsenceTooltipContent = (absence: any, opts?: { showStatus?: boolean; showDuration?: boolean }) => {
  const startDate = dayjs(absence.startDate)
  const endDate = dayjs(absence.endDate)
  const duration = endDate.diff(startDate, 'day') + 1

  return (
    <div className="gba:max-w-xs gba:p-2">
      <div className="gba:font-semibold gba:text-sm gba:mb-2 gba:flex gba:items-center gba:gap-2">
        <div
          className="gba:w-3 gba:h-3 gba:rounded-full"
          style={{ backgroundColor: absence.statusColor || 'var(--nw-offline)' }}
        />
        {absence.type}
      </div>
      <div className="gba:space-y-1 gba:text-xs">
        {opts?.showStatus && (
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}:
            </span>
            <span className="gba:font-medium" style={{ color: absence.statusColor || 'var(--nw-offline)' }}>
              {getAbsenceStatusLabel(absence.originalStatus || absence.status)}
            </span>
          </div>
        )}
        <div className="gba:flex gba:justify-between">
          <span className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_detailed_view.start', 'Start')}:
          </span>
          <span>{startDate.format('MMM DD, YYYY')}</span>
        </div>
        <div className="gba:flex gba:justify-between">
          <span className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_detailed_view.end', 'End')}:
          </span>
          <span>{endDate.format('MMM DD, YYYY')}</span>
        </div>
        {opts?.showDuration && (
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:
            </span>
            <span>
              {duration}{' '}
              {duration === 1
                ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.limited_pending_days_text.day', 'day')
                : getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.limited_pending_days_text.days', 'days')}
            </span>
          </div>
        )}
        {absence.description && (
          <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-border">
            <div className="gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.document_layout.document_table.description',
                'Description'
              )}
              :
            </div>
            <div className="gba:text-muted-foreground gba:break-words">{absence.description}</div>
          </div>
        )}
      </div>
    </div>
  )
}
