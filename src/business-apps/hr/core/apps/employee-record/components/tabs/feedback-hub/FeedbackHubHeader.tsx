'use client'

import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Employee } from '../../../hooks/useEmployeeData'

interface FeedbackHubHeaderProps {
  t: (key: string, options?: Record<string, unknown>) => string
  employee: Employee
  accessToken: string
}

const FeedbackHubHeader: React.FC<FeedbackHubHeaderProps> = ({ t, employee, accessToken }) => (
  <div>
    <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:items-center gba:gap-4">
      <div className="gba:max-w-2xl">
        <h2 className="gba:font-bold gba:text-2xl">{t('feedback-hub-title')}</h2>
        <p className="gba:text-muted-foreground gba:text-lg">{t('feedback-hub-description')}</p>
      </div>
      <div className="gba:flex gba:gap-4 gba:items-center gba:self-center">
        <AppAction
          variant="update-primary"
          contexts={[
            {
              context: FlowContextName.employeeRequestFeedback,
              contextData: { employeeId: employee?.id, isRequestingFeedback: true }
            }
          ]}
          prefixDataTestId="request-feedback"
          accessToken={accessToken}
          autoExecute={true}
        >
          {t('feedback-hub-request-feedback')}
        </AppAction>
        <AppAction
          variant="update-secondary"
          buttonSize="default"
          contexts={[{ context: FlowContextName.employeeGiveFeedback, contextData: { employeeId: employee?.id } }]}
          prefixDataTestId="add-feedback"
          accessToken={accessToken}
          autoExecute={true}
        >
          {t('feedback-hub-give-feedback')}
        </AppAction>
      </div>
    </div>
  </div>
)

export default FeedbackHubHeader
