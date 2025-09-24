import React, { useEffect, useState } from 'react';
import { Card, Spinner } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';
import { getCatalogValue } from '@/common/utils/windowUtils';

const prefixDataTestId = 'InvestmentForm-GroupSelectSegment';

export interface GroupSelectSegmentProps {
  onGroupSelect: (group: string) => void;
  isLoading?: boolean;
  businessAppContext?: any; // Add context to access additionalData
}

const GroupSelectSegment: React.FC<GroupSelectSegmentProps> = ({
  onGroupSelect,
  businessAppContext,
}) => {
  const {
    investmentCatalogData,
    investmentCatalogLoading,
    investmentCatalogError,
  } = useInvestmentFormContext();

  // Immediately check if we should auto-detect (before first render)
  const shouldAutoDetect = (() => {
    try {
      // Check URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const fromSubView = urlParams.get('fromSubView');
      
      // Check businessAppContext.additionalData as fallback
      const additionalData = businessAppContext?.additionalData;
      const contextFromSubView = additionalData?.fromSubView || additionalData?.subView;
      const investmentGroup = additionalData?.investmentGroup;
      
      // Map investmentGroup to subView
      let mappedSubView = contextFromSubView;
      if (investmentGroup && !contextFromSubView) {
        switch (investmentGroup.toUpperCase()) {
          case 'LIQUID_FUND':
          case 'LIQUID-FUND':
            mappedSubView = 'liquid-funds';
            break;
          case 'REAL_ESTATE':
          case 'REAL-ESTATE':
            mappedSubView = 'real-estate';
            break;
          case 'EQUITY':
            mappedSubView = 'equity';
            break;
        }
      }
      
      const detectedSubView = fromSubView || mappedSubView;
      return detectedSubView && detectedSubView !== 'overview' && detectedSubView !== 'all';
    } catch {
      return false;
    }
  })();

  // Track context detection state  
  const [isDetectingContext, setIsDetectingContext] = useState(shouldAutoDetect);
  const [contextDetectionComplete, setContextDetectionComplete] = useState(!shouldAutoDetect);

  // Auto-detect investment group from URL context
  useEffect(() => {
    // Check if we're in a specific investment context based on URL or referrer
    const detectInvestmentGroupFromContext = () => {
      try {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const fromView = urlParams.get('fromView');
        const fromSubView = urlParams.get('fromSubView');
        
        // Check businessAppContext.additionalData as primary source
        // The data might be nested in different structures, so check multiple paths
        const additionalData = businessAppContext?.additionalData;
        
        const contextFromView = additionalData?.fromView || additionalData?.view;
        const contextFromSubView = additionalData?.fromSubView || additionalData?.subView;
        const investmentGroup = additionalData?.investmentGroup;
        let mappedFromSubView = contextFromSubView;
        
        if (investmentGroup && !contextFromSubView) {
          switch (investmentGroup.toUpperCase()) {
            case 'LIQUID_FUND':
            case 'LIQUID-FUND':
              mappedFromSubView = 'liquid-funds';
              break;
            case 'REAL_ESTATE':
            case 'REAL-ESTATE':
              mappedFromSubView = 'real-estate';
              break;
            case 'EQUITY':
              mappedFromSubView = 'equity';
              break;
          }
        }
        
        // Use context data if available, fallback to URL params
        const detectedFromView = contextFromView || fromView;
        const detectedFromSubView = mappedFromSubView || fromSubView;
        
        // Check referrer URL for context
        const referrer = document.referrer;
        

        
        // Special case: If we're in overview or no specific context, show manual selection
        if (detectedFromSubView === 'overview' || detectedFromSubView === null || detectedFromSubView === 'all') {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          return false;
        }
        
        // Auto-select based on subView context
        if (detectedFromSubView === 'liquid-funds') {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:LIQUID_FUND');
          return true;
        }
        
        if (detectedFromSubView === 'real-estate') {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:REAL_ESTATE');
          return true;
        }
        
        if (detectedFromSubView === 'equity') {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:EQUITY');
          return true;
        }
        
        // Check referrer URL for investment type indicators
        if (referrer.includes('liquid-funds') || referrer.includes('liquid-fund')) {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:LIQUID_FUND');
          return true;
        }
        
        if (referrer.includes('real-estate')) {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:REAL_ESTATE');
          return true;
        }
        
        if (referrer.includes('equity')) {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:EQUITY');
          return true;
        }
        
        // Check current URL for context
        const currentUrl = window.location.href;
        if (currentUrl.includes('liquid-fund')) {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:LIQUID_FUND');
          return true;
        }
        
        if (currentUrl.includes('real-estate')) {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:REAL_ESTATE');
          return true;
        }
        
        if (currentUrl.includes('equity')) {
          setIsDetectingContext(false);
          setContextDetectionComplete(true);
          onGroupSelect('InvestmentGroup:v1:EQUITY');
          return true;
        }
        
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
    
    // Run detection immediately, no delay
    detectInvestmentGroupFromContext();
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
            Select Investment Group
          </h2>
          <p style={{ 
            margin: 0, 
            color: 'var(--nw-color-text-secondary)', 
            fontSize: '1rem' 
          }}>
            Choose the investment group you want to create
          </p>
        </div>
      )}

      {/* Context Detection Loading State */}
      {isDetectingContext && (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--nw-spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--nw-spacing-md)'
        }}>
          <Spinner size="lg" />
          <p style={{ margin: 0, color: 'var(--nw-color-text-secondary)' }}>
            Detecting investment context...
          </p>
        </div>
      )}

      {/* Catalog Loading State */}
      {!isDetectingContext && investmentCatalogLoading && (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--nw-spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--nw-spacing-md)'
        }}>
          <Spinner size="lg" />
          <p style={{ margin: 0, color: 'var(--nw-color-text-secondary)' }}>
            Loading investment groups...
          </p>
        </div>
      )}

      {/* Error State */}
      {!isDetectingContext && investmentCatalogError && (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--nw-spacing-xl)',
          color: 'var(--nw-color-danger-500)'
        }}>
          <p style={{ margin: 0, marginBottom: 'var(--nw-spacing-sm)' }}>Failed to load investment groups</p>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{investmentCatalogError}</p>
        </div>
      )}

      {!isDetectingContext && !investmentCatalogLoading && !investmentCatalogError && contextDetectionComplete && (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--nw-spacing-lg)',
          marginBottom: 'var(--nw-spacing-lg)'
        }}>
          {investmentGroups.map((group) => (
            <Card
              key={group.id}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                border: '2px solid var(--nw-color-border-default)',
                boxShadow: 'var(--nw-shadow-sm)'
              }}
              className="hover:border-primary-500 hover:shadow-md"
              onClick={() => onGroupSelect(group.value)}
              data-testid={formatDataTestId(prefixDataTestId, `Group-${group.id}`)}
            >
              <div style={{
                padding: 'var(--nw-spacing-lg)',
                textAlign: 'left'
              }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: 'var(--nw-spacing-sm)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--nw-color-text-primary)'
                }}>
                  {group.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--nw-color-text-secondary)',
                  lineHeight: 1.5
                }}>
                  {group.description}
                </p>
              </div>
            </Card>
          ))}
          {investmentGroups.length === 0 && (
            <div style={{ 
              gridColumn: '1 / -1',
              textAlign: 'center', 
              padding: 'var(--nw-spacing-xl)',
              color: 'var(--nw-color-text-secondary)'
            }}>
              <p style={{ margin: 0 }}>No investment groups available</p>
            </div>
          )}
        </div>
      )}

      {!investmentCatalogLoading && !investmentCatalogError && investmentGroups.length > 0 && (
        <div style={{ 
          textAlign: 'center',
          padding: 'var(--nw-spacing-md)',
          backgroundColor: 'var(--nw-color-surface-secondary)',
          borderRadius: 'var(--nw-border-radius-md)',
          border: '1px solid var(--nw-color-border-default)'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: 'var(--nw-color-text-secondary)' 
          }}>
            You can modify investment details after selecting the group
          </p>
        </div>
      )}
    </div>
  );
};

export default GroupSelectSegment;
