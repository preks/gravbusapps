'use client'

import React from 'react'
import { Button, Card, Alert, Icon } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import { TimeEntriesTable } from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/TimeEntriesTable'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PencilIcon } from '@phosphor-icons/react'

interface TimeHistoryProps {
  employeeId: string
  accessToken: string
}

const TimeHistory: React.FC<TimeHistoryProps> = ({ employeeId, accessToken }) => {
  const locale = getCurrentActiveUserLocale()
  const { currentMonth, prevMonth, nextMonth, entries, pageSize, setPageSize, error } = useTimeTrackingData({
    employeeId,
    accessToken
  })

  return (
    <div data-testid="time-tracking-history-container">
      {/* Top-left Request Correction button */}
      <div className="gba:mb-3 gba:flex gba:items-center gba:justify-end">
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
        />
      </Card>
    </div>
  )
}

export default TimeHistory
