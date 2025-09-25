// Investment Tab Configuration Utilities
import React from 'react';
import { Home, BarChart3, Folder, FileText } from 'lucide-react';
import { DocumentSection } from '@/common/components/common-relations/record-sections/document-section';
import { AccountSection } from '@/common/components/common-relations/record-sections/account-section';
import { ContactSection } from '@/common/components/common-relations/record-sections/contact-section';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
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
 * Gets type-specific overview content
 */
export const getTypeSpecificOverviewContent = (investmentType: string, typeSpecificData: any) => {
  switch (investmentType) {
    case 'equity':
      return (
        <EquityInvestmentRounds 
          equityData={typeSpecificData}
          isLoading={false}
        />
      );
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
) => ({
  defaultValue: activeTab,
  onValueChange: setActiveTab,
  items: [
    // Home Tab
    {
      value: 'home',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.home', 'Home'),
      icon: <Home className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12">
          <InvestmentHomeTab
            investmentId={investmentId}
            {...props}
          />
        </div>
      )
    },
    // Overview Tab
    {
      value: 'overview',
      label: getTranslationFromI18nKeyAndLabel('crm.investments.tabs.overview', 'Overview'),
      icon: <BarChart3 className="gba:h-4 gba:w-4 gba:mr-2" />,
      content: (
        <div className="gba:col-span-12 gba:space-y-6">
          {/* Generate One-Pager Action */}
          <div className="gba:flex gba:justify-end gba:mb-4">
          <GenerateOnePagerButton
            investmentId={investment?.id}
            investment={investment}
            catalogData={catalogData}
            accessToken={props.accessToken}
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
          {getTypeSpecificOverviewContent(investmentType, typeSpecificData)}

          {/* Common Account and Contact Information */}
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
            <AccountSection 
              account={investment?.investmentAccount}
              accessToken={props.accessToken}
              data-testid="investment-account-section"
            />
            <ContactSection 
              contacts={investment?.investmentAccount?.investmentAccountContact?.map((link: any) => link?.contact).filter(Boolean) || []}
              accessToken={props.accessToken}
              data-testid="investment-contact-section"
            />
          </div>
        </div>
      )
    },
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
          <div className="gba:flex gba:justify-end gba:mb-4">
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
  ]
});
