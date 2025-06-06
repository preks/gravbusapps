import React from "react";
import { Upload, message } from "antd";
import { CameraOutlined, FullscreenOutlined } from "@ant-design/icons";
import styles from "../../ExpenseItem.module.css";
import { useExpenseItem } from "../../ExpenseItemContext/ExpenseItemContext";

interface UploadComponentProps {
  fileList: any[];
  setFileList: (files: any[]) => void;
}

// Allowed file types
const ALLOWED_FILE_TYPES = [".pdf", ".PDF", ".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];

export const UploadComponent: React.FC<UploadComponentProps> = ({ 
  fileList, 
  setFileList
}) => {
  const { currentStep } = useExpenseItem();
  
  // Validate file type
  const validateFileType = (file: File) => {
    const isValidType = ALLOWED_FILE_TYPES.some(type => {
      const extension = `.${file.name.split('.').pop()}`;
      return type.toLowerCase() === extension.toLowerCase();
    });
    
    if (!isValidType) {
      message.error(`File type not supported. Please upload PDF, JPG, JPEG, or PNG files only.`);
    }
    
    return isValidType;
  };
  
  // Handle file upload for a single file
  const handleBeforeUpload = (file: File) => {
    if (!validateFileType(file)) {
      return Upload.LIST_IGNORE;
    }
    return false; // Prevent auto upload
  };
  
  // Handle file upload for multiple files
  const handleChange = (info: any) => {
    // Filter out any files that might have been rejected by validateFileType
    const validFiles = info.fileList.filter((file: any) => {
      // If the file has just been added and doesn't have a response, validate it
      if (!file.response && file.status !== 'error') {
        return validateFileType(file.originFileObj);
      }
      return true; // Keep existing files
    });
    
    setFileList(validFiles);
  };
  
  // Handle file removal
  const handleRemove = (file: any) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid);
    setFileList(newFileList);
  };
  
  const getButtonContent = () => {
    // Start screen with empty file list (Image 1)
    if (fileList.length === 0 && currentStep === "start") {
      return (
        <div className={`${styles.uploadButtonStart} gba:uploadButtonStart`}>
          <CameraOutlined className={styles.uploadIcon} />
          <span>Attach Receipt</span>
        </div>
      );
    }
    
    // Form screen with empty file list (Image 4)
    if (fileList.length === 0) {
      return (
        <div className={`${styles.uploadButtonFormEmpty} gba:uploadButtonFormEmpty`}>
          <span>Attach Receipt</span>
          <FullscreenOutlined className={styles.uploadIconSmall} />
        </div>
      );
    }
    
    // With files attached (Image 5) - this will be rendered below the file list
    return null;
  };

  const getContainerClass = () => {
    if (fileList.length > 0) {
      return `${styles.uploadContainerWithFiles} gba:uploadContainerWithFiles`;
    }
    
    return currentStep === "start" 
      ? `${styles.uploadContainerStart} gba:uploadContainerStart`
      : `${styles.uploadContainerForm} gba:uploadContainerForm`;
  };

  // Define accepted file types for the file dialog
  const acceptedFileTypes = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG";
  
  return (
    <div className={getContainerClass()}>
      {fileList.length === 0 ? (
        // When there are no attachments, make the whole component clickable
        <Upload
          listType="text"
          fileList={fileList}
          beforeUpload={handleBeforeUpload}
          onChange={handleChange}
          onRemove={handleRemove}
          multiple={true}
          accept={acceptedFileTypes}
          className={`${styles.uploadComponent} gba:uploadComponent`}
        >
          {getButtonContent()}
        </Upload>
      ) : (
        // When there are attachments, use a flex container with two rows
        <div className={`${styles.filesFlexContainer} gba:filesFlexContainer`}>
          {/* Row 1: File list display */}
          <div className={`${styles.fileListRow} gba:fileListRow`}>
            <Upload
              listType="text"
              fileList={fileList}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              onRemove={handleRemove}
              multiple={true}
              accept={acceptedFileTypes}
              className={`${styles.uploadComponent} gba:uploadComponent`}
              showUploadList={{
                showPreviewIcon: false,
                showDownloadIcon: false,
                showRemoveIcon: true,
              }}
            />
          </div>
          
          {/* Row 2: Attach Receipt button */}
          <div className={`${styles.attachButtonRow} gba:attachButtonRow`}>
            <Upload
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              multiple={true}
              accept={acceptedFileTypes}
            >
              <div className={`${styles.attachMoreContainer} gba:attachMoreContainer`}>
                <span>Attach Receipt</span>
                <FullscreenOutlined className={styles.uploadIconSmall} />
              </div>
            </Upload>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadComponent;
