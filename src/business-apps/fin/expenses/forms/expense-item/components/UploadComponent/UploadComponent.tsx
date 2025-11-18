import React, { useState, useCallback, useEffect } from 'react'
import { Modal, Upload } from 'antd'
import { useExpenseItem } from '../../context/ExpenseItemContext'
import { Button } from '@newwork/gravity-ui-catalog'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UploadComponentProps {
  fileList: any[]
  setFileList: (files: any[]) => void
}

const ALLOWED_FILE_TYPES = ['.pdf', '.PDF', '.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG']

export const UploadComponent: React.FC<UploadComponentProps> = ({ fileList, setFileList }) => {
  const { currentStep, handleFileUpload, isProcessingFiles } = useExpenseItem()

  const t = getTranslationFromI18nKeyAndLabel
  const [isHandlingUpload, setIsHandlingUpload] = useState<boolean>(false)
  const [showProcessing, setShowProcessing] = useState<boolean>(false)

  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false)

  // Smooth out quick state flips: set immediately on start, delay hide to avoid flicker
  useEffect(() => {
    const processingTarget = isProcessingFiles || isHandlingUpload
    let hideTimeoutId: number | undefined

    if (processingTarget) {
      setShowProcessing(true)
    } else {
      hideTimeoutId = window.setTimeout(() => {
        setShowProcessing(false)
      }, 300)
    }

    return () => {
      if (hideTimeoutId) window.clearTimeout(hideTimeoutId)
    }
  }, [isProcessingFiles, isHandlingUpload])

  const validateFileType = (file: File) => {
    const isValidType = ALLOWED_FILE_TYPES.some(type => {
      const extension = `.${file.name.split('.').pop()}`
      return type.toLowerCase() === extension.toLowerCase()
    })

    if (!isValidType) {
      showToast(
        t(
          'lowcoder:create_expense_type_item.error_file_type_message',
          'File type not supported. Please upload PDF, JPG, JPEG, or PNG files only.'
        ),
        'error'
      )
    }

    return isValidType
  }

  const handleBeforeUpload = (file: File) => {
    if (!validateFileType(file)) {
      return Upload.LIST_IGNORE
    }

    if (fileList.length > 0 && !isProcessingFiles && !isHandlingUpload) {
      setPendingFiles([file])
      setTimeout(() => setIsModalVisible(true), 0)
      return Upload.LIST_IGNORE
    }

    if (!isProcessingFiles && !isHandlingUpload) {
      const newFile = {
        uid: Date.now().toString(),
        name: file.name,
        status: 'done',
        originFileObj: file
      }
      const newFileList = [...fileList, newFile]
      setFileList(newFileList)
      processFiles([file])
    }

    return false
  }

  const processFiles = useCallback(
    (files: File[]) => {
      if (isHandlingUpload || isProcessingFiles || files.length === 0) {
        return
      }
      setIsHandlingUpload(true)

      handleFileUpload(files).finally(() => {
        setIsHandlingUpload(false)
      })
    },
    [handleFileUpload, isHandlingUpload, isProcessingFiles]
  )

  const handleModalConfirm = useCallback(
    (keepExisting: boolean) => {
      if (!pendingFiles.length) return

      setIsModalVisible(false)

      if (keepExisting) {
        const existingFiles = fileList.map(f => f.originFileObj).filter(Boolean)
        const newFileListItems = pendingFiles.map(file => ({
          uid: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: file.name,
          status: 'done',
          originFileObj: file
        }))
        setFileList([...fileList, ...newFileListItems])
        processFiles([...existingFiles, ...pendingFiles])
      } else {
        const newFileListItems = pendingFiles.map(file => ({
          uid: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: file.name,
          status: 'done',
          originFileObj: file
        }))
        setFileList(newFileListItems)
        processFiles(pendingFiles)
      }

      setPendingFiles([])
    },
    [fileList, pendingFiles, processFiles, setFileList]
  )

  const handleChange = (info: any) => {
    const validFiles = info.fileList.filter((file: any) => {
      if (!file.response && file.status !== 'error') {
        return validateFileType(file.originFileObj)
      }
      return true
    })

    if (!isModalVisible) {
      setFileList(validFiles)
    }
  }

  const handleRemove = (file: any) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid)
    setFileList(newFileList)
  }

  const getButtonContent = () => {
    if (fileList.length === 0 && currentStep === 'start') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            cursor: 'pointer',
            padding: '20px',
            width: '100%',
            height: '100%'
          }}
        >
          {showProcessing ? (
            <>
              <img
                src={ICONS.SPINNER_ICON}
                alt="Loading"
                style={{ width: '36px', height: '36px' }}
                width="36"
                height="36"
                data-testid="upload-loading-icon"
              />
              <span>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_type_item.processing_receipt',
                  'Processing the receipt...'
                )}
              </span>
            </>
          ) : (
            <>
              <img
                src={ICONS.FOCUS}
                alt={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.focus_alt_text', 'Focus')}
                style={{ width: '36px', height: '36px' }}
                width="36"
                height="36"
                data-testid="upload-icon-large"
              />
              <span className="gba:font-medium gba:text-black" data-testid="attach-receipt-text-start">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_type_item.attach_receipt',
                  'Attach Receipt'
                )}
              </span>
            </>
          )}
        </div>
      )
    }

    if (fileList.length === 0) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '20px 20px',
            width: '100%',
            height: '100%',
            gap: '16px'
          }}
        >
          {showProcessing ? (
            <>
              <img
                src={ICONS.SPINNER_ICON}
                alt="Loading"
                style={{ width: '18px', height: '18px' }}
                data-testid="upload-loading-icon-small"
              />
              <span>{t('lowcoder:create_expense_type_item.processing', 'Processing...')}</span>
            </>
          ) : (
            <>
              <span className="gba:font-medium gba:text-black" data-testid="attach-receipt-text-form">
                {t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}
              </span>
              <img
                src={ICONS.FOCUS}
                alt={t('lowcoder:create_expense_type_item.focus_alt_text', 'Focus')}
                style={{ width: '18px', height: '18px' }}
                data-testid="upload-icon-small"
              />
            </>
          )}
        </div>
      )
    }

    return null
  }

  const getContainerStyles = (): React.CSSProperties => {
    if (fileList.length > 0) {
      return {
        border: '2px solid border',
        borderRadius: '4px',
        padding: '20px 20px',
        position: 'relative' as const,
        backgroundColor: '#fff',
        minHeight: '80px'
      }
    }

    if (currentStep === 'start') {
      return {
        border: '2px solid border',
        borderRadius: '4px',
        padding: '0',
        height: '204px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff'
      }
    }

    return {
      border: '2px solid border',
      borderRadius: '4px',
      padding: '0',
      backgroundColor: '#fff'
    }
  }

  const acceptedFileTypes = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'

  return (
    <div style={getContainerStyles()} data-testid="upload-container">
      {fileList.length === 0 ? (
        <Upload
          listType="text"
          fileList={fileList}
          beforeUpload={handleBeforeUpload}
          onChange={handleChange}
          onRemove={handleRemove}
          multiple={true}
          accept={acceptedFileTypes}
          style={{ width: '100%', height: '100%' }}
          disabled={isProcessingFiles || isHandlingUpload}
          data-testid="upload-input-empty"
        >
          {getButtonContent()}
        </Upload>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }} data-testid="files-flex-container">
          <div
            style={{ width: '100%' }}
            data-testid="file-list-row"
            className="gba:[&_.ant-upload-list-item-name]:flex"
          >
            <Upload
              listType="text"
              fileList={fileList}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              onRemove={handleRemove}
              multiple={true}
              accept={acceptedFileTypes}
              style={{ width: '100%', height: '100%' }}
              showUploadList={{
                showPreviewIcon: false,
                showDownloadIcon: false,
                showRemoveIcon: true
              }}
              data-testid="upload-input-with-files"
            />
          </div>

          <div
            style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}
            data-testid="attach-button-row"
          >
            <Upload
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              multiple={true}
              accept={acceptedFileTypes}
              disabled={isProcessingFiles || isHandlingUpload}
              data-testid="attach-more-upload"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  gap: '16px'
                }}
                data-testid="attach-more-container"
              >
                {isProcessingFiles ? (
                  <>
                    <span data-testid="processing-text">
                      {t(
                        'lowcoder:create_expense_item.change_expense_item_container.file_add_document_processing',
                        'Processing the receipt...'
                      )}
                    </span>
                    <img
                      src={ICONS.SPINNER_ICON}
                      alt="Loading"
                      style={{ width: '18px', height: '18px' }}
                      data-testid="loading-icon"
                    />
                  </>
                ) : (
                  <>
                    <span className="gba:font-medium gba:text-black" data-testid="attach-receipt-text">
                      {t('lowcoder:create_expense_type_item.attach_receipt', 'Attach Receipt')}
                    </span>
                    <img
                      src={ICONS.FOCUS}
                      alt={t('lowcoder:create_expense_type_item.focus_alt_text', 'Focus')}
                      style={{ width: '18px', height: '18px' }}
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
            setIsModalVisible(false)
            setPendingFiles([])
          }}
          footer={null}
          maskClosable={false}
          centered
          data-testid="upload-confirmation-modal"
          style={{ zIndex: 1050 }}
          destroyOnClose={true}
          width={500}
        >
          <div style={{ padding: '16px 0', fontFamily: 'Roboto, sans-serif' }} data-testid="modal-content">
            <p
              style={{ marginBottom: '24px', fontSize: '16px', color: 'foreground', textAlign: 'center' }}
              data-testid="modal-message"
            >
              {t(
                'lowcoder:create_expense_type_item.upload_file_modal_message',
                'Do you want to keep the current file as well?'
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }} data-testid="modal-buttons">
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
  )
}

export default UploadComponent
