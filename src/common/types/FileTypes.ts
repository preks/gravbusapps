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
  accessScope: string

  /**
   * ID of the file
   */
  fileId?: string
}

/**
 * Query parameters for file operations
 */
export type FileQueryParams = {
  /**
   * Application name (e.g., 'expenses')
   */
  appName?: string

  /**
   * Folder path where the file is stored
   */
  folderPath?: string

  /**
   * Encoding type for the file (e.g., 'base64')
   */
  encoding?: string

  /**
   * MIME type of the file
   */
  mimeType?: string

  /**
   * When true, the file service uses originalFileName (derived from the file name + mimeType)
   * as the fileId instead of generating a random UUID.
   * Required for predictable fileIds like 'default_logo.svg+xml'.
   */
  keepFilename?: boolean
}

/**
 * File metadata
 */
export type FileMetadata = {
  /**
   * File ID
   */
  id: string

  /**
   * File name
   */
  fileName: string

  /**
   * File URL
   */
  fileUrl: string

  /**
   * File size in bytes
   */
  fileSize?: number

  /**
   * MIME type of the file
   */
  mimeType?: string

  /**
   * Upload date
   */
  uploadDate?: string
}

/**
 * File upload response from file service
 */
export interface FileUploadResponse {
  fileInfo: {
    appName: string
    fileId: string
    folderPath: string
    accessScope: string
    path: string
    fileMetadata: {
      mimeType: string
      originalFileName: string
      keyValues: any[]
      updatedAt: string
    }
    uploadedAt: string
  }
}

/**
 * File list entry returned by the file service listing endpoint
 */
export interface FileListEntry {
  fileId: string
  appName?: string
  folderPath?: string
  accessScope?: string
  path?: string
  uploadedAt?: string
  fileMetadata?: {
    mimeType?: string
    originalFileName?: string
    [key: string]: unknown
  }
}

/**
 * File list response from the file service
 */
export interface FileListResponse {
  files: FileListEntry[]
}

/**
 * File information object from file service (used in documents, notes, activities, tasks)
 */
export interface FileInfo {
  /** File path for accessing the file */
  path: string
  /** Unique file identifier */
  fileId?: string
  /** Application name */
  appName?: string
  /** Folder path where file is stored */
  folderPath?: string
  /** Upload timestamp */
  uploadedAt?: string
  /** Access scope (e.g., 'tenant') */
  accessScope?: string
  /** Associated DocuSign envelope ID for signed documents */
  docusignEnvelopeId?: string
  /** How the DocuSign envelope was initiated */
  docusignEnvelopeMode?: 'embedded' | 'email'
  /** File metadata (mimeType, originalFileName, etc.) */
  fileMetadata?: {
    /** MIME type of the file */
    mimeType?: string
    /** Original filename before upload */
    originalFileName?: string
    /** Additional metadata properties */
    [key: string]: unknown
  }
}
