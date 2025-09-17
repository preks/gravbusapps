import React, { useState, useMemo } from 'react';
import { RecordLayout, Badge, Spinner } from '@newwork/nw-design-system';
import { BarChart3, Folder, FileText, Home, TrendingUp, Building2 } from 'lucide-react';
import { 
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { useEquityRecordData } from './hooks/useEquityRecordData';
import {
  InvestmentRounds
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


interface EquityRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const EquityRecord: React.FC<EquityRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('home');

  // Fetch real GraphQL data using centralized structure
  const { equityData, isLoading, error } = useEquityRecordData(props, props.investmentId);

  // Check if tile fields are configured for this investment type
  const { processedTiles } = useInvestmentTileFields(props, equityData?.investment);
  const hasTileFields = processedTiles.length > 0;

  // Helper functions for formatting
  const formatCurrencyValue = (amount: number | null, currency?: { code: string } | null): string => {
    if (!amount && amount !== 0) return 'N/A';
    const currencyCode = currency?.code || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return 'N/A';
    }
  };

  // AI Summary hook for HeaderSection
  const aiSummaryHook = useInvestmentAiSummary(props.investmentId || '', props.accessToken);

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

  // Memoize header meta badge to prevent unnecessary re-renders
  const headerMeta = useMemo(() => {
    if (!equityData?.investment) return undefined;

  return (
      <div className="gba:flex gba:items-center gba:gap-2">
        <Badge variant="secondary" className="gba:text-sm">
          {equityData.investment.investmentType?.value || 'Venture/Disruptive Technology'}
        </Badge>
        <Badge variant="outline" className="gba:text-sm">
          {equityData.investment.investmentStatus?.value || 'Unknown'}
        </Badge>
        {equityData.investment.investmentStakeType?.value && (
          <Badge variant="default" className="gba:text-sm">
            {equityData.investment.investmentStakeType.value}
          </Badge>
        )}
      </div>
    );
  }, [equityData?.investment]);

  // Memoize header detail groups with investment fields
  const headerDetailGroups = useMemo(() => {
    if (!equityData?.investment) return [];

    const investment = equityData.investment;
    const equityInvestment = equityData.equityInvestment;

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
            label: 'Market Value',
            value: investment.investmentMarketValue 
              ? formatCurrencyValue(investment.investmentMarketValue, investment.currency) 
              : '-',
            icon: TrendingUp
          },
          {
            label: 'Stake Percentage',
            value: investment.stakePercentage !== null && investment.stakePercentage !== undefined 
              ? `${investment.stakePercentage.toFixed(1)}%` 
              : '-',
            icon: PercentageOutlined
          }
        ]
      },
      {
        id: 'investment-dates',
        items: [
          {
            label: 'Foundation Date',
            value: equityInvestment?.foundationDate ? formatDate(equityInvestment.foundationDate) : '-',
            icon: CalendarOutlined
          },
          {
            label: 'Acquisition Date',
            value: investment.acquisitionDate ? formatDate(investment.acquisitionDate) : '-',
            icon: CalendarOutlined
          }
        ]
      },
      {
        id: 'investment-performance',
        items: [
          {
            label: 'Turnover Amount',
            value: equityInvestment?.turnoverAmount 
              ? formatCurrencyValue(equityInvestment.turnoverAmount, investment.currency) 
              : '-',
            icon: TrendingUp
          },
          {
            label: 'EBITDA Amount',
            value: equityInvestment?.ebitdaAmount 
              ? formatCurrencyValue(equityInvestment.ebitdaAmount, investment.currency) 
              : '-',
            icon: TrendingUp
          }
        ]
      },
      {
        id: 'investment-management',
        items: [
          {
            label: 'Investment Group',
            value: investment.investmentGroup?.value || '-',
            icon: UserOutlined
          },
          {
            label: 'Owner Employee',
            value: investment.ownerEmployee?.displayName || 
                   (investment.ownerEmployee?.firstName && investment.ownerEmployee?.lastName 
                     ? `${investment.ownerEmployee.firstName} ${investment.ownerEmployee.lastName}` 
                     : '-'),
            icon: UserOutlined
          }
        ]
      }
    ];
  }, [equityData?.investment, equityData?.equityInvestment]);

  // Memoize header actions with AI Summary Button
  const headerActions = useMemo(() => (
    <AiSummaryButton
      config={{
        entityType: 'investment',
        loadingMessage: 'Generating AI Summary...',
        loadingSubtitle: 'Analyzing investment data and activities'
      }}
      summaryHook={aiSummaryHook}
      dataTestId={`investment-update-button-${props.investmentId}`}
    />
  ), [aiSummaryHook, props.investmentId]);

  // Memoize header action button with InvestmentEntity flow context
  const headerActionButton = useMemo(() => (
    <AppActionButton
      size="icon"
      contextsArray={[FlowContextName.investmentEntity]}
      externalContextData={{ investmentId: props.investmentId }}
      prefixDataTestId="investment-record-action"
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
                investmentId={equityData?.investment?.id}
                accessToken={props.accessToken}
              />
            </div>

            {/* Investment Tile Section - only show if tile fields are configured */}
            {hasTileFields && (
              <InvestmentTileSection 
                investment={equityData?.investment}
                isLoading={isLoading}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                additionalData={props.additionalData}
                data-testid="equity-record-tiles"
              />
            )}

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
            {/* Reports Header with Action Buttons */}
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
                accessToken={props.accessToken}
              />
            </div>

            {/* Investment Reports Display - Using Unified Component with Equity Configuration */}
            {equityData?.investment?.id && (
              <InvestmentReportsTab
                investmentId={equityData.investment.id}
                investmentGroupIds={['InvestmentGroup:v1:EQUITY']}
                specificInvestmentId={equityData.equityInvestment?.id}
                investmentType="equity"
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                data-testid="equity-investment-reports"
              />
            )}
          </div>
        )
      }
    ]
  }), [activeTab, setActiveTab, props, hasTileFields, equityData, isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !equityData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Investment not found'}</p>
          <button
            onClick={handleBackToInvestments}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:hover:bg-blue-600"
          >
            Back to Investments
          </button>
      </div>
      </div>
    );
  }

  return (
    <div
      className="gba:investment-details-container"
      data-testid="equity-investment-detail"
    >
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={Building2}
        headerCategory="EQUITY INVESTMENT"
        onBack={handleBackToInvestments}
        headerTitle={
          equityData?.investment?.investmentAccount?.name ||
          equityData?.investment?.name ||
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

export default EquityRecord; 