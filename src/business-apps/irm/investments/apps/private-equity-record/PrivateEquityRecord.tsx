import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { DollarSign } from 'lucide-react';
import { PrivateEquityRecordProps } from './types';
import { privateEquityMockData } from './data/mockData';
import { usePrivateEquityRecordData } from './hooks/usePrivateEquityRecordData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  PrivateEquityDetails,
  CompanyInformation,
  ContactDetails
} from './components';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface PrivateEquityRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const PrivateEquityRecord: React.FC<PrivateEquityRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const mockData = privateEquityMockData;

  // Fetch real GraphQL data
  const { privateEquityData, isLoading, error } = usePrivateEquityRecordData(props, props.investmentId);

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen">
      {/* Investment Details Header Card - Now with real data */}
      <InvestmentDetailsHeader 
        data={!privateEquityData ? mockData : undefined} 
        privateEquityData={privateEquityData}
        isLoading={isLoading}
        error={error}
      />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-white gba:border">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <DollarSign className="gba:h-4 gba:w-4 gba:mr-2" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="gba:space-y-6" data-testid="overview-content">
            {/* Key Metrics - Now with real data and calculated KPIs */}
            <KeyMetrics 
              data={!privateEquityData ? mockData : undefined}
              privateEquityData={privateEquityData}
              isLoading={isLoading}
            />

            {/* Private Equity Details - Now with real data */}
            <PrivateEquityDetails 
              data={!privateEquityData ? mockData : undefined}
              privateEquityData={privateEquityData}
              isLoading={isLoading}
            />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation 
                data={!privateEquityData ? mockData : undefined}
                privateEquityData={privateEquityData}
                isLoading={isLoading}
              />
              <ContactDetails 
                data={mockData}
                isLoading={isLoading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PrivateEquityRecord;
export type { PrivateEquityRecordProps }; 