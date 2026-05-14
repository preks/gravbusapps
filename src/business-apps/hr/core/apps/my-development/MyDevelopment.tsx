'use client'

import React from 'react'
import { ChartBarIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCurrentUserEmployeeRecordData } from '../employee-record/hooks/useCurrentUserEmployeeRecordData'
import { HrSelfServiceEmployeeBoundary } from '../employee-record/components/HrSelfServiceEmployeeBoundary'
import HrGrowthTab from '../employee-record/components/tabs/HrGrowthTab'
import translations from '../employee-record/_i18n'

export const MyDevelopment: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const { loading, error, employee, employeeId, feedback, performanceGoals, performanceEvaluationFeatureFlag } =
    useCurrentUserEmployeeRecordData(accessToken, userInfo)

  return (
    <HrSelfServiceEmployeeBoundary
      loading={loading}
      error={error}
      employee={employee}
      loadingTestId="my-development-loading"
      errorTestId="my-development-error"
      unavailableMessage={t('my-development-unavailable')}
    >
      {resolvedEmployee => (
        <div data-testid="my-development-container" className="gba:min-h-screen gba:w-full gba:px-6 gba:pb-6">
          <div className="gba:flex gba:min-h-24 gba:items-center gba:border-b gba:border-border">
            <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-4">
              <span className="gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:text-primary">
                <ChartBarIcon size={32} />
              </span>
              <div className="gba:min-w-0">
                <h1 className="gba:text-2xl gba:font-secondary gba:font-semibold gba:tracking-tight">
                  {t('my-development-page-title')}
                </h1>
                <p className="gba:text-sm gba:text-muted-foreground">{t('my-development-page-description')}</p>
              </div>
            </div>
          </div>

          <div className="gba:pt-4">
            <HrGrowthTab
              employee={resolvedEmployee}
              employeeId={employeeId}
              accessToken={accessToken}
              userInfo={userInfo}
              isSelfView
              performanceEvaluationFeatureFlag={performanceEvaluationFeatureFlag}
              employeePerformanceGoals={performanceGoals}
              feedback={feedback}
              urlMode="standalone"
            />
          </div>
        </div>
      )}
    </HrSelfServiceEmployeeBoundary>
  )
}

export default MyDevelopment
