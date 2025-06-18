import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Typography, Spin, Descriptions, Divider, Card, Image, Upload, Alert } from 'antd';
import { FileImageOutlined, LoadingOutlined } from '@ant-design/icons';
import { FileClient } from '@/common/network/files/FileClient';
import Pill from '@/components/pill/Pill';
import { ExpenseItem, useGetExpenseItem } from '../../../hooks/useGetExpenseItems';
import { getExpenseItemStatusDisplay } from '../../../utils';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text } = Typography;

export interface ExpenseItemDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpenseItem | null;
  onClose: () => void;
}

// Custom styles for centering the upload component
const uploadCenterStyle = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '1.5rem',
  width: '100%'
};

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
  
  const handlePreview = useCallback((file: UploadFile) => {
    setPreviewImage(file.url ?? '');
    setPreviewOpen(true);
  }, []);
  
  // We're not using any DOM manipulation anymore, just proper CSS
  
  // Render attachment preview section
  const renderAttachmentPreview = useCallback(() => {
    console.log('renderAttachmentPreview called - fileLoading:', fileLoading, 'fileList.length:', fileList.length);
    
    if (fileLoading) {
      console.log('Rendering loading spinner for attachments');
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} size="large" />
        </div>
      );
    }
    
    if (fileList.length > 0) {
      // Calculate a fixed width based on the number of files
      // Each card is 104px wide, plus potential margin of 8px between them
      const cardWidth = 104;
      const cardMargin = 8;
      
      // Calculate the total width needed for all cards in a single row
      // This helps ensure proper centering for any number of files
      const calculateWidth = () => {
        if (fileList.length === 0) return 0;
        if (fileList.length === 1) return cardWidth;
        return fileList.length * cardWidth + (fileList.length - 1) * cardMargin;
      };
      
      return (
        <>
          {/* Fixed-width container that's centered with flex */}
          <div style={{
            ...uploadCenterStyle,
            alignItems: 'center'
          }}>
            {/* This div has an exact width based on the number of items */}
            <div style={{ 
              width: `${calculateWidth()}px`,
              // The key is setting this inner container to have an exact width
              // that fits the number of cards we have - then flex-center works properly
            }}>
              <Upload
                listType="picture-card"
                fileList={fileList}
                onPreview={handlePreview}
                onChange={() => {}}
                showUploadList={{ showRemoveIcon: false }}
              />
            </div>
          </div>
          <Image
            wrapperStyle={{ display: 'none' }}
            preview={{
              visible: previewOpen,
              onVisibleChange: (visible) => setPreviewOpen(visible),
              afterOpenChange: (visible) => !visible && setPreviewImage(''),
            }}
            src={previewImage}
          />
        </>
      );
    }
    
    return (
      <Card className="gba:text-center gba:py-8">
        <FileImageOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
        <div className="gba:mt-2">
          <Text type="secondary">No receipt attached</Text>
        </div>
      </Card>
    );
  }, [fileLoading, fileList.length, handlePreview, previewOpen, previewImage]);
  
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
    <div className="gba:p-4">
      <div className="gba:mb-0">
        {renderAttachmentPreview()}
      </div>
      
      {/* Expense Details Section */}
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Code">{displayItem.code}</Descriptions.Item>
        <Descriptions.Item label="Title">{displayItem.title}</Descriptions.Item>
        <Descriptions.Item label="Description">{displayItem.description ?? 'No description'}</Descriptions.Item>
        <Descriptions.Item label="Date">{displayItem.invoiceDate}</Descriptions.Item>
        <Descriptions.Item label="Amount">
          <span style={{ fontWeight: 'bold' }}>€{displayItem.reimbursableAmount?.toFixed(2) ?? '0.00'}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Pill
            label={getExpenseItemStatusDisplay(displayItem.status).label}
            type={getExpenseItemStatusDisplay(displayItem.status).type}
            className="gba:text-center"
          />
        </Descriptions.Item>
        {displayItem.expenseClass && (
          <Descriptions.Item label="Expense Class">
            {displayItem.expenseClass.value}
          </Descriptions.Item>
        )}
        {displayItem.costCenter && (
          <Descriptions.Item label="Cost Center">
            {displayItem.costCenter.name}
          </Descriptions.Item>
        )}
      </Descriptions>
      <Divider />
    </div>
  );
};

export default ExpenseItemDetails;