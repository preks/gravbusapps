import React, { useState } from 'react';
import { ServiceCatalog, ServiceDetail, RequestForm, MyRequests } from './components';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { WorkflowEngine, ServiceRequestTemplate } from '../../types';
import { mockWorkflowEngine, createConductorWorkflowEngine } from '../../services';
import { useServicesFeatureFlag } from '../../utils/featureFlags';

export interface ServicePortalProps extends BusinessAppContextProps {
  workflowEngine?: WorkflowEngine; // TODO: Inject from context or provider
  initialView?: ServicePortalView;
  onServiceDeskNavigation?: () => void; // Callback to navigate to Service Desk app
}

export type ServicePortalView = 
  | 'catalog' 
  | 'categoryDetail'
  | 'requestForm'
  | 'myRequests';

interface ServicePortalState {
  currentView: ServicePortalView;
  selectedCategoryId?: string;
  selectedServiceId?: string;
  selectedTemplate?: ServiceRequestTemplate;
  selectedRequestId?: string;
}

export const ServicePortal: React.FC<ServicePortalProps> = ({
  workflowEngine, // Will be initialized below
  initialView = 'catalog',
  onServiceDeskNavigation,
  ...contextProps
}) => {
  // Initialize workflow engine - prefer passed engine, fallback to real Conductor engine, then mock for development
  const activeWorkflowEngine: WorkflowEngine = workflowEngine || 
    (contextProps.accessToken ? createConductorWorkflowEngine(contextProps) : mockWorkflowEngine);
  const { isEnabled, checkAndRedirect } = useServicesFeatureFlag();
  const [state, setState] = useState<ServicePortalState>({
    currentView: initialView
  });

  // Redirect if Services+ is disabled
  React.useEffect(() => {
    checkAndRedirect();
  }, []);

  // Don't render if services are disabled
  if (!isEnabled) {
    return null;
  }

  // Navigation handlers
  const navigateToCatalog = () => {
    setState({ currentView: 'catalog' });
  };

  const navigateToCategory = (categoryId: string, serviceId?: string) => {
    setState({
      currentView: 'categoryDetail',
      selectedCategoryId: categoryId,
      selectedServiceId: serviceId
    });
  };

  const navigateToRequestForm = (template: ServiceRequestTemplate) => {
    setState({
      currentView: 'requestForm',
      selectedTemplate: template,
      selectedCategoryId: template.categoryId
    });
  };

  const navigateToMyRequests = (requestId?: string) => {
    setState({
      currentView: 'myRequests',
      selectedRequestId: requestId
    });
  };

  // Removed unused helper functions - components now handle their own navigation

  // Removed getLayoutProps - each component now handles its own layout

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'catalog':
        return (
          <ServiceCatalog
            onCategorySelect={navigateToCategory}
            onMyRequestsClick={() => navigateToMyRequests()}
            onServiceDeskClick={onServiceDeskNavigation}
            {...contextProps}
          />
        );
      
      case 'categoryDetail':
        return (
          <ServiceDetail
            categoryId={state.selectedCategoryId!}
            onRequestService={navigateToRequestForm}
            onBack={navigateToCatalog}
          />
        );
      
      case 'requestForm':
        return (
          <RequestForm
            template={state.selectedTemplate!}
            workflowEngine={activeWorkflowEngine}
            onSuccess={navigateToMyRequests}
            onCancel={() => navigateToCategory(state.selectedCategoryId!)}
            {...contextProps}
          />
        );
      
      case 'myRequests':
        return (
          <MyRequests
            workflowEngine={activeWorkflowEngine}
            onBack={navigateToCatalog}
            {...contextProps}
          />
        );
      
      default:
        return (
          <ServiceCatalog
            onCategorySelect={navigateToCategory}
            onMyRequestsClick={() => navigateToMyRequests()}
            onServiceDeskClick={onServiceDeskNavigation}
            {...contextProps}
          />
        );
    }
  };

  return (
    <div data-testid="service-portal-container">
      {renderCurrentView()}
    </div>
  );
};
