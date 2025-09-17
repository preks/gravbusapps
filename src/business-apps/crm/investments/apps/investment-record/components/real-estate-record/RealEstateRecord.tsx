import React, { useState, useMemo } from 'react';
import { RecordLayout, Badge, Spinner } from '@newwork/nw-design-system';
import { Home, Folder, FileText, BarChart3, Building, TrendingUp } from 'lucide-react';
import { 
  UserOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useRealEstateRecordData } from './hooks/useRealEstateRecordData';
import {
  LiquidityForecast
} from './components';
import InvestmentReportsTab from '../shared/InvestmentReportsTab';
// No more hardcoded catalog IDs - component decides what it needs
import { CompanyInformation, ContactDetails, UploadReportButton, GenerateOnePagerButton, InvestmentHomeTab, InvestmentTileSection } from '../shared';
import { useInvestmentTileFields } from '../../hooks/useInvestmentTileFields';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo } from '@/common/utils/navigationUtils';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { AiSummaryButton } from '@/common/components/common-relations/record-sections/header-section/ai-summary-button';
import { useInvestmentAiSummary } from '../../hooks/useInvestmentAiSummary';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import DocumentSection from '@/common/components/common-relations/record-sections/document-section/DocumentSection';

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

  // AI Summary hook for HeaderSection
  const aiSummaryHook = useInvestmentAiSummary(props.investmentId || '', props.accessToken);

  // Helper function to format currency values
  const formatCurrencyValue = (amount: number, currency: any): string => {
    if (!amount || !currency) return '-';
    const currencyCode = typeof currency === 'string' ? currency.split(':').pop() || 'EUR' : 'EUR';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
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

  // Memoize header meta badge with investment type and status
  const headerMeta = useMemo(() => {
    if (!realEstateData?.investment) return null;

    const investment = realEstateData.investment;
    const realEstate = realEstateData.realEstateInvestment;
    
    return (
      <div className="gba:flex gba:gap-2">
        <Badge variant="secondary" className="gba:bg-green-100 gba:text-green-800">
          {investment.investmentType?.value || 'Real Estate'}
        </Badge>
        {investment.investmentStatus && (
          <Badge 
            variant={investment.investmentStatus.value === 'Active' ? 'default' : 'secondary'}
            className={investment.investmentStatus.value === 'Active' ? 'gba:bg-blue-100 gba:text-blue-800' : 'gba:bg-gray-100 gba:text-gray-800'}
          >
            {investment.investmentStatus.value}
          </Badge>
        )}
        {realEstate?.propertyType && (
          <Badge variant="outline" className="gba:border-orange-200 gba:text-orange-800">
            {realEstate.propertyType.value}
          </Badge>
        )}
      </div>
    );
  }, [realEstateData?.investment, realEstateData?.realEstateInvestment]);

  // Memoize header detail groups with investment fields
  const headerDetailGroups = useMemo(() => {
    if (!realEstateData?.investment) return [];

    const investment = realEstateData.investment;
    const realEstate = realEstateData.realEstateInvestment;

    return [
      {
        id: 'investment-financial',
        items: [
          {
            label: 'Initial Investment',
            value: investment.initialInvestmentAmount 
              ? formatCurrencyValue(investment.initialInvestmentAmount, investment.currency) 
              : '-',
            icon: DollarOutlined
          },
          {
            label: 'Total Investment',
            value: investment.totalInvestmentAmount 
              ? formatCurrencyValue(investment.totalInvestmentAmount, investment.currency) 
              : '-',
            icon: DollarOutlined
          },
          {
            label: 'Current Value',
            value: investment.investmentMarketValue
              ? formatCurrencyValue(investment.investmentMarketValue, investment.currency) 
              : '-',
            icon: TrendingUp
          }
        ]
      },
      {
        id: 'investment-dates',
        items: [
          {
            label: 'Creation Date',
            value: investment.createdAt
              ? new Date(investment.createdAt).toLocaleDateString() 
              : '-',
            icon: CalendarOutlined
          },
          {
            label: 'Acquisition Date',
            value: investment.acquisitionDate 
              ? new Date(investment.acquisitionDate).toLocaleDateString() 
              : '-',
            icon: CalendarOutlined
          }
        ]
      },
      {
        id: 'investment-details',
        items: [
          {
            label: 'Investment Group',
            value: investment.investmentGroup?.value || '-',
            icon: UserOutlined
          },
          {
            label: 'Property Type',
            value: realEstate?.propertyType?.value || investment.investmentType?.value || '-',
            icon: Building
          }
        ]
      }
    ];
  }, [realEstateData?.investment, realEstateData?.realEstateInvestment]);

  // Memoize header actions with AI Summary Button
  const headerActions = useMemo(() => (
    <AiSummaryButton
      config={{
        entityType: 'investment',
        loadingMessage: 'Generating AI Summary...',
        loadingSubtitle: 'Analyzing real estate investment data and activities'
      }}
      summaryHook={aiSummaryHook}
      dataTestId={`real-estate-update-button-${props.investmentId}`}
    />
  ), [aiSummaryHook, props.investmentId]);

  // Memoize header action button with InvestmentEntity flow context
  const headerActionButton = useMemo(() => (
    <AppActionButton
      size="icon"
      contextsArray={[FlowContextName.investmentEntity]}
      externalContextData={{ investmentId: props.investmentId }}
      prefixDataTestId="real-estate-record-action"
      emptyStateBehavior="hide"
      deferMainContextRequestsUntilClick={false}
      accessToken={props.accessToken}
    />
  ), [props.investmentId, props.accessToken]);

  // Memoize subViews configuration for RecordLayout
  const subViewsConfig = useMemo(() => ({
    defaultValue: activeTab,
    onValueChange: setActiveTab,
    items: [
      {
        value: 'home',
        label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.home', 'Home'),
        icon: <Home className="gba:h-4 gba:w-4 gba:mr-2" />,
        content: (
          <div className="gba:col-span-12">
            <InvestmentHomeTab
              investmentId={props.investmentId || ''}
              {...props}
            />
          </div>
        )
      },
      {
        value: 'overview',
        label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.overview', 'Overview'),
        icon: <BarChart3 className="gba:h-4 gba:w-4 gba:mr-2" />,
        content: (
          <div className="gba:col-span-12 gba:space-y-6">
            {/* Generate One-Pager Action */}
            <div className="gba:flex gba:justify-end gba:mb-4">
              <GenerateOnePagerButton
                investmentId={realEstateData?.investment?.id}
                accessToken={props.accessToken}
              />
            </div>

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
          </div>
        )
      },
      {
        value: 'documents',
        label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.documents', 'Documents'),
        icon: <Folder className="gba:h-4 gba:w-4 gba:mr-2" />,
        content: (
          <div className="gba:col-span-12">
            <DocumentSection
              entityId={props.investmentId || ''}
              documents={realEstateData?.documents?.map(doc => ({
                id: doc.id,
                name: doc.name,
                description: doc.description,
                createdAt: doc.createdAt || new Date().toISOString(),
                expirationDate: doc.expirationDate,
                documentType: doc.documentType ? {
                  id: doc.documentType.id,
                  value: doc.documentType.value,
                  code: doc.documentType.code
                } : null,
                documentGroup: doc.documentGroup ? {
                  id: doc.documentGroup.id,
                  value: doc.documentGroup.value,
                  code: doc.documentGroup.code
                } : null,
                file: doc.file,
                mimeType: doc.mimeType,
                fileSize: doc.fileSize,
                createdBy: doc.createdBy?.toString(),
                parentDocument: doc.parentDocument?.id,
                folder: doc.folder,
                verified: doc.verified,
                verificationDate: doc.verificationDate,
                authenticated: doc.authenticated,
                authenticationDate: doc.authenticationDate,
                mandatory: doc.mandatory,
                version: doc.version
              })) || []}
              isLoading={isLoading}
              error={error}
              onRefresh={() => {
                // Refresh the real estate data which includes documents
                window.location.reload();
              }}
              uploadActionProps={{
                contextsArray: [FlowContextName.investmentDocumentCreate],
                externalContextData: { investmentId: props.investmentId },
                prefixDataTestId: 'real-estate-investment-document'
              }}
              createFolderActionProps={{
                contextsArray: [FlowContextName.investmentDocumentCreate],
                externalContextData: { 
                  investmentId: props.investmentId,
                  createFolder: true 
                },
                prefixDataTestId: 'real-estate-investment-folder'
              }}
              accessToken={props.accessToken}
              data-testid="real-estate-investment-documents"
            />
          </div>
        )
      },
      {
        value: 'reports',
        label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.reports', 'Reports'),
        icon: <FileText className="gba:h-4 gba:w-4 gba:mr-2" />,
        content: (
          <div className="gba:col-span-12 gba:space-y-6">
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
          </div>
        )
      }
    ]
  }), [activeTab, setActiveTab, props, realEstateData, isLoading, hasTileFields]);

  // Show loading state during data fetch
  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show error state or back navigation if no data
  if (error || !realEstateData?.investment) {
    return (
      <div className="gba:p-8 gba:text-center">
        <div className="gba:mb-4">
          <button
            onClick={handleBackToInvestments}
            className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600 gba:mx-auto"
            data-testid="back-to-investments-button"
          >
            <span className="gba:mr-2">←</span>
            Back to Investments
          </button>
      </div>
      </div>
    );
  }

  return (
    <div
      className="gba:investment-details-container"
      data-testid="real-estate-record"
    >
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={Building}
        headerCategory="REAL ESTATE INVESTMENT"
        onBack={handleBackToInvestments}
        headerTitle={
          realEstateData?.investment?.investmentAccount?.name ||
          realEstateData?.investment?.name ||
          'Investment Details'
        }
        headerMeta={headerMeta}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        headerDetailGroups={headerDetailGroups}
        subViews={subViewsConfig}
      />
    </div>
  );
};

export default RealEstateRecord; 