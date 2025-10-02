// Investment Tab Configuration Utilities
import { Home, BarChart3, Folder, FileText } from 'lucide-react';
import { DocumentSection } from '@/common/components/common-relations/record-sections/document-section';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  GenerateOnePagerButton, 
  UploadReportButton,
  InvestmentTileSection,
  InvestmentHomeTab,
  InvestmentReportsTab
} from '../components/shared';
import {
  EquityInvestmentRounds,
  RealEstateLiquidityForecast 
} from '../components/group-specific';
// Remove dependency on investmentTypeUtils - now using dynamic types

/**
 * Gets type-specific overview content with enhanced equity detection
 */
export const getTypeSpecificOverviewContent = (investmentType: string, typeSpecificData: any, businessAppContext?: BusinessAppContextProps, onRefresh?: () => void) => {
  // Enhanced equity detection - check multiple conditions
  const isEquityInvestment = 
    investmentType === 'equity' ||
    (investmentType || '').toLowerCase().includes('equity') ||
    (typeSpecificData?.investment?.investmentGroup?.code || '').includes('EQUITY') ||
    (typeSpecificData?.investment?.investmentType?.code || '').toLowerCase().includes('equity') ||
    typeSpecificData?.equityInvestment; // Has equity data

  // Enhanced real estate detection - check multiple conditions
  const isRealEstateInvestment = 
    investmentType === 'real_estate' ||
    (investmentType || '').toLowerCase().includes('real_estate') ||
    (investmentType || '').toLowerCase().includes('realestate') ||
    (typeSpecificData?.investment?.investmentGroup?.code || '').includes('REAL_ESTATE') ||
    (typeSpecificData?.investment?.investmentType?.code || '').toLowerCase().includes('real_estate') ||
    typeSpecificData?.realEstateInvestment; // Has real estate data

  if (isEquityInvestment) {
    return (
      <div data-testid="equity-overview-section">
        <EquityInvestmentRounds 
          equityData={typeSpecificData}
          isLoading={false}
          onRefresh={onRefresh}
          data-testid="equity-investment-rounds-overview"
          accessToken={businessAppContext?.accessToken || ''}
          userInfo={businessAppContext?.userInfo}
          additionalData={businessAppContext?.additionalData}
        />
      </div>
    );
  }

  if (isRealEstateInvestment) {
    return (
      <div data-testid="real-estate-overview-section">
        <RealEstateLiquidityForecast 
          realEstateData={typeSpecificData}
          isLoading={false}
          data-testid="real-estate-liquidity-forecast-overview"
        />
      </div>
    );
  }

  switch (investmentType) {
    case 'real_estate':
      return (
        <RealEstateLiquidityForecast 
          realEstateData={typeSpecificData}
          isLoading={false}
        />
      );
    default:
      return null;
  }
};

/**
 * Creates the tab configuration for RecordLayout
 */
export const createInvestmentTabsConfig = (
  activeTab: string,
  setActiveTab: (tab: string) => void,
  investmentId: string,
  investment: any,
  investmentType: string,
  typeSpecificData: any,
  processedTiles: any[],
  documents: any[],
  loadData: () => void,
  props: BusinessAppContextProps,
  catalogData?: any
) => {
  // Create base tabs array
  const tabs = [
    // Home Tab
    {
      value: 'home',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.home', 'Home'),
      icon: <Home className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
          <InvestmentHomeTab
            investmentId={investmentId}
            investment={investment}
            {...props}
          />
      )
    }
  ];

  // Add Overview Tab only for non-liquid fund investments
  const typeStr = (investmentType || '').toUpperCase();
  const isLiquidFund =
    typeStr === 'LIQUID_FUND' ||
    typeStr.includes('LIQUID_FUND') ||
    ((investment?.investmentGroup?.code || '').toUpperCase().includes('LIQUID_FUND')) ||
    ((investment?.investmentGroup?.value || '').toUpperCase().includes('LIQUID_FUND')) ||
    ((investment?.investmentType?.code || '').toUpperCase().includes('LIQUID_FUND')) ||
    ((investment?.investmentType?.value || '').toUpperCase().includes('LIQUID_FUND'));
  
  if (!isLiquidFund) {
    tabs.push({
      value: 'overview',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.overview', 'Overview'),
      icon: <BarChart3 className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12 gba:space-y-6">
          {/* Generate One-Pager Action */}
          <div 
            className="gba:flex gba:justify-end"
            style={{ marginBottom: 'var(--nw-spacing-lg)' }}
            data-testid="investment-generate-onepager-section"
          >
            <GenerateOnePagerButton
              investmentId={investment?.id}
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              investmentData={investment}
            />
          </div>

          {/* Investment Tile Section - only show if tile fields are configured */}
          {processedTiles.length > 0 && (
            <InvestmentTileSection 
              investment={investment}
              isLoading={false}
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              additionalData={props.additionalData}
              data-testid={`${investmentType}-record-tiles`}
            />
          )}

          {/* Type-specific content */}
          {getTypeSpecificOverviewContent(investmentType, typeSpecificData, props, loadData)}

          {/* Note: Account and Contact sections removed - now available in Home tab */}
        </div>
      )
    });
  }

  // Add remaining tabs
  tabs.push(
    // Documents Tab
    {
      value: 'documents',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.documents', 'Documents'),
      icon: <Folder className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12">
          <DocumentSection
            entityId={investmentId}
            documents={documents}
            isLoading={false}
            error={null}
            onRefresh={loadData}
            uploadActionProps={{
              contextsArray: [FlowContextName.investmentDocumentCreate],
              externalContextData: { investmentId },
              prefixDataTestId: 'investment-document-upload'
            }}
            createFolderActionProps={{
              contextsArray: [FlowContextName.investmentDocumentCreate],
              externalContextData: { investmentId },
              prefixDataTestId: 'investment-document-create-folder'
            }}
            data-testid="investment-document-section"
            {...props}
          />
        </div>
      )
    },
    // Reports Tab
    {
      value: 'reports',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.reports', 'Reports'),
      icon: <FileText className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12 gba:space-y-6">
          {/* Upload Report Action */}
          <div 
            className="gba:flex gba:justify-end"
            style={{ marginBottom: 'var(--nw-spacing-lg)' }}
            data-testid="investment-upload-report-section"
          >
            <UploadReportButton
              investmentId={investment?.id}
              accessToken={props.accessToken}
            />
          </div>

          {/* Investment Reports Tab */}
          <InvestmentReportsTab
            investmentId={investmentId}
            investmentGroupIds={[investment?.investmentGroup?.id].filter(Boolean)}
            specificInvestmentId={investmentId}
            catalogData={catalogData}
            investmentTypeCode={investment?.investmentType?.code || ''}
            liquidFundTypeCode={typeSpecificData?.liquidFundInvestment?.investmentLiquidFundType?.code}
            investment={investment}
            typeSpecificData={typeSpecificData}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
            additionalData={props.additionalData}
          />
        </div>
      )
    }
  );

  return {
    defaultValue: activeTab,
    onValueChange: (val: string) => {
      setActiveTab(val);
      const url = buildPlatformUrl(window.location.pathname, { tab: val });
      navigateTo(url);
    },
    items: tabs
  };
};
