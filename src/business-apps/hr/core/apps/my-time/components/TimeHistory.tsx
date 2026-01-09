'use client'

import React from 'react'
import { Button, Card, Alert, Icon, useTranslation } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import { TimeEntriesTable } from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/TimeEntriesTable'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PencilIcon } from '@phosphor-icons/react'
import { exportTimeHistoryPdf } from '../utils/exportTimeHistoryPdf'
import timeTrackingTranslations from '../_i18n'

interface TimeHistoryProps {
  employeeId: string
  accessToken: string
  userId?: string
  employeeCode?: string
  employeeFirstName?: string
  employeeLastName?: string
}

const TimeHistory: React.FC<TimeHistoryProps> = ({
  employeeId,
  accessToken,
  userId,
  employeeCode,
  employeeFirstName,
  employeeLastName
}) => {
  const locale = getCurrentActiveUserLocale()
  const { currentMonth, prevMonth, nextMonth, entries, pageSize, setPageSize, error } = useTimeTrackingData({
    employeeId,
    accessToken
  })

  const { t } = useTranslation(timeTrackingTranslations)

  const handleGenerateReport = async () => {
    try {
      await exportTimeHistoryPdf({
        reportTitle: t('report_title'),
        generatedLabel: t('generated'),
        entries,
        monthDate: currentMonth,
        locale,
        employeeId,
        employeeCode,
        employeeFirstName,
        employeeLastName
      })
    } catch (e) {
      // Swallow errors silently; UI already has general error alert area
      // and PDF generation is a best-effort client-side feature.
      console.error('[TimeHistory] PDF export failed', e)
    }
  }

  return (
    <div data-testid="time-tracking-history-container">
      {/* Top-right actions */}
      <div className="gba:mb-3 gba:flex gba:items-center gba:justify-end gba:gap-2">
        <Button onClick={handleGenerateReport} data-testid="my-time-history-generate-report-button">
          {t('generate_report')}
        </Button>
        <AppAction
          variant="update-primary"
          data-testid="my-time-history-request-correction-button"
          contexts={[
            {
              context: FlowContextName.employeeAttendanceCorrectionRequest,
              contextData: { employeeId }
            }
          ]}
          prefixDataTestId="my-time-history-request-correction"
          accessToken={accessToken}
        >
          <>
            <Icon icon={PencilIcon} />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.actions.request_correction',
              'Request Correction'
            )}
          </>
        </AppAction>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-4">
          {error}
        </Alert>
      )}

      <Card className="gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-start gba:mb-3">
          <div className="gba:flex gba:gap-2" data-testid="history-month-selector">
            <Button variant="outline" onClick={prevMonth} data-testid="history-month-selector-prev">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.prev', 'Prev')}
            </Button>
            <div className="gba:self-center">
              {currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" onClick={nextMonth} data-testid="history-month-selector-next">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.next', 'Next')}
            </Button>
          </div>
        </div>

        <TimeEntriesTable
          entries={entries}
          locale={locale}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          accessToken={accessToken}
          employeeId={employeeId}
          userId={userId}
        />
      </Card>
    </div>
  )
}

export default TimeHistory
