// Main reusable form component (supports both modal and inline modes)
export { InvestmentDocumentUploadForm } from './UploadInvestmentReportForm';

// Hooks
export { useInvestmentFileUpload } from './hooks/useInvestmentFileUpload';
export { useInvestmentDocumentUpload } from './hooks/useInvestmentDocumentUpload';

// Types
export type {
  InvestmentDocumentUploadFormProps,
  UploadFile,
  UploadProgress,
  Investment,
  UseInvestmentDocumentUploadProps,
  UseInvestmentDocumentUploadReturn
} from './types';

// Default export - the main reusable component
export { InvestmentDocumentUploadForm as default } from './UploadInvestmentReportForm';
