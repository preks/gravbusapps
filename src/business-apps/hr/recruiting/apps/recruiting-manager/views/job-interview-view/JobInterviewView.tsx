import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobInterviews } from '@/common/data/recruiting/hooks/useJobInterviews'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { JobInterviewCalendar } from './components/JobInterviewCalendar'
import type { JobInterview } from '@/common/data/recruiting/types/jobInterviewTypes'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import dayjs from 'dayjs'

export type JobInterviewViewProps = BusinessAppContextProps

export const JobInterviewView: React.FC<JobInterviewViewProps> = context => {
  const [monthOffset, setMonthOffset] = useState(0) // 0 = current month

  // Calculate date range for current month based on offset
  const currentMonth = useMemo(() => dayjs().add(monthOffset, 'month'), [monthOffset])
  const monthStart = useMemo(() => currentMonth.startOf('month').toISOString(), [currentMonth])
  const monthEnd = useMemo(() => currentMonth.endOf('month').toISOString(), [currentMonth])

  const { jobInterviews, loading, error, refetch } = useJobInterviews(
    context.accessToken,
    {
      where: {
        scheduledAt: {
          _gte: monthStart,
          _lte: monthEnd
        }
      },
      orderBy: [{ field: 'scheduledAt', direction: 'ASC_NULLS_LAST' as const }]
    },
    'list'
  )

  useProcessCompletion({
    onSuccess: () => {
      refetch()
    }
  })

  // Refetch when month changes
  useEffect(() => {
    refetch()
  }, [monthStart, monthEnd, refetch])

  // Handle month change from calendar
  const handleMonthChange = useCallback((newMonthOffset: number) => {
    setMonthOffset(newMonthOffset)
  }, [])

  // Handle interview click - navigate to application record
  const handleInterviewClick = useCallback((interview: JobInterview) => {
    if (interview.jobApplicationId) {
      const url = buildPlatformUrl('/platform/hr/recruiting/job-application-record', {
        jobApplicationId: interview.jobApplicationId
      })
      navigateTo(url)
    }
  }, [])

  return (
    <div data-testid="job-interview-view" className="gba:h-full">
      <JobInterviewCalendar
        interviews={jobInterviews}
        loading={loading}
        error={error}
        onInterviewClick={handleInterviewClick}
        monthOffset={monthOffset}
        onMonthChange={handleMonthChange}
      />
    </div>
  )
}

export default JobInterviewView
