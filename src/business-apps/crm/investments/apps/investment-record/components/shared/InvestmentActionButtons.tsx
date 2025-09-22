import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { FileText, Upload } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

// =============================================================================
// GENERATE ONE-PAGER BUTTON
// =============================================================================

export interface GenerateOnePagerButtonProps {
  /**
   * Investment ID to pass to the report generation flow
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
 * Generate One-Pager Button Component
 * Reusable button for generating investment one-pager reports across different investment record types
 */
export const GenerateOnePagerButton: React.FC<GenerateOnePagerButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken
}) => {
  if (!investmentId) {
    return null; // Don't render if no investment ID
  }

  return (
    <AppAction
      contextsArray={[FlowContextName.investmentReportGenerate]}
      externalContextData={{ investmentId }}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      prefixDataTestId="investment-record-generate-one-pager"
    >
      <Button
        variant={variant}
        size={size}
        className="gba:flex gba:items-center gba:gap-2"
        data-testid="generate-investment-one-pager-button"
      >
        <FileText className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('investment.reports.generateOnePager', 'Generate One-Pager')}
      </Button>
    </AppAction>
  );
};

// =============================================================================
// UPLOAD REPORT BUTTON
// =============================================================================

export interface UploadReportButtonProps {
  /**
   * Investment ID to pass to the upload flow
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
  variant = 'outline',
  size = 'default',
  accessToken
}) => {
  if (!investmentId) {
    return null; // Don't render if no investment ID
  }

  return (
    <AppAction
      contextsArray={[FlowContextName.investmentReportUpload]}
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

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  GenerateOnePagerButton,
  UploadReportButton
};
