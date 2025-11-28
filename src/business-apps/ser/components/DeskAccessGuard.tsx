import React from 'react'
import { Alert } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { StepReceiver } from '../packages/services-plus-core/src'
import { useDesksForUser } from '../hooks/useDesksForUser'

export interface DeskAccessGuardProps extends BusinessAppContextProps {
  requiredDesk?: StepReceiver
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Route guard component that checks if user has access to a specific desk
 * If no specific desk is required, checks if user has access to any desk
 */
export const DeskAccessGuard: React.FC<DeskAccessGuardProps> = ({
  requiredDesk,
  children,
  fallback,
  accessToken,
  userInfo
}) => {
  const { availableDesks, isLoading, error, hasAccessToDesk } = useDesksForUser({ accessToken, userInfo })

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="desk-access-guard-loading"
        className="gba:p-6 gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <div className="gba:flex gba:items-center gba:gap-4">
          <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600"></div>
          <span className="gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel('services.guard.loading', 'Checking desk access permissions...')}
          </span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div data-testid="desk-access-guard-error" className="gba:p-6">
        <Alert
          message={getTranslationFromI18nKeyAndLabel('services.guard.error.title', 'Access Check Failed')}
          description={getTranslationFromI18nKeyAndLabel(
            'services.guard.error.description',
            `Failed to verify desk access permissions: ${error}`
          )}
          type="error"
          showIcon
          className="gba:max-w-md gba:mx-auto"
        />
      </div>
    )
  }

  // Check access for specific desk
  if (requiredDesk) {
    const hasAccess = hasAccessToDesk(requiredDesk)

    if (!hasAccess) {
      console.log(`DeskAccessGuard: Access denied to desk ${requiredDesk}`, {
        requiredDesk,
        availableDesks: availableDesks.map(d => d.desk),
        userHasAccess: hasAccess
      })

      return (
        fallback || (
          <div data-testid="desk-access-guard-denied" className="gba:p-6">
            <Alert
              message={getTranslationFromI18nKeyAndLabel('services.guard.denied.title', 'Access Denied')}
              description={getTranslationFromI18nKeyAndLabel(
                'services.guard.denied.specific.description',
                `You do not have permission to access the ${requiredDesk} service desk.`
              )}
              type="warning"
              showIcon
              className="gba:max-w-md gba:mx-auto"
            />
          </div>
        )
      )
    }
  }

  // Check if user has access to any desk
  if (availableDesks.length === 0) {
    console.log('DeskAccessGuard: No desk access found', {
      availableDesks,
      userInfo: userInfo?.employeeDetails?.employeeId
    })

    return (
      fallback || (
        <div data-testid="desk-access-guard-no-access" className="gba:p-6">
          <Alert
            message={getTranslationFromI18nKeyAndLabel('services.guard.noAccess.title', 'No Service Desk Access')}
            description={getTranslationFromI18nKeyAndLabel(
              'services.guard.noAccess.description',
              'You do not have permission to access any service desks. Please contact your administrator.'
            )}
            type="warning"
            showIcon
            className="gba:max-w-md gba:mx-auto"
          />
        </div>
      )
    )
  }

  // Access granted
  console.log('DeskAccessGuard: Access granted', {
    requiredDesk,
    availableDesks: availableDesks.map(d => d.desk),
    hasSpecificAccess: requiredDesk ? hasAccessToDesk(requiredDesk) : true
  })

  return <>{children}</>
}
