import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFeature } from '@/common/hooks/useFeature';
import type { StepReceiver } from 'packages/services-plus-core';
import { DeskQueue } from './components/DeskQueue';
import { useUserCapabilities } from './hooks/useUserCapabilities';
import { ServiceDeskDiagnostic } from './components/ServiceDeskDiagnostic';

// UI Components - TODO: Replace with @newwork/nw-design-system when available
import { Tabs, Alert, Spin, Button } from 'antd';
import { Badge } from 'antd';

/**
 * ServiceDesk component for managing service requests across different desks
 * Provides tabs for each desk the user is entitled to based on capabilities
 */
export interface ServiceDeskProps extends BusinessAppContextProps {
  deskKey?: StepReceiver;
  ticketId?: string;
}

const ServiceDesk: React.FC<ServiceDeskProps> = ({
  accessToken,
  userInfo,
  deskKey,
  ticketId,
}) => {
  // Feature flag guard - default to enabled for development
  const servicesFeature = useFeature<boolean>('SERVICES_PLUS_ENABLED');
  const isServicesEnabled = servicesFeature !== false; // true if undefined (development) or true
  
  // Tab state management with URL parameter support
  const [activeTab, setActiveTab] = useState<string>(deskKey || '');
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  // Get user capabilities to determine available desks
  const { capabilities, isLoading: capabilitiesLoading, error: capabilitiesError } = useUserCapabilities({
    accessToken,
    userInfo,
  });

  // Update tab from URL parameter
  useEffect(() => {
    if (deskKey) {
      setActiveTab(deskKey);
    }
  }, [deskKey]);

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const newPath = `/desk/${key}`;
    window.history.pushState({}, '', newPath);
  };

  // Feature flag check - return early if explicitly disabled
  if (servicesFeature === false) {
    return (
      <div 
        data-testid="services-plus-disabled" 
        className="gba:p-6 gba:text-center"
      >
        <Alert
          message={getTranslationFromI18nKeyAndLabel(
            'services.feature.disabled.title',
            'Feature Not Available'
          )}
          description={getTranslationFromI18nKeyAndLabel(
            'services.feature.disabled.description',
            'Services+ is not enabled for your organization.'
          )}
          type="info"
          showIcon
          className="gba:max-w-md gba:mx-auto"
        />
      </div>
    );
  }

  // Debug info for development
  console.log('ServiceDesk Debug:', {
    servicesFeature,
    isServicesEnabled,
    capabilitiesLoading,
    capabilitiesError,
    accessToken: !!accessToken,
    userInfo: !!userInfo,
    capabilities,
  });

  // Loading state while checking capabilities
  if (capabilitiesLoading) {
    return (
      <div 
        data-testid="service-desk-loading" 
        className="gba:p-6 gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <div className="gba:flex gba:items-center gba:gap-4">
          <Spin size="large" />
          <span className="gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel(
              'services.loading.capabilities',
              'Loading desk capabilities...'
            )}
          </span>
        </div>
      </div>
    );
  }

  // Error state with diagnostic option
  if (capabilitiesError) {
    if (showDiagnostic) {
      return <ServiceDeskDiagnostic accessToken={accessToken} userInfo={userInfo} />;
    }

    return (
      <div data-testid="service-desk-error" className="gba:p-6">
        <Alert
          message={getTranslationFromI18nKeyAndLabel(
            'services.desk.error.title',
            'Error Loading Service Desk'
          )}
          description={
            <div>
              <p className="gba:mb-3">
                {getTranslationFromI18nKeyAndLabel(
                  'services.desk.error.description',
                  'Failed to load desk capabilities. Please try again.'
                )}
              </p>
              <div className="gba:space-x-2">
                <Button 
                  type="primary" 
                  onClick={() => window.location.reload()}
                >
                  {getTranslationFromI18nKeyAndLabel('services.error.retry', 'Retry')}
                </Button>
                <Button onClick={() => setShowDiagnostic(true)}>
                  {getTranslationFromI18nKeyAndLabel('services.error.diagnostic', 'Show Diagnostic')}
                </Button>
              </div>
            </div>
          }
          type="error"
          showIcon
          className="gba:max-w-md gba:mx-auto"
        />
      </div>
    );
  }

  // No desks available
  if (!capabilities || capabilities.length === 0) {
    return (
      <div data-testid="service-desk-no-access" className="gba:p-6">
        <Alert
          message={getTranslationFromI18nKeyAndLabel(
            'services.desk.noAccess.title',
            'No Desk Access'
          )}
          description={getTranslationFromI18nKeyAndLabel(
            'services.desk.noAccess.description',
            'You do not have access to any service desks.'
          )}
          type="warning"
          showIcon
          className="gba:max-w-md gba:mx-auto"
        />
      </div>
    );
  }

  // Default to first available desk if no tab is selected
  if (!activeTab && capabilities.length > 0) {
    setActiveTab(capabilities[0].desk);
  }

  return (
    <div data-testid="service-desk-container" className="gba:p-6">
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-semibold gba:mb-1">
          {getTranslationFromI18nKeyAndLabel(
            'services.desk.title',
            'Service Desk'
          )}
        </h1>
        <p className="gba:text-gray-500">
          {getTranslationFromI18nKeyAndLabel(
            'services.desk.description',
            'Manage service requests and tickets across different departments'
          )}
        </p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        data-testid="service-desk-tabs"
        className="gba:w-full"
        items={capabilities.map(({ desk, name, ticketCount }) => ({
          key: desk,
          label: (
            <span 
              data-testid={`desk-tab-${desk.toLowerCase()}`}
              className="gba:flex gba:items-center gba:gap-2"
            >
              <span>
                {getTranslationFromI18nKeyAndLabel(
                  `services.desk.${desk.toLowerCase()}.name`,
                  name
                )}
              </span>
              {ticketCount > 0 && (
                <Badge 
                  count={ticketCount} 
                  size="small"
                  className="gba:ml-1" 
                />
              )}
            </span>
          ),
          children: (
            <DeskQueue
              deskKey={desk}
              ticketId={ticketId}
              accessToken={accessToken}
              userInfo={userInfo}
            />
          ),
        }))}
      />
    </div>
  );
};

export default ServiceDesk;
