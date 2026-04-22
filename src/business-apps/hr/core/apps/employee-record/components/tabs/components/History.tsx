'use client'

import React from 'react'
import { Button, Card, CardContent, Alert } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '../hooks/useTimeTrackingData'
import { TimeEntriesTable } from './TimeEntriesTable'

interface HistoryProps {
  employeeId: string
  accessToken: string
}

const History: React.FC<HistoryProps> = ({ employeeId, accessToken }) => {
  const locale = getCurrentActiveUserLocale()
  const { currentMonth, prevMonth, nextMonth, entries, pageSize, setPageSize, sortKey, sortDir, setSort, error } =
    useTimeTrackingData({
      employeeId,
      accessToken
    })

  return (
    <div data-testid="time-tracking-history-container">
      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <CardContent className="gba:p-4">
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
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={setSort}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default History
