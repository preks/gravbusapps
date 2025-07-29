import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button } from 'antd';
import { PageLayout } from '@newwork/nw-design-system';
import {
  TeamOutlined,
  NodeIndexOutlined,
  ApartmentOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { TreeStructure } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { WorkforceDistributionReport } from './components/views/workforce-distribution-report';
import { StructuralAnalysisReport } from './components/views/structural-analysis-report';
import OrganizationalHierarchyReport from './components/views/organizational-hierarchy-report';

export interface OrgChartAnalyticsProps extends BusinessAppContextProps {}

export const OrgChartAnalytics: React.FC<OrgChartAnalyticsProps> = (context) => {
  const viewOptions = [
    {
      key: 'workforce-distribution',
      icon: <TeamOutlined />,
      label: 'Workforce Distribution'
    },
    {
      key: 'structural-analysis',
      icon: <NodeIndexOutlined />,
      label: 'Structural Analysis'
    },
    {
      key: 'organizational-hierarchy',
      icon: <ApartmentOutlined />,
      label: 'Organizational Hierarchy'
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
    const errorContent = renderErrorContent('Organization Analytics');
    if (errorContent) return errorContent;

    const loadingContent = renderLoadingContent('Organization Analytics');
    if (loadingContent) return loadingContent;

    switch (activeTab) {
      case 'workforce-distribution':
        return (
          <div data-testid="workforce-distribution-tab-content">
            <WorkforceDistributionReport {...context} />
          </div>
        );
      case 'structural-analysis':
        return (
          <div data-testid="structural-analysis-tab-content">
            <StructuralAnalysisReport {...context} />
          </div>
        );
      case 'organizational-hierarchy':
        return (
          <div data-testid="organizational-hierarchy-tab-content">
            <OrganizationalHierarchyReport {...context} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="orgchart-analytics-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: TreeStructure,
          variant: "strategy",
          size: "lg",
          label: "Organization Chart Analytics"
        }}
        headerTitle="Organization Chart Analytics"
        headerDescription="Comprehensive organizational insights, workforce distribution, and structural analysis"
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

export default OrgChartAnalytics;
