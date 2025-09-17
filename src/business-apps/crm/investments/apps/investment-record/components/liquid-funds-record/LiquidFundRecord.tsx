import React, { useState, useMemo } from 'react';
import { RecordLayout, Badge, Spinner } from '@newwork/nw-design-system';
import { Droplets, FileText, Folder, Home, BarChart3, TrendingUp } from 'lucide-react';
import { 
  UserOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { LiquidFundRecordProps } from './types';
import { useLiquidFundData } from './hooks/useLiquidFundData';
import InvestmentReportsTab from '../shared/InvestmentReportsTab';
// No more hardcoded catalog IDs - component decides what it needs
import { CompanyInformation, ContactDetails, UploadReportButton, GenerateOnePagerButton, InvestmentHomeTab } from '../shared';
import { useInvestmentTileFields } from '../../hooks/useInvestmentTileFields';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo } from '@/common/utils/navigationUtils';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { AiSummaryButton } from '@/common/components/common-relations/record-sections/header-section/ai-summary-button';
import { useInvestmentAiSummary } from '../../hooks/useInvestmentAiSummary';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

const LiquidFundRecord: React.FC<LiquidFundRecordProps> = (props) => {
  const [activeTab, setActiveTab] = useState('home');
  const context = (props as unknown) as import('@/common/BusinessAppContext').BusinessAppContextProps;
  const { liquidFundData, isLoading, error } = useLiquidFundData(context, props.investmentId);

  // Check if tile fields are configured for this investment type
  const { processedTiles } = useInvestmentTileFields(context, liquidFundData?.investment);
  const hasTileFields = processedTiles.length > 0;

  // AI Summary hook for HeaderSection
  const aiSummaryHook = useInvestmentAiSummary(props.investmentId || '', context.accessToken);

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


  // Memoize header meta badge with investment type and status
  const headerMeta = useMemo(() => {
    if (!liquidFundData?.investment) return null;

    const investment = liquidFundData.investment;
    
    return (
      <div className="gba:flex gba:gap-2">
        <Badge variant="secondary" className="gba:bg-blue-100 gba:text-blue-800">
          {investment.investmentType?.value || 'Liquid Fund'}
        </Badge>
        {investment.investmentStatus && (
          <Badge 
            variant={investment.investmentStatus.value === 'Active' ? 'default' : 'secondary'}
            className={investment.investmentStatus.value === 'Active' ? 'gba:bg-green-100 gba:text-green-800' : 'gba:bg-gray-100 gba:text-gray-800'}
          >
            {investment.investmentStatus.value}
          </Badge>
        )}
        {investment.investmentType?.value && investment.investmentType.value !== 'Liquid Fund' && (
          <Badge variant="outline" className="gba:border-purple-200 gba:text-purple-800">
            {investment.investmentType.value}
          </Badge>
        )}
      </div>
    );
  }, [liquidFundData?.investment]);

  // Memoize header detail groups with investment fields
  const headerDetailGroups = useMemo(() => {
    if (!liquidFundData?.investment) return [];

    const investment = liquidFundData.investment;

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
            label: 'Type',
            value: investment.investmentType?.value || '-',
            icon: UserOutlined
          }
        ]
      }
    ];
  }, [liquidFundData?.investment]);

  // Memoize header actions with AI Summary Button
  const headerActions = useMemo(() => (
    <AiSummaryButton
      config={{
        entityType: 'investment',
        loadingMessage: 'Generating AI Summary...',
        loadingSubtitle: 'Analyzing liquid fund data and activities'
      }}
      summaryHook={aiSummaryHook}
      dataTestId={`liquid-fund-update-button-${props.investmentId}`}
    />
  ), [aiSummaryHook, props.investmentId]);

  // Memoize header action button with InvestmentEntity flow context
  const headerActionButton = useMemo(() => (
    <AppActionButton
      size="icon"
      contextsArray={[FlowContextName.investmentEntity]}
      externalContextData={{ investmentId: props.investmentId }}
      prefixDataTestId="liquid-fund-record-action"
      emptyStateBehavior="hide"
      deferMainContextRequestsUntilClick={false}
      accessToken={context.accessToken}
    />
  ), [props.investmentId, context.accessToken]);

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
              {...context}
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
                investmentId={liquidFundData?.investment?.id}
                accessToken={context.accessToken}
              />
            </div>

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation investmentData={{ investment: liquidFundData?.investment as any }} />
              <ContactDetails investmentData={{ investment: liquidFundData?.investment as any }} isLoading={isLoading} />
            </div>
          </div>
        )
      },
      {
        value: 'documents',
        label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.documents', 'Documents'),
        icon: <Folder className="gba:h-4 gba:w-4 gba:mr-2" />,
        content: (
          <div className="gba:col-span-12 gba:p-8 gba:text-center">
            <div className="gba:max-w-md gba:mx-auto">
              <Folder className="gba:h-16 gba:w-16 gba:mx-auto gba:text-gray-300 gba:mb-4" />
              <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-2">
                Documents Coming Soon
              </h3>
              <p className="gba:text-gray-500">
                Document management features will be implemented in a future update.
              </p>
            </div>
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
                investmentId={liquidFundData?.investment?.id}
                accessToken={context.accessToken}
              />
            </div>

            {/* Investment Reports Display - Using Unified Component with Liquid Fund Configuration */}
            {liquidFundData?.investment?.id && (
              <InvestmentReportsTab
                investmentId={liquidFundData.investment.id}
                investmentGroupIds={['InvestmentGroup:v1:LIQUID_FUND']}
                specificInvestmentId={liquidFundData.liquidFundInvestment?.id}
                investmentType="liquid_fund"
                accessToken={context.accessToken}
                userInfo={context.userInfo}
                data-testid="liquid-fund-record-investment-reports"
              />
            )}
          </div>
        )
      }
    ]
  }), [activeTab, setActiveTab, props.investmentId, context, liquidFundData, isLoading, hasTileFields]);

  // Show loading state during data fetch
  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show error state or back navigation if no data
  if (error || !liquidFundData?.investment) {
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
      data-testid="liquid-fund-record"
    >
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={Droplets}
        headerCategory="LIQUID FUND INVESTMENT"
        onBack={handleBackToInvestments}
        headerTitle={
          liquidFundData?.investment?.investmentAccount?.name ||
          liquidFundData?.investment?.name ||
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

export default LiquidFundRecord; 