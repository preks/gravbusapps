import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Droplets } from 'lucide-react';
import { Spin, Alert, Button } from 'antd';
import { LiquidFundRecordProps } from './types';
import { liquidFundMockData } from './data/mockData';
import { useLiquidFundData } from './hooks/useLiquidFundData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  LiquidFundDetails
} from './components';
import { CompanyInformation, ContactDetails } from '../shared/components';

const LiquidFundRecord: React.FC<LiquidFundRecordProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { liquidFundData, isLoading, error, refetch } = useLiquidFundData(props, props.investmentId);
  
  // Use real data if available, otherwise fallback to mock data
  const data = liquidFundData || liquidFundMockData;

  // Show loading spinner while fetching data
  if (isLoading) {
    return (
      <div className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" data-testid="liquid-fund-record-loading">
        <Spin size="large" />
      </div>
    );
  }

  // Show error message if data fetching failed
  if (error) {
    return (
      <div className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" data-testid="liquid-fund-record-error">
        <Alert
          message="Error Loading Investment Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen" data-testid="liquid-fund-record">
      {/* Investment Details Header Card */}
      <InvestmentDetailsHeader data={data} />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-white gba:border">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <Droplets className="gba:h-4 gba:w-4 gba:mr-2" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="gba:space-y-6" data-testid="overview-content">
            {/* Key Metrics */}
            <KeyMetrics data={data} />

            {/* Liquid Fund Details */}
            <LiquidFundDetails data={data} />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation data={data} />
              <ContactDetails data={data} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiquidFundRecord; 