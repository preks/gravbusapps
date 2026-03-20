'use client'

import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Employee } from '../../../hooks/useEmployeeData'

interface FeedbackHubHeaderProps {
  t: (key: string, options?: Record<string, unknown>) => string
  employee: Employee
  accessToken: string
  isSelfView: boolean
  currentUserEmployeeId: string
  canRequestFeedbackOnBehalf?: boolean
}

const FeedbackHubHeader: React.FC<FeedbackHubHeaderProps> = ({
  t,
  employee,
  accessToken,
  isSelfView,
  currentUserEmployeeId,
  canRequestFeedbackOnBehalf = false
}) => (
  <div>
    <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:items-center gba:gap-4">
      <div className="gba:max-w-2xl">
        <h2 className="gba:font-bold gba:text-2xl">{t('feedback-hub-title')}</h2>
        <p className="gba:text-muted-foreground gba:text-lg">{t('feedback-hub-description')}</p>
      </div>
      <div className="gba:flex gba:gap-4 gba:items-center gba:self-center">
        {!isSelfView && (
          <AppAction
            variant="update-primary"
            contexts={[
              {
                context: FlowContextName.employeeGiveFeedback,
                contextData: {
                  // Resolve flow permissions against current user context.
                  employeeId: currentUserEmployeeId,
                  // Prefill modal target with viewed employee.
                  receiverId: employee?.userId || employee?.additionalProperties?.userId,
                  targetEmployeeId: employee?.id
                }
              }
            ]}
            prefixDataTestId="add-feedback"
            accessToken={accessToken}
            autoExecute={true}
          >
            {t('feedback-hub-give-feedback')}
          </AppAction>
        )}
        <AppAction
          variant="update-secondary"
          buttonSize="default"
          contexts={[
            {
              context: FlowContextName.employeeRequestFeedback,
              contextData:
                !isSelfView && canRequestFeedbackOnBehalf
                  ? {
                      // Keep initiator context as current user.
                      employeeId: currentUserEmployeeId,
                      // Run the request flow on behalf of the viewed employee.
                      targetEmployeeId: employee?.id,
                      subjectUserId: employee?.userId || employee?.additionalProperties?.userId,
                      isRequestingFeedback: true
                    }
                  : { employeeId: currentUserEmployeeId, isRequestingFeedback: true }
            }
          ]}
          prefixDataTestId="request-feedback"
          accessToken={accessToken}
          autoExecute={true}
        >
          {t('feedback-hub-request-feedback')}
        </AppAction>
      </div>
    </div>
  </div>
)

export default FeedbackHubHeader
