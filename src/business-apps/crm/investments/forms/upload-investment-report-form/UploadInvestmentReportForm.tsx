import React, { useState, useEffect } from 'react';
import { Upload, message } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { FileText, CheckCircle, Upload as UploadIcon } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system';
import { useForm } from 'react-hook-form';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGetInvestments } from '@/common/data/investment';
import { useInvestmentFileUpload } from './hooks/useInvestmentFileUpload';
import type { InvestmentDocumentUploadFormProps, UploadFile } from './types';

const DEFAULT_ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png'];
const DEFAULT_MAX_FILES = 5;

export const InvestmentDocumentUploadForm: React.FC<BusinessAppContextProps & InvestmentDocumentUploadFormProps> = ({
  // Form behavior props
  mode = 'inline',
  onSuccess,
  onCancel,
  
  // Investment context props
  investmentId,
  showInvestmentSelector = true,
  
  // Modal specific props
  open = false,
  onOpenChange,
  
  // UI customization props
  title,
  description,
  maxFiles = DEFAULT_MAX_FILES,
  allowedFileTypes = DEFAULT_ALLOWED_FILE_TYPES,
  
  // Business app context props
  accessToken,
  userInfo,
  additionalData
}) => {
  console.log('InvestmentDocumentUploadForm rendering with props:', { 
    mode, 
    open, 
    accessToken: !!accessToken,
    investmentId,
    showInvestmentSelector 
  });

  const form = useForm({
    defaultValues: {
      investmentId: investmentId || '',
      files: []
    },
    mode: 'onChange'
  });

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<string[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [loadingInvestments, setLoadingInvestments] = useState(false);
  const [investmentsError, setInvestmentsError] = useState(false);

  const {
    uploadFiles,
    isUploading,
    uploadProgress,
    error: uploadError,
    clearError
  } = useInvestmentFileUpload({
    accessToken,
    onSuccess: (fileIds) => {
      setUploadSuccess(fileIds);
      if (onSuccess) {
        onSuccess(fileIds);
      }
      
      // Auto-close modal after 3 seconds if in modal mode
      if (mode === 'modal') {
        setTimeout(() => {
          handleClose();
        }, 3000);
      }
    },
    onError: (errorMsg) => {
      console.error('Upload error:', errorMsg);
    }
  });

  // Initialize investment hook with error boundary (same as original modal)
  let fetchInvestments: any = null;
  try {
    const investmentHook = useGetInvestments({ accessToken, userInfo, additionalData });
    fetchInvestments = investmentHook.fetchInvestments;
  } catch (error) {
    console.warn('Investment hook initialization failed, using fallback:', error);
  }

  // Load investments when form is displayed (same pattern as original modal)
  useEffect(() => {
    const loadInvestments = async () => {
      if (!fetchInvestments) {
        console.warn('fetchInvestments not available, skipping investment loading');
        setInvestmentsError(true);
        return;
      }

      try {
        setLoadingInvestments(true);
        setInvestmentsError(false);
        
        const result = await fetchInvestments({ limit: 100 });
        const investmentList = result?.Investment || [];
        
        if (investmentList.length === 0) {
          console.warn('No investments found');
          setInvestmentsError(true);
        } else {
          setInvestments(investmentList);
          console.log(`Loaded ${investmentList.length} investments`);
        }
        
      } catch (error) {
        console.error('Failed to load investments:', error);
        setInvestmentsError(true);
        // Don't show error message to user unless they try to use the dropdown
      } finally {
        setLoadingInvestments(false);
      }
    };

    if (showInvestmentSelector && accessToken && fetchInvestments) {
      loadInvestments();
    }
  }, [showInvestmentSelector, accessToken, fetchInvestments]);

  // Set investment ID if provided as prop
  useEffect(() => {
    if (investmentId && form.getValues().investmentId !== investmentId) {
      form.setValue('investmentId', investmentId);
    }
  }, [investmentId, form]);

  const validateFile = (file: RcFile): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      message.error(getTranslationFromI18nKeyAndLabel(
        'investment.document.upload.error.fileType',
        `File type ${fileExtension} is not allowed`
      ));
      return false;
    }
    return true;
  };

  const handleFileChange = ({ fileList: newFileList }: any) => {
    const validFiles = newFileList.filter((file: any) => {
      if (file.originFileObj && !validateFile(file.originFileObj)) {
        return false;
      }
      return true;
    });
    setFileList(validFiles);
  };

  const beforeUpload = (file: RcFile) => {
    return validateFile(file) ? false : Upload.LIST_IGNORE;
  };

  const onSubmit = async (values: any) => {
    console.log('Form submitted with values:', values);
    console.log('Current fileList:', fileList);
    
    const files = fileList.map(f => f.originFileObj).filter(Boolean) as RcFile[];
    const targetInvestmentId = values.investmentId;
    
    if (!files.length) {
      message.error(getTranslationFromI18nKeyAndLabel(
        'investment.document.upload.error.noFile', 
        'Please select at least one file'
      ));
      return;
    }

    if (!targetInvestmentId) {
      message.error(getTranslationFromI18nKeyAndLabel(
        'investment.document.upload.error.investmentRequired', 
        'Please select an investment'
      ));
      return;
    }

    await uploadFiles(files, targetInvestmentId);
  };

  const handleClose = () => {
    form.reset();
    setFileList([]);
    setUploadSuccess([]);
    clearError();
    setInvestments([]);
    setLoadingInvestments(false);
    setInvestmentsError(false);
    
    if (mode === 'modal' && onOpenChange) {
      onOpenChange(false);
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  const defaultTitle = getTranslationFromI18nKeyAndLabel(
    'investment.document.upload.title', 
    'Upload Investment Report'
  );
  
  const defaultDescription = getTranslationFromI18nKeyAndLabel(
    'investment.document.upload.description',
    'Upload report documents, AI will analyze the documents and provide a report record of the documents. These documents will be securely stored and easily accessible for future reference and compliance purposes.'
  );

  // Error handling for missing access token
  if (!accessToken) {
    const errorContent = (
      <Alert>
        <AlertDescription>
          Authentication Required: Access token is required to upload documents.
        </AlertDescription>
      </Alert>
    );

    if (mode === 'modal') {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Error</DialogTitle>
            </DialogHeader>
            {errorContent}
            <DialogFooter>
              <Button onClick={() => onOpenChange?.(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <div className="gba:p-6">
        <h2 className="gba:text-xl gba:font-bold gba:mb-4">Error</h2>
        {errorContent}
      </div>
    );
  }

  // Main form content
  const formContent = (
    <div className="gba:space-y-4">
      {uploadSuccess.length > 0 ? (
        <div className="gba:py-8 gba:text-center" data-testid="upload-success-message">
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
            <CheckCircle className="gba:h-16 gba:w-16 gba:text-green-500" />
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:text-green-600">
                {getTranslationFromI18nKeyAndLabel(
                  'investment.document.upload.success.title', 
                  `${uploadSuccess.length} Document${uploadSuccess.length > 1 ? 's' : ''} Uploaded Successfully!`
                )}
              </h3>
              <div className="gba:text-sm gba:text-gray-600 gba:mt-2">
                <p className="gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('investment.document.upload.success.fileIds', 'File IDs:')}
                </p>
                <div className="gba:max-h-32 gba:overflow-y-auto">
                  {uploadSuccess.map((fileId, index) => (
                    <div key={index} className="gba:font-mono gba:text-blue-600 gba:text-xs gba:py-1" data-testid={`file-id-${index}`}>
                      {index + 1}. {fileId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} data-testid="investment-document-upload-form" className="gba:space-y-4">
            {/* Investment Selection - Only show if showInvestmentSelector is true */}
            {showInvestmentSelector && (
              <FormField
                control={form.control}
                name="investmentId"
                rules={{ 
                  required: getTranslationFromI18nKeyAndLabel('investment.document.upload.error.investmentRequired', 'Please select an investment') 
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.document.upload.investment', 'Investment')}</FormLabel>
                    <FormControl>
                      {!investmentsError && investments.length > 0 ? (
                        <Select onValueChange={field.onChange} value={field.value} disabled={loadingInvestments}>
                          <SelectTrigger data-testid="investment-select" className="gba:w-full">
                            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('investment.document.upload.investment.placeholder', 'Select an investment')} />
                          </SelectTrigger>
                          <SelectContent>
                            {investments.map((investment) => (
                              <SelectItem key={investment.id} value={investment.id}>
                                {investment.name || investment.businessKey || investment.id}
                                {investment.businessKey && ` (${investment.businessKey})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div>
                          <Input
                            {...field}
                            placeholder={getTranslationFromI18nKeyAndLabel('investment.document.upload.investment.placeholder.manual', 'Enter investment ID')}
                            data-testid="investment-input"
                            className="gba:w-full"
                          />
                          {investmentsError && (
                            <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                              {getTranslationFromI18nKeyAndLabel(
                                'investment.document.upload.investment.fallback',
                                'Unable to load investments list. Please enter the investment ID manually.'
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* File Upload */}
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('investment.document.upload.files', 'Document Files')}
              </label>
              <Upload.Dragger
                fileList={fileList}
                onChange={handleFileChange}
                beforeUpload={beforeUpload}
                maxCount={maxFiles}
                multiple
                accept={allowedFileTypes.join(',')}
                data-testid="file-upload-dragger"
              >
                <p className="ant-upload-drag-icon gba:flex gba:justify-center">
                  <UploadIcon size={48} className="gba:text-gray-400" />
                </p>
                <p className="ant-upload-text">
                  {getTranslationFromI18nKeyAndLabel(
                    'investment.document.upload.dropText',
                    'Click or drag files to this area to upload'
                  )}
                </p>
                <p className="ant-upload-hint">
                  {getTranslationFromI18nKeyAndLabel(
                    'investment.document.upload.hint',
                    `Support for PDF, Word, Excel, and text files. Maximum ${maxFiles} files. Files are uploaded directly to storage.`
                  )}
                </p>
              </Upload.Dragger>
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="gba:mb-4">
                <div className="gba:flex gba:justify-between gba:text-sm gba:text-gray-600 gba:mb-2">
                  <span>Uploading files...</span>
                  <span>{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                  <div 
                    className="gba:bg-blue-600 gba:h-2 gba:rounded-full gba:transition-all"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {uploadError && (
              <Alert>
                <AlertDescription>
                  {uploadError}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      )}
    </div>
  );

  // Action buttons
  const actionButtons = uploadSuccess.length === 0 && (
    <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6">
      <Button
        variant="outline"
        onClick={handleClose}
        disabled={isUploading}
        data-testid="cancel-button"
      >
        {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      </Button>
      <Button
        type="submit"
        onClick={form.handleSubmit(onSubmit)}
        disabled={isUploading || fileList.length === 0}
        data-testid="upload-button"
      >
        {isUploading
          ? getTranslationFromI18nKeyAndLabel('investment.document.upload.uploading', 'Uploading...')
          : getTranslationFromI18nKeyAndLabel('investment.document.upload.upload', 'Upload Documents')
        }
      </Button>
    </div>
  );

  // Error boundary wrapper
  try {
    // Modal mode
    if (mode === 'modal') {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="gba:max-w-2xl" data-testid="investment-document-upload-modal">
            <DialogHeader>
              <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                <FileText className="gba:h-5 gba:w-5" />
                {title || defaultTitle}
              </DialogTitle>
            </DialogHeader>
            
            <div className="gba:mb-4">
              <p className="gba:text-gray-600">
                {description || defaultDescription}
              </p>
            </div>

            {formContent}

            {actionButtons && (
              <DialogFooter>
                {actionButtons}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      );
    }

    // Inline mode
    return (
      <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="investment-document-upload-form">
        <div className="gba:mb-6">
          <h2 className="gba:text-xl gba:font-bold gba:mb-2 gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5" />
            {title || defaultTitle}
          </h2>
          <p className="gba:text-gray-600">
            {description || defaultDescription}
          </p>
        </div>

        {formContent}
        {actionButtons}
      </div>
    );

  } catch (error) {
    console.error('Error rendering InvestmentDocumentUploadForm:', error);
    
    const errorFallback = (
      <Alert>
        <AlertDescription>
          There was an error loading the upload form. Please try again or contact support.
        </AlertDescription>
      </Alert>
    );

    if (mode === 'modal') {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Component Error</DialogTitle>
            </DialogHeader>
            {errorFallback}
            <DialogFooter>
              <Button onClick={() => onOpenChange?.(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <div className="gba:p-6">
        <h2 className="gba:text-xl gba:font-bold gba:mb-4">Component Error</h2>
        {errorFallback}
      </div>
    );
  }
};