import type { RcFile } from 'antd/es/upload';

export interface InvestmentDocumentUploadFormProps {
  // Form behavior
  mode?: 'modal' | 'inline';
  onSuccess?: (fileIds: string[]) => void;
  onCancel?: () => void;
  
  // Investment context
  investmentId?: string;
  showInvestmentSelector?: boolean;
  
  // Modal specific props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // UI customization
  title?: string;
  description?: string;
  maxFiles?: number;
  allowedFileTypes?: string[];
}

export interface UploadFile {
  uid: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  originFileObj?: RcFile;
}

export interface UploadProgress {
  current: number;
  total: number;
}

export interface Investment {
  id: string;
  name: string;
  businessKey?: string;
}

export interface UseInvestmentDocumentUploadProps {
  accessToken: string;
  onSuccess?: (fileIds: string[]) => void;
  onError?: (error: string) => void;
}

export interface UseInvestmentDocumentUploadReturn {
  uploadFiles: (files: RcFile[], investmentId: string) => Promise<string[]>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
  clearError: () => void;
}
