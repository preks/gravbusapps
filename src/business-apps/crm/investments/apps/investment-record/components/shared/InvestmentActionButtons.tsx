import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { FileText, Upload } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface InvestmentData {
  investmentGroup?: {
    code: string;
    childEntries?: Array<{
      code: string;
      objectValue?: {
        tileFields?: any[];
      };
    }>;
  };
  investmentType?: {
    code: string;
  };
  type?: string;
}

interface CatalogData {
  investmentGroups?: Array<{
    code: string;
    objectValue?: {
      tileFields?: any[];
    };
    childEntries?: Array<{
      code: string;
      objectValue?: {
        tileFields?: any[];
      };
    }>;
  }>;
  investmentTypes?: Array<{
    code: string;
    objectValue?: {
      tileFields?: any[];
    };
  }>;
}

// =============================================================================
// GENERATE ONE-PAGER BUTTON
// =============================================================================

export interface GenerateOnePagerButtonProps extends BusinessAppContextProps {
  /**
   * Investment ID to pass to the report generation flow
   */
  investmentId?: string;
  
  /**
   * Investment data to check for tile configuration
   */
  investment?: InvestmentData;
  
  /**
   * Catalog data containing group and type definitions with objectValue
   */
  catalogData?: CatalogData;
  
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
 * Helper function to get the correct FlowContextName based on investment type
 */
const getInvestmentFlowContext = (type?: string): FlowContextName => {
  switch (type?.toLowerCase()) {
    case 'equity':
      return FlowContextName.equityInvestmentEntity;
    case 'private equity':
    case 'privateequity':
      return FlowContextName.privateEquityInvestmentEntity;
    case 'liquid fund':
    case 'liquidfund':
      return FlowContextName.liquidFundInvestmentEntity;
    case 'real estate':
    case 'realestate':
      return FlowContextName.realEstateInvestmentEntity;
    default:
      return FlowContextName.investmentReportGenerate; // Safe default for backward compatibility
  }
};

/**
 * Helper function to check if investment has tiles defined in catalog objectValue
 */
const hasInvestmentTilesConfiguration = (investment: InvestmentData | undefined, catalogData: CatalogData | undefined): boolean => {
  if (!investment || !catalogData) {
    return false;
  }

  const investmentGroupCode = investment?.investmentGroup?.code;
  const investmentTypeCode = investment?.investmentType?.code;

  // Check investment group for tile configuration
  const investmentGroups = catalogData.investmentGroups || [];
  const matchingGroup = investmentGroups.find((group) => group.code === investmentGroupCode);
  
  if (matchingGroup?.objectValue?.tileFields && matchingGroup.objectValue.tileFields.length > 0) {
    return true; // Group has tile fields defined
  }

  // Check investment type for tile configuration
  const investmentTypes = catalogData.investmentTypes || [];
  const matchingType = investmentTypes.find((type) => type.code === investmentTypeCode);
  
  if (matchingType?.objectValue?.tileFields && matchingType.objectValue.tileFields.length > 0) {
    return true; // Type has tile fields defined
  }

  // Also check nested types in groups (for flipped relationships)
  if (matchingGroup?.childEntries && matchingGroup.childEntries.length > 0) {
    const nestedType = matchingGroup.childEntries.find((type) => type.code === investmentTypeCode);
    if (nestedType?.objectValue?.tileFields && nestedType.objectValue.tileFields.length > 0) {
      return true; // Nested type has tile fields defined
    }
  }

  return false; // No tile configuration found
};

/**
 * Generate One-Pager Button Component
 * Reusable button for generating investment one-pager reports across different investment record types
 * Only appears if the investment has tiles defined in its group and/or type catalog objectValue
 */
export const GenerateOnePagerButton: React.FC<GenerateOnePagerButtonProps> = ({
  investmentId,
  investment,
  catalogData,
  variant = 'default',
  size = 'default',
  accessToken
}) => {
  if (!investmentId) {
    return null; // Don't render if no investment ID
  }

  // Check if investment has tiles configured - required for one-pager generation
  if (!hasInvestmentTilesConfiguration(investment, catalogData)) {
    return null; // Don't render if no tiles are configured
  }

  return (
    <AppAction
      contextsArray={[getInvestmentFlowContext(investment?.type)]}
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

export interface UploadReportButtonProps extends BusinessAppContextProps {
  /**
   * Investment ID to pass to the upload flow
   */
  investmentId?: string;
  
  /**
   * Investment data to determine entity-specific context
   */
  investment?: InvestmentData;
  
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
  investment,
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
