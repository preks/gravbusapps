import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { BarChart3, Folder, FileText } from 'lucide-react';
import { useEquityRecordData } from './hooks/useEquityRecordData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  EquityDetails,
  EquityInvestmentReports
} from './components';
import { CompanyInformation, ContactDetails, UploadReportButton } from '../shared';
import { DocumentManager, useDocumentDataController } from '@/components/document-manager';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface EquityRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const EquityRecord: React.FC<EquityRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const documentDataController = useDocumentDataController();

  // Fetch real GraphQL data using centralized structure
  // Fetch real GraphQL data using centralized structure
  const { equityData, isLoading, error } = useEquityRecordData(props, props.investmentId);

  // If this is not an equity investment, don't render anything
  if (error && error.includes('not an equity investment')) {
    return null; // Let other investment type components handle it
  }

  // If this is not an equity investment, don't render anything
  if (error && error.includes('not an equity investment')) {
    return null; // Let other investment type components handle it
  }

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen">
      {/* Investment Details Header Card - Now with real data */}
      <InvestmentDetailsHeader 
        equityData={equityData}
        isLoading={isLoading}
        error={error}
      />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-white gba:border">
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

          <TabsContent value="overview" className="gba:space-y-6" data-testid="overview-content">
            {/* Key Metrics - Now with real data and calculated KPIs */}
            <KeyMetrics 
              equityData={equityData}
              isLoading={isLoading}
            />

            {/* Equity Details - Now with real data */}
            <EquityDetails 
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
            <div className="gba:p-0">
              <DocumentManager
                entityId={equityData?.investment?.investmentAccount?.id || ''}
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