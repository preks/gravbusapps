import React, { useState, useEffect } from 'react';
import { ServiceCatalog, ServiceDetail, RequestForm, MyRequests, AIOnboardingTooltip } from './components';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ServiceRequestTemplate, FlowTemplate } from '../../types';
import type { WorkflowEngine } from '../../services';
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
  selectedFlowTemplate?: FlowTemplate;
  selectedRequestId?: string;
}

// Parse URL parameters for view and state
const parseUrlParams = () => {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Match legacy path patterns: /category/hr, /service/123, /request/456
  const categoryMatch = path.match(/\/category\/([^\/]+)/);
  const serviceMatch = path.match(/\/service\/([^\/]+)/);
  const requestMatch = path.match(/\/request\/([^\/]+)/);
  
  // Get view from URL parameter (e.g., ?view=myRequests)
  const viewFromUrl = searchParams.get('view') || 'catalog';
  
  // Get category from URL parameter (new approach) or path (legacy)
  const categoryFromUrl = searchParams.get('category') || (categoryMatch ? categoryMatch[1] : undefined);
  
  // Get service from URL parameter (new approach) or path (legacy)
  const serviceFromUrl = searchParams.get('service') || (serviceMatch ? serviceMatch[1] : undefined);
  
  // Get request from URL parameter (new approach) or path (legacy)
  const requestFromUrl = searchParams.get('request') || (requestMatch ? requestMatch[1] : undefined);
  
  return {
    viewFromUrl: viewFromUrl as ServicePortalView,
    categoryFromUrl,
    serviceFromUrl,
    requestFromUrl,
  };
};

export const ServicePortal: React.FC<ServicePortalProps> = ({
  workflowEngine, // Will be initialized below
  initialView = 'catalog',
  onServiceDeskNavigation,
  ...contextProps
}) => {
  // Parse URL parameters
  const { viewFromUrl, categoryFromUrl, serviceFromUrl, requestFromUrl } = parseUrlParams();
  
  // Initialize workflow engine - prefer passed engine, fallback to real Conductor engine, then mock for development
  const activeWorkflowEngine = workflowEngine || 
    (contextProps.accessToken ? createConductorWorkflowEngine(contextProps) : mockWorkflowEngine);
  const { isEnabled, checkAndRedirect } = useServicesFeatureFlag();
  
  // Initialize state with URL parameters
  const [state, setState] = useState<ServicePortalState>({
    currentView: viewFromUrl || initialView,
    selectedCategoryId: categoryFromUrl,
    selectedServiceId: serviceFromUrl,
    selectedRequestId: requestFromUrl
  });

  // Redirect if Services+ is disabled
  React.useEffect(() => {
    checkAndRedirect();
  }, []);

  // Ensure URL parameters are set on component load
  useEffect(() => {
    const url = new URL(window.location.href);
    let urlChanged = false;
    
    // Only set app parameter in development environment (not needed in platform/production)
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && !url.searchParams.has('app')) {
      url.searchParams.set('app', 'ServicePortal');
      urlChanged = true;
    }
    
    // Set view parameter if we're not on the default catalog view
    if (state.currentView !== 'catalog' && !url.searchParams.has('view')) {
      url.searchParams.set('view', state.currentView);
      urlChanged = true;
    }
    
    // Set category parameter if we have one and it's not in URL
    if (state.selectedCategoryId && !url.searchParams.has('category')) {
      url.searchParams.set('category', state.selectedCategoryId);
      urlChanged = true;
    }
    
    // Set service parameter if we have one and it's not in URL  
    if (state.selectedServiceId && !url.searchParams.has('service')) {
      url.searchParams.set('service', state.selectedServiceId);
      urlChanged = true;
    }
    
    // Set request parameter if we have one and it's not in URL
    if (state.selectedRequestId && !url.searchParams.has('request')) {
      url.searchParams.set('request', state.selectedRequestId);
      urlChanged = true;
    }
    
    if (urlChanged) {
      window.history.replaceState({}, '', url.toString());
    }
  }, [state.currentView, state.selectedCategoryId, state.selectedServiceId, state.selectedRequestId]);

  // Handle browser navigation (back/forward/refresh)
  useEffect(() => {
    const handlePopState = () => {
      const { viewFromUrl, categoryFromUrl, serviceFromUrl, requestFromUrl } = parseUrlParams();
      
      // Update state from URL
      setState(prevState => ({
        ...prevState,
        currentView: viewFromUrl || 'catalog',
        selectedCategoryId: categoryFromUrl,
        selectedServiceId: serviceFromUrl,
        selectedRequestId: requestFromUrl
      }));
      
      // Ensure app parameter is preserved on browser navigation (only in development)
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction) {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('app')) {
          url.searchParams.set('app', 'ServicePortal');
          window.history.replaceState({}, '', url.toString());
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Don't render if services are disabled
  if (!isEnabled) {
    return null;
  }

  // Helper function to build URL with app and view parameters
  const buildUrlWithApp = (view: string, category?: string, service?: string, request?: string) => {
    const url = new URL(window.location.href);
    // Preserve current pathname (don't force to root like service desk does)
    
    // Only set app parameter in development environment (not needed in platform/production)
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && !url.searchParams.has('app')) {
      url.searchParams.set('app', 'ServicePortal');
    }
    
    // Set view parameter
    if (view !== 'catalog') {
      url.searchParams.set('view', view);
    } else {
      url.searchParams.delete('view'); // Remove view for catalog (default)
    }
    
    // Set category parameter if provided
    if (category) {
      url.searchParams.set('category', category);
    } else {
      url.searchParams.delete('category');
    }
    
    // Set service parameter if provided
    if (service) {
      url.searchParams.set('service', service);
    } else {
      url.searchParams.delete('service');
    }
    
    // Set request parameter if provided
    if (request) {
      url.searchParams.set('request', request);
    } else {
      url.searchParams.delete('request');
    }
    
    return url.toString();
  };

  // Helper function to clean URL parameters when navigating away from specific views
  // Available for future use by components that need to clear navigation state
  // const cleanUrlParameters = (parametersToRemove: string[]) => {
  //   const url = new URL(window.location.href);
  //   let urlChanged = false;
  //   
  //   parametersToRemove.forEach(param => {
  //     if (url.searchParams.has(param)) {
  //       url.searchParams.delete(param);
  //       urlChanged = true;
  //     }
  //   });
  //   
  //   if (urlChanged) {
  //     window.history.pushState({}, '', url.toString());
  //   }
  // };

  // Navigation handlers
  const navigateToCatalog = () => {
    setState({ currentView: 'catalog' });
    const newUrl = buildUrlWithApp('catalog');
    window.history.pushState({}, '', newUrl);
  };

  const navigateToCategory = (categoryId: string, serviceId?: string) => {
    setState({
      currentView: 'categoryDetail',
      selectedCategoryId: categoryId,
      selectedServiceId: serviceId
    });
    const newUrl = buildUrlWithApp('categoryDetail', categoryId, serviceId);
    window.history.pushState({}, '', newUrl);
  };

  const navigateToRequestForm = (template: ServiceRequestTemplate) => {
    setState({
      currentView: 'requestForm',
      selectedTemplate: template,
      selectedFlowTemplate: undefined, // Clear flow template
      selectedCategoryId: template.categoryId
    });
    const newUrl = buildUrlWithApp('requestForm', template.categoryId);
    window.history.pushState({}, '', newUrl);
  };

  const navigateToFlowRequestForm = (flowTemplate: FlowTemplate) => {
    // Determine category from template tags
    let categoryId = 'flow-templates'; // fallback
    
    if (flowTemplate.tags?.serviceCategory && Array.isArray(flowTemplate.tags.serviceCategory)) {
      // Extract category ID from ServicePortalCategory reference (e.g., "ServicePortalCategory:1:HR" -> "hr")
      const categoryRef = flowTemplate.tags.serviceCategory[0];
      if (typeof categoryRef === 'string' && categoryRef.includes('ServicePortalCategory:1:')) {
        categoryId = categoryRef.split('ServicePortalCategory:1:')[1].toLowerCase();
      }
    }
    
    setState(prevState => ({
      ...prevState,
      currentView: 'requestForm',
      selectedTemplate: undefined, // Clear mock template
      selectedFlowTemplate: flowTemplate,
      // Keep the current selectedCategoryId if we came from a category, otherwise use determined category
      selectedCategoryId: prevState.selectedCategoryId || categoryId
    }));
    
    const newUrl = buildUrlWithApp('requestForm', categoryId);
    window.history.pushState({}, '', newUrl);
  };

  const navigateToMyRequests = (requestId?: string) => {
    setState({
      currentView: 'myRequests',
      selectedRequestId: requestId
    });
    const newUrl = buildUrlWithApp('myRequests', undefined, undefined, requestId);
    window.history.pushState({}, '', newUrl);
  };

  // URL cleanup utility available for components that need to clear specific parameters
  // Example usage: cleanUrlParameters(['request', 'service']) to clean up navigation state

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
            onRequestFlowTemplate={navigateToFlowRequestForm}
            onBack={navigateToCatalog}
            {...contextProps}
          />
        );
      
      case 'requestForm':
        return (
          <RequestForm
            template={state.selectedTemplate}
            flowTemplate={state.selectedFlowTemplate}
            workflowEngine={activeWorkflowEngine as any}
            onSuccess={navigateToMyRequests}
            onCancel={() => navigateToCategory(state.selectedCategoryId!)}
            {...contextProps}
          />
        );
      
      case 'myRequests':
        return (
          <MyRequests
            workflowEngine={activeWorkflowEngine as any}
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
    <div data-testid="service-portal-container" className="gba:relative">
      {renderCurrentView()}
      
      {/* AI Onboarding Tooltip - only show on catalog view */}
      {state.currentView === 'catalog' && (
        <AIOnboardingTooltip />
      )}
    </div>
  );
};
