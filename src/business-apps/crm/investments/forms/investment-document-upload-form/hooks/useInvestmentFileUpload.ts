import { useState, useCallback } from 'react';
import { message } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { env } from '@/common/env/EnvUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { UploadProgress, UseInvestmentDocumentUploadProps, UseInvestmentDocumentUploadReturn } from '../types';

const FILES_ENDPOINT = env("NEXT_PUBLIC_FILE_SERVICE_ENDPOINT");

export const useInvestmentFileUpload = ({
  accessToken,
  onSuccess,
  onError
}: UseInvestmentDocumentUploadProps): UseInvestmentDocumentUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Upload single file using investment folder structure
  const uploadSingleFile = useCallback(async (file: RcFile, investmentId: string): Promise<any> => {
    if (!FILES_ENDPOINT) {
      throw new Error('File service endpoint not configured');
    }

    // Create folder path for investment documents using camelCase alternate codes
    // documentGroup: Uses 'financial' (alternativeCode from InvestmentDocumentGroup catalog)
    // documentType: Uses 'fundPerformanceReport' (alternativeCode from InvestmentDocumentType catalog)
    // Pattern must match: ^(/[\\w_-]{1,256})+$ (each segment must start with /)
    const documentGroup = 'financial';
    const documentType = 'fundPerformanceReport';
    const folderPath = `/investment/${investmentId}/${documentGroup}/${documentType}`;
    const mimeType = file.type;
    
    // Build URL with established appName and folder structure
    const url = `${FILES_ENDPOINT}/tenant/files?appName=investmentRelations&folderPath=${encodeURIComponent(folderPath)}&mimeType=${encodeURIComponent(mimeType)}`;
    
    // Create FormData
    const formData = new FormData();
    formData.append('fileContent', file);
    
    console.log(`Uploading file: ${file.name} to ${url}`);
    console.log(`Using folder structure: ${folderPath} (Investment: ${investmentId})`);
    
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
    console.log(`File uploaded successfully:`, result);
    return result;
  }, [accessToken]);

  const uploadFiles = useCallback(async (files: RcFile[], investmentId: string): Promise<string[]> => {
    if (!files.length) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'investment.document.upload.error.noFile', 
        'Please select at least one file'
      );
      message.error(errorMessage);
      setError(errorMessage);
      return [];
    }

    if (!accessToken) {
      const errorMessage = 'Authentication required';
      message.error(errorMessage);
      setError(errorMessage);
      return [];
    }

    setIsUploading(true);
    setError(null);
    const uploadedIds: string[] = [];
    const totalFiles = files.length;

    try {
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadProgress({ current: i + 1, total: totalFiles });

        console.log(`Uploading file ${i + 1}/${totalFiles}: ${file.name}`);

        // Upload using established folder structure pattern
        const uploadResult = await uploadSingleFile(file, investmentId);
        
        // Extract file ID from response (this will be our "table ID")
        // Response structure: { fileInfo: { fileId: string, fileMetadata: {...} } } or { fileId: string }
        const fileId = uploadResult?.fileInfo?.fileId || uploadResult?.fileId || uploadResult?.id || `FILE_${Date.now()}_${i}`;
        uploadedIds.push(fileId);

        console.log(`File ${i + 1} uploaded successfully. File ID: ${fileId}`);
        console.log('Full upload response:', uploadResult);
      }

      setUploadProgress(null);

      const successMessage = getTranslationFromI18nKeyAndLabel(
        'investment.document.upload.success.message',
        `${uploadedIds.length} document(s) uploaded successfully!`
      );
      message.success(successMessage);
      
      if (onSuccess) {
        onSuccess(uploadedIds);
      }

      return uploadedIds;

    } catch (err: any) {
      const errorMessage = err?.message || 'Upload failed';
      console.error('Upload failed:', err);
      message.error(errorMessage);
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
