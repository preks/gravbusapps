import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFeature } from '@/common/hooks/useFeature';
import type { StepReceiver } from 'packages/services-plus-core';
import { Dashboard } from './components/Dashboard';
import { Tickets } from './components/Tickets';
import { TemplatesTab } from './components/TemplatesTab';
import { Analytics } from './components/Analytics';
import { TaskRecord } from './components/TaskRecord';
import { useUserCapabilities } from './hooks/useUserCapabilities';
import { ServiceDeskDiagnostic } from './components/ServiceDeskDiagnostic';
import { PageLayout } from '@newwork/nw-design-system';
import { 
  HeadsetIcon,
  ChartBarIcon,
  TicketIcon,
  FileTextIcon,
  HouseIcon
} from '@phosphor-icons/react';

// UI Components
import { Alert, Spin, Button } from 'antd';

/**
 * ServiceDesk component for managing service requests across different desks
 * Provides tabs for each desk the user is entitled to based on capabilities
 */
export interface ServiceDeskProps extends BusinessAppContextProps {
  deskKey?: StepReceiver;
  ticketId?: string;
}

// Parse URL parameters for subview, ticketTab and ticketId
const parseUrlParams = () => {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Match task patterns: /task/123
  const taskMatch = path.match(/\/task\/([^\/]+)/);
  
  // Get subview from URL parameter (e.g., ?subview=tickets)
  const subviewFromUrl = searchParams.get('subview') || 'dashboard';
  
  // Get ticket tab from URL parameter (e.g., ?tab=IT or ?tab=completed)
  const ticketTabFromUrl = searchParams.get('tab') || null;
  
  return {
    subviewFromUrl,
    ticketIdFromUrl: taskMatch ? taskMatch[1] : null,
    ticketTabFromUrl,
  };
};

const ServiceDesk: React.FC<ServiceDeskProps> = ({
  accessToken,
  userInfo,
  deskKey,
  ticketId,
}) => {

  const { subviewFromUrl, ticketIdFromUrl, ticketTabFromUrl } = parseUrlParams();
  
  // Use tab parameter or component prop for desk key
  const resolvedDeskKey = deskKey || ticketTabFromUrl || '';
  const resolvedTicketId = ticketId || ticketIdFromUrl || null;

  // Feature flag guard - default to enabled for development
  const servicesFeature = useFeature<boolean>('SERVICES_PLUS_ENABLED');
  const isServicesEnabled = servicesFeature !== false; // true if undefined (development) or true
  
  // Submenu and tab state management with URL parameter support
  const [activeSubView, setActiveSubView] = useState<string>(subviewFromUrl);
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Prioritize ticketTabFromUrl, then resolvedDeskKey
    if (ticketTabFromUrl) {
      return ticketTabFromUrl;
    }
    if (resolvedDeskKey) {
      return resolvedDeskKey;
    }
    return '';
  });
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(resolvedTicketId);
  const [lastTicketsTab, setLastTicketsTab] = useState<string>(''); // Remember last selected tab in Tickets subview
  
  // Get user capabilities to determine available desks
  const { capabilities, isLoading: capabilitiesLoading, error: capabilitiesError } = useUserCapabilities({
    accessToken,
    userInfo,
  });

  // Update task from URL parameters and ensure URL parameters are set
  useEffect(() => {
    if (resolvedTicketId) {
      setSelectedTaskId(resolvedTicketId);
    }
    
    // Initialize lastTicketsTab if we're starting on tickets subview with an active tab
    if (activeSubView === 'tickets' && activeTab && !lastTicketsTab) {
      setLastTicketsTab(activeTab);
    }
    
    // Ensure app, subview and tab parameters are set on component load
    const url = new URL(window.location.href);
    let urlChanged = false;
    
    if (!url.searchParams.has('app')) {
      url.searchParams.set('app', 'ServiceDesk');
      urlChanged = true;
    }
    
    if (!url.searchParams.has('subview')) {
      url.searchParams.set('subview', activeSubView);
      urlChanged = true;
    }
    
    // Set tab parameter if we're on tickets subview and have an active tab
    if (activeSubView === 'tickets' && activeTab && !url.searchParams.has('tab')) {
      url.searchParams.set('tab', activeTab);
      urlChanged = true;
    }
    
    if (urlChanged) {
      window.history.replaceState({}, '', url.toString());
    }
  }, [resolvedTicketId, activeSubView, activeTab, lastTicketsTab]);


  // Handle browser navigation (back/forward/refresh)
  useEffect(() => {
    const handlePopState = () => {
      const { subviewFromUrl, ticketIdFromUrl, ticketTabFromUrl } = parseUrlParams();
      
      // Update subview from URL
      setActiveSubView(subviewFromUrl);
      
      // Update active tab from tab parameter
      if (ticketTabFromUrl) {
        setActiveTab(ticketTabFromUrl);
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

  // Helper function to build URL with app, subview and tab parameters preserved
  const buildUrlWithApp = (path: string, subview?: string, tab?: string) => {
    const url = new URL(window.location.href);
    url.pathname = path;
    // Preserve the app parameter if it exists
    if (!url.searchParams.has('app')) {
      url.searchParams.set('app', 'ServiceDesk');
    }
    // Set subview parameter if provided
    if (subview) {
      url.searchParams.set('subview', subview);
    }
    // Set tab parameter if provided
    if (tab) {
      url.searchParams.set('tab', tab);
    }
    return url.toString();
  };

  // Handle submenu change
  const handleSubViewChange = (subView: string) => {
    setActiveSubView(subView);
    setSelectedTaskId(null); // Clear task selection when switching subviews
    
    let tabToSet = '';
    
    // When switching to tickets, use last remembered tab or default to first available
    if (subView === 'tickets' && capabilities && capabilities.length > 0) {
      // Use last remembered tab if it exists and is valid (either a capability desk or 'completed')
      const isValidCapabilityTab = lastTicketsTab && capabilities.some(cap => cap.desk === lastTicketsTab);
      const isCompletedTab = lastTicketsTab === 'completed';
      const validLastTab = isValidCapabilityTab || isCompletedTab;
      
      tabToSet = validLastTab ? lastTicketsTab : capabilities[0].desk;
      setActiveTab(tabToSet);
    }
    
    // Update URL to reflect current subview and tab
    const currentPath = window.location.pathname;
    const newUrl = buildUrlWithApp(currentPath, subView, tabToSet || undefined);
    window.history.pushState({}, '', newUrl);
  };

  // Handle ticket tab change (IT, HR, Completed, etc.)
  const handleTicketTabChange = (tabKey: string) => {
    console.log('🔍 [ServiceDesk] handleTicketTabChange called:', { tabKey, previousActiveTab: activeTab });
    setActiveTab(tabKey);
    setLastTicketsTab(tabKey); // Remember this tab for when user returns to Tickets subview
    setSelectedTaskId(null); // Clear task selection when switching tabs
    
    // Always use root path and rely on tab parameter for consistency
    // This avoids conflicts between path-based and parameter-based tab selection
    const newPath = '/';
    const newUrl = buildUrlWithApp(newPath, activeSubView, tabKey);
    console.log('🔍 [ServiceDesk] Tab change URL:', newUrl);
    window.history.pushState({}, '', newUrl);
  };


  // Handle task selection
  const handleTaskSelect = (taskId: string, _deskKey: string) => {
    console.log('🔍 [ServiceDesk] handleTaskSelect called:', { taskId, _deskKey, activeTab, activeSubView });
    setSelectedTaskId(taskId);
    // Use new URL format with tab parameter instead of path-based desk
    const newUrl = buildUrlWithApp(`/task/${taskId}`, activeSubView, activeTab);
    console.log('🔍 [ServiceDesk] Task select URL:', newUrl);
    window.history.pushState({}, '', newUrl);
  };

  // Handle closing task detail
  const handleTaskClose = () => {
    console.log('🔍 [ServiceDesk] handleTaskClose called:', { activeTab, activeSubView });
    setSelectedTaskId(null);
    
    // Always use root path and rely on tab parameter for consistency
    const newPath = '/';
    const newUrl = buildUrlWithApp(newPath, activeSubView, activeTab);
    console.log('🔍 [ServiceDesk] Task close URL:', newUrl);
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

  // Render content based on active submenu
  const renderSubViewContent = () => {
    switch (activeSubView) {
      case 'dashboard':
        return (
          <Dashboard
            accessToken={accessToken}
            userInfo={userInfo}
          />
        );
      case 'tickets':
        return (
          <Tickets
            deskKey={activeTab}
            ticketId={ticketId}
            accessToken={accessToken}
            userInfo={userInfo}
            onTaskSelect={handleTaskSelect}
            onTabChange={handleTicketTabChange}
          />
        );
      case 'templates':
        return (
          <TemplatesTab
            accessToken={accessToken}
            userInfo={userInfo}
          />
        );
      case 'analytics':
        return (
          <Analytics
            accessToken={accessToken}
            userInfo={userInfo}
          />
        );
      default:
        return (
          <Dashboard
            accessToken={accessToken}
            userInfo={userInfo}
          />
        );
    }
  };

  return (
    <div data-testid="service-desk-container" className="gba:h-full">
      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'services.desk.title',
          'Service Desk'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'services.desk.description',
          'Manage service requests and tickets across different departments'
        )}
        headerIcon={HeadsetIcon}
        variant="ext2"
        headerSubViews={{
          value: activeSubView,
          items: [
            { 
              value: 'dashboard', 
              label: getTranslationFromI18nKeyAndLabel(
                'services.desk.submenu.dashboard',
                'Dashboard'
              ),
              icon: <HouseIcon size={16} />
            },
            { 
              value: 'tickets', 
              label: getTranslationFromI18nKeyAndLabel(
                'services.desk.submenu.tickets',
                'Tickets'
              ),
              icon: <TicketIcon size={16} />
            },
            { 
              value: 'templates', 
              label: getTranslationFromI18nKeyAndLabel(
                'services.desk.submenu.templates',
                'Templates'
              ),
              icon: <FileTextIcon size={16} />
            },
            { 
              value: 'analytics', 
              label: getTranslationFromI18nKeyAndLabel(
                'services.desk.submenu.analytics',
                'Analytics'
              ),
              icon: <ChartBarIcon size={16} />
            },
          ],
          onValueChange: handleSubViewChange,
        }}
        className="gba:h-full"
      >
        {renderSubViewContent()}
      </PageLayout>
    </div>
  );
};

export default ServiceDesk;
