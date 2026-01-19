import { useState, useCallback } from 'react';
import { env } from '@/common/env/EnvUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const FILES_ENDPOINT = env("NEXT_PUBLIC_FILE_SERVICE_ENDPOINT");

export interface UploadFile {
  uid: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  originFileObj?: File;
  errorMessage?: string;
}

export interface UploadProgress {
  current: number;
  total: number;
}

export interface UseServiceFileUploadProps {
  accessToken: string;
  onSuccess?: (fileIds: string[]) => void;
  onError?: (error: string) => void;
}

export interface UseServiceFileUploadReturn {
  uploadFiles: (files: File[], requestId?: string) => Promise<any[]>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
  clearError: () => void;
}

export const useServiceFileUpload = ({
  accessToken,
  onSuccess,
  onError
}: UseServiceFileUploadProps): UseServiceFileUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Upload single file using service request folder structure
  const uploadSingleFile = useCallback(async (file: File, requestId?: string): Promise<any> => {
    if (!FILES_ENDPOINT) {
      throw new Error('File service endpoint not configured');
    }

    // Create folder path for service request documents
    // Pattern: /service-requests/{requestId}/attachments or /service-requests/temp/{timestamp} for new requests
    const folderPath = requestId 
      ? `/service-requests/${requestId}/attachments`
      : `/service-requests/temp/${Date.now()}`;
    
    const mimeType = file.type;
    
    // Build URL with service app name and folder structure
    const url = `${FILES_ENDPOINT}/tenant/files?appName=serviceDesk&folderPath=${encodeURIComponent(folderPath)}&mimeType=${encodeURIComponent(mimeType)}`;
    
    // Create FormData
    const formData = new FormData();
    formData.append('fileContent', file);
    
    console.log(`Uploading service file: ${file.name} to ${url}`);
    console.log(`Using folder structure: ${folderPath} ${requestId ? `(Request: ${requestId})` : '(Temporary)'}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`Service file uploaded successfully:`, result);
    return result;
  }, [accessToken]);

  const uploadFiles = useCallback(async (files: File[], requestId?: string): Promise<any[]> => {
    if (!files.length) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'service.document.upload.error.noFile', 
        'Please select at least one file'
      );
      setError(errorMessage);
      return [];
    }

    if (!accessToken) {
      const errorMessage = 'Authentication required';
      setError(errorMessage);
      return [];
    }

    setIsUploading(true);
    setError(null);
    const uploadResults: any[] = [];
    const totalFiles = files.length;

    try {
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadProgress({ current: i + 1, total: totalFiles });

        console.log(`Uploading service file ${i + 1}/${totalFiles}: ${file.name}`);

        // Upload using service folder structure pattern
        const uploadResult = await uploadSingleFile(file, requestId);
        uploadResults.push(uploadResult);

        console.log(`Service file ${i + 1} uploaded successfully. Full response:`, uploadResult);
      }

      setUploadProgress(null);

      const successMessage = getTranslationFromI18nKeyAndLabel(
        'service.document.upload.success.message',
        `${uploadResults.length} file(s) uploaded successfully!`
      );
      
      if (onSuccess) {
        // For backward compatibility, still pass file IDs to onSuccess
        const fileIds = uploadResults.map(result => 
          result?.fileInfo?.fileId || result?.fileId || result?.id || `FILE_${Date.now()}`
        );
        onSuccess(fileIds);
      }

      return uploadResults;

    } catch (err: any) {
      const errorMessage = err?.message || 'Upload failed';
      console.error('Service file upload failed:', err);
      setError(errorMessage);
      setUploadProgress(null);
      
      if (onError) {
        onError(errorMessage);
      }
      
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [accessToken, uploadSingleFile, onSuccess, onError]);

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    error,
    clearError
  };
};
