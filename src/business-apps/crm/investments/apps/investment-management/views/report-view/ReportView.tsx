import React, { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button
} from '@newwork/nw-design-system';
import { BarChart3, TrendingUp, Building2, PieChart, Upload } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { LiquidFundReport } from './liquid-fund-report/LiquidFundReport';
import { RealEstateReport } from './real-estate-report/RealEstateReport';
import { EquityReport } from './equity-report/EquityReport';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

export interface ReportViewProps extends BusinessAppContextProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  accessToken,
  userInfo,
  additionalData,
  initialSubTab = 'liquid-fund',
  onSubTabChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    const updateURL = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('analyticsSubView', activeSubTab);
      window.history.replaceState({}, '', url.toString());
    };

    updateURL();
    
    // Notify parent component of tab change
    if (onSubTabChange) {
      onSubTabChange(activeSubTab);
    }
  }, [activeSubTab, onSubTabChange]);

  const handleTabChange = (tabValue: string) => {
    setActiveSubTab(tabValue);
  };

  return (
    <div className="gba:h-full" data-testid="analytics-container">
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="gba:h-full">
        <div className="gba:border-b gba:border-gray-200 gba:bg-white gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:h-6 gba:w-6" />
                Investment Analytics
              </h2>
              <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
                Analyze investment performance and portfolio metrics
              </p>
            </div>
            <div>
              <AppAction
                contextsArray={[FlowContextName.investmentReportUpload]}
                accessToken={accessToken}
                emptyStateBehavior="hide"
                prefixDataTestId="investment-upload-report"
              >
                <Button
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid="upload-document-button"
                >
                  <Upload className="gba:h-4 gba:w-4" />
                  {getTranslationFromI18nKeyAndLabel('investment.reports.uploadDocument', 'Upload Report')}
                </Button>
              </AppAction>
            </div>
          </div>
          
          <TabsList className="gba:mt-4 gba:grid gba:w-full gba:grid-cols-3 gba:max-w-2xl">
            <TabsTrigger 
              value="liquid-fund" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="liquid-fund-analytics-tab"
            >
              <TrendingUp className="gba:h-4 gba:w-4" />
              Liquid Fund
            </TabsTrigger>
            <TabsTrigger 
              value="real-estate" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="real-estate-analytics-tab"
            >
              <Building2 className="gba:h-4 gba:w-4" />
              Real Estate
            </TabsTrigger>
            <TabsTrigger 
              value="equity" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="equity-analytics-tab"
            >
              <PieChart className="gba:h-4 gba:w-4" />
              Equity
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="gba:flex-1 gba:overflow-auto">
          <TabsContent value="liquid-fund" className="gba:h-full gba:mt-0">
            <LiquidFundReport
              accessToken={accessToken}
              userInfo={userInfo}
              data-testid="liquid-fund-analytics"
            />
          </TabsContent>
          
          <TabsContent value="real-estate" className="gba:h-full gba:mt-0">
            <RealEstateReport
              accessToken={accessToken}
              userInfo={userInfo}
              data-testid="real-estate-analytics"
            />
          </TabsContent>
          
          <TabsContent value="equity" className="gba:h-full gba:mt-0">
            <EquityReport
              accessToken={accessToken}
              userInfo={userInfo}
              data-testid="equity-analytics"
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ReportView;