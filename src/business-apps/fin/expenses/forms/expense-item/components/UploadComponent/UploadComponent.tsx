import React, { useRef, useState, useCallback } from "react";
import { Modal, Upload, Spin } from "antd";
// Using custom icons instead of Ant Design icons
import { useExpenseItem } from "../../context/ExpenseItemContext";
import { ICONS } from "../../constants/icons";
import { Button } from "@newwork/gravity-ui-catalog";
import { useTranslation } from "react-i18next";
import { showToast } from "../../utils/notificationUtils";

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
         showToast(
            t("lowcoder:create_expense_type_item.error_file_type_message", "File type not supported. Please upload PDF, JPG, JPEG, or PNG files only."),
            "error"
          );
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
              <Spin className="gba:uploadIcon" data-testid="upload-loading-icon" />
              <span>{t('lowcoder:create_expense_type_item.processing_receipt', 'Processing the receipt...')}</span>
            </>
          ) : (
            <>
              <img 
                src={ICONS.FOCUS} 
                alt={t('lowcoder:create_expense_type_item.focus_alt_text', 'Focus')} 
                className={`gba:uploadIcon`}
                width="36"
                height="36"
                data-testid="upload-icon-large"
              />
              <span className="gba:fontMedium" data-testid="attach-receipt-text-start">{t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}</span>
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
              <Spin className="gba:uploadIconSmall" data-testid="upload-loading-icon-small" />
              <span>{t('lowcoder:create_expense_type_item.processing', 'Processing...')}</span>
            </>
          ) : (
            <>
              <span className="gba:fontMedium" data-testid="attach-receipt-text-form">{t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}</span>
              <img 
                src={ICONS.FOCUS} 
                alt={t('lowcoder:create_expense_type_item.focus_alt_text', 'Focus')} 
                className={`gba:uploadIconSmall`}
                width="18"
                height="18"
                data-testid="upload-icon-small"
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
    <div className={getContainerClass()} data-testid="upload-container">
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
          data-testid="upload-input-empty"
        >
          {getButtonContent()}
        </Upload>
      ) : (
        <div className={`gba:filesFlexContainer`} data-testid="files-flex-container">
          <div className={`gba:fileListRow`} data-testid="file-list-row">
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
              data-testid="upload-input-with-files"
            />
          </div>

          <div className={`gba:attachButtonRow`} data-testid="attach-button-row">
            <Upload
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              multiple={true}
              accept={acceptedFileTypes}
              disabled={isProcessingFiles}
              data-testid="attach-more-upload"
            >
              <div className={`gba:attachMoreContainer`} data-testid="attach-more-container">
                {isProcessingFiles ? (
                  <>
                    <span data-testid="processing-text">{t('lowcoder:create_expense_item.change_expense_item_container.file_add_document_processing', 'Processing the receipt...')}</span>
                    <Spin className="gba:uploadIconSmall" data-testid="loading-icon" />
                  </>
                ) : (
                  <>
                    <span className="gba:fontMedium" data-testid="attach-receipt-text">{t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}</span>
                    <img 
                      src={ICONS.FOCUS} 
                      alt={t('lowcoder:create_expense_type_item.focus_alt_text', 'Focus')} 
                      className={`gba:uploadIconSmall`}
                      width="18"
                      height="18"
                      data-testid="attach-receipt-icon"
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
          title={t('lowcoder:create_expense_type_item.attach_additional_files', 'Attach Additional Files')}
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
          <div className={`gba:modalContent`} data-testid="modal-content">
            <p data-testid="modal-message">{
            fileList.length > 1 ? t("lowcoder:create_expense_type_item.upload_file_modal_message","Do you want to keep the current file as well?"): t("lowcoder:create_expense_type_item.upload_file_modal_message","Do you want to keep the current file as well?")}</p>
            <div className={`gba:modalButtons`} data-testid="modal-buttons">
              <Button 
                variant="secondary"
                onClick={() => handleModalConfirm(false)}
                data-testid="modal-no-button"
                className="gba:min-w-[120px]"
              >
                {t('lowcoder:create_expense_type_item.cancel_button_modal', 'No')}
              </Button>
              <Button 
                variant="primary"
                onClick={() => handleModalConfirm(true)}
                data-testid="modal-yes-button"
                className="gba:min-w-[120px]"
              >
                {t('lowcoder:create_expense_type_item.confirm_button_modal', 'Yes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UploadComponent;
