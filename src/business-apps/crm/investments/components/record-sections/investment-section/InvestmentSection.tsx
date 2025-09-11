import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Spinner, Alert } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import DynamicInvestmentFields from './DynamicInvestmentFields';
import { PiTrendUp, PiChartBar, PiBank, PiPercent } from 'react-icons/pi';

interface InvestmentSectionProps {
  investmentData: any; // Generic prop that accepts both lead and opportunity data
  businessAppContext?: BusinessAppContextProps;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

const InvestmentSection: React.FC<InvestmentSectionProps> = ({
  investmentData,
  businessAppContext,
  isLoading = false,
  error = null,
  className = ''
}) => {
  if (isLoading) {
    return (
      <Card className={`gba:w-full ${className}`} data-testid="investment-section-loading">
        <CardHeader className="gba:pb-2 gba:px-4 gba:pt-4">
          <CardTitle className="gba:text-base">Investment Information</CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0 gba:pb-4 gba:px-4">
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="sm" className="gba:mr-2" />
            <span className="gba:text-sm gba:text-gray-600">Loading investment data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`gba:w-full ${className}`} data-testid="investment-section-error">
        <CardHeader className="gba:pb-2 gba:px-4 gba:pt-4">
          <CardTitle className="gba:text-base">Investment Information</CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0 gba:pb-4 gba:px-4">
          <Alert variant="destructive">
            <div>
              <strong>Error</strong>
              <div>Failed to load investment information: {error}</div>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`gba:w-full ${className}`} data-testid="investment-section">
      <CardHeader className="gba:pb-2 gba:px-4 gba:pt-4">
        <CardTitle className="gba:text-base">Investment Information</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0 gba:pb-4 gba:px-4">
        {/* Core Investment Information - Always Shown */}
        <div data-testid="core-investment-info">
          {/* Investment Name */}
          <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="gba:h-7 gba:w-7 gba:flex gba:items-center gba:justify-center gba:bg-blue-50 gba:rounded-full">
              <PiTrendUp 
                style={{ fontSize: '14px', color: '#3b82f6' }} 
                title="Investment name"
              />
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {investmentData?.investmentName || '-'}
            </div>
          </div>

          {/* Investment Group and Type combined */}
          {(investmentData?.investmentGroup || investmentData?.investmentType) && (
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PiChartBar 
                style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                title="Investment group and type"
              />
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                {[
                  investmentData?.investmentGroup?.value || investmentData?.investmentGroup?.code,
                  investmentData?.investmentType?.value || investmentData?.investmentType?.code
                ].filter(Boolean).join(' • ')}
              </div>
            </div>
          )}

          {/* Investment Role and Stake Type row */}
          <div style={{ marginBottom: '6px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
            {investmentData?.investmentRole && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiBank 
                  style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                  title="Investment role"
                />
                <span style={{ fontWeight: '500', color: '#111827' }}>
                  {investmentData.investmentRole.value || investmentData.investmentRole.code}
                </span>
              </div>
            )}
            
            {investmentData?.investmentStakeType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiPercent 
                  style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                  title="Stake type"
                />
                <span style={{ fontWeight: '500', color: '#111827' }}>
                  {investmentData.investmentStakeType.value || investmentData.investmentStakeType.code}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Dynamic Investment Fields */}
        <DynamicInvestmentFields investmentData={investmentData} businessAppContext={businessAppContext} />
      </CardContent>
    </Card>
  );
};

export default InvestmentSection;
