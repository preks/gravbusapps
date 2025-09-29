import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  Spinner
} from '@newwork/nw-design-system';
import { toast } from 'sonner';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { EquityAnalyticsFilters } from './types';
import { EquityAnalyticsTable } from './components/EquityAnalyticsTable';
import { useEquityInvestmentTypes } from './hooks/useEquityInvestmentTypes';
import { useGetInvestmentCatalogData } from '@/business-apps/crm/investments/forms/investment-form/queries/InvestmentCatalogQueries';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';
import { ReportFilterPanel, useReportFilters } from '../components/shared';

// Using separate DatePicker components for start and end dates

interface EquityReportProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const EquityReport: React.FC<EquityReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'equity-analytics'
}) => {
  // Fetch dynamic equity investment types from catalog
  const { investmentTypes, loading: typesLoading, error: typesError } = useEquityInvestmentTypes(accessToken);
  
  // Fetch catalog data for dynamic columns
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData({ accessToken, userInfo });
  const [catalogData, setCatalogData] = useState<any>(null);
  
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const data = await fetchInvestmentCatalogData();
        setCatalogData(data);
      } catch (error) {
        console.error('Error loading catalog data:', error);
      }
    };
    
    if (accessToken) {
      loadCatalogData();
    }
  }, [accessToken, fetchInvestmentCatalogData]);
  
  // Use catalog types if available, otherwise use empty array (only Overview tab)
  const effectiveInvestmentTypes = typesError || investmentTypes.length === 0 ? [] : investmentTypes;
  
  // Sub-tab management - start with first investment type
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  // Get initial investment type from URL parameter
  const getInitialInvestmentType = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const investmentTypeFromUrl = urlParams.get('investmentType');
    
    if (effectiveInvestmentTypes.length === 0) {
      return '';
    }
    
    // Validate against available investment types
    if (investmentTypeFromUrl && effectiveInvestmentTypes.some(type => type.code === investmentTypeFromUrl)) {
      return investmentTypeFromUrl;
    }
    
    // Fall back to first available investment type
    return effectiveInvestmentTypes[0].code;
  }, [effectiveInvestmentTypes]);

  // Update URL when activeSubTab changes using platform navigation utilities
  const updateUrl = useCallback((investmentType: string) => {
    try {
      const currentUrl = new URL(window.location.href);
      const params: Record<string, string> = {};
      
      // Preserve existing query parameters
      currentUrl.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // Update investmentType parameter
      params.investmentType = investmentType;
      
      // Use platform URL builder for safe navigation
      const newUrl = buildPlatformUrl(currentUrl.pathname, params);
      
      // Use safe history manipulation
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', newUrl);
      } else {
        // Browser doesn't support history manipulation
        throw new Error('Browser does not support history manipulation');
      }
    } catch (error) {
      console.error('Failed to update URL:', error);
      
      // Provide user feedback about the navigation issue
      toast.warning('Unable to update the page URL. The view will still function normally, but bookmarking may not work as expected.', {
        duration: 5000,
        description: 'Navigation error occurred'
      });
      
      // Continue with state updates - application should remain functional
      // even if URL manipulation fails
    }
  }, []);

  // Unified handler for activeSubTab changes
  const handleSetActiveSubTab = useCallback((code: string) => {
    setActiveSubTab(code);
    updateUrl(code);
  }, [updateUrl]);

  // Initialize tab from URL when investment types are loaded
  useEffect(() => {
    if (effectiveInvestmentTypes.length > 0 && !activeSubTab) {
      const initialType = getInitialInvestmentType();
      if (initialType) {
        setActiveSubTab(initialType);
        updateUrl(initialType);
      }
    }
  }, [effectiveInvestmentTypes, activeSubTab, getInitialInvestmentType, updateUrl]);

  // Restore tab from URL on browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentType = getInitialInvestmentType();
      if (currentType) setActiveSubTab(currentType);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialInvestmentType]);

  // Shared filter state and logic
  const reportFilters = useReportFilters();

  // Find the selected investment type from catalog
  const selectedInvestmentType = useMemo(() => {
    if (activeSubTab === 'overview') return undefined;
    return effectiveInvestmentTypes.find(type => type.code === activeSubTab);
  }, [activeSubTab, effectiveInvestmentTypes]);

  // Create filters for equity analytics (with investment type filtering)
  const equityAnalyticsFilters = useMemo((): EquityAnalyticsFilters => {
    const filters = {
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      investmentType: selectedInvestmentType?.code || undefined
    };

    return filters;
  }, [reportFilters.computedFilters.startDate, reportFilters.computedFilters.endDate, selectedInvestmentType, activeSubTab]);



  // Show loading state while investment types are being fetched
  const showLoadingWarning = typesLoading && !typesError;
  const showErrorWarning = typesError && effectiveInvestmentTypes.length === 0;

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
      {/* Warning messages */}
      {showLoadingWarning && (
        <Alert variant="default" data-testid={`${dataTestId}-types-loading-alert`}>
          {getTranslationFromI18nKeyAndLabel('equity.analytics.loadingTypes', 'Loading investment types from catalog... Showing Overview only.')}
        </Alert>
      )}
      
      {showErrorWarning && (
        <Alert variant="destructive" data-testid={`${dataTestId}-types-error-alert`}>
          {getTranslationFromI18nKeyAndLabel('equity.analytics.typesError', 'Unable to load investment types from catalog. Showing Overview only.')}
        </Alert>
      )}

      {/* Filters Section */}
      <ReportFilterPanel
        filters={reportFilters}
        variant="card"
        title={getTranslationFromI18nKeyAndLabel('filters.title', 'Filters')}
        description={getTranslationFromI18nKeyAndLabel('equity.analytics.filters.description', 'Configure time period for the equity analytics view')}
        data-testid={`${dataTestId}-filters`}
      />

      {/* Equity Analytics Tables with Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={handleSetActiveSubTab} className="gba:w-full" data-testid={`${dataTestId}-tabs`}>
        <TabsList className="gba:grid gba:w-full" style={{ gridTemplateColumns: `repeat(${effectiveInvestmentTypes.length}, minmax(0, 1fr))` }} data-testid={`${dataTestId}-tabs-list`}>
          {effectiveInvestmentTypes.map((type) => (
            <TabsTrigger 
              key={type.code} 
              value={type.code} 
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-tab-trigger`}
            >
              {type.value}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {effectiveInvestmentTypes.map((type) => (
          <TabsContent key={type.code} value={type.code} className="gba:mt-6" data-testid={`${dataTestId}-${type.code.toLowerCase()}-tab-panel`}>
            <EquityAnalyticsTable
              accessToken={accessToken}
              userInfo={userInfo}
              filters={equityAnalyticsFilters}
              investmentType={type.code}
              investmentTypeValue={type.value}
              title={`${type.value} Analytics`}
              catalogData={catalogData}
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EquityReport;
