import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Home } from 'lucide-react';
import { RealEstateRecordProps } from './types';
import { realEstateMockData } from './data/mockData';
import { useRealEstateRecordData } from './hooks/useRealEstateRecordData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  RealEstateDetails
} from './components';
import { CompanyInformation, ContactDetails } from '../shared';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface RealEstateRecordComponentProps extends BusinessAppContextProps {
  investmentId?: string;
}

const RealEstateRecord: React.FC<RealEstateRecordComponentProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const mockData = realEstateMockData;

  // Fetch real GraphQL data
  const { realEstateData, isLoading, error } = useRealEstateRecordData(props, props.investmentId);

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen">
      {/* Investment Details Header Card - Now with real data */}
      <InvestmentDetailsHeader 
        data={!realEstateData ? mockData : undefined} 
        realEstateData={realEstateData}
        isLoading={isLoading}
        error={error}
      />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-white gba:border">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <Home className="gba:h-4 gba:w-4 gba:mr-2" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="gba:space-y-6" data-testid="overview-content">
            {/* Key Metrics - Now with real data and calculated KPIs */}
            <KeyMetrics 
              data={!realEstateData ? mockData : undefined}
              realEstateData={realEstateData}
              isLoading={isLoading}
            />

            {/* Real Estate Details */}
            <RealEstateDetails 
              data={!realEstateData ? mockData : undefined}
              realEstateData={realEstateData}
              isLoading={isLoading}
            />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation data={mockData} />
              <ContactDetails data={mockData} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RealEstateRecord; 