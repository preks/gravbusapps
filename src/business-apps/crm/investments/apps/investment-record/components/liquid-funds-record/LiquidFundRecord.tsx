import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Droplets, FileText, Folder } from 'lucide-react';
import { DocumentManager, useDocumentDataController } from '@/components/document-manager';
import { LiquidFundRecordProps } from './types';
import { useLiquidFundData } from './hooks/useLiquidFundData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  LiquidFundDetails,
  LiquidFundInvestmentReports
} from './components';
import { CompanyInformation, ContactDetails } from '../shared';
import LiquidPortfolioReports from '@/business-apps/crm/investments/apps/investment-management/views/investment-view/components/LiquidPortfolioReports';

const LiquidFundRecord: React.FC<LiquidFundRecordProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const context = (props as unknown) as import('@/common/BusinessAppContext').BusinessAppContextProps;
  const { liquidFundData, isLoading, error } = useLiquidFundData(context, props.investmentId);
  const documentDataController = useDocumentDataController();
  const getPortfolioIdFromUrl = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('portfolioId');
  };
  const portfolioId = getPortfolioIdFromUrl();

  // If this is not a liquid fund investment, don't render anything
  if (error && error.includes('not a liquid fund investment')) {
    return null; // Let other investment type components handle it
  }

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen" data-testid="liquid-fund-record">
      {/* Investment Details Header Card */}
      <InvestmentDetailsHeader liquidFundData={liquidFundData} context={context} />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-white gba:border">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <Droplets className="gba:h-4 gba:w-4 gba:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="documents-tab">
              <Folder className="gba:h-4 gba:w-4 gba:mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="reports-tab">
              <FileText className="gba:h-4 gba:w-4 gba:mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

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
            <div className="gba:p-0">
              <DocumentManager
                entityId={liquidFundData?.investment?.investmentAccount?.id || ''}
                entityType="account"
                context={{ accessToken: context.accessToken }}
                dataController={documentDataController}
              />
            </div>
          </TabsContent>
          <TabsContent value="reports" className="gba:space-y-6" data-testid="reports-content">
            {liquidFundData?.liquidFundInvestment?.id && (
              <LiquidFundInvestmentReports
                liquidFundInvestmentId={liquidFundData.liquidFundInvestment.id}
                accessToken={context.accessToken}
                userInfo={context.userInfo}
                data-testid="liquid-fund-record-investment-reports"
              />
            )}

            {/* Portfolio-level Reports (if portfolioId provided) */}
            {portfolioId && (
              <div className="gba:space-y-4" data-testid="portfolio-reports-section">
                <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">Portfolio Reports</h3>
                <LiquidPortfolioReports
                  portfolioId={portfolioId}
                  accessToken={context.accessToken}
                  userInfo={context.userInfo}
                  data-testid="liquid-fund-record-portfolio-reports"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiquidFundRecord; 