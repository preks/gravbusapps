import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { Upload } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { BaseInvestment } from '../../hooks/useInvestmentReportData';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { DirectApiGenerateButton } from './DirectApiGenerateButton';
import { FlowBasedGenerateButton } from './FlowBasedGenerateButton';

// =============================================================================
// GENERATE ONE-PAGER BUTTON
// =============================================================================

export interface GenerateOnePagerButtonProps extends Partial<BusinessAppContextProps> {
  /**
   * Investment ID to generate report for
   */
  investmentId?: string;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Use direct API approach instead of flow-based approach
   * When true: calls /generateInvestmentReport API directly with proper payload
   * When false/undefined: uses existing flow-based approach (default behavior)
   */
  useDirectApi?: boolean;

  /**
   * Pre-loaded investment data to avoid duplicate API calls
   * When provided, this data will be used instead of fetching it again
   */
  investmentData?: BaseInvestment;
}

export const GenerateOnePagerButton: React.FC<GenerateOnePagerButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  useDirectApi = false,
  investmentData
}) => {
  // Validate required props
  if (!investmentId && !investmentData) {
    console.warn('⚠️ GenerateOnePagerButton: Missing required investmentId or investmentData');
    return null;
  }

  // NEW DIRECT API APPROACH (opt-in with useDirectApi=true)
  if (useDirectApi) {
    return (
      <DirectApiGenerateButton
        variant={variant}
        size={size}
        accessToken={accessToken}
        userInfo={userInfo}
        investmentData={investmentData}
      />
    );
  }

  // ORIGINAL FLOW-BASED APPROACH (default behavior) - Enhanced with complete payload
  return (
    <FlowBasedGenerateButton
      investmentId={investmentId!}
      variant={variant}
      size={size}
      accessToken={accessToken}
      userInfo={userInfo}
      investmentData={investmentData}
    />
  );
};

// =============================================================================
// UPLOAD REPORT BUTTON  
// =============================================================================

export interface UploadReportButtonProps extends BusinessAppContextProps {
  /**
   * Investment ID to pass to the upload flow
   */
  investmentId: string;

  /**
   * Investment data for flow context (optional but recommended)
   */
  investment?: BaseInvestment;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';
}

// Helper function to get investment flow context
const getInvestmentFlowContext = (): FlowContextName => {
  // Return the standard investment report upload flow context
  return FlowContextName.investmentReportUpload;
};

export const UploadReportButton: React.FC<UploadReportButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken
}) => {
  if (!investmentId || !accessToken) {
    return null;
  }

  return (
    <AppAction
      contextsArray={[getInvestmentFlowContext()]}
      externalContextData={{ investmentId }}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      prefixDataTestId="investment-record-upload-report"
    >
      <Button
        variant={variant}
        size={size}
        className="gba:flex gba:items-center"
        style={{ gap: 'var(--nw-spacing-sm)' }}
        data-testid="upload-investment-report-button"
      >
        <Upload style={{ height: '1rem', width: '1rem' }} />
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