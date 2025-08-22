import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Droplets } from 'lucide-react';
import { LiquidFundRecordProps } from './types';
import { useLiquidFundData } from './hooks/useLiquidFundData';
import {
  InvestmentDetailsHeader,
  KeyMetrics,
  LiquidFundDetails
} from './components';
import { CompanyInformation, ContactDetails } from '../shared';

const LiquidFundRecord: React.FC<LiquidFundRecordProps> = (props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { liquidFundData, isLoading, error } = useLiquidFundData(props, props.investmentId);

  // If this is not a liquid fund investment, don't render anything
  if (error && error.includes('not a liquid fund investment')) {
    return null; // Let other investment type components handle it
  }

  return (
    <div className="gba:bg-gray-50 gba:min-h-screen" data-testid="liquid-fund-record">
      {/* Investment Details Header Card */}
      <InvestmentDetailsHeader liquidFundData={liquidFundData} />

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
            <KeyMetrics liquidFundData={liquidFundData} />

            {/* Liquid Fund Details */}
            <LiquidFundDetails liquidFundData={liquidFundData} />

            {/* Company Information and Contact Details */}
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
              <CompanyInformation />
              <ContactDetails />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiquidFundRecord; 