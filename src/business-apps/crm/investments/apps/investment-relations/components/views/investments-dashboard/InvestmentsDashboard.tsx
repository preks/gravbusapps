import React, { useState } from 'react';
import { Tabs, TabsContent } from '@newwork/nw-design-system';
import { Drawer } from 'antd';
import { InvestmentsDashboardProps } from './types/investmentTypes';
import { 
  DashboardHeader,
  DashboardNavigation,
  InvestmentTypesTab,
  AllInvestmentsTab,
  AnalyticsTab
} from './components';
import { EquityRecord } from '@/business-apps/irm/investments/apps/equity-record';
import { RealEstateRecord } from '@/business-apps/irm/investments/apps/real-estate-record';
import { PrivateEquityRecord } from '@/business-apps/irm/investments/apps/private-equity-record';
import { LiquidFundRecord } from '@/business-apps/irm/investments/apps/liquid-funds-record';

/**
 * Main dashboard component for IRM Investments management
 * Provides overview of all investments with filtering, sorting, and metrics
 */
const InvestmentsDashboard: React.FC<InvestmentsDashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  const [activeTab, setActiveTab] = useState('investment-types');
  const [allInvestmentsSubTab, setAllInvestmentsSubTab] = useState('overview');
  const [selectedEquityId, setSelectedEquityId] = useState<string | null>(null);
  const [selectedRealEstateId, setSelectedRealEstateId] = useState<string | null>(null);
  const [selectedPrivateEquityId, setSelectedPrivateEquityId] = useState<string | null>(null);
  const [selectedLiquidFundId, setSelectedLiquidFundId] = useState<string | null>(null);
  const [isEquityRecordVisible, setIsEquityRecordVisible] = useState(false);
  const [isRealEstateRecordVisible, setIsRealEstateRecordVisible] = useState(false);
  const [isPrivateEquityRecordVisible, setIsPrivateEquityRecordVisible] = useState(false);
  const [isLiquidFundRecordVisible, setIsLiquidFundRecordVisible] = useState(false);

  const handleEquityRowClick = (equityId: string) => {
    setSelectedEquityId(equityId);
    setIsEquityRecordVisible(true);
  };

  const handleRealEstateRowClick = (realEstateId: string) => {
    setSelectedRealEstateId(realEstateId);
    setIsRealEstateRecordVisible(true);
  };

  const handlePrivateEquityRowClick = (privateEquityId: string) => {
    setSelectedPrivateEquityId(privateEquityId);
    setIsPrivateEquityRecordVisible(true);
  };

  const handleLiquidFundRowClick = (liquidFundId: string) => {
    setSelectedLiquidFundId(liquidFundId);
    setIsLiquidFundRecordVisible(true);
  };

  const handleCloseEquityRecord = () => {
    setIsEquityRecordVisible(false);
    setSelectedEquityId(null);
  };

  const handleCloseRealEstateRecord = () => {
    setIsRealEstateRecordVisible(false);
    setSelectedRealEstateId(null);
  };

  const handleClosePrivateEquityRecord = () => {
    setIsPrivateEquityRecordVisible(false);
    setSelectedPrivateEquityId(null);
  };

  const handleCloseLiquidFundRecord = () => {
    setIsLiquidFundRecordVisible(false);
    setSelectedLiquidFundId(null);
  };

  return (
    <div className="gba:min-h-screen gba:bg-gray-50" data-testid="investments-dashboard">
      {!isEquityRecordVisible && !isRealEstateRecordVisible && !isPrivateEquityRecordVisible && !isLiquidFundRecordVisible ? (
        <>
          {/* Header */}
          <DashboardHeader />

          {/* Navigation Tabs */}
          <DashboardNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Main Content */}
          <div className="gba:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsContent value="investment-types">
            <InvestmentTypesTab 
              accessToken={accessToken}
              userInfo={userInfo}
              onNavigateToInvestmentType={(investmentType: string) => {
                setActiveTab('all-investments');
                setAllInvestmentsSubTab(investmentType);
              }}
            />
          </TabsContent>

                        <TabsContent value="all-investments">
            <AllInvestmentsTab 
              onEquityRowClick={handleEquityRowClick}
              onRealEstateRowClick={handleRealEstateRowClick}
              onPrivateEquityRowClick={handlePrivateEquityRowClick}
              onLiquidFundRowClick={handleLiquidFundRowClick}
              accessToken={accessToken}
              userInfo={userInfo}
              initialSubTab={allInvestmentsSubTab}
              onSubTabChange={setAllInvestmentsSubTab}
            />
          </TabsContent>

              <TabsContent value="analytics">
                <AnalyticsTab 
                  accessToken={accessToken}
                  userInfo={userInfo}
                />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        /* Fullscreen Record Views */
        <div className="gba:min-h-screen gba:bg-white">
          {isEquityRecordVisible && (
            <>
              <div className="gba:p-4 gba:border-b gba:bg-gray-50 gba:flex gba:items-center gba:justify-between">
                <h1 className="gba:text-lg gba:font-semibold gba:text-gray-900">Equity Investment Details</h1>
                <button
                  onClick={handleCloseEquityRecord}
                  className="gba:px-4 gba:py-2 gba:bg-gray-200 gba:text-gray-700 gba:rounded gba:hover:bg-gray-300 gba:transition-colors"
                  data-testid="close-equity-record"
                >
                  ← Back to Dashboard
                </button>
              </div>
              {selectedEquityId && (
                <EquityRecord
                  accessToken={accessToken}
                  userInfo={userInfo}
                  investmentId={selectedEquityId}
                />
              )}
            </>
          )}
          
          {isRealEstateRecordVisible && (
            <>
              <div className="gba:p-4 gba:border-b gba:bg-gray-50 gba:flex gba:items-center gba:justify-between">
                <h1 className="gba:text-lg gba:font-semibold gba:text-gray-900">Real Estate Investment Details</h1>
                <button
                  onClick={handleCloseRealEstateRecord}
                  className="gba:px-4 gba:py-2 gba:bg-gray-200 gba:text-gray-700 gba:rounded gba:hover:bg-gray-300 gba:transition-colors"
                  data-testid="close-real-estate-record"
                >
                  ← Back to Dashboard
                </button>
              </div>
                             {selectedRealEstateId && (
                <RealEstateRecord
                  accessToken={accessToken}
                  userInfo={userInfo}
                  investmentId={selectedRealEstateId}
                />
              )}
            </>
          )}
          
          {isPrivateEquityRecordVisible && (
            <>
              <div className="gba:p-4 gba:border-b gba:bg-gray-50 gba:flex gba:items-center gba:justify-between">
                <h1 className="gba:text-lg gba:font-semibold gba:text-gray-900">Private Equity Investment Details</h1>
                <button
                  onClick={handleClosePrivateEquityRecord}
                  className="gba:px-4 gba:py-2 gba:bg-gray-200 gba:text-gray-700 gba:rounded gba:hover:bg-gray-300 gba:transition-colors"
                  data-testid="close-private-equity-record"
                >
                  ← Back to Dashboard
                </button>
              </div>
              {selectedPrivateEquityId && (
                <PrivateEquityRecord
                  accessToken={accessToken}
                  userInfo={userInfo}
                  investmentId={selectedPrivateEquityId}
                />
              )}
            </>
          )}
          
          {isLiquidFundRecordVisible && (
            <>
              <div className="gba:p-4 gba:border-b gba:bg-gray-50 gba:flex gba:items-center gba:justify-between">
                <h1 className="gba:text-lg gba:font-semibold gba:text-gray-900">Liquid Fund Investment Details</h1>
                <button
                  onClick={handleCloseLiquidFundRecord}
                  className="gba:px-4 gba:py-2 gba:bg-gray-200 gba:text-gray-700 gba:rounded gba:hover:bg-gray-300 gba:transition-colors"
                  data-testid="close-liquid-fund-record"
                >
                  ← Back to Dashboard
                </button>
              </div>
              {selectedLiquidFundId && (
                <LiquidFundRecord
                  accessToken={accessToken}
                  userInfo={userInfo}
                  investmentId={selectedLiquidFundId}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InvestmentsDashboard;