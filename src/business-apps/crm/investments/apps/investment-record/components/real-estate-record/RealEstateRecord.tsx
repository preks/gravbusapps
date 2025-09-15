import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Home, Folder, FileText, BarChart3 } from 'lucide-react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRealEstateRecordData } from './hooks/useRealEstateRecordData';
import {
  InvestmentDetailsHeader,
  ProjectDevelopmentDetailsHeader,
  OthersDetailsHeader,
  MezzanineLoansDetailsHeader,
  LiquidityForecast
} from './components';
import InvestmentReportsTab from '../shared/InvestmentReportsTab';
// No more hardcoded catalog IDs - component decides what it needs
import { CompanyInformation, ContactDetails, UploadReportButton, GenerateOnePagerButton, InvestmentHomeTab, InvestmentTileSection } from '../shared';
import { DocumentSection, NoteSection } from '@/common/components/common-relations/record-sections';
import { useInvestmentTileFields } from '../../hooks/useInvestmentTileFields';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo } from '@/common/utils/navigationUtils';

interface RealEstateRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const RealEstateRecord: React.FC<RealEstateRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('home');

  // Fetch real GraphQL data using centralized structure
  const { realEstateData, isLoading, error } = useRealEstateRecordData(props, props.investmentId);

  // Check if tile fields are configured for this investment type
  const { processedTiles } = useInvestmentTileFields(props, realEstateData?.investment);
  const hasTileFields = processedTiles.length > 0;

  // Determine which header component to render based on investment type
  const getHeaderComponent = () => {
    const investment = realEstateData?.investment;
    const typeCode = (investment?.investmentType?.code || '').toString().toUpperCase();
    const typeName = (investment?.investmentType?.value || '').toString().toLowerCase();
    const typeRef = (investment?.investmentTypeRef || '').toString().toUpperCase();

    // Check for Mezzanine Loans - try multiple possible values
    if (typeCode.includes('MEZZANINE') || 
        typeName.includes('mezzanine') || 
        typeRef.includes('MEZZANINE') ||
        typeName.includes('mezzanine loan')) {
      return (
        <MezzanineLoansDetailsHeader 
          realEstateData={realEstateData}
          isLoading={isLoading}
          error={error}
          context={props}
          investmentId={props.investmentId}
        />
      );
    }
    
    // Check for Project Development
    if (typeCode.includes('PROJECT_DEVELOPMENT') || 
        typeName.includes('project development') || 
        typeRef.includes('PROJECT_DEVELOPMENT')) {
      return (
        <ProjectDevelopmentDetailsHeader 
          realEstateData={realEstateData}
          isLoading={isLoading}
          error={error}
          context={props}
          investmentId={props.investmentId}
        />
      );
    }
    
    // Check for Others
    if (typeCode.includes('OTHERS') || 
        typeName.includes('others') || 
        typeRef.includes('OTHERS')) {
      return (
        <OthersDetailsHeader 
          realEstateData={realEstateData}
          isLoading={isLoading}
          error={error}
          context={props}
          investmentId={props.investmentId}
        />
      );
    }
    
    // Default to Existing Properties header
    return (
      <InvestmentDetailsHeader 
        realEstateData={realEstateData}
        isLoading={isLoading}
        error={error}
        context={props}
        investmentId={props.investmentId}
      />
    );
  };

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

      {/* Dynamic Investment Details Header Card - Changes based on investment type */}
      {getHeaderComponent()}

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
            {/* Generate One-Pager Action - only show if tile fields are configured */}
            {hasTileFields && (
              <div className="gba:flex gba:justify-end gba:mb-4">
                <GenerateOnePagerButton
                  investmentId={realEstateData?.investment?.id}
                  accessToken={props.accessToken}
                />
              </div>
            )}

            {/* Investment Tile Section - only show if tile fields are configured */}
            {hasTileFields && (
              <InvestmentTileSection 
                investment={realEstateData?.investment}
                isLoading={isLoading}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                additionalData={props.additionalData}
                data-testid="real-estate-record-tiles"
              />
            )}

            {/* Liquidity Forecast 5 Years */}
            <LiquidityForecast 
              realEstateData={realEstateData}
              isLoading={isLoading}
            />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation 
                investmentData={{ investment: realEstateData?.investment as any }}
                isLoading={isLoading}
              />
              <ContactDetails 
                investmentData={{ investment: realEstateData?.investment as any }}
                isLoading={isLoading}
              />
            </div>
          </TabsContent>
          <TabsContent value="documents" className="gba:space-y-6" data-testid="documents-content">
            <DocumentSection
              entityId={props.investmentId || ''}
              entityType="investment"
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              data-testid="real-estate-investment-documents"
            />
            <NoteSection
              investmentId={props.investmentId || ''}
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              data-testid="real-estate-investment-notes"
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
                investmentId={realEstateData?.investment?.id}
                accessToken={props.accessToken}
              />
            </div>

            {/* Investment Reports Display - Using Unified Component with Dynamic Type Configuration */}
            {realEstateData?.investment?.id && (() => {
              // Determine investment type based on the same logic used for headers
              const investment = realEstateData?.investment;
              const typeCode = (investment?.investmentType?.code || '').toString().toUpperCase();
              const typeName = (investment?.investmentType?.value || '').toString().toLowerCase();
              const typeRef = (investment?.investmentTypeRef || '').toString().toUpperCase();

              let investmentType = 'real_estate_general'; // Default

              // Check for Mezzanine Loans
              if (typeCode.includes('MEZZANINE') || 
                  typeName.includes('mezzanine') || 
                  typeRef.includes('MEZZANINE') ||
                  typeName.includes('mezzanine loan')) {
                investmentType = 'mezzanine_loans';
              }
              // Check for Project Development
              else if (typeCode.includes('PROJECT_DEVELOPMENT') || 
                       typeName.includes('project development') || 
                       typeRef.includes('PROJECT_DEVELOPMENT')) {
                investmentType = 'project_development';
              }
              // Check for Others
              else if (typeCode.includes('OTHER') || 
                       typeName.includes('other') || 
                       typeRef.includes('OTHER') ||
                       typeName.includes('others')) {
                investmentType = 'others';
              }

              return (
                <InvestmentReportsTab
                  investmentId={realEstateData.investment.id}
                  investmentGroupIds={['InvestmentGroup:v1:REAL_ESTATE']}
                  specificInvestmentId={realEstateData.realEstateInvestment?.id}
                  investmentType={investmentType}
                  accessToken={props.accessToken}
                  userInfo={props.userInfo}
                  data-testid="real-estate-investment-reports"
                />
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RealEstateRecord; 