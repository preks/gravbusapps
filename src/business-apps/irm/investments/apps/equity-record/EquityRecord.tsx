import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { BarChart3 } from 'lucide-react';
import { EquityRecordProps } from './types';
import { equityMockData } from './data/mockData';
import { useEquityRecordData } from './hooks/useEquityRecordData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  EquityDetails
} from './components';
import { CompanyInformation, ContactDetails } from '../shared/components';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface EquityRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const EquityRecord: React.FC<EquityRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const mockData = equityMockData;

  // Fetch real GraphQL data
  const { equityData, isLoading, error } = useEquityRecordData(props, props.investmentId);

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen">
      {/* Investment Details Header Card - Now with real data */}
      <InvestmentDetailsHeader 
        data={!equityData ? mockData : undefined} 
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
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="gba:space-y-6" data-testid="overview-content">
            {/* Key Metrics - Now with real data and calculated KPIs */}
            <KeyMetrics 
              data={!equityData ? mockData : undefined}
              equityData={equityData}
              isLoading={isLoading}
            />

            {/* Equity Details - Now with real data */}
            <EquityDetails 
              data={!equityData ? mockData : undefined}
              equityData={equityData}
              isLoading={isLoading}
            />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation 
                data={!equityData ? mockData : undefined}
                equityData={equityData}
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

export default EquityRecord; 