import React, { useState, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { NavigationCard, QuickActionButton } from './components';
import { crmAreas, quickActions, categoryLabels, getCrmAreasByCategory } from './utils/crmAreas';
import { CrmArea, QuickAction } from './types';
import BackgroundImage from '@/assets/images/background.png';
import { useCrmDashboardStats } from './hooks/useCrmDashboardStats';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

interface CustomerLauncherProps extends BusinessAppContextProps {}

const CustomerLauncher: React.FC<CustomerLauncherProps> = (context) => {
  const { stats, isLoading, error, refetch } = useCrmDashboardStats(context);
  
  // Group areas by category
  const groupedAreas = useMemo(() => {
    return crmAreas.reduce((acc, area) => {
      if (!acc[area.category]) {
        acc[area.category] = [];
      }
      acc[area.category].push(area);
      return acc;
    }, {} as Record<string, CrmArea[]>);
  }, []);

  const handleNavigationClick = (area: CrmArea) => {
    // TODO: Implement actual navigation when routing is set up
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.action === 'create-lead') {
      startProcess({
        domain: 'customer-relations',
        processName: 'createLead',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'save-opportunity') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveOpportunity',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'save-contact') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveContact',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'create-account') {
      startProcess({
        domain: 'customer-relations',
        processName: 'createAccount',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'generate-report') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'dashboard' });
      navigateTo(url);
    } else {
      // TODO: Implement other quick actions when functionality is available
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div 
      className="gba:min-h-full gba:bg-cover gba:bg-center gba:bg-no-repeat" 
      style={{
        backgroundImage: `url(${BackgroundImage})`
      }}
      data-testid="customer-launcher-container"
    >
      {/* Header Section */}
      <div className="gba:bg-white gba:border-b gba:border-gray-200 gba:shadow-sm">
        <div className="gba:px-6 gba:py-6">
          {/* Title and Stats */}
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2" data-testid="customer-launcher-title">
                Customer Relationship Management Hub
              </h1>
              <p className="gba:text-gray-600 gba:text-base gba:max-w-2xl" data-testid="customer-launcher-description">
                Comprehensive customer management, sales pipeline, and relationship intelligence
              </p>
            </div>
            
            {/* Stats */}
            <div className="gba:flex gba:items-center gba:gap-8 gba:text-right">
              {error ? (
                <Alert
                  message="Error loading stats"
                  description={error}
                  type="error"
                  showIcon
                  action={
                    <Button 
                      size="small" 
                      onClick={refetch}
                      icon={<ReloadOutlined />}
                    >
                      Retry
                    </Button>
                  }
                />
              ) : (
                <>
                  <div data-testid="total-customers-stat">
                    <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                      {isLoading ? <Spin size="small" /> : formatNumber(stats.totalCustomers)}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Total Customers</div>
                  </div>
                  <div data-testid="active-opportunities-stat">
                    <div className="gba:text-2xl gba:font-bold" style={{ color: '#10B981' }}>
                      {isLoading ? <Spin size="small" /> : formatNumber(stats.activeOpportunities)}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Active Opportunities</div>
                  </div>
                  <div data-testid="pipeline-value-stat">
                    <div className="gba:text-2xl gba:font-bold" style={{ color: '#3B82F6' }}>
                      {isLoading ? <Spin size="small" /> : formatCurrency(stats.pipelineValue)}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Pipeline Value</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="gba:px-6 gba:py-8">
        {/* Core CRM Modules Section */}
        <div className="gba:mb-12">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-white gba:mb-1 gba:drop-shadow-sm">Core CRM Modules</h2>
              <p className="gba:text-sm gba:text-white gba:drop-shadow-sm">Essential CRM functions for daily operations and customer management</p>
            </div>
          </div>

          {/* CRM Modules Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-6">
            {Object.entries(groupedAreas).map(([category, areas]) => 
              areas.map((area) => (
                <NavigationCard
                  key={area.id}
                  area={area}
                  onClick={handleNavigationClick}
                  stats={stats}
                />
              ))
            )}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="gba:mb-12" data-testid="quick-actions-section">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-white gba:mb-1 gba:drop-shadow-sm">Quick Actions</h2>
              <p className="gba:text-sm gba:text-white gba:drop-shadow-sm">Frequently used CRM functions and shortcuts</p>
            </div>
            <button className="gba:text-sm gba:text-white hover:gba:text-gray-200 gba:font-medium gba:transition-colors gba:duration-200 gba:drop-shadow-sm">
              View All →
            </button>
          </div>
          
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-4">
            {quickActions.map((action) => (
              <QuickActionButton
                key={action.id}
                action={action}
                onClick={handleQuickAction}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLauncher; 