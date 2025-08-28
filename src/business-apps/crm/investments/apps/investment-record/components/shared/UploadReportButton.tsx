import React, { useState } from 'react';
import { Button } from '@newwork/nw-design-system';
import { Upload } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { InvestmentDocumentUploadForm } from '../../../../forms/investment-document-upload-form';

export interface UploadReportButtonProps extends BusinessAppContextProps {
  /**
   * Investment ID to pre-populate in the upload form
   */
  investmentId?: string;
  
  /**
   * Callback when upload is successful
   */
  onUploadSuccess?: (fileIds: string[]) => void;
  
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
  onUploadSuccess,
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  additionalData
}) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleUploadSuccess = (fileIds: string[]) => {
    console.log('Investment reports uploaded successfully:', fileIds);
    setUploadDialogOpen(false);
    
    if (onUploadSuccess) {
      onUploadSuccess(fileIds);
    }
  };

  if (!investmentId) {
    return null; // Don't render if no investment ID
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setUploadDialogOpen(true)}
        className="gba:flex gba:items-center gba:gap-2"
        data-testid="upload-investment-report-button"
      >
        <Upload className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('investment.reports.uploadReport', 'Upload Report')}
      </Button>

      {/* Upload Report Modal */}
      <InvestmentDocumentUploadForm
        mode="modal"
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={handleUploadSuccess}
        investmentId={investmentId}
        showInvestmentSelector={false} // Hide investment selector since we already have the investment
        title={getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.title.specific',
          'Upload Investment Report'
        )}
        description={getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.description.specific',
          'Upload performance reports and financial documents for this investment. Files will be securely stored and easily accessible for future reference.'
        )}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
      />
    </>
  );
};

export default UploadReportButton;
