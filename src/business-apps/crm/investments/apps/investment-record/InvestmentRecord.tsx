import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RecordLayout, Spinner } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentById, useGetInvestmentDocumentsByInvestmentId } from '@/common/data/investment';
import { useGetInvestmentCatalogData } from '@/business-apps/crm/investments/forms/investment-form/queries/InvestmentCatalogQueries';
import { AiSummaryButton } from '@/common/components/common-relations/record-sections/header-section/ai-summary-button';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { useInvestmentTileFields } from './hooks/useInvestmentTileFields';
import { useInvestmentAiSummary } from './hooks/useInvestmentAiSummary';
import { TrendingUp, Home, BarChart3 } from 'lucide-react';
import { 
  createHeaderMeta, 
  getTypeSpecificDetailGroups 
} from './utils/investmentHeaderConfig';
import { createInvestmentTabsConfig } from './utils/investmentTabConfig';

interface InvestmentRecordProps extends BusinessAppContextProps {}

const InvestmentRecord: React.FC<InvestmentRecordProps> = (props) => {
  const [investmentId, setInvestmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [investmentData, setInvestmentData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [catalogData, setCatalogData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic investment type detection using catalog data
  const determineInvestmentType = useCallback((investmentData: any): string => {
    if (!investmentData) return 'generic';
    
    // Use the actual investment type code for dynamic behavior
    if (investmentData.investmentType?.code) {
      return investmentData.investmentType.code;
    }
    
    // Fallback to group-based detection
    const group = investmentData.investmentGroup?.code || '';
    if (group.includes('EQUITY')) return 'equity';
    if (group.includes('LIQUID_FUND')) return 'liquid_fund';
    if (group.includes('REAL_ESTATE')) return 'real_estate';
    if (group.includes('PRIVATE_EQUITY')) return 'private_equity';
    
    return 'generic';
  }, []);

  // Extract type-specific data arrays
  const extractTypeSpecificData = useCallback((investmentData: any, documents: any[]): any => {
    if (!investmentData) return null;
    
    const base = { investment: investmentData, documents };
    
    // Extract all type-specific arrays
    return {
      ...base,
      equityInvestment: Array.isArray(investmentData.equityInvestment) ? investmentData.equityInvestment[0] : undefined,
      liquidFundInvestment: Array.isArray(investmentData.liquidFundInvestment) ? investmentData.liquidFundInvestment[0] : undefined,
      realEstateInvestment: Array.isArray(investmentData.realEstateInvestment) ? investmentData.realEstateInvestment[0] : undefined,
      privateEquityInvestment: Array.isArray(investmentData.privateEquityInvestment) ? investmentData.privateEquityInvestment[0] : undefined
    };
  }, []);

  // Get icon based on investment group (hardcoded for now)
  const getInvestmentIcon = useCallback((investmentData: any) => {
    if (!investmentData) return BarChart3;
    
    const group = investmentData.investmentGroup?.code || '';
    if (group.includes('EQUITY')) return TrendingUp;
    if (group.includes('REAL_ESTATE')) return Home;
    return BarChart3;
  }, []);

  // Get display category based on investment group
  const getInvestmentCategory = useCallback((investmentData: any): string => {
    if (!investmentData) return 'INVESTMENT';
    
    const group = investmentData.investmentGroup?.code || '';
    if (group.includes('EQUITY')) return 'EQUITY INVESTMENT';
    if (group.includes('LIQUID_FUND')) return 'LIQUID FUND INVESTMENT';
    if (group.includes('REAL_ESTATE')) return 'REAL ESTATE INVESTMENT';
    if (group.includes('PRIVATE_EQUITY')) return 'PRIVATE EQUITY INVESTMENT';
    
    return 'INVESTMENT';
  }, []);
  
  // Central hooks for data fetching
  const { fetchInvestmentById } = useGetInvestmentById(props);
  const { fetchInvestmentDocumentsByInvestmentId } = useGetInvestmentDocumentsByInvestmentId(props);
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(props);

  // Get investmentId from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('investmentId');
    if (id) {
      setInvestmentId(id);
    }
  }, []);

  // Load catalog data once for dynamic field definitions
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const catalog = await fetchInvestmentCatalogData();
        setCatalogData(catalog);
      } catch (err) {
        console.error('Failed to load catalog data:', err);
        // Don't fail the entire component if catalog fails - fallback to static fields
      }
    };

    if (props.accessToken) {
      loadCatalogData();
    }
  }, [props.accessToken, fetchInvestmentCatalogData]);

  // Load investment and document data
  const loadData = useCallback(async () => {
    if (!investmentId || !props.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const [investmentResult, documentsResult] = await Promise.all([
        fetchInvestmentById(investmentId),
        fetchInvestmentDocumentsByInvestmentId(investmentId)
      ]);
      
      if (!investmentResult.investment) {
        setError(`No investment found for ID: ${investmentId}`);
        return;
      }

      setInvestmentData(investmentResult.investment);
      setDocuments(documentsResult || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, props.accessToken, fetchInvestmentById, fetchInvestmentDocumentsByInvestmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine investment type and type-specific data using dynamic approach
  const investmentType = useMemo(() => determineInvestmentType(investmentData), [investmentData, determineInvestmentType]);
  const typeSpecificData = useMemo(() => extractTypeSpecificData(investmentData, documents), [investmentData, documents, extractTypeSpecificData]);

  // Hook for tile fields and AI summary
  const { processedTiles } = useInvestmentTileFields(props, investmentData);
  const aiSummaryHook = useInvestmentAiSummary(investmentId || '', props.accessToken);

  // Navigation
  const handleBack = useCallback(() => {
    // Get the fromView and fromSubView parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const fromView = urlParams.get('fromView');
    const fromSubView = urlParams.get('fromSubView');
    
    // Navigate back based on the source view
    if (fromView && fromSubView) {
      switch (fromView) {
        case 'investments':
          navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: fromView, subView: fromSubView }));
          break;
        case 'divestments':
          navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: fromView, subView: fromSubView }));
          break;
        default:
          // Fallback to investment management main view
          navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: 'investments' }));
          break;
      }
    } else {
      // Fallback to investment management main view if no source info
      navigateTo(buildPlatformUrl('/platform/irm/investment-management', { view: 'investments' }));
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !typeSpecificData) {
    return (
      <div className="gba:p-8 gba:text-center">
        <div className="gba:mb-4">
          <button
            onClick={handleBack}
            className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600 gba:mx-auto"
            data-testid="back-to-investments-button"
          >
            <span className="gba:mr-2">←</span>
            Back to Investments
          </button>
        </div>
        {error && (
          <p className="gba:text-red-500 gba:text-lg gba:mb-4">
            {error}
          </p>
        )}
      </div>
    );
  }

  const investment = investmentData;

  // Header configuration using centralized utilities
  const headerMeta = createHeaderMeta(investment, investmentType, typeSpecificData);

  const headerActions = (
    <AiSummaryButton
      config={{
        entityType: 'investment',
        loadingMessage: getTranslationFromI18nKeyAndLabel('crm.investments.ai.summary.loading', 'Generating AI Summary...'),
        loadingSubtitle: getTranslationFromI18nKeyAndLabel('crm.investments.ai.summary.subtitle', 'Analyzing investment data and activities')
      }}
      summaryHook={aiSummaryHook}
      dataTestId={`${investmentType}-update-button-${investmentId}`}
    />
  );

  const headerActionButton = (
    <AppActionButton
      size="icon"
      contextsArray={[FlowContextName.investmentEntity]}
      externalContextData={{ investmentId }}
      prefixDataTestId={`${investmentType}-record-action`}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick={false}
      accessToken={props.accessToken}
    />
  );

  // Detail groups for header using centralized utilities with dynamic catalog data
  const headerDetailGroups = getTypeSpecificDetailGroups(investmentType, typeSpecificData, investment, catalogData);

  // Tab configuration using centralized utilities
  const subViewsConfig = createInvestmentTabsConfig(
    activeTab,
    setActiveTab,
    investmentId || '',
    investment,
    investmentType,
    typeSpecificData,
    processedTiles,
    documents,
    loadData,
    props,
    catalogData
  );

  return (
    <div
      className="gba:investment-details-container"
      data-testid={`${investmentType}-investment-detail`}
    >
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={getInvestmentIcon(investment)}
        headerCategory={getInvestmentCategory(investment)}
        onBack={handleBack}
        headerTitle={investment?.name || 'Investment Record'}
        headerMeta={headerMeta}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        headerDetailGroups={headerDetailGroups}
        subViews={subViewsConfig}
      />
    </div>
  );
};

export default InvestmentRecord; 