import React, { useEffect, useState } from 'react';
import { Spinner } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';
import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const prefixDataTestId = 'InvestmentForm-GroupSelectSegment';

// Normalized map for investment group detection
const INVESTMENT_GROUP_MAP: Record<string, string> = {
  // Liquid Fund variations
  'liquid-fund': 'InvestmentGroup:v1:LIQUID_FUND',
  'liquid_fund': 'InvestmentGroup:v1:LIQUID_FUND',
  'liquid-funds': 'InvestmentGroup:v1:LIQUID_FUND',
  'liquid_funds': 'InvestmentGroup:v1:LIQUID_FUND',
  'LIQUID_FUND': 'InvestmentGroup:v1:LIQUID_FUND',
  'LIQUID-FUND': 'InvestmentGroup:v1:LIQUID_FUND',
  'LIQUID_FUNDS': 'InvestmentGroup:v1:LIQUID_FUND',
  'LIQUID-FUNDS': 'InvestmentGroup:v1:LIQUID_FUND',
  
  // Real Estate variations
  'real-estate': 'InvestmentGroup:v1:REAL_ESTATE',
  'real_estate': 'InvestmentGroup:v1:REAL_ESTATE',
  'REAL_ESTATE': 'InvestmentGroup:v1:REAL_ESTATE',
  'REAL-ESTATE': 'InvestmentGroup:v1:REAL_ESTATE',
  'realestate': 'InvestmentGroup:v1:REAL_ESTATE',
  'REALESTATE': 'InvestmentGroup:v1:REAL_ESTATE',
  
  // Equity variations
  'equity': 'InvestmentGroup:v1:EQUITY',
  'EQUITY': 'InvestmentGroup:v1:EQUITY',
  'equities': 'InvestmentGroup:v1:EQUITY',
  'EQUITIES': 'InvestmentGroup:v1:EQUITY',
};

// Single function to detect investment group from any string input
const detectGroupFromString = (input: string | null | undefined): string | null => {
  if (!input) return null;
  
  // Direct lookup first
  if (INVESTMENT_GROUP_MAP[input]) {
    return INVESTMENT_GROUP_MAP[input];
  }
  
  // Partial match for URLs and complex strings
  for (const [key, value] of Object.entries(INVESTMENT_GROUP_MAP)) {
    if (input.includes(key)) {
      return value;
    }
  }
  
  return null;
};

// Consolidated detection function with single responsibility
const detectInvestmentGroup = (
  businessAppContext: any,
  onGroupSelect: (group: string) => void,
  setIsDetectingContext: (value: boolean) => void,
  setContextDetectionComplete: (value: boolean) => void
): boolean => {
  try {
    // Ordered source evaluation
    const sources = [
      // 1. Business app context data (primary)
      businessAppContext?.additionalData?.fromSubView,
      businessAppContext?.additionalData?.subView,
      businessAppContext?.additionalData?.investmentGroup,
      businessAppContext?.additionalData?.fromView,
      businessAppContext?.additionalData?.view,
      
      // 2. URL parameters (secondary)
      new URLSearchParams(window.location.search).get('fromSubView'),
      new URLSearchParams(window.location.search).get('subView'),
      new URLSearchParams(window.location.search).get('view'),
      
      // 3. Document referrer (tertiary)
      document.referrer,
      
      // 4. Current URL (fallback)
      window.location.href,
    ];
    
    // Find first valid investment group
    for (const source of sources) {
      const detectedGroup = detectGroupFromString(source);
      if (detectedGroup) {
        // Special case: Skip auto-detection for overview/all contexts
        if (source && ['overview', 'all'].some(skip => source.includes(skip))) {
          continue;
        }
        
        // Valid group found - complete selection
        setIsDetectingContext(false);
        setContextDetectionComplete(true);
        onGroupSelect(detectedGroup);
        return true;
      }
    }
    
    // No group detected - show manual selection
    setIsDetectingContext(false);
    setContextDetectionComplete(true);
    return false;
    
  } catch (error) {
    console.error('Error detecting investment context:', error);
    setIsDetectingContext(false);
    setContextDetectionComplete(true);
    return false;
  }
};

export interface GroupSelectSegmentProps extends BusinessAppContextProps {
  onGroupSelect: (group: string) => void;
}

const GroupSelectSegment: React.FC<GroupSelectSegmentProps> = ({
  onGroupSelect,
  ...businessAppContext
}) => {
  const {
    investmentCatalogData,
    investmentCatalogLoading,
    investmentCatalogError,
  } = useInvestmentFormContext();

  // Immediately check if we should auto-detect (before first render)
  const shouldAutoDetect = (() => {
    try {
      // Use simplified detection to determine if auto-detection is possible
      const sources = [
        businessAppContext?.additionalData?.fromSubView,
        businessAppContext?.additionalData?.subView,
        businessAppContext?.additionalData?.investmentGroup,
        new URLSearchParams(window.location.search).get('fromSubView'),
        new URLSearchParams(window.location.search).get('subView'),
      ];
      
      for (const source of sources) {
        if (detectGroupFromString(source)) {
          // Skip auto-detection for overview/all contexts
          if (source && ['overview', 'all'].some(skip => source.includes(skip))) {
            return false;
          }
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  })();

  // Track context detection state  
  const [isDetectingContext, setIsDetectingContext] = useState(shouldAutoDetect);
  const [contextDetectionComplete, setContextDetectionComplete] = useState(!shouldAutoDetect);

  // Auto-detect investment group from URL context
  useEffect(() => {
    // Use consolidated detection function
    detectInvestmentGroup(
      businessAppContext,
      onGroupSelect,
      setIsDetectingContext,
      setContextDetectionComplete
    );
  }, [onGroupSelect, businessAppContext]);

  // Transform catalog data into display format
  const investmentGroups = investmentCatalogData?.investmentGroups?.map(group => {
    // Use the utility function to get the translated value
    const displayTitle = getCatalogValue(group);
    
    return {
      id: group.id,
      code: group.code,
      title: displayTitle || group.value || group.code, // Use translated value, fallback to value, then code
      value: `InvestmentGroup:v1:${group.code}`,
      description: `Investment opportunities in ${displayTitle || group.value}`,
    };
  }) || [];

  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      style={{ padding: 'var(--nw-spacing-lg)' }}
    >
      {/* Only show title when we're not detecting context or when showing manual selection */}
      {(!isDetectingContext && contextDetectionComplete) && (
        <div style={{ textAlign: 'center', marginBottom: 'var(--nw-spacing-xl)' }}>
          <h2 style={{ 
            margin: 0, 
            marginBottom: 'var(--nw-spacing-sm)',
            color: 'var(--nw-color-text-primary)', 
            fontSize: '1.5rem', 
            fontWeight: 600 
          }}>
            {getTranslationFromI18nKeyAndLabel('investment.form.selectGroup', 'Select Investment Group')}
          </h2>
          <p style={{ 
            margin: 0, 
            color: 'var(--nw-color-text-secondary)', 
            fontSize: '1rem' 
          }}>
            {getTranslationFromI18nKeyAndLabel('investment.form.chooseGroup', 'Choose the investment group you want to create')}
          </p>
        </div>
      )}

      {/* Context Detection Loading State */}
      {isDetectingContext && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'ContextDetection-Loading')}
          style={{ 
            textAlign: 'center', 
            padding: 'var(--nw-spacing-xl)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--nw-spacing-md)'
          }}>
          <Spinner size="lg" data-testid={formatDataTestId(prefixDataTestId, 'ContextDetection-Spinner')} />
          <p 
            data-testid={formatDataTestId(prefixDataTestId, 'ContextDetection-Message')}
            style={{ margin: 0, color: 'var(--nw-color-text-secondary)' }}
          >
{getTranslationFromI18nKeyAndLabel('investment.form.detectingContext', 'Detecting investment context...')}
          </p>
        </div>
      )}

      {/* Catalog Loading State */}
      {!isDetectingContext && investmentCatalogLoading && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'CatalogLoading-Container')}
          style={{ 
            textAlign: 'center', 
            padding: 'var(--nw-spacing-xl)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--nw-spacing-md)'
          }}>
          <Spinner size="lg" data-testid={formatDataTestId(prefixDataTestId, 'CatalogLoading-Spinner')} />
          <p 
            data-testid={formatDataTestId(prefixDataTestId, 'CatalogLoading-Message')}
            style={{ margin: 0, color: 'var(--nw-color-text-secondary)' }}
          >
            {getTranslationFromI18nKeyAndLabel('investment.form.loadingGroups', 'Loading investment groups...')}
          </p>
        </div>
      )}

      {/* Error State */}
      {!isDetectingContext && investmentCatalogError && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'Error-Container')}
          style={{ 
            textAlign: 'center', 
            padding: 'var(--nw-spacing-xl)',
            color: 'var(--nw-color-danger-500)'
          }}>
          <p 
            data-testid={formatDataTestId(prefixDataTestId, 'Error-Message')}
            style={{ margin: 0, marginBottom: 'var(--nw-spacing-sm)' }}
          >
            {getTranslationFromI18nKeyAndLabel('investment.form.loadFailed', 'Failed to load investment groups')}
          </p>
          <p 
            data-testid={formatDataTestId(prefixDataTestId, 'Error-Details')}
            style={{ margin: 0, fontSize: '0.875rem' }}
          >
            {investmentCatalogError}
          </p>
        </div>
      )}

      {!isDetectingContext && !investmentCatalogLoading && !investmentCatalogError && contextDetectionComplete && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'InvestmentGroups-Container')}
          style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--nw-spacing-sm)', // Very minimal gap between cards
            marginBottom: 'var(--nw-spacing-xl)',
            padding: 'calc(var(--nw-spacing-xl) * 5)'
          }}>
          {investmentGroups.map((group) => (
            <div
              key={group.id}
              data-testid={formatDataTestId(prefixDataTestId, `InvestmentGroup-Card-${group.id}`)}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid var(--nw-color-border-subtle)',
                borderRadius: 'calc(var(--nw-border-radius-lg) * 3)', // Maximum border radius for smooth curves
                backgroundColor: 'var(--nw-card)',
                boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: 'calc(var(--nw-spacing-xl) * 4)', // Maximum padding for bigger cards
                margin: '0', // Remove margin - gap handles spacing between borders
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                maxWidth: '750px', // Maximum width for bigger cards
                width: '100%',
                minHeight: '100px' // Increased minimum height for bigger cards
              }}
              onClick={() => onGroupSelect(group.value)}
              onMouseEnter={(e) => {
                const card = e.currentTarget;
                card.style.boxShadow = '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -4px rgba(0, 0, 0, 0.08)';
                card.style.transform = 'translateY(-4px) scale(1.02)';
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget;
                card.style.boxShadow = '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.05)';
                card.style.transform = 'translateY(0px) scale(1)';
              }}
            >
              <div>
                <h3 style={{
                  margin: 0,
                  marginBottom: 'var(--nw-spacing-md)',
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--nw-foreground)',
                  letterSpacing: '-0.025em'
                }}>
                  {group.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '1rem',
                  color: 'var(--nw-muted-foreground)',
                  lineHeight: 1.6
                }}>
                  {group.description}
                </p>
              </div>
            </div>
          ))}
          {investmentGroups.length === 0 && (
            <div
              data-testid={formatDataTestId(prefixDataTestId, 'EmptyState-Container')}
              style={{ 
                gridColumn: '1 / -1',
                textAlign: 'center', 
                padding: 'var(--nw-spacing-xl)',
                color: 'var(--nw-color-text-secondary)'
              }}>
              <p 
                data-testid={formatDataTestId(prefixDataTestId, 'EmptyState-Message')}
                style={{ margin: 0 }}
              >
                {getTranslationFromI18nKeyAndLabel('investment.form.noGroupsAvailable', 'No investment groups available')}
              </p>
            </div>
          )}
        </div>
      )}

      {!investmentCatalogLoading && !investmentCatalogError && investmentGroups.length > 0 && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'HelpText-Container')}
          style={{ 
            textAlign: 'center',
            padding: 'var(--nw-spacing-md)',
            paddingTop: 'var(--nw-spacing-xl)',
            marginTop: 'var(--nw-spacing-lg)',
            backgroundColor: 'var(--nw-color-surface-secondary)',
            borderRadius: 'var(--nw-border-radius-md)',
            border: '1px solid var(--nw-color-border-default)'
          }}>
          <p 
            data-testid={formatDataTestId(prefixDataTestId, 'HelpText-Message')}
            style={{ 
              margin: 0, 
              fontSize: '0.875rem', 
              color: 'var(--nw-color-text-secondary)' 
            }}>
            {getTranslationFromI18nKeyAndLabel('investment.form.modifyDetailsHint', 'You can modify investment details after selecting the group')}
          </p>
        </div>
      )}
    </div>
  );
};

export default GroupSelectSegment;
