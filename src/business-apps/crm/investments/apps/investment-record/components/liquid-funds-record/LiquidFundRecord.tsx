import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Droplets, FileText, Folder, Home, BarChart3 } from 'lucide-react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { LiquidFundRecordProps } from './types';
import { useLiquidFundData } from './hooks/useLiquidFundData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  LiquidFundDetails,
  LiquidFundInvestmentReports
} from './components';
import { CompanyInformation, ContactDetails, UploadReportButton, InvestmentHomeTab, InvestmentDocuments } from '../shared';

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo } from '@/common/utils/navigationUtils';

const LiquidFundRecord: React.FC<LiquidFundRecordProps> = (props) => {
  const [activeTab, setActiveTab] = useState('home');
  const context = (props as unknown) as import('@/common/BusinessAppContext').BusinessAppContextProps;
  const { liquidFundData, isLoading, error } = useLiquidFundData(context, props.investmentId);

  // If this is not a liquid fund investment, don't render anything
  if (error && error.includes('not a liquid fund investment')) {
    return null; // Let other investment type components handle it
  }

  // Handle back navigation
  const handleBackToInvestments = () => {
    // Get URL parameters to determine which view/subView to return to
    const urlParams = new URLSearchParams(window.location.search);
    const fromView = urlParams.get('fromView') || 'investments';
    const fromSubView = urlParams.get('fromSubView') || 'overview';
    
    // Navigate back to the investment management view with appropriate parameters
    const backUrl = `/platform/irm/investment-management?view=${fromView}&subView=${fromSubView}`;
    navigateTo(backUrl);
  };

  const getBackButtonText = () => {
    // Get URL parameters to show appropriate back text
    const urlParams = new URLSearchParams(window.location.search);
    const fromSubView = urlParams.get('fromSubView');
    
    if (fromSubView) {
      switch (fromSubView) {
        case 'equity':
          return 'Back to Equity Investments';
        case 'real-estate':
          return 'Back to Real Estate Investments';
        case 'liquid-funds':
          return 'Back to Liquid Fund Investments';
        case 'private-equity':
          return 'Back to Private Equity Investments';
        case 'overview':
        default:
          return 'Back to All Investments';
      }
    }
    
    return 'Back to Investments';
  };

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen" style={{ backgroundColor: 'white', padding: '16px' }} data-testid="liquid-fund-record">
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={handleBackToInvestments}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-to-investments-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
      </div>

      {/* Investment Details Header Card */}
      <InvestmentDetailsHeader liquidFundData={liquidFundData} context={context} investmentId={props.investmentId} />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-white gba:border">
            <TabsTrigger value="home" data-testid="home-tab">
              <Home className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('crm.investments.tabs.home', 'Home')}
            </TabsTrigger>
            <TabsTrigger value="overview" data-testid="overview-tab">
              <BarChart3 className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('crm.investments.tabs.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="documents-tab">
              <Folder className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('crm.investments.tabs.documents', 'Documents')}
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="reports-tab">
              <FileText className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('crm.investments.tabs.reports', 'Reports')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="gba:space-y-6" data-testid="home-content">
            <InvestmentHomeTab
              investmentId={props.investmentId || ''}
              {...(context as any)}
            />
          </TabsContent>

          <TabsContent value="overview" className="gba:space-y-6" data-testid="overview-content">
            {/* Key Metrics */}
            <KeyMetrics liquidFundData={liquidFundData} />

            {/* Liquid Fund Details */}
            <LiquidFundDetails liquidFundData={liquidFundData} />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation investmentData={{ investment: liquidFundData?.investment as any }} />
              <ContactDetails investmentData={{ investment: liquidFundData?.investment as any }} isLoading={isLoading} />
            </div>
          </TabsContent>
          <TabsContent value="documents" className="gba:space-y-6" data-testid="documents-content">
            <InvestmentDocuments
              investmentId={props.investmentId || ''}
              context={context}
            />
          </TabsContent>
          <TabsContent value="reports" className="gba:space-y-6" data-testid="reports-content">
            {/* Reports Header with Upload Button */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
              <div>
                <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.reports.title', 'Investment Reports')}
                </h3>
                <p className="gba:text-sm gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.reports.description', 'View and manage performance reports and financial documents')}
                </p>
              </div>
              <UploadReportButton
                investmentId={liquidFundData?.investment?.id}
                onUploadSuccess={(fileIds) => {
                  console.log('Upload successful, file IDs:', fileIds);
                  // Could trigger refresh of reports here if needed
                }}
                accessToken={context.accessToken}
                userInfo={context.userInfo}
                additionalData={context.additionalData}
              />
            </div>

            {/* Existing Reports Display */}
            {liquidFundData?.liquidFundInvestment?.id && (
              <LiquidFundInvestmentReports
                liquidFundInvestmentId={liquidFundData.liquidFundInvestment.id}
                accessToken={context.accessToken}
                userInfo={context.userInfo}
                data-testid="liquid-fund-record-investment-reports"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiquidFundRecord; 