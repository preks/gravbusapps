/**
 * Types for the File Service API
 */

/**
 * Path parameters for file operations
 */
export type FilePathParams = {
  /**
   * Access scope for the file (e.g., 'tenant')
   */
  accessScope: string;
  
  /**
   * ID of the file
   */
  fileId: string;
};

/**
 * Query parameters for file operations
 */
export type FileQueryParams = {
  /**
   * Application name (e.g., 'expenses')
   */
  appName?: string;
  
  /**
   * Folder path where the file is stored
   */
  folderPath?: string;
};

/**
 * File metadata
 */
export type FileMetadata = {
  /**
   * File ID
   */
  id: string;
  
  /**
   * File name
   */
  fileName: string;
  
  /**
   * File URL
   */
  fileUrl: string;
  
  /**
   * File size in bytes
   */
  fileSize?: number;
  
  /**
   * MIME type of the file
   */
  mimeType?: string;
  
  /**
   * Upload date
   */
  uploadDate?: string;
};
