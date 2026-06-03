import React, { useState, useCallback, useEffect } from 'react'
import { Modal, Upload } from 'antd'
import { useExpenseItem } from '../../context/ExpenseItemContext'
import { Button } from '@newwork/gravity-ui-catalog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button as DSButton } from '@newwork/nw-design-system'
import { PaperclipIcon } from '@phosphor-icons/react'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { useExpenseItemTranslation } from '../../useExpenseItemTranslation'
import { ACCEPTED_FILE_TYPES, isAllowedFileType, createUploadFileItem } from './uploadUtils'
import { useReceiptPreview } from './useReceiptPreview'

interface UploadComponentProps {
  fileList: any[]
  setFileList: (files: any[]) => void
}

export const UploadComponent: React.FC<UploadComponentProps> = ({ fileList, setFileList }) => {
  const { currentStep, handleFileUpload, isProcessingFiles } = useExpenseItem()
  const receiptPreview = useReceiptPreview(fileList)
  const { t } = useExpenseItemTranslation()
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
    const valid = isAllowedFileType(file)
    if (!valid) {
      showToast(t('expense-item-error-file-type'), 'error')
    }
    return valid
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
      const newFile = createUploadFileItem(file, Date.now().toString())
      setFileList([...fileList, newFile])
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
        const existingFiles = fileList.map(f => f.originFileObj).filter(Boolean) as File[]
        const newFileListItems = pendingFiles.map(f => createUploadFileItem(f))
        setFileList([...fileList, ...newFileListItems])
        processFiles([...existingFiles, ...pendingFiles])
      } else {
        const newFileListItems = pendingFiles.map(f => createUploadFileItem(f))
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
              <span>{t('expense-item-processing-receipt')}</span>
            </>
          ) : (
            <>
              <img
                src={ICONS.FOCUS}
                alt={t('expense-item-focus-alt', 'Focus')}
                style={{ width: '36px', height: '36px' }}
                width="36"
                height="36"
                data-testid="upload-icon-large"
              />
              <span className="gba:font-medium gba:text-foreground" data-testid="attach-receipt-text-start">
                {t('expense-item-attach-receipt', 'Attach Receipt')}
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
              <span>{t('expense-item-processing')}</span>
            </>
          ) : (
            <>
              <span className="gba:font-medium gba:text-foreground" data-testid="attach-receipt-text-form">
                {t('expense-item-attach-receipt', 'Attach Receipt')}
              </span>
              <img
                src={ICONS.FOCUS}
                alt={t('expense-item-focus-alt', 'Focus')}
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
          accept={ACCEPTED_FILE_TYPES}
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
              accept={ACCEPTED_FILE_TYPES}
              style={{ width: '100%', height: '100%' }}
              showUploadList={{
                showPreviewIcon: false,
                showDownloadIcon: false,
                showRemoveIcon: true
              }}
              data-testid="upload-input-with-files"
            />
          </div>

          <div className="gba:flex gba:items-center gba:justify-end gba:gap-4 gba:mt-4" data-testid="attach-button-row">
            {currentStep !== 'start' && (
              <DSButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={receiptPreview.openReceiptPreview}
                data-testid="receipt-preview-button"
                className="gba:flex gba:items-center gba:gap-2 gba:font-medium gba:text-foreground"
              >
                <PaperclipIcon size={18} />
                {t('expense-item-receipt-preview')}
              </DSButton>
            )}
            <Upload
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              multiple={true}
              accept={ACCEPTED_FILE_TYPES}
              disabled={isProcessingFiles || isHandlingUpload}
              data-testid="attach-more-upload"
            >
              <div
                className="gba:flex gba:items-center gba:gap-4 gba:cursor-pointer"
                data-testid="attach-more-container"
              >
                {isProcessingFiles ? (
                  <>
                    <span data-testid="processing-text">{t('expense-item-processing-receipt')}</span>
                    <img
                      src={ICONS.SPINNER_ICON}
                      alt="Loading"
                      style={{ width: '18px', height: '18px' }}
                      data-testid="loading-icon"
                    />
                  </>
                ) : (
                  <>
                    <span className="gba:font-medium gba:text-foreground" data-testid="attach-receipt-text">
                      {t('expense-item-attach-receipt', 'Attach Receipt')}
                    </span>
                    <img
                      src={ICONS.FOCUS}
                      alt={t('expense-item-focus-alt', 'Focus')}
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
          title={t('expense-item-attach-additional-files')}
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
              {t('expense-item-upload-modal-message')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }} data-testid="modal-buttons">
              <Button
                variant="secondary"
                onClick={() => handleModalConfirm(false)}
                data-testid="modal-no-button"
                className="gba:min-w-[120px]"
              >
                {t('expense-item-modal-no')}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleModalConfirm(true)}
                data-testid="modal-yes-button"
                className="gba:min-w-[120px]"
              >
                {t('expense-item-modal-yes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Dialog open={receiptPreview.previewOpen} onOpenChange={open => !open && receiptPreview.closeImagePreview()}>
        <DialogContent className="gba:max-w-[90vw] gba:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('expense-item-image-preview')}</DialogTitle>
          </DialogHeader>
          <div className="gba:mt-4 gba:flex gba:justify-center">
            <img
              src={receiptPreview.previewImage}
              alt="Preview"
              className="gba:max-w-full gba:max-h-[calc(90vh-120px)] gba:object-contain"
              data-testid="receipt-image-preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptPreview.pdfPreviewOpen} onOpenChange={open => !open && receiptPreview.closePdfPreview()}>
        <DialogContent className="gba:max-w-[90vw] gba:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('expense-item-pdf-preview')}</DialogTitle>
          </DialogHeader>
          <div className="gba:mt-4">
            <iframe
              src={receiptPreview.pdfPreviewUrl}
              className="gba:w-full gba:h-[calc(90vh-120px)] gba:border-0"
              title="PDF Preview"
              data-testid="receipt-pdf-preview-iframe"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UploadComponent
