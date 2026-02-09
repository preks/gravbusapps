/**
 * Service Cases Application
 *
 * Case management for the Services module (Service Desk/Portal).
 * Uses the reusable CaseManagement component with service-specific configuration.
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CaseManagement } from '../../../common/apps/case-management'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { Alert } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ServiceCasesProps extends BusinessAppContextProps {
  /**
   * Default view to show on load
   */
  initialView?: 'dashboard' | 'list'

  /**
   * Callback when user wants to navigate to Service Desk
   */
  onServiceDeskNavigation?: () => void

  /**
   * Callback when user wants to navigate to Service Portal
   */
  onServicePortalNavigation?: () => void
}

/**
 * Service Cases component for the Services module.
 *
 * Provides case management capabilities specifically for service-related cases:
 * - IT support cases
 * - Service requests
 * - Incident management
 * - Problem tracking
 *
 * Uses tag filtering to show only service-related cases (AppCatalog:1:SER).
 */
export const ServiceCases: React.FC<ServiceCasesProps> = ({
  initialView = 'dashboard',
  // Navigation callbacks for future integrations
  onServiceDeskNavigation: _onServiceDeskNavigation,
  onServicePortalNavigation: _onServicePortalNavigation,
  ...contextProps
}) => {
  // Suppress unused variable warnings for future features
  void _onServiceDeskNavigation
  void _onServicePortalNavigation
  // Feature flag guard - check if Services module is enabled
  const servicesFeature = useFeature(Feature.Services.Enabled.Key)

  // Feature flag check - return early if explicitly disabled
  if (servicesFeature === false) {
    return (
      <div data-testid="services-cases-disabled" className="gba:p-6 gba:text-center">
        <Alert variant="default" className="gba:max-w-md gba:mx-auto">
          <h4 className="gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('services.feature.disabled.title', 'Feature Not Available')}
          </h4>
          <p>
            {getTranslationFromI18nKeyAndLabel(
              'services.feature.disabled.description',
              'Services is not enabled for your organization.'
            )}
          </p>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid="service-cases-container" className="gba:w-full gba:h-full">
      <CaseManagement
        appName="Service Cases"
        appDescription="Manage IT support cases, service requests, and incident tracking"
        appTag="AppCatalog:1:SER"
        defaultView={initialView}
        allowCreate={true}
        allowEdit={true}
        allowDelete={true}
        showAnalytics={true}
        enableEntityLinking={true}
        entityTypes={['user', 'employee', 'organizationalUnit']}
        {...contextProps}
      />
    </div>
  )
}

export default ServiceCases
