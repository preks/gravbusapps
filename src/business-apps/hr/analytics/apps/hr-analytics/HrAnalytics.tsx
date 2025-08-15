import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button } from 'antd';
import { PageLayout } from '@newwork/nw-design-system';
import {
  DashboardOutlined,
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  ApartmentOutlined,
  DollarOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { ChartPie } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import Dashboard from './components/views/dashboard/Dashboard';
import Demographics from './components/views/demographics';
import Workforce from './components/views/workforce';
import StructuralAnalysisReport from './components/views/structural-analysis/StructuralAnalysisReport';
import Compensation from './components/views/compensation';
import Forecasting from './components/views/forecasting';

export interface HrAnalyticsProps extends BusinessAppContextProps {}

export const HrAnalytics: React.FC<HrAnalyticsProps> = (context) => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'demographics',
      icon: <UserOutlined />,
      label: 'Demographics'
    },
    {
      key: 'workforce',
      icon: <TeamOutlined />,
      label: 'Workforce'
    },
    {
      key: 'compensation',
      icon: <DollarOutlined />,
      label: 'Compensation'
    },
    {
      key: 'forecasting',
      icon: <LineChartOutlined />,
      label: 'Forecasting'
    },
    {
      key: 'structural-analysis',
      icon: <ApartmentOutlined />,
      label: 'Structural Analysis'
    }
  ];

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get('view');

    // Validate that the view exists in our options
    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl;
    }

    return viewOptions[0].key;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialView());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL to reflect the current view
    const url = new URL(window.location.href);
    url.searchParams.set('view', value);
    
    // Define which views have tabs
    const viewsWithTabs = ['workforce', 'structural-analysis', 'forecasting'];
    
    // If switching to a view without tabs, remove the tab parameter
    if (!viewsWithTabs.includes(value)) {
      url.searchParams.delete('tab');
    }
    
    window.history.pushState({}, '', url.toString());
  };

  // Sync tab with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const viewFromUrl = urlParams.get('view');
      
      if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
        setActiveTab(viewFromUrl);
        
        // Define which views have tabs
        const viewsWithTabs = ['workforce', 'structural-analysis', 'forecasting'];
        
        // If navigating to a view without tabs, clean up the tab parameter
        if (!viewsWithTabs.includes(viewFromUrl) && urlParams.has('tab')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('tab');
          window.history.replaceState({}, '', url.toString());
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewOptions]);

  // Debug logging for development
  useEffect(() => {
    console.log(`HR Analytics - Active view: ${activeTab}`);
  }, [activeTab]);

  // Clean up tab parameter on initial load if current view doesn't support tabs
  useEffect(() => {
    const viewsWithTabs = ['workforce', 'structural-analysis', 'forecasting'];
    const urlParams = new URLSearchParams(window.location.search);
    
    if (!viewsWithTabs.includes(activeTab) && urlParams.has('tab')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    }
  }, []); // Run only on initial mount

  const renderErrorContent = (viewName: string) => {
    if (error) {
      return (
        <div className="gba:p-6">
          <Alert
            message={`Error Loading ${viewName}`}
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => setError(null)} type="primary">
                Retry
              </Button>
            }
            className="gba:shadow-sm"
          />
        </div>
      );
    }
    return null;
  };

  const renderLoadingContent = (viewName: string) => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <div className="gba:text-center">
            <Spin size="large" />
            <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">
              Loading {viewName}...
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTabContent = () => {
    const errorContent = renderErrorContent('HR Analytics');
    if (errorContent) return errorContent;

    const loadingContent = renderLoadingContent('HR Analytics');
    if (loadingContent) return loadingContent;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div data-testid="dashboard-tab-content">
            <Dashboard
              accessToken={context.accessToken}
              userInfo={context.userInfo}
            />
          </div>
        );
      case 'demographics':
        return (
          <div data-testid="demographics-tab-content">
            <Demographics {...context} />
          </div>
        );
      case 'workforce':
        return (
          <div data-testid="workforce-tab-content">
            <Workforce {...context} />
          </div>
        );
      case 'compensation':
        return (
          <div data-testid="compensation-tab-content">
            <Compensation {...context} />
          </div>
        );
      case 'forecasting':
        return (
          <div data-testid="forecasting-tab-content">
            <Forecasting {...context} />
          </div>
        );
      case 'structural-analysis':
        return (
          <div data-testid="structural-analysis-tab-content">
            <StructuralAnalysisReport {...context} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="hr-analytics-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: ChartPie,
          variant: "premium",
          size: "lg",
          label: "HR Analytics"
        }}
        headerTitle="HR Analytics"
        headerDescription="Comprehensive workforce insights, analytics, and metrics to drive HR decisions"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">
          {renderTabContent()}
        </div>
      </PageLayout>
    </div>
  );
};

export default HrAnalytics;
