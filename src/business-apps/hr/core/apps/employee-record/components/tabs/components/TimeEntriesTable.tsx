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

export interface TimeEntriesTableProps {
  entries: TimeEntry[]
  locale: string
  pageSize: number
  onPageSizeChange: (s: number) => void
  accessToken: string
  employeeId: string
  userId?: string
}

export const TimeEntriesTable: React.FC<TimeEntriesTableProps> = props => {
  const { entries, locale, pageSize, onPageSizeChange, accessToken, employeeId, userId } = props
  const { t } = useTranslation(hrI18n)

  const statusToVariant: Record<string, any> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'destructive',
    open: 'info'
  }

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '-'

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.date', 'Date')}</TableHead>
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
              <TableCell colSpan={13} className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.empty', 'No entries')}
              </TableCell>
            </TableRow>
          ) : (
            entries.map(e => (
              <TableRow key={e.id} data-testid={`time-tracking-table-row-${e.id}`}>
                <TableCell data-testid={`time-tracking-table-date-cell-${e.id}`}>
                  {new Date(e.attendanceDateISO).toLocaleDateString(locale)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-start-cell-${e.id}`}>
                  {formatTime(e.startTimeISO)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-end-cell-${e.id}`}>{formatTime(e.endTimeISO)}</TableCell>
                <TableCell data-testid={`time-tracking-table-recorded-cell-${e.id}`}>{e.recordedTime ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-break-cell-${e.id}`}>{e.breakTime ?? '0h'}</TableCell>
                <TableCell data-testid={`time-tracking-table-effective-cell-${e.id}`}>
                  {e.effectiveTime ?? '-'}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-planned-cell-${e.id}`}>{e.plannedTime ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-diff-cell-${e.id}`}>{e.differenceTime ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-manual-cell-${e.id}`}>
                  <Badge variant={e.manualOverride ? 'warning' : 'secondary'}>
                    {e.manualOverride
                      ? getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')
                      : getTranslationFromI18nKeyAndLabel('common.no', 'No')}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`time-tracking-table-location-cell-${e.id}`}>
                  {getLocationLabel(e.attendanceLocation)}
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
                <TableCell className="gba:py-4 gba:px-6">
                  <div className="gba:flex gba:justify-start gba:gap-2">
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Custom footer with rows-per-page aligned right */}
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
    </div>
  )
}

export default TimeEntriesTable
