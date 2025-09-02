import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Home, Folder, FileText } from 'lucide-react';
import { useRealEstateRecordData } from './hooks/useRealEstateRecordData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  RealEstateDetails,
  RealEstateInvestmentReports
} from './components';
import { DocumentManager, useDocumentDataController } from '@/components/document-manager';
import { CompanyInformation, ContactDetails, UploadReportButton } from '../shared';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface RealEstateRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const RealEstateRecord: React.FC<RealEstateRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const context = (props as unknown) as import('@/common/BusinessAppContext').BusinessAppContextProps;

  // Fetch real GraphQL data using centralized structure
  // Fetch real GraphQL data using centralized structure
  const { realEstateData, isLoading, error } = useRealEstateRecordData(props, props.investmentId);
  const documentDataController = useDocumentDataController();

  // If this is not a real estate investment, don't render anything
  if (error && error.includes('not a real estate investment')) {
    return null; // Let other investment type components handle it
  }

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen">
      {/* Investment Details Header Card - Now with real data */}
      <InvestmentDetailsHeader 
        realEstateData={realEstateData}
        isLoading={isLoading}
        error={error}
        context={context}
      />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-white gba:border">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <Home className="gba:h-4 gba:w-4 gba:mr-2" />
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
            {/* Key Metrics - Now with real data and calculated KPIs */}
            <KeyMetrics 
              realEstateData={realEstateData}
              isLoading={isLoading}
            />

            {/* Real Estate Details */}
            <RealEstateDetails 
              realEstateData={realEstateData}
              isLoading={isLoading}
            />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation investmentData={{ investment: realEstateData?.investment as any }} isLoading={isLoading} />
              <ContactDetails investmentData={{ investment: realEstateData?.investment as any }} isLoading={isLoading} />
            </div>
          </TabsContent>
          <TabsContent value="documents" className="gba:space-y-6" data-testid="documents-content">
            <div className="gba:p-0">
              <DocumentManager
                entityId={realEstateData?.investment?.investmentAccount?.id || ''}
                entityType="account"
                context={{ accessToken: props.accessToken }}
                dataController={documentDataController}
              />
            </div>
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
                onUploadSuccess={(fileIds) => {
                  console.log('Upload successful, file IDs:', fileIds);
                  // Could trigger refresh of reports here if needed
                }}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                additionalData={props.additionalData}
              />
            </div>

            {/* Existing Reports Display */}
            {realEstateData?.realEstateInvestment?.id && (
              <RealEstateInvestmentReports
                realEstateInvestmentId={realEstateData.realEstateInvestment.id}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                data-testid="real-estate-investment-reports"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RealEstateRecord; 