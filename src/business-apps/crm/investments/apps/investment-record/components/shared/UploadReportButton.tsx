import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { Upload } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

export interface UploadReportButtonProps {
  /**
   * Investment ID to pre-populate in the upload form
   */
  investmentId?: string;
  
  /**
   * Access token for authentication
   */
  accessToken?: string;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'secondary';
  
  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Upload Report Button Component
 * Reusable button for uploading investment reports across different investment record types
 */
export const UploadReportButton: React.FC<UploadReportButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken
}) => {
  console.log('UploadReportButton props:', { investmentId, accessToken: !!accessToken });
  
  if (!investmentId) {
    console.warn('UploadReportButton: No investmentId provided, not rendering button');
    return null; // Don't render if no investment ID
  }

  return (
    <AppAction
      contextsArray={[FlowContextName.uploadInvestmentReport]}
      externalContextData={{ investmentId }}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      prefixDataTestId="investment-record-upload-report"
    >
      <Button
        variant={variant}
        size={size}
        className="gba:flex gba:items-center gba:gap-2"
        data-testid="upload-investment-report-button"
      >
        <Upload className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('investment.reports.uploadReport', 'Upload Report')}
      </Button>
    </AppAction>
  );
};

export default UploadReportButton;
