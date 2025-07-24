import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { InvestmentNavigationCard, InvestmentQuickActionButton } from './components';
import { investmentAreas, investmentQuickActions, categoryLabels, getInvestmentAreasByCategory } from './utils/investmentAreas';
import { InvestmentArea, InvestmentQuickAction } from './types';
import BackgroundImage from '@/assets/images/background.png';
import { useInvestmentDashboardStats } from './hooks/useInvestmentDashboardStats';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

interface InvestmentLauncherProps extends BusinessAppContextProps {}

const InvestmentLauncher: React.FC<InvestmentLauncherProps> = (context) => {
  const { stats, isLoading, error, refetch } = useInvestmentDashboardStats(context);
  
  // Group areas by category
  const groupedAreas = useMemo(() => {
    return investmentAreas.reduce((acc, area) => {
      if (!acc[area.category]) {
        acc[area.category] = [];
      }
      acc[area.category].push(area);
      return acc;
    }, {} as Record<string, InvestmentArea[]>);
  }, []);

  const handleNavigationClick = (area: InvestmentArea) => {
    // Navigate to platform investment relations with specific view
    if (area.id === 'leads') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'leads' });
      navigateTo(url);
    } else if (area.id === 'opportunities') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'opportunities' });
      navigateTo(url);
    } else if (area.id === 'accounts') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'accounts' });
      navigateTo(url);
    } else if (area.id === 'contacts') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'contacts' });
      navigateTo(url);
    } else if (area.id === 'investments') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'investments' });
      navigateTo(url);
    } else if (area.id === 'analytics-reporting') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'analytics' });
      navigateTo(url);
    }
  };

  const handleQuickAction = (action: InvestmentQuickAction) => {
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
    } else if (action.action === 'create-opportunity') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveOpportunity',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'create-contact') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveContact',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'create-investment') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestment',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      });
    } else if (action.action === 'generate-report') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'dashboard' });
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

  const formatPercentage = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num / 100);
  };

  return (
    <div 
      className="gba:min-h-full gba:bg-cover gba:bg-center gba:bg-no-repeat" 
      style={{
        backgroundImage: `url(${BackgroundImage})`
      }}
      data-testid="investment-launcher-container"
    >
      {/* Header Section */}
      <div className="gba:bg-white gba:border-b gba:border-gray-200 gba:shadow-sm">
        <div className="gba:px-6 gba:py-6">
          {/* Title and Stats */}
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2" data-testid="investment-launcher-title">
                Investment Relations Management Hub
              </h1>
              <p className="gba:text-gray-600 gba:text-base gba:max-w-2xl" data-testid="investment-launcher-description">
                Comprehensive portfolio management, investment tracking, and performance analytics
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
                  <div data-testid="total-portfolio-value-stat">
                    <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                      {isLoading ? <Spin size="small" /> : formatCurrency(stats.totalPortfolioValue)}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Total Portfolio Value</div>
                  </div>
                  <div data-testid="asset-types-stat">
                    <div className="gba:text-2xl gba:font-bold" style={{ color: '#10B981' }}>
                      {isLoading ? <Spin size="small" /> : formatNumber(stats.assetTypes)}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Asset Types</div>
                  </div>
                  <div data-testid="average-roi-stat">
                    <div className="gba:text-2xl gba:font-bold" style={{ color: '#8B5CF6' }}>
                      {isLoading ? <Spin size="small" /> : formatPercentage(stats.averageROI)}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Average ROI</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="gba:px-6 gba:py-8">
        {/* Core Modules Section */}
        <div className="gba:mb-12">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-white gba:mb-1 gba:drop-shadow-sm">Core Investment Modules</h2>
              <p className="gba:text-sm gba:text-white gba:drop-shadow-sm">Essential investment management and portfolio analytics functions</p>
            </div>
          </div>

          {/* Modules Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-6 gba:auto-rows-fr">
            {investmentAreas.map((area) => (
              <InvestmentNavigationCard
                key={area.id}
                area={area}
                onClick={handleNavigationClick}
                stats={stats}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="gba:mb-12" data-testid="investment-quick-actions-section">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-white gba:mb-1 gba:drop-shadow-sm">Quick Actions</h2>
              <p className="gba:text-sm gba:text-white gba:drop-shadow-sm">Frequently used investment and business management functions</p>
            </div>
            <button className="gba:text-sm gba:text-white hover:gba:text-gray-200 gba:font-medium gba:transition-colors gba:duration-200 gba:drop-shadow-sm">
              View All →
            </button>
          </div>
          
          <div className="gba:grid gba:grid-cols-6 gba:gap-4">
            {investmentQuickActions.map((action) => (
              <InvestmentQuickActionButton
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

export default InvestmentLauncher; 