import React, { useState, useRef, useCallback } from 'react';
import { FileText, Upload as UploadIcon, X, AlertCircle } from 'lucide-react';
import { 
  Input,
  Button,
  Badge,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useServiceFileUpload } from '../hooks/useServiceFileUpload';
import type { UploadFile } from '../hooks/useServiceFileUpload';

// Re-export UploadFile type for convenience
export type { UploadFile };

export interface FileUploadFieldProps {
  name: string;
  label?: string;
  showLabel?: boolean;
  value: UploadFile[];
  onChange: (files: UploadFile[]) => void;
  onUploadComplete?: (uploadResults: any[]) => void;
  required?: boolean;
  description?: string;
  hasError?: boolean;
  errorMessage?: string;
  maxFiles?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in MB
  accessToken: string;
  requestId?: string;
  disabled?: boolean;
  hideUploadButton?: boolean; // New prop to hide upload button
}

const DEFAULT_ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.zip'];
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_FILE_SIZE = 10; // MB

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  name,
  label,
  showLabel = true,
  value = [],
  onChange,
  onUploadComplete,
  required = false,
  description,
  hasError = false,
  errorMessage,
  maxFiles = DEFAULT_MAX_FILES,
  allowedFileTypes = DEFAULT_ALLOWED_FILE_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  accessToken,
  requestId,
  disabled = false,
  hideUploadButton = false
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>(value);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload hook
  const { uploadFiles, uploadProgress, error: uploadError, isUploading } = useServiceFileUpload({
    accessToken,
    onSuccess: (fileIds) => {
      console.log('File upload completed, file IDs:', fileIds);
    },
    onError: (errorMsg) => {
      console.error('File upload error:', errorMsg);
    }
  });

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return getTranslationFromI18nKeyAndLabel(
        'service.document.upload.error.fileSize',
        `File size must be less than ${maxFileSize}MB`
      );
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      return getTranslationFromI18nKeyAndLabel(
        'service.document.upload.error.fileType',
        `File type ${fileExtension} is not allowed`
      );
    }

    return null;
  }, [maxFileSize, allowedFileTypes]);

  // Process and validate added files
  const handleFilesAdded = useCallback((newFiles: File[]) => {
    if (disabled) return;

    // Check max files limit
    const remainingSlots = maxFiles - fileList.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    const validFiles = filesToAdd.map((file, index) => {
      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${index}`,
        name: file.name,
        status: 'done',
        originFileObj: file
      };
      
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        return { 
          ...uploadFile, 
          status: 'error' as const,
          errorMessage: validationError
        };
      }

      return uploadFile;
    });

    const updatedFileList = [...fileList, ...validFiles];
    setFileList(updatedFileList);
    onChange(updatedFileList);
  }, [fileList, maxFiles, validateFile, onChange, disabled]);

  // Handle file selection from input
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    handleFilesAdded(selectedFiles);
    
    // Clear the file input after processing so subsequent selections work correctly
    // This allows adding multiple files one by one
    if (event.target) {
      event.target.value = '';
    }
  }, [handleFilesAdded]);

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    handleFilesAdded(droppedFiles);
  }, [disabled, handleFilesAdded]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Remove file from list
  const removeFile = useCallback((uid: string) => {
    if (disabled) return;
    
    const updatedFileList = fileList.filter(file => file.uid !== uid);
    setFileList(updatedFileList);
    onChange(updatedFileList);
    
    // Clear the file input value so the same file can be selected again
    // This is essential for allowing re-selection of the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileList, onChange, disabled]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  // Upload files to server
  const handleUploadFiles = useCallback(async () => {
    if (disabled || isUploading) return;

    const filesToUpload = fileList
      .filter(f => f.status === 'done' && f.originFileObj)
      .map(f => f.originFileObj!)
      .filter(Boolean);

    if (!filesToUpload.length) return;

    try {
      // Update status to uploading
      const uploadingFileList = fileList.map(f => 
        f.status === 'done' ? { ...f, status: 'uploading' as const } : f
      );
      setFileList(uploadingFileList);
      onChange(uploadingFileList);

      // Upload files
      const results = await uploadFiles(filesToUpload, requestId);
      setUploadResults(results);

      // Update status to done and store upload results
      const completedFileList = fileList.map((f, index) => {
        if (f.status === 'uploading' && results[index]) {
          return { 
            ...f, 
            status: 'done' as const,
            uploadResult: results[index]
          };
        }
        return f;
      });
      
      setFileList(completedFileList);
      onChange(completedFileList);

      // Clear the file input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(results);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Update status to error
      const errorFileList = fileList.map(f => 
        f.status === 'uploading' ? { 
          ...f, 
          status: 'error' as const,
          errorMessage: error instanceof Error ? error.message : 'Upload failed'
        } : f
      );
      setFileList(errorFileList);
      onChange(errorFileList);
      
      // Clear the file input after error to allow re-selection
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [fileList, uploadFiles, requestId, onUploadComplete, onChange, disabled, isUploading]);

  // Get upload results for form submission
  const getUploadResults = useCallback(() => {
    return uploadResults;
  }, [uploadResults]);

  // Expose upload results to parent
  React.useImperativeHandle(React.createRef(), () => ({
    getUploadResults,
    uploadFiles: handleUploadFiles
  }));

  const canAddMoreFiles = fileList.length < maxFiles;
  const hasValidFiles = fileList.some(f => f.status === 'done' && !f.errorMessage);
  const hasUploadedFiles = uploadResults.length > 0;

  return (
    <div className="gba:space-y-2" data-testid={`field-container-${name}`}>
      {/* Label - Only show if showLabel is true and label is provided */}
      {showLabel && label && (
        <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
          <FileText className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
          {label}
          {required && <span className="gba:text-destructive gba:ml-1">*</span>}
        </label>
      )}

      {/* Description */}
      {description && (
        <p className="gba:text-xs gba:text-muted-foreground">{description}</p>
      )}

      {/* File Upload Area */}
      <div 
        className={`gba:border-2 gba:border-dashed gba:rounded-lg gba:p-6 gba:text-center gba:transition-colors ${
          disabled ? 'gba:opacity-50 gba:cursor-not-allowed' : 'gba:cursor-pointer'
        } ${hasError ? 'gba:border-destructive' : 'gba:border-border'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={canAddMoreFiles ? openFilePicker : undefined}
        data-testid={`file-upload-area-${name}`}
      >
        <div className="gba:flex gba:justify-center gba:mb-4">
          <UploadIcon size={32} className="gba:text-muted-foreground" />
        </div>
        
        {canAddMoreFiles ? (
          <>
            <p className="gba:mb-2 gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'service.document.upload.dropText',
                'Drop your files here or click to browse'
              )}
            </p>
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'service.document.upload.hint',
                `Supports: ${allowedFileTypes.join(', ')}. Max ${maxFiles} files, ${maxFileSize}MB each.`
              )}
            </p>
          </>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'service.document.upload.maxFiles',
              `Maximum ${maxFiles} files reached`
            )}
          </p>
        )}
      </div>

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={allowedFileTypes.join(',')}
        multiple={maxFiles > 1}
        className="gba:hidden"
        data-testid={`file-input-${name}`}
        disabled={disabled}
      />

      {/* File List Display */}
      {fileList.length > 0 && (
        <div className="gba:space-y-2 gba:mt-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('service.document.upload.selectedFiles', 'Selected Files')}
            </label>
            
            {/* Upload Button - Only show if not hidden */}
            {!hideUploadButton && hasValidFiles && !hasUploadedFiles && (
              <Button
                type="button"
                size="sm"
                onClick={handleUploadFiles}
                disabled={disabled || isUploading}
                className="gba:ml-2"
                data-testid={`upload-button-${name}`}
              >
                {isUploading ? (
                  <>
                    <UploadIcon className="gba:w-4 gba:h-4 gba:mr-1 gba:animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadIcon className="gba:w-4 gba:h-4 gba:mr-1" />
                    Upload Files
                  </>
                )}
              </Button>
            )}
          </div>

          {fileList.map((file) => (
            <div 
              key={file.uid} 
              className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md gba:border ${
                file.status === 'error' ? 'gba:border-destructive gba:bg-destructive/5' : 'gba:border-border gba:bg-background'
              }`}
              data-testid={`file-item-${file.uid}`}
            >
              <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <FileText className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{file.name}</span>
                  
                  {file.status === 'uploading' && (
                    <Badge variant="secondary" className="gba:text-xs">
                      <UploadIcon className="gba:w-3 gba:h-3 gba:mr-1 gba:animate-spin" />
                      Uploading
                    </Badge>
                  )}
                  
                  {file.status === 'error' && (
                    <Badge variant="destructive" className="gba:text-xs">
                      <AlertCircle className="gba:w-3 gba:h-3 gba:mr-1" />
                      Error
                    </Badge>
                  )}
                  
                  {file.status === 'done' && !file.errorMessage && (
                    <Badge variant="secondary" className="gba:text-xs gba:bg-green-100 gba:text-green-800">
                      Ready
                    </Badge>
                  )}
                </div>
                
                {file.errorMessage && (
                  <span className="gba:text-xs gba:text-destructive gba:ml-6">
                    {file.errorMessage}
                  </span>
                )}
              </div>
              
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.uid)}
                  className="gba:h-6 gba:w-6 gba:p-0 gba:ml-2"
                  data-testid={`remove-file-${file.uid}`}
                >
                  <X className="gba:h-4 gba:w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="gba:mt-4">
          <div className="gba:flex gba:justify-between gba:text-sm gba:text-muted-foreground gba:mb-2">
            <span>Uploading files...</span>
            <span>{uploadProgress.current} / {uploadProgress.total}</span>
          </div>
          <div className="gba:w-full gba:bg-secondary gba:rounded-full gba:h-2">
            <div 
              className="gba:bg-primary gba:h-2 gba:rounded-full gba:transition-all"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {(uploadError || hasError) && (
        <Alert>
          <AlertCircle className="gba:h-4 gba:w-4" />
          <AlertDescription>
            {uploadError || errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Success Info */}
      {hasUploadedFiles && (
        <Alert>
          <AlertDescription className="gba:text-green-700">
            {getTranslationFromI18nKeyAndLabel(
              'service.document.upload.success',
              `${uploadResults.length} file(s) uploaded successfully and will be included with your request.`
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
