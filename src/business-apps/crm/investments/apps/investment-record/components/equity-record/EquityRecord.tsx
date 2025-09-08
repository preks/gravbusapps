import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { BarChart3, Folder, FileText, Home } from 'lucide-react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useEquityRecordData } from './hooks/useEquityRecordData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  EquityDetails,
  EquityInvestmentReports,
  EquityHistoricalDataTable,
  InvestmentRounds,
  InvestmentSections
} from './components';
import { CompanyInformation, ContactDetails, UploadReportButton, InvestmentHomeTab, InvestmentDocuments } from '../shared';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo } from '@/common/utils/navigationUtils';


interface EquityRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const EquityRecord: React.FC<EquityRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('home');

  // Fetch real GraphQL data using centralized structure
  const { equityData, isLoading, error } = useEquityRecordData(props, props.investmentId);

  // Always render the component - no error blocking

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
        case 'overview':
        default:
          return 'Back to All Investments';
      }
    }
    
    return 'Back to Investments';
  };

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen" style={{ backgroundColor: 'white', padding: '16px' }}>
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

      {/* Investment Details Header Card - Now with real data */}
      <InvestmentDetailsHeader 
        equityData={equityData}
        isLoading={isLoading}
        error={error}
        context={props}
        investmentId={props.investmentId}
      />

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
              {...props}
            />
          </TabsContent>

          <TabsContent value="overview" className="gba:space-y-6" data-testid="overview-content">
            {/* Three Information Sections */}
            <InvestmentSections 
              equityData={equityData}
              isLoading={isLoading}
            />

            {/* Investment Rounds Table */}
            <InvestmentRounds 
              equityData={equityData}
              isLoading={isLoading}
            />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation 
                investmentData={{ investment: equityData?.investment as any }}
                isLoading={isLoading}
              />
              <ContactDetails 
                investmentData={{ investment: equityData?.investment as any }}
                isLoading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="gba:space-y-6" data-testid="documents-content">
            <InvestmentDocuments
              investmentId={props.investmentId || ''}
              context={props}
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
                investmentId={equityData?.investment?.id}
                onUploadSuccess={(fileIds) => {
                  console.log('Upload successful, file IDs:', fileIds);
                  // Could trigger refresh of reports here if needed
                }}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                additionalData={props.additionalData}
              />
            </div>

            {/* Historical Data Table */}
            {props.investmentId && (
              <EquityHistoricalDataTable
                {...props}
                investmentId={props.investmentId}
                equityInvestmentId={equityData?.equityInvestment?.id}
              />
            )}

            {/* Existing Reports Display */}
            {equityData?.equityInvestment?.id && (
              <EquityInvestmentReports
                equityInvestmentId={equityData.equityInvestment.id}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                data-testid="equity-investment-reports"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EquityRecord; 