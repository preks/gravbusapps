import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFeature } from '@/common/hooks/useFeature';
import type { StepReceiver } from 'packages/services-plus-core';
import { DeskQueue } from './components/DeskQueue';
import { TemplatesTab } from './components/TemplatesTab';
import { TaskRecord } from './components/TaskRecord';
import { CompletedTickets } from './components/CompletedTickets';
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

// Parse URL parameters for deskKey and ticketId
const parseUrlParams = () => {
  const path = window.location.pathname;
  // Match patterns like /desk/IT or /desk/IT/task/123
  const deskMatch = path.match(/\/desk\/([^\/]+)/);
  const taskMatch = path.match(/\/desk\/[^\/]+\/task\/([^\/]+)/);
  
  return {
    deskKeyFromUrl: deskMatch ? deskMatch[1] : null,
    ticketIdFromUrl: taskMatch ? taskMatch[1] : null,
  };
};

const ServiceDesk: React.FC<ServiceDeskProps> = ({
  accessToken,
  userInfo,
  deskKey,
  ticketId,
}) => {

  const { deskKeyFromUrl, ticketIdFromUrl } = parseUrlParams();
  const resolvedDeskKey = deskKey || deskKeyFromUrl || '';
  const resolvedTicketId = ticketId || ticketIdFromUrl || null;

  // Feature flag guard - default to enabled for development
  const servicesFeature = useFeature<boolean>('SERVICES_PLUS_ENABLED');
  const isServicesEnabled = servicesFeature !== false; // true if undefined (development) or true
  
  // Tab state management with URL parameter support
  const [activeTab, setActiveTab] = useState<string>(resolvedDeskKey);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(resolvedTicketId);
  
  // Get user capabilities to determine available desks
  const { capabilities, isLoading: capabilitiesLoading, error: capabilitiesError } = useUserCapabilities({
    accessToken,
    userInfo,
  });

  // Update tab and task from URL parameters
  useEffect(() => {
    if (resolvedDeskKey) {
      setActiveTab(resolvedDeskKey);
    }
    if (resolvedTicketId) {
      setSelectedTaskId(resolvedTicketId);
    }
    
    // Ensure app parameter is set on component load
    const url = new URL(window.location.href);
    if (!url.searchParams.has('app')) {
      url.searchParams.set('app', 'ServiceDesk');
      window.history.replaceState({}, '', url.toString());
    }
  }, [resolvedDeskKey, resolvedTicketId]);

  // Handle browser navigation (back/forward/refresh)
  useEffect(() => {
    const handlePopState = () => {
      const { deskKeyFromUrl, ticketIdFromUrl } = parseUrlParams();
      if (deskKeyFromUrl) {
        setActiveTab(deskKeyFromUrl);
      }
      if (ticketIdFromUrl) {
        setSelectedTaskId(ticketIdFromUrl);
      } else {
        setSelectedTaskId(null);
      }
      
      // Ensure app parameter is preserved on browser navigation
      const url = new URL(window.location.href);
      if (!url.searchParams.has('app')) {
        url.searchParams.set('app', 'ServiceDesk');
        window.history.replaceState({}, '', url.toString());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Helper function to build URL with app parameter preserved
  const buildUrlWithApp = (path: string) => {
    const url = new URL(window.location.href);
    url.pathname = path;
    // Preserve the app parameter if it exists
    if (!url.searchParams.has('app')) {
      url.searchParams.set('app', 'ServiceDesk');
    }
    return url.toString();
  };

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSelectedTaskId(null); // Clear task selection when switching tabs
    const newUrl = buildUrlWithApp(`/desk/${key}`);
    window.history.pushState({}, '', newUrl);
  };

  // Handle task selection
  const handleTaskSelect = (taskId: string, deskKey: string) => {
    setSelectedTaskId(taskId);
    const newUrl = buildUrlWithApp(`/desk/${deskKey}/task/${taskId}`);
    window.history.pushState({}, '', newUrl);
  };

  // Handle closing task detail
  const handleTaskClose = () => {
    setSelectedTaskId(null);
    const newUrl = buildUrlWithApp(`/desk/${activeTab}`);
    window.history.pushState({}, '', newUrl);
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

  // Show task record if selected
  if (selectedTaskId) {
    return (
      <TaskRecord
        taskId={selectedTaskId}
        deskKey={activeTab}
        accessToken={accessToken}
        userInfo={userInfo}
        onClose={handleTaskClose}
      />
    );
  }

  return (
    <div data-testid="service-desk-container" className="gba:p-6 gba:h-full gba:flex gba:flex-col">
      <div className="gba:mb-6 gba:flex-shrink-0">
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
        className="gba:w-full gba:flex-1 gba:flex gba:flex-col [&_.ant-tabs-content-holder]:gba:flex-1 [&_.ant-tabs-tabpane]:gba:h-full"
        items={[
          // Regular desk tabs
          ...capabilities.map(({ desk, name, ticketCount }) => ({
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
              <div className="gba:h-full">
                <DeskQueue
                  deskKey={desk}
                  ticketId={ticketId}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  onTaskSelect={handleTaskSelect}
                />
              </div>
            ),
          })),
          // Completed Tickets tab
          {
            key: 'completed',
            label: (
              <span 
                data-testid="desk-tab-completed"
                className="gba:flex gba:items-center gba:gap-2"
              >
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'services.desk.completed.name',
                    'Completed Tickets'
                  )}
                </span>
              </span>
            ),
            children: (
              <div className="gba:h-full">
                <CompletedTickets
                  accessToken={accessToken}
                  userInfo={userInfo}
                  onTaskSelect={handleTaskSelect}
                />
              </div>
            ),
          },
          // Templates tab for development
          {
            key: 'templates',
            label: (
              <span 
                data-testid="desk-tab-templates"
                className="gba:flex gba:items-center gba:gap-2"
              >
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'services.desk.templates.name',
                    'Templates'
                  )}
                </span>
                <Badge 
                  count="DEV" 
                  style={{ backgroundColor: '#52c41a' }}
                  size="small"
                  className="gba:ml-1" 
                />
              </span>
            ),
            children: (
              <div className="gba:h-full">
                <TemplatesTab
                  accessToken={accessToken}
                  userInfo={userInfo}
                />
              </div>
            ),
          }
        ]}
      />
    </div>
  );
};

export default ServiceDesk;
