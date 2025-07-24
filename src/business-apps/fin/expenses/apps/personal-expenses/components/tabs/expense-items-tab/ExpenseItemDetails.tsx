import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Typography, Spin, Descriptions, Divider, Card, Image, Alert, Modal } from 'antd';
import { FileImageOutlined, LoadingOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileOutlined } from '@ant-design/icons';
import { FileClient } from '@/common/network/files/FileClient';
import Pill from '@/components/pill/Pill';
import { ExpenseItem, useGetExpenseItem } from '../../../hooks/useGetExpenseItems';
import { getExpenseItemStatusDisplay } from '../../../utils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text } = Typography;

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
      const filesPromises = item.expenseItemFile.map(async (file: any, index: number) => {
        const fileId = file.fileUrl?.split('/').pop();
        
        if (!fileId) {
          return null;
        }
        
        try {
          // Fetch the file blob using the FileClient with proper authorization
          const blob = await fileClient.getFile(
            { 
              accessScope: 'tenant', 
              fileId 
            },
            { 
              appName: 'expenses',
              folderPath: `/expenseItemsDocuments/${employeeId}`
            }
          );
          
          // Create an object URL from the blob
          const objectUrl = URL.createObjectURL(blob);
          
          // Create an UploadFile object for the antd Upload component
          const uploadFile = {
            uid: `-${index}`,
            name: file.fileName ?? `Receipt-${index + 1}`,
            status: 'done',
            url: objectUrl,
            originFileObj: new File([blob], file.fileName ?? `Receipt-${index + 1}`, {
              type: blob.type
            })
          } as UploadFile;
          
          return uploadFile;
        } catch (err) {
          console.error(`Error fetching file ${fileId}:`, err);
          // Fall back to using the direct URL if blob fetching fails
          return {
            uid: `-${index}`,
            name: file.fileName ?? `Receipt-${index + 1}`,
            status: 'done',
            url: file.fileUrl
          } as UploadFile;
        }
      });
      
      const files = await Promise.all(filesPromises);
      const validFiles = files.filter(Boolean) as UploadFile[];
      
      if (isMounted.current) {
        setFileList(validFiles);
      }
    } catch (error) {
      console.error('Error processing file attachments:', error);
      if (isMounted.current) {
        setFileList([]);
      }
    } finally {
      // Ensure fileLoading is set to false with a small delay to allow React to process state updates
      setTimeout(() => {
        if (isMounted.current) {
          setFileLoading(false);
          console.log('File loading state set to false (with timeout)');
        }
      }, 100);
    }
  }, [contextProps.userInfo?.employeeDetails?.employeeId]);
  
  // Load file attachments when detailedItem changes
  useEffect(() => {
    if (detailedItem) {
      fetchFileAttachments(detailedItem);
    } else {
      setFileList([]);
    }
  }, [detailedItem, fetchFileAttachments]);
  
  
  
  // We're not using any DOM manipulation anymore, just proper CSS
  
  // Render attachment preview section
  const renderAttachmentPreview = useCallback(() => {
    if (fileLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8" data-testid="expense-file-loading">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} size="large" />
        </div>
      );
    }

    if (fileList.length > 0) {
      return (
        <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:py-4" data-testid="expense-file-list">
          {fileList.map((file, idx) => {
            const fileType = file.originFileObj?.type || '';
            const fileName = file.name || '';
            const fileUrl = file.url || '';
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
                  <Image
                    src={fileUrl}
                    alt={fileName}
                    className="gba:rounded-md gba:shadow"
                    width={90}
                    height={90}
                    data-testid={`expense-file-image-${idx}`}
                    preview={{
                      visible: previewOpen && previewImage === fileUrl,
                      onVisibleChange: (visible) => {
                        setPreviewOpen(visible);
                        if (!visible) setPreviewImage('');
                      },
                    }}
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
                    {getTranslationFromI18nKeyAndLabel('expense.item.download', 'Download')}
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
          <Text type="secondary">{getTranslationFromI18nKeyAndLabel('expense.item.noReceipt', 'No receipt attached')}</Text>
        </div>
      </Card>
    );
  }, [fileLoading, fileList, previewOpen, previewImage, setPreviewOpen, setPreviewImage]);
  
  // Show loading state while fetching detailed item data
  if (isItemLoading) {
    return (
      <div className="gba:p-4 gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} size="large" />
      </div>
    );
  }
  
  // Show error state if there was an error fetching the detailed item
  if (itemError) {
    return (
      <div className="gba:p-4">
        <Alert message="Error" description={itemError} type="error" showIcon />
      </div>
    );
  }

// Use the detailed item if available, otherwise fall back to the selectedItem
const displayItem = detailedItem || selectedItem;
if (!displayItem) return null;

return (
  <div className="gba:p-4 gba:relative gba:mb-6">
    {/* Header: Title, Code, Status Pill */}
    <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
      <div>
        <Typography.Title level={4} className="gba:mb-1">
          {typeof displayItem.title === 'string' ? displayItem.title : ''}
        </Typography.Title>
        <Typography.Text type="secondary">
          {typeof displayItem.code === 'string' ? displayItem.code : ''}
        </Typography.Text>
      </div>
      <Pill
        type={getExpenseItemStatusDisplay(displayItem.status).type}
        label={getExpenseItemStatusDisplay(displayItem.status).label}
        className="gba:text-base"
        data-testid="expense-item-status-pill"
      />
    </div>

    {/* Dates Section */}
    {displayItem.invoiceDate && (
      <div className="gba:flex gba:items-center gba:mb-2">
        <span className="gba:mr-2"><FileImageOutlined /></span>
        <Typography.Text className="gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('expense.item.invoiceDate', 'Invoice Date')}: {typeof displayItem.invoiceDate === 'string' ? displayItem.invoiceDate : ''}
        </Typography.Text>
      </div>
    )}
    {'creationDate' in displayItem && displayItem.creationDate && (
      <div className="gba:flex gba:items-center gba:mb-2">
        <span className="gba:mr-2"><FileImageOutlined /></span>
        <Typography.Text className="gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('expense.item.creationDate', 'Creation Date')}: {typeof displayItem.creationDate === 'string' ? displayItem.creationDate : ''}
        </Typography.Text>
      </div>
    )}
    {/* Add more date rows as needed, matching plan details style */}

    {/* Description Section */}
    {typeof displayItem.description === 'string' && displayItem.description && (
      <Typography.Text className="gba:block gba:mb-4">
        {displayItem.description}
      </Typography.Text>
    )}

    {/* Details Section */}
    <Descriptions size="small" column={1}>
      {displayItem.employee && displayItem.employee.fullName && (
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.item.requester', 'Requester')}>
          {String(displayItem.employee.fullName)}
        </Descriptions.Item>
      )}
      {displayItem.expenseClass && displayItem.expenseClass.value && (
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.item.class', 'Expense Class')}>
          {String(displayItem.expenseClass.value)}
        </Descriptions.Item>
      )}
      {displayItem.costCenter && displayItem.costCenter.name && (
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.item.costCenter', 'Cost Center')}>
          {String(displayItem.costCenter.name)}
        </Descriptions.Item>
      )}
      <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.item.amount', 'Amount')}>
        <span style={{ fontWeight: 'bold' }}>
          €{typeof displayItem.reimbursableAmount === 'number' ? displayItem.reimbursableAmount.toFixed(2) : '0.00'}
        </span>
      </Descriptions.Item>
    </Descriptions>

    <Divider />

    {/* File Viewer Section */}
    <div className="gba:mt-2">
      {renderAttachmentPreview()}
    </div>

    <Modal
      open={pdfPreviewOpen}
      title={getTranslationFromI18nKeyAndLabel('expense.item.pdfPreview', 'PDF Preview')}
      footer={null}
      onCancel={() => setPdfPreviewOpen(false)}
      width="90vw"
      style={{ top: 20 }}
      destroyOnClose
      data-testid="pdf-preview-modal"
    >
      <iframe
        src={pdfPreviewUrl}
        style={{ width: '100%', height: 'calc(90vh - 55px)', border: 'none' }}
        title="PDF Preview"
        data-testid="pdf-preview-iframe"
      />
    </Modal>
  </div>
);

}

export default ExpenseItemDetails;