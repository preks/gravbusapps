'use client'

import React from 'react'
import { ChartBarIcon } from '@phosphor-icons/react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { useCurrentUserEmployeeRecordData } from '../employee-record/hooks/useCurrentUserEmployeeRecordData'
import { HrSelfServiceEmployeeBoundary } from '../employee-record/components/HrSelfServiceEmployeeBoundary'
import HrGrowthTab from '../employee-record/components/tabs/HrGrowthTab'
import translations from '../employee-record/_i18n'

export const MyDevelopment: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const { loading, error, employee, employeeId, feedback, performanceGoals, devFeatureFlag } =
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
                employee={resolvedEmployee}
                employeeId={employeeId}
                accessToken={accessToken}
                userInfo={userInfo}
                isSelfView
                devFeatureFlag={devFeatureFlag}
                employeePerformanceGoals={performanceGoals}
                feedback={feedback}
                urlMode="standalone"
              />
            </div>
          </PageLayout>
        </div>
      )}
    </HrSelfServiceEmployeeBoundary>
  )
}

export default MyDevelopment
