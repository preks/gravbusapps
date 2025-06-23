import React, { useRef, useState, useCallback } from "react";
import { Upload, message, Modal } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useExpenseItem } from "../../context/ExpenseItemContext";
import { Button } from "@newwork/gravity-ui-catalog";
import { useTranslation } from "react-i18next";
import { translate } from "../../utils/windowUtils";

interface UploadComponentProps {
  fileList: any[];
  setFileList: (files: any[]) => void;
}

const ALLOWED_FILE_TYPES = [".pdf", ".PDF", ".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];

export const UploadComponent: React.FC<UploadComponentProps> = ({ 
  fileList, 
  setFileList
}) => {
  const { 
    currentStep, 
    handleFileUpload, 
    isProcessingFiles
  } = useExpenseItem();
  
const { t } = useTranslation();
  const [isHandlingUpload, setIsHandlingUpload] = useState<boolean>(false);
  

  const lastUploadTimestampRef = useRef<number>(0);
  

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  

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
  

  const handleBeforeUpload = (file: File) => {
    if (!validateFileType(file)) {
      return Upload.LIST_IGNORE;
    }

    if (fileList.length > 0 && !isProcessingFiles && !isHandlingUpload) {
      setPendingFiles([file]);
      setTimeout(() => setIsModalVisible(true), 0);
      return Upload.LIST_IGNORE;
    }

    if (!isProcessingFiles && !isHandlingUpload) {
      const newFile = {
        uid: Date.now().toString(),
        name: file.name,
        status: 'done',
        originFileObj: file
      };
      const newFileList = [...fileList, newFile];
      setFileList(newFileList);
      processFiles([file]);
    }

    return false;
  };

  const processFiles = useCallback((files: File[]) => {
    if (isHandlingUpload || isProcessingFiles || files.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - lastUploadTimestampRef.current < 500) {
      return;
    }

    lastUploadTimestampRef.current = now;
    setIsHandlingUpload(true);

    setTimeout(() => {
      handleFileUpload(files).finally(() => {
        setIsHandlingUpload(false);
      });
    }, 0);
  }, [handleFileUpload, isHandlingUpload, isProcessingFiles]);

  const handleModalConfirm = useCallback((keepExisting: boolean) => {
    if (!pendingFiles.length) return;

    setIsModalVisible(false);

    if (keepExisting) {
      const existingFiles = fileList.map(f => f.originFileObj).filter(Boolean);
      const newFileListItems = pendingFiles.map(file => ({
        uid: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        name: file.name,
        status: 'done',
        originFileObj: file
      }));
      setFileList([...fileList, ...newFileListItems]);
      processFiles([...existingFiles, ...pendingFiles]);
    } else {
      const newFileListItems = pendingFiles.map(file => ({
        uid: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        name: file.name,
        status: 'done',
        originFileObj: file
      }));
      setFileList(newFileListItems);
      processFiles(pendingFiles);
    }

    setPendingFiles([]);
  }, [fileList, pendingFiles, processFiles, setFileList]);

  const handleChange = (info: any) => {
    const validFiles = info.fileList.filter((file: any) => {
      if (!file.response && file.status !== 'error') {
        return validateFileType(file.originFileObj);
      }
      return true;
    });

    if (!isModalVisible) {
      setFileList(validFiles);
    }
  };

  const handleRemove = (file: any) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid);
    setFileList(newFileList);
  };

  const getButtonContent = () => {
    if (fileList.length === 0 && currentStep === "start") {
      return (
        <div className={`gba:uploadButtonStart`}>
          {isProcessingFiles ? (
            <>
              <LoadingOutlined className="gba:uploadIcon" />
              <span>Processing the receipt...</span>
            </>
          ) : (
            <>
              <img 
                src="https://newwork-dev.newwork.com/_next/static/media/lowcoder-icons/remixicons/focus-mode.svg" 
                alt="Focus" 
                className={`gba:uploadIcon`}
                width="36"
                height="36"
              />
              <span>{t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}</span>
            </>
          )}
        </div>
      );
    }

    if (fileList.length === 0) {
      return (
        <div className={`gba:uploadButtonFormEmpty`}>
          {isProcessingFiles ? (
            <>
              <LoadingOutlined className="gba:uploadIconSmall" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}</span>
              <img 
                src="https://newwork-dev.newwork.com/_next/static/media/lowcoder-icons/remixicons/focus-mode.svg" 
                alt="Focus" 
                className={`gba:uploadIconSmall`}
                width="18"
                height="18"
              />
            </>
          )}
        </div>
      );
    }

    return null;
  };

  const getContainerClass = () => {
    if (fileList.length > 0) {
      return `gba:uploadContainerWithFiles`;
    }

    return currentStep === "start" 
      ? `gba:uploadContainerStart`
      : `gba:uploadContainerForm`;
  };

  const acceptedFileTypes = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG";

  return (
    <div className={getContainerClass()}>
      {fileList.length === 0 ? (
        <Upload
          listType="text"
          fileList={fileList}
          beforeUpload={handleBeforeUpload}
          onChange={handleChange}
          onRemove={handleRemove}
          multiple={true}
          accept={acceptedFileTypes}
          className={`gba:uploadComponent`}
          disabled={isProcessingFiles}
        >
          {getButtonContent()}
        </Upload>
      ) : (
        <div className={`gba:filesFlexContainer`}>
          <div className={`gba:fileListRow`}>
            <Upload
              listType="text"
              fileList={fileList}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              onRemove={handleRemove}
              multiple={true}
              accept={acceptedFileTypes}
              className={`gba:uploadComponent`}
              showUploadList={{
                showPreviewIcon: false,
                showDownloadIcon: false,
                showRemoveIcon: true,
              }}
            />
          </div>

          <div className={`gba:attachButtonRow`}>
            <Upload
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              multiple={true}
              accept={acceptedFileTypes}
              disabled={isProcessingFiles}
            >
              <div className={`gba:attachMoreContainer`}>
                {isProcessingFiles ? (
                  <>
                    <span>{t('create_expense_item.change_expense_item_container.file_add_document_processing', 'Processing the receipt...')}</span>
                    <LoadingOutlined className="gba:uploadIconSmall" />
                  </>
                ) : (
                  <>
                    <span>{t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}</span>
                    <img 
                      src="https://newwork-dev.newwork.com/_next/static/media/lowcoder-icons/remixicons/focus-mode.svg" 
                      alt="Focus" 
                      className={`gba:uploadIconSmall`}
                      width="18"
                      height="18"
                    />
                  </>
                )}
              </div>
            </Upload>
          </div>
        </div>
      )}

      {isModalVisible && (
        <Modal
          title="Attach Additional Files"
          open={true}
          onCancel={() => {
            setIsModalVisible(false);
            setPendingFiles([]);
          }}
          footer={null}
          maskClosable={false}
          centered
          data-testid="upload-confirmation-modal"
          style={{ zIndex: 1050 }}
          destroyOnClose={true}
          width={500}
        >
          <div className={`gba:modalContent`}>
            <p>Do you want to keep the current {fileList.length > 1 ? 'files' : 'file'} as well?</p>
            <div className={`gba:modalButtons`}>
              <Button 
                variant="secondary"
                onClick={() => handleModalConfirm(false)}
                data-testid="modal-no-button"
                className="gba:min-w-[120px]"
              >
                No
              </Button>
              <Button 
                variant="primary"
                onClick={() => handleModalConfirm(true)}
                data-testid="modal-yes-button"
                className="gba:min-w-[120px]"
              >
                Yes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UploadComponent;
