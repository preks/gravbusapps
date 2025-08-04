import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Badge,
  Separator,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system';
import { FileImageOutlined, LoadingOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileOutlined } from '@ant-design/icons';
import { FileClient } from '@/common/network/files/FileClient';
import { ExpenseItem, useGetExpenseItem } from '../../../hooks/useGetExpenseItems';
import { getExpenseItemStatusDisplay } from '../../../utils';
import { getTranslationFromI18nKeyAndLabel, getDateFormat } from '@/common/utils/windowUtils';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';

export interface ExpenseItemDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpenseItem | null;
  onClose: () => void;
}

export const ExpenseItemDetails: React.FC<ExpenseItemDetailsProps> = ({
  selectedItem,
  onClose,
  ...contextProps
}) => {
  // Use the hook to get detailed expense item data
  const { item: detailedItem, isLoading: isItemLoading, error: itemError, fetchItem } = useGetExpenseItem(contextProps);
  
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState<boolean>(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  
  // Ref to track if component is mounted
  const isMounted = useRef<boolean>(true);
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Fetch detailed expense item data when selectedItem changes
  // We use a ref to track if we've already fetched this item to prevent recursive calls
  const fetchedItemIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (selectedItem?.id && fetchedItemIdRef.current !== selectedItem.id) {
      fetchedItemIdRef.current = selectedItem.id;
      fetchItem(selectedItem.id);
    }
  }, [selectedItem?.id, fetchItem]);
  
  // Reset the fetched item id ref when the component unmounts or when selectedItem is null
  useEffect(() => {
    if (!selectedItem) {
      fetchedItemIdRef.current = null;
    }
  }, [selectedItem]);
  
  // Create FileClient with proper authorization
  const fileClient = useMemo(() => {
    const client = new FileClient();
    // Set authorization header if we have an access token
    if (contextProps.accessToken) {
      client.setAccessToken(contextProps.accessToken);
    }
    return client;
  }, [contextProps.accessToken]);
  
  // Fetch file attachments for an expense item
  const fetchFileAttachments = useCallback(async (item: ExpenseItem) => {
    if (!item?.expenseItemFile || item.expenseItemFile.length === 0) {
      setFileList([]);
      return;
    }
    
    setFileLoading(true);
    
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId;
    
    // Ensure we have a valid employeeId for the folder path
    if (!employeeId) {
      console.error('No employee ID available for file path');
      setFileLoading(false);
      return;
    }
    
    // Ensure we have an access token
    if (!contextProps.accessToken) {
      console.error('No access token available for file request');
      setFileLoading(false);
      return;
    }
    
    try {
      // Process each file attachment
      const processedFiles: UploadFile[] = [];
      
      for (const fileInfo of item.expenseItemFile) {
        try {
          // Use the fileInfo.id as the file identifier
          const pathParams = {
            accessScope: 'tenant',
            fileId: fileInfo.id
          };
          
          // Get file as blob and create object URL
          const fileBlob = await fileClient.getFile(pathParams, {
            appName: 'expenses',
            folderPath: `employees/${employeeId}/expense-items/${item.id}`
          });
          
          if (fileBlob && isMounted.current) {
            // Create object URL for the blob
            const downloadUrl = URL.createObjectURL(fileBlob);
            
            // Create UploadFile object
            const uploadFile: UploadFile = {
              uid: fileInfo.id,
              name: fileInfo.fileName || fileInfo.id, // Use fileName from fileInfo
              status: 'done',
              url: downloadUrl,
              size: fileBlob.size,
              type: fileBlob.type || 'application/octet-stream'
            };
            
            processedFiles.push(uploadFile);
          }
        } catch (fileError) {
          console.error(`Error processing file ${fileInfo.id}:`, fileError);
          // Continue with other files even if one fails
        }
      }
      
      if (isMounted.current) {
        setFileList(processedFiles);
      }
    } catch (error) {
      console.error('Error fetching file attachments:', error);
      if (isMounted.current) {
        setFileList([]);
      }
    } finally {
      if (isMounted.current) {
        setFileLoading(false);
      }
    }
  }, [fileClient, contextProps.userInfo?.employeeDetails?.employeeId, contextProps.accessToken]);
  
  // Fetch file attachments when detailed item changes
  useEffect(() => {
    if (detailedItem) {
      fetchFileAttachments(detailedItem);
    }
  }, [detailedItem, fetchFileAttachments]);
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CREATED':
        return 'secondary' as const;
      case 'PENDING':
        return 'warning' as const;
      case 'APPROVED':
        return 'success' as const;
      case 'REJECTED':
        return 'destructive' as const;
      case 'CLOSED':
        return 'success' as const;
      default:
        return 'default' as const;
    }
  };

  // Render attachment preview
  const renderAttachmentPreview = useCallback(() => {
    if (fileLoading) {
      return (
        <Card className="gba:text-center gba:py-8" data-testid="expense-file-loading">
          <Spinner />
          <div className="gba:mt-2">
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('expense.item.loadingReceipt', 'Loading receipt...')}
            </p>
          </div>
        </Card>
      );
    }

    if (fileList.length > 0) {
      return (
        <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:sm:gba:grid-cols-3 gba:md:gba:grid-cols-4 gba:lg:gba:grid-cols-5" data-testid="expense-files-grid">
          {fileList.map((file, idx) => {
            const fileName = file.name || '';
            const fileUrl = file.url || '';
            const fileType = file.type || '';
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            
            // Helper: Render icon by file type
            const renderFileIcon = () => {
              if (fileType.includes('pdf') || ext === 'pdf') return <FilePdfOutlined className="gba:text-red-500" style={{ fontSize: 32 }} />;
              if (fileType.includes('image') || ['jpg','jpeg','png','gif','bmp','webp'].includes(ext)) return <FileImageOutlined className="gba:text-blue-500" style={{ fontSize: 32 }} />;
              if (fileType.includes('word') || ['doc','docx'].includes(ext)) return <FileWordOutlined className="gba:text-blue-700" style={{ fontSize: 32 }} />;
              if (fileType.includes('excel') || ['xls','xlsx','csv'].includes(ext)) return <FileExcelOutlined className="gba:text-green-700" style={{ fontSize: 32 }} />;
              return <FileOutlined className="gba:text-gray-500" style={{ fontSize: 32 }} />;
            };

            // Helper: Render preview by file type
            const renderPreview = () => {
              if (fileType.includes('image') || ['jpg','jpeg','png','gif','bmp','webp'].includes(ext)) {
                return (
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="gba:rounded-md gba:shadow gba:w-[90px] gba:h-[90px] gba:object-cover gba:cursor-pointer"
                    data-testid={`expense-file-image-${idx}`}
                    onClick={() => {
                      setPreviewImage(fileUrl);
                      setPreviewOpen(true);
                    }}
                  />
                );
              }
              if (fileType.includes('pdf') || ext === 'pdf') {
                return (
                  <div
                    className="gba:w-[90px] gba:h-[90px] gba:flex gba:justify-center gba:items-center gba:bg-gray-100 gba:rounded-md gba:shadow gba:cursor-pointer hover:gba:bg-gray-200"
                    onClick={() => {
                      setPdfPreviewUrl(fileUrl);
                      setPdfPreviewOpen(true);
                    }}
                    data-testid={`expense-file-pdf-thumb-${idx}`}
                  >
                    <FilePdfOutlined className="gba:text-red-500" style={{ fontSize: 48 }} />
                  </div>
                );
              }
              // For other types: icon + download
              return (
                <div className="gba:flex gba:flex-col gba:items-center" data-testid={`expense-file-generic-${idx}`}> 
                  {renderFileIcon()}
                  <a
                    href={fileUrl}
                    download={fileName}
                    className="gba:mt-2 gba:text-xs gba:text-blue-600 hover:gba:underline"
                    data-testid={`expense-file-download-${idx}`}
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.download', 'Download')}
                  </a>
                </div>
              );
            };

            return (
              <div
                key={file.uid}
                className="gba:flex gba:flex-col gba:items-center gba:p-2 gba:bg-white gba:rounded-lg gba:shadow-md gba:w-[104px] gba:h-[130px]"
                data-testid={`expense-file-card-${idx}`}
              >
                {renderPreview()}
                <div className="gba:mt-2 gba:truncate gba:text-xs gba:text-center" title={fileName} data-testid={`expense-file-name-${idx}`}>{fileName}</div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <Card className="gba:text-center gba:py-8" data-testid="expense-file-empty">
        <FileImageOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
        <div className="gba:mt-2">
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_receipt_attached', 'No receipt attached')}
          </p>
        </div>
      </Card>
    );
  }, [fileLoading, fileList, previewOpen, previewImage, setPreviewOpen, setPreviewImage]);
  
  // Show loading state while fetching detailed item data
  if (isItemLoading) {
    return (
      <div className="gba:p-4 gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner />
      </div>
    );
  }
  
  // Show error state if there was an error fetching the detailed item
  if (itemError) {
    return (
      <div className="gba:p-4">
        <Alert>
          <AlertDescription>{itemError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use the detailed item if available, otherwise fall back to the selectedItem
  const displayItem = detailedItem || selectedItem;
  if (!displayItem) return null;

  return (
    <div className="gba:space-y-6">
      {/* Header: Title, Code, Status Badge */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-1">
            {typeof displayItem.title === 'string' ? displayItem.title : ''}
          </h2>
          <p className="gba:text-sm gba:text-gray-600">
            {typeof displayItem.code === 'string' ? displayItem.code : ''}
          </p>
        </div>
        <Badge
          variant={getStatusBadgeVariant(displayItem.status)}
          data-testid="expense-item-status-badge"
        >
          {getExpenseItemStatusDisplay(displayItem.status).label}
        </Badge>
      </div>

      {/* Dates Section */}
                <Card>
            <CardContent className="gba:p-4 gba:space-y-3">
              {displayItem.expenseDate && (
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <span className="gba:text-sm gba:text-gray-700">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date', 'Expense Date')}: {' '}
                    {dayjs(displayItem.expenseDate).format(getDateFormat('date-long'))}
                  </span>
                </div>
              )}
              {displayItem.invoiceDate && (
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <span className="gba:text-sm gba:text-gray-700">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.invoice_date', 'Invoice Date')}: {' '}
                    {dayjs(displayItem.invoiceDate).format(getDateFormat('date-long'))}
                  </span>
                </div>
              )}
              {!displayItem.expenseDate && !displayItem.invoiceDate && (
                <div className="gba:text-center gba:py-4 gba:text-sm gba:text-gray-500">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_date_information_available', 'No date information available')}
                </div>
              )}
            </CardContent>
          </Card>

      {/* Description Section */}
      {typeof displayItem.description === 'string' && displayItem.description && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.description', 'Description')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-gray-700">{displayItem.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_item_details_title', 'Item Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-3 gba:text-sm">
            {displayItem.employee && displayItem.employee.fullName && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.requester', 'Requester')}:
                </span>
                <span className="gba:text-gray-900">{String(displayItem.employee.fullName)}</span>
              </div>
            )}
            {displayItem.expenseClass && displayItem.expenseClass.value && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_class', 'Expense Class')}:
                </span>
                <span className="gba:text-gray-900">{String(displayItem.expenseClass.value)}</span>
              </div>
            )}
            {displayItem.costCenter && displayItem.costCenter.name && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('expense.item.costCenter', 'Cost Center')}:
                </span>
                <span className="gba:text-gray-900">{String(displayItem.costCenter.name)}</span>
              </div>
            )}
            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('expense.item.amount', 'Amount')}:
              </span>
              <span className="gba:text-gray-900 gba:font-semibold">
                €{typeof displayItem.reimbursableAmount === 'number' ? displayItem.reimbursableAmount.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* File Viewer Section */}
      <div className="gba:mt-2">
        {renderAttachmentPreview()}
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="gba:max-w-[90vw] gba:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expense.item.pdfPreview', 'PDF Preview')}
            </DialogTitle>
          </DialogHeader>
          <div className="gba:mt-4">
            <iframe
              src={pdfPreviewUrl}
              className="gba:w-full gba:h-[calc(90vh-120px)] gba:border-0"
              title="PDF Preview"
              data-testid="pdf-preview-iframe"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseItemDetails;