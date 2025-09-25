import React, { useState, useMemo } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AnalyticsFilters } from './types';
import dayjs from 'dayjs';
import { AnalyticsTable } from './components/LiquidFundReportTable';
import { ReportFilterPanel, useReportFilters } from '../components/shared';

// Using separate DatePicker components for start and end dates

interface LiquidFundReportProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const LiquidFundReport: React.FC<LiquidFundReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'liquid-fund-analytics'
}) => {
  // Sub-tab management - Start with Bank Deposits since Overview is removed
  const [activeSubTab, setActiveSubTab] = useState<string>('tab1');

  // Shared filter state and logic
  const reportFilters = useReportFilters();

  // Create filters for specific investment types (Overview removed)
  const bankDepositFilters = useMemo((): AnalyticsFilters => ({
    startDate: reportFilters.computedFilters.startDate,
    endDate: reportFilters.computedFilters.endDate,
    investmentType: 'Bank Deposit'
  }), [reportFilters.computedFilters.startDate, reportFilters.computedFilters.endDate]);

  const fixedTermDepositFilters = useMemo((): AnalyticsFilters => ({
    startDate: reportFilters.computedFilters.startDate,
    endDate: reportFilters.computedFilters.endDate,
    investmentType: 'Fixed-Term Deposit'
  }), [reportFilters.computedFilters.startDate, reportFilters.computedFilters.endDate]);

  const multipleTypesFilters = useMemo((): AnalyticsFilters => ({
    startDate: reportFilters.computedFilters.startDate,
    endDate: reportFilters.computedFilters.endDate,
    investmentType: 'Money Market Funds,Pension Fund,Equity,Bond' // Multiple types separated by comma
  }), [reportFilters.computedFilters.startDate, reportFilters.computedFilters.endDate]);





  // Don't render filter-dependent content until filters are initialized
  if (!reportFilters.filtersInitialized) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    );
  }

  return (
    <div className="gba:space-y-6 gba:p-6" data-testid={dataTestId}>
      {/* Filters Section */}
      <ReportFilterPanel
        filters={reportFilters}
        variant="simple"
        title={getTranslationFromI18nKeyAndLabel('filters.title', 'Filters')}
        data-testid={`${dataTestId}-filters`}
      />

      {/* Analytics Tables with Sub-tabs - Overview removed */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
          <TabsTrigger value="tab1" data-testid={`${dataTestId}-tab1`}>
            Bank Deposits
          </TabsTrigger>
          <TabsTrigger value="tab2" data-testid={`${dataTestId}-tab2`}>
            Fixed-Term Deposits
          </TabsTrigger>
          <TabsTrigger value="tab3" data-testid={`${dataTestId}-tab3`}>
            Multiple Types
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tab1" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={bankDepositFilters}
            investmentType="Bank Deposits"
            title="Liquid Fund Analytics - Bank Deposits"
            data-testid={`${dataTestId}-bank-deposits-table`}
          />
        </TabsContent>
        
        <TabsContent value="tab2" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={fixedTermDepositFilters}
            investmentType="Fixed-Term Deposits"
            title="Liquid Fund Analytics - Fixed-Term Deposits"
            data-testid={`${dataTestId}-fixed-term-deposits-table`}
          />
        </TabsContent>
        
        <TabsContent value="tab3" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={multipleTypesFilters}
            investmentType="Multiple Investment Types"
            title="Liquid Fund Analytics - Money Market, Pension, Equity & Bond"
            data-testid={`${dataTestId}-multiple-types-table`}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default LiquidFundReport;