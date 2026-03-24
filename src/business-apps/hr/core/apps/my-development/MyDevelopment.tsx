'use client'

import React, { useEffect } from 'react'
import { ChartBarIcon } from '@phosphor-icons/react'
import { PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useEmployeeData } from '../employee-record/hooks/useEmployeeData'
import HrGrowthTab from '../employee-record/components/tabs/HrGrowthTab'
import translations from '../employee-record/_i18n'

export const MyDevelopment: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const activeStructureId = getCurrentActiveStructureId() || ''
  const employeeId = userInfo?.employeeDetails?.employeeId || ''
  const devFeatureFlag = useFeature(Feature.Dev.Enabled.Key)

  const { loading, error, employee, feedback, performanceGoals, silentRefetch } = useEmployeeData(
    accessToken,
    activeStructureId,
    employeeId
  )

  useEffect(() => {
    const pendingRefetchTimers = new Set<number>()

    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      const resolution = customEvent.detail.resolution
      if (resolution === 'success') {
        silentRefetch()
        const followUpRefetchTimer = window.setTimeout(() => {
          pendingRefetchTimers.delete(followUpRefetchTimer)
          silentRefetch()
        }, 1200)
        pendingRefetchTimers.add(followUpRefetchTimer)
      }
    }

    globalThis.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)

    return () => {
      pendingRefetchTimers.forEach(timerId => window.clearTimeout(timerId))
      globalThis.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
    }
  }, [silentRefetch])

  if (loading) {
    return (
      <div
        className="gba:flex gba:min-h-screen gba:items-center gba:justify-center"
        data-testid="my-development-loading"
      >
        <Spinner />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div
        className="gba:flex gba:min-h-screen gba:items-center gba:justify-center gba:text-muted-foreground"
        data-testid="my-development-error"
      >
        <p>{t('my-development-unavailable')}</p>
      </div>
    )
  }

  return (
    <div data-testid="my-development-container" className="gba:min-h-screen">
      <PageLayout
        headerIcon={ChartBarIcon}
        headerTitle={t('my-development-page-title')}
        headerDescription={t('my-development-page-description')}
        variant={MODULE_COLORS.HR}
        className="gba:min-h-screen"
      >
        <div className="gba:mt-4">
          <HrGrowthTab
            employee={employee}
            employeeId={employeeId}
            accessToken={accessToken}
            userInfo={userInfo}
            isSelfView
            devFeatureFlag={devFeatureFlag as boolean}
            employeePerformanceGoals={performanceGoals}
            feedback={feedback}
            urlMode="standalone"
          />
        </div>
      </PageLayout>
    </div>
  )
}

export default MyDevelopment
