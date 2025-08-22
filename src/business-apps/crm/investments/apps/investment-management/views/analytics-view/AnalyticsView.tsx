import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { BarChart3, Droplets, Home, LayoutDashboard } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

// Import the investment report components
import EquityInvestmentsReport from './equity-investments-report/EquityInvestmentsReport';
import LiquidFundInvestmentsReport from './liquid-fund-report/LiquidFundInvestmentsReport';
import RealEstateInvestmentsReport from './real-estate-report/RealEstateInvestmentsReport';
import { InvestmentPortfolioOverview } from './overview';

export interface AnalyticsViewProps extends BusinessAppContextProps {}

export const AnalyticsView: React.FC<AnalyticsViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Get initial tab from URL query parameters
  const getInitialTab = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('analyticsTab');
    
    // Valid analytics tab values
    if (tabFromUrl && ['overview', 'equity', 'liquid-funds', 'real-estate'].includes(tabFromUrl)) {
      return tabFromUrl;
    }
    
    // Default to overview
    return 'overview';
  }, []);

  // Update URL when tab changes
  const updateUrl = useCallback((tab: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('analyticsTab', tab);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    updateUrl(value);
  }, [updateUrl]);

  // Initialize tab from URL on mount
  useEffect(() => {
    const initialTab = getInitialTab();
    setActiveTab(initialTab);
  }, [getInitialTab]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab();
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialTab]);

  return (
    <div 
      data-testid={formatDataTestId('AnalyticsView', 'Container')}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('analytics.title', 'Investment Analytics')}
          </h1>
        </div>
        <p className="gba:text-gray-600 gba:mt-2">
          {getTranslationFromI18nKeyAndLabel('analytics.description', 'Comprehensive analytics and reporting for all investment types')}
        </p>
      </div>

      {/* Analytics Tabs */}
      <div className="gba:bg-white gba:rounded-lg gba:shadow-sm">
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange}
          data-testid={formatDataTestId('AnalyticsView', 'AnalyticsTabs')}
          className="gba:w-full"
        >
          <TabsList className="gba:grid gba:w-full gba:grid-cols-4 gba:p-1">
            <TabsTrigger 
              value="overview" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={formatDataTestId('AnalyticsView', 'OverviewTab')}
            >
              <LayoutDashboard className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger 
              value="equity" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={formatDataTestId('AnalyticsView', 'EquityTab')}
            >
              <BarChart3 className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.equity', 'Equity Investments')}
            </TabsTrigger>
            <TabsTrigger 
              value="liquid-funds" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={formatDataTestId('AnalyticsView', 'LiquidFundsTab')}
            >
              <Droplets className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.liquidFunds', 'Liquid Funds')}
            </TabsTrigger>
            <TabsTrigger 
              value="real-estate" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={formatDataTestId('AnalyticsView', 'RealEstateTab')}
            >
              <Home className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.realEstate', 'Real Estate')}
            </TabsTrigger>
          </TabsList>

          <TabsContent 
            value="overview" 
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'OverviewContent')}
          >
            <InvestmentPortfolioOverview 
              {...props} 
              prefixDataTestId="AnalyticsView-Overview"
            />
          </TabsContent>

          <TabsContent 
            value="equity" 
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'EquityContent')}
          >
            <EquityInvestmentsReport 
              {...props} 
              prefixDataTestId="AnalyticsView-Equity"
            />
          </TabsContent>

          <TabsContent 
            value="liquid-funds" 
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'LiquidFundsContent')}
          >
            <LiquidFundInvestmentsReport 
              {...props} 
              prefixDataTestId="AnalyticsView-LiquidFunds"
            />
          </TabsContent>

          <TabsContent 
            value="real-estate" 
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'RealEstateContent')}
          >
            <RealEstateInvestmentsReport 
              {...props} 
              prefixDataTestId="AnalyticsView-RealEstate"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsView;
