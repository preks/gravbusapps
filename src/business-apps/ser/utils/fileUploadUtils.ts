/**
 * Utility functions for file upload processing and debugging
 */

export interface ProcessedFileUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  uploadTimestamp: string;
  folderPath?: string;
  downloadPath?: string;
  appName?: string;
  accessScope?: string;
  originalUploadResponse?: any;
}

/**
 * Process raw upload results into a standardized format
 * Based on NEWWORK file service response structure
 */
export function processUploadResults(uploadResults: any[]): ProcessedFileUploadResult[] {
  return uploadResults.map((result, index) => {
    console.log(`🔍 [FileUploadUtils] Processing upload result ${index}:`, result);
    
    // Handle NEWWORK file service response structure
    const fileInfo = result?.fileInfo || result;
    const fileMetadata = fileInfo?.fileMetadata || {};
    
    const processed: ProcessedFileUploadResult = {
      // File identification
      fileId: fileInfo?.fileId || `unknown-${Date.now()}-${index}`,
      fileName: fileMetadata?.originalFileName || fileInfo?.fileName || `file-${index}`,
      mimeType: fileMetadata?.mimeType || fileInfo?.mimeType || 'application/octet-stream',
      
      // File metadata
      fileSize: fileMetadata?.size || fileInfo?.fileSize,
      uploadTimestamp: fileInfo?.uploadedAt || fileMetadata?.updatedAt || new Date().toISOString(),
      
      // Path information
      folderPath: fileInfo?.folderPath,
      downloadPath: fileInfo?.path,
      appName: fileInfo?.appName,
      accessScope: fileInfo?.accessScope,
      
      // Keep original for debugging
      originalUploadResponse: result
    };
    
    console.log(`🔍 [FileUploadUtils] Processed result ${index}:`, processed);
    return processed;
  });
}

/**
 * Create a human-readable summary of upload results
 */
export function createUploadSummary(uploadResults: ProcessedFileUploadResult[]): string {
  if (!uploadResults || uploadResults.length === 0) {
    return 'No files uploaded';
  }
  
  const summary = uploadResults.map((result, index) => {
    const sizeInfo = result.fileSize ? ` - ${formatFileSize(result.fileSize)}` : '';
    return `File ${index + 1}: ${result.fileName} (${result.fileId})${sizeInfo} - ${result.mimeType}`;
  }).join('\n');
  
  return `${uploadResults.length} file(s) uploaded:\n${summary}`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract file IDs from upload results for backward compatibility
 */
export function extractFileIds(uploadResults: ProcessedFileUploadResult[]): string[] {
  return uploadResults.map(result => result.fileId);
}

/**
 * Create a JSON-serializable version of upload results for form submission
 * Optimized for NEWWORK file service response structure
 */
export function serializeUploadResults(uploadResults: any[]): any {
  const processed = processUploadResults(uploadResults);
  
  // Create a clean object that can be safely JSON.stringify'd
  return processed.map(result => ({
    // Core file information
    fileId: result.fileId,
    fileName: result.fileName,
    mimeType: result.mimeType,
    fileSize: result.fileSize,
    uploadTimestamp: result.uploadTimestamp,
    
    // Path and access information
    folderPath: result.folderPath,
    downloadPath: result.downloadPath,
    appName: result.appName,
    accessScope: result.accessScope,
    
    // Human-readable summary
    summary: `${result.fileName}${result.fileSize ? ` (${formatFileSize(result.fileSize)})` : ''}`,
    
    // Debug information
    _debug: {
      originalResponse: JSON.stringify(result.originalUploadResponse, null, 2),
      parsedAt: new Date().toISOString()
    }
  }));
}
