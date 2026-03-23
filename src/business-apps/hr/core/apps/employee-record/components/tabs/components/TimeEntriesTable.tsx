'use client'

import React from 'react'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { TimeEntry } from '../hooks/useTimeTrackingData'
import hrI18n from './_i18n'
import { formatDurationToHHMM } from '@/business-apps/hr/core/apps/my-time/utils/duration'

export interface TimeEntriesTableProps {
  entries: TimeEntry[]
  locale: string
  pageSize: number
  onPageSizeChange: (s: number) => void
  accessToken: string
  employeeId: string
  userId?: string
  /** When false, hides the "Rows per page" selector (e.g. for My Time Time History with fixed 100) */
  showRowsPerPage?: boolean
}

export const TimeEntriesTable: React.FC<TimeEntriesTableProps> = props => {
  const { entries, locale, pageSize, onPageSizeChange, accessToken, employeeId, userId, showRowsPerPage = true } = props
  const { t } = useTranslation(hrI18n)

  const statusToVariant: Record<string, any> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'destructive',
    open: 'info'
  }

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '-'

  const formatDate = (iso: string): string => {
    const d = new Date(iso)
    const loc = String(locale || 'en-US').toLowerCase()
    // Ensure dd.mm.yyyy format for German and Romanian locales
    if (loc.startsWith('de') || loc.startsWith('ro')) {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}.${month}.${year}`
    }
    // For other locales, use the standard locale formatting
    return d.toLocaleDateString(locale || 'en-US')
  }

  const getLocationLabel = (loc?: string) => {
    switch (loc) {
      case 'IS_NEAR_HOME':
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.home', 'Home')
      case 'IS_NEAR_OFFICE':
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.office', 'Office')
      case 'IS_OTHER_LOCATION':
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.remote', 'Remote Location')
      default:
        return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.unknown', 'Unknown')
    }
  }

  return (
    <div data-testid="time-tracking-table">
      <Table className="gba:[&_th]:py-1.5 gba:[&_td]:py-1.5 gba:[&_tbody_tr]:h-10 gba:[&_tbody_td]:align-middle">
        <TableHeader>
          <TableRow>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.date', 'Date')}</TableHead>
            <TableHead>
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking_table_workday', 'Day Type')}
            </TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.start', 'Start')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.end', 'End')}</TableHead>
            <TableHead>
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.recorded', 'Recorded')}
            </TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.break', 'Break')}</TableHead>
            <TableHead>
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.effective', 'Effective')}
            </TableHead>
            <TableHead>
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.planned', 'Planned')}
            </TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.diff', 'Diff')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.manual', 'Manual')}</TableHead>
            <TableHead>
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.label', 'Location')}
            </TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.notes', 'Notes')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.status', 'Status')}</TableHead>
            <TableHead className="gba:w-[60px]">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={14} className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.empty', 'No entries')}
              </TableCell>
            </TableRow>
          ) : (
            entries.map(e => (
              <TableRow
                key={e.id}
                data-testid={`time-tracking-table-row-${e.id}`}
                className={e.isPlaceholder ? 'gba:text-muted-foreground' : undefined}
              >
                <TableCell data-testid={`time-tracking-table-date-cell-${e.id}`}>
                  {formatDate(e.attendanceDateISO)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-daytype-cell-${e.id}`}>
                  {e.absenceLabel
                    ? e.absenceLabel
                    : e.dayType === 'holiday'
                      ? t('holiday')
                      : e.dayType === 'weekend'
                        ? t('time_tracking_day_type_weekend')
                        : e.dayType === 'non_working'
                          ? t('time_tracking_day_type_not_working')
                          : t('time_tracking_day_type_work_day')}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-start-cell-${e.id}`}>
                  {formatTime(e.startTimeISO)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-end-cell-${e.id}`}>{formatTime(e.endTimeISO)}</TableCell>
                <TableCell data-testid={`time-tracking-table-recorded-cell-${e.id}`}>
                  {e.recordedTime != null && e.recordedTime !== '' ? formatDurationToHHMM(e.recordedTime) : '-'}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-break-cell-${e.id}`}>
                  {e.isPlaceholder ? '-' : formatDurationToHHMM(e.breakTime ?? '0h')}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-effective-cell-${e.id}`}>
                  {e.effectiveTime != null && e.effectiveTime !== '' ? formatDurationToHHMM(e.effectiveTime) : '-'}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-planned-cell-${e.id}`}>
                  {e.plannedTime != null && e.plannedTime !== '' ? formatDurationToHHMM(e.plannedTime) : '-'}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-diff-cell-${e.id}`}>
                  {e.differenceTime != null && e.differenceTime !== '' ? formatDurationToHHMM(e.differenceTime) : '-'}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-manual-cell-${e.id}`}>
                  {e.isPlaceholder ? (
                    '-'
                  ) : (
                    <Badge variant={e.manualOverride ? 'warning' : 'secondary'}>
                      {e.manualOverride
                        ? getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')
                        : getTranslationFromI18nKeyAndLabel('common.no', 'No')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-location-cell-${e.id}`}>
                  {e.isPlaceholder ? '-' : getLocationLabel(e.attendanceLocation)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-notes-cell-${e.id}`}>{e.notes ?? ''}</TableCell>
                <TableCell data-testid={`time-tracking-table-status-cell-${e.id}`}>
                  {e.status ? (
                    <Badge variant={statusToVariant[e.status] || 'info'}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="gba:py-1.5 gba:px-2 gba:align-middle">
                  {!e.isPlaceholder ? (
                    <div className="gba:flex gba:items-center gba:justify-start gba:scale-[0.65] gba:origin-left">
                      <AppActionButton
                        data-testid={`time-tracking-update-button-${e.id}`}
                        size="icon"
                        contextsArray={[FlowContextName.employeeAttendanceCorrectionRequest]}
                        externalContextData={{
                          employeeId,
                          employeeid: employeeId,
                          timeEntryId: e.id,
                          attendanceDateISO: e.attendanceDateISO,
                          startTimeISO: e.startTimeISO,
                          endTimeISO: e.endTimeISO,
                          notes: e.notes,
                          timeEntryVersion: e.version,
                          recordedTime: e.recordedTime,
                          breakTime: e.breakTime,
                          effectiveTime: e.effectiveTime,
                          plannedTime: e.plannedTime,
                          differenceTime: e.differenceTime,
                          changeMode: 'INSERT',
                          userId: userId,
                          employeeAttendanceCorrectionRequest: {
                            timeEntryVersion: e.version,
                            timeEntryId: e.id
                          }
                        }}
                        prefixDataTestId={`time-tracking-update`}
                        accessToken={accessToken}
                        emptyStateBehavior="enable"
                        onClick={evt => evt.stopPropagation()}
                      />
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Custom footer with rows-per-page aligned right (optional, hidden on My Time Time History) */}
      {showRowsPerPage && (
        <div className="gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border gba:pt-4 gba:mt-4">
          <div />
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">Rows per page</span>
            <select
              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              data-testid="time-tracking-rows-per-page"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeEntriesTable
