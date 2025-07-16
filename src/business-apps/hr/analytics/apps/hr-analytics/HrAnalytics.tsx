import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button } from 'antd';
import { PageLayout } from '@newwork/nw-design-system';
import {
  DashboardOutlined,
  CalendarOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { ChartPie } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import Dashboard from './components/views/dashboard/Dashboard';
import AbsenceReport from './components/views/absence-report';
import Demographics from './components/views/demographics';
import Workforce from './components/views/workforce';

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
      key: 'absences',
      icon: <CalendarOutlined />,
      label: 'Absences'
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

    // Default to first view
    return viewOptions[0].key;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialView());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search);

    // Always set the view parameter (including for default)
    urlParams.set('view', view);

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleTabChange = (key: string) => {
    // Prevent deselection - if key is empty or same as current, ignore the change
    if (!key || key === activeTab) {
      return;
    }
    setActiveTab(key);
    updateUrl(key);
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('view')) {
      updateUrl(activeTab);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setActiveTab(newView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      case 'absences':
        return (
          <div data-testid="absences-tab-content">
            <AbsenceReport {...context} />
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
