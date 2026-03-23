import React, { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Separator,
  Card,
  Spinner,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { ImageIcon, FilePdfIcon, FileDocIcon, FileXlsIcon, FileIcon } from '@phosphor-icons/react'
import { useFileClient } from '@/common/network/files/useFileClient'
import { ExpenseItem, useGetExpenseItem } from '../../../hooks/useGetExpenseItems'
import { getExpenseItemStatusDisplay } from '../../../utils'
import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { AppAction } from '@/components/app-action'
import { generateExpenseItemActions } from '../../../utils/expenseItemActions'
import { Badge } from '@newwork/nw-design-system'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  DetailsPanelContent,
  type DetailsPanelField
} from '../../../../../common/components/details-panel/DetailsPanelContent'

// Utility function to truncate file names
const truncateFileName = (fileName: string, maxLength: number = 15): string => {
  if (!fileName || fileName.length <= maxLength) {
    return fileName || ''
  }

  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex === -1) {
    // No extension, just truncate
    return fileName.substring(0, maxLength - 3) + '...'
  }

  const name = fileName.substring(0, lastDotIndex)
  const extension = fileName.substring(lastDotIndex)

  // If extension is too long, just show the extension
  if (extension.length >= maxLength - 3) {
    return '...' + extension
  }

  // If name is very short, just truncate the whole thing
  if (name.length <= 3) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  const maxNameLength = maxLength - extension.length - 3
  return name.substring(0, maxNameLength) + '...' + extension
}

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export interface ExpenseItemDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpenseItem | null
  onClose: () => void
}

export const ExpenseItemDetails: React.FC<ExpenseItemDetailsProps> = ({ selectedItem, onClose, ...contextProps }) => {
  // Use the hook to get detailed expense item data
  const { item: detailedItem, isLoading: isItemLoading, error: itemError, fetchItem } = useGetExpenseItem(contextProps)

  const [fileLoading, setFileLoading] = useState<boolean>(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewOpen, setPreviewOpen] = useState<boolean>(false)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState<boolean>(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('')

  // Ref to track if component is mounted
  const isMounted = useRef<boolean>(true)

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Fetch detailed expense item data when selectedItem changes
  // We use a ref to track if we've already fetched this item to prevent recursive calls
  const fetchedItemIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedItem?.id && fetchedItemIdRef.current !== selectedItem.id) {
      fetchedItemIdRef.current = selectedItem.id
      fetchItem(selectedItem.id)
    }
  }, [selectedItem?.id, fetchItem])

  // Reset the fetched item id ref when the component unmounts or when selectedItem is null
  useEffect(() => {
    if (!selectedItem) {
      fetchedItemIdRef.current = null
    }
  }, [selectedItem])

  // Use FileClient hook for proper authorization
  const fileClient = useFileClient(contextProps)

  /**
   * Extracts file ID from URL or returns the provided ID
   */
  const extractFileId = (fileInfo: any): string => {
    let fileId = fileInfo.id
    if (fileInfo.fileUrl) {
      const urlParts = fileInfo.fileUrl.split('/')
      const potentialFileId = urlParts[urlParts.length - 1]
      if (potentialFileId && potentialFileId !== 'files') {
        fileId = potentialFileId
      }
    }
    return fileId
  }

  /**
   * Attempts to fetch file with fallback paths
   */
  const fetchFileWithFallback = async (fileId: string, employeeId: string, itemId: string): Promise<Blob | null> => {
    const pathParams = {
      accessScope: 'tenant',
      fileId: fileId
    }

    // Try primary path
    try {
      return await fileClient.getFile(pathParams, {
        appName: 'expenses',
        folderPath: `/expenseItemsDocuments/${employeeId}`
      })
    } catch (firstError) {
      console.log('First attempt failed, trying alternative path:', firstError)
    }

    // Try alternative path
    try {
      return await fileClient.getFile(pathParams, {
        appName: 'expenses',
        folderPath: `employees/${employeeId}/expense-items/${itemId}`
      })
    } catch (secondError) {
      console.log('Second attempt also failed:', secondError)
      return null
    }
  }

  /**
   * Processes a single file attachment
   */
  const processFileAttachment = async (
    fileInfo: any,
    employeeId: string,
    itemId: string
  ): Promise<UploadFile | null> => {
    try {
      const fileId = extractFileId(fileInfo)
      const fileBlob = await fetchFileWithFallback(fileId, employeeId, itemId)

      if (!fileBlob || !isMounted.current) {
        return null
      }

      // Create object URL for the blob
      const downloadUrl = URL.createObjectURL(fileBlob)

      // Create UploadFile object
      return {
        uid: fileId,
        name: fileInfo.fileName || fileId,
        status: 'done',
        url: downloadUrl,
        size: fileBlob.size,
        type: fileBlob.type || 'application/octet-stream'
      }
    } catch (fileError) {
      console.error(`Error processing file ${fileInfo.id}:`, fileError)
      return null
    }
  }

  // Fetch file attachments for an expense item
  const fetchFileAttachments = useCallback(
    async (item: ExpenseItem) => {
      // Early returns for invalid state
      if (!item?.expenseItemFile || item.expenseItemFile.length === 0) {
        console.log('No expense item files found')
        setFileList([])
        return
      }

      const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
      if (!employeeId) {
        console.error('No employee ID available for file path')
        return
      }

      if (!contextProps.accessToken) {
        console.error('No access token available for file request')
        return
      }

      setFileLoading(true)

      try {
        // Process all files in parallel
        const filePromises = item.expenseItemFile.map(fileInfo => processFileAttachment(fileInfo, employeeId, item.id))

        const results = await Promise.all(filePromises)

        // Filter out null results (failed files)
        const processedFiles = results.filter((file): file is UploadFile => file !== null)

        if (isMounted.current) {
          setFileList(processedFiles)
        }
      } catch (error) {
        console.error('Error fetching file attachments:', error)
        if (isMounted.current) {
          setFileList([])
        }
      } finally {
        if (isMounted.current) {
          setFileLoading(false)
        }
      }
    },
    [fileClient, contextProps.userInfo?.employeeDetails?.employeeId, contextProps.accessToken]
  )

  // Fetch file attachments when detailed item changes
  useEffect(() => {
    if (detailedItem) {
      fetchFileAttachments(detailedItem)
    }
  }, [detailedItem, fetchFileAttachments])

  // Render attachment preview
  const renderAttachmentPreview = useCallback(() => {
    if (fileLoading) {
      return (
        <Card
          className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8"
          data-testid="expense-file-loading"
        >
          <div className="gba:flex gba:flex-col gba:items-center gba:space-y-2">
            <Spinner />
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense.item.loadingReceipt', 'Loading receipt...')}
            </p>
          </div>
        </Card>
      )
    }

    if (fileList.length > 0) {
      return (
        <div
          className="gba:grid gba:grid-cols-2 gba:gap-4 gba:sm:gba:grid-cols-3 gba:md:gba:grid-cols-4 gba:lg:gba:grid-cols-5"
          data-testid="expense-files-grid"
        >
          {fileList.map((file, idx) => {
            const fileName = file.name || `File_${idx + 1}`
            const fileUrl = file.url || ''
            const fileType = file.type || ''
            const ext = fileName.split('.').pop()?.toLowerCase() || ''

            // Helper: Render icon by file type
            const renderFileIcon = () => {
              if (fileType.includes('pdf') || ext === 'pdf')
                return <FilePdfIcon size={32} className="gba:text-red-500" />
              if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
                return <ImageIcon size={32} className="gba:text-blue-500" />
              if (fileType.includes('word') || ['doc', 'docx'].includes(ext))
                return <FileDocIcon size={32} className="gba:text-blue-700" />
              if (fileType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext))
                return <FileXlsIcon size={32} className="gba:text-green-700" />
              return <FileIcon size={32} className="gba:text-gray-500" />
            }

            // Helper: Render preview by file type
            const renderPreview = () => {
              if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
                return (
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="gba:rounded-md gba:shadow gba:w-[90px] gba:h-[90px] gba:object-cover gba:cursor-pointer hover:gba:opacity-80"
                    data-testid={`expense-file-image-${idx}`}
                    onClick={() => {
                      setPreviewImage(fileUrl)
                      setPreviewOpen(true)
                    }}
                  />
                )
              }
              if (fileType.includes('pdf') || ext === 'pdf') {
                return (
                  <div
                    className="gba:w-[90px] gba:h-[90px] gba:flex gba:justify-center gba:items-center gba:bg-gray-100 gba:rounded-md gba:shadow gba:cursor-pointer hover:gba:bg-gray-200"
                    onClick={() => {
                      setPdfPreviewUrl(fileUrl)
                      setPdfPreviewOpen(true)
                    }}
                    data-testid={`expense-file-pdf-thumb-${idx}`}
                  >
                    <FilePdfIcon size={48} className="gba:text-red-500" />
                  </div>
                )
              }
              // For other types: icon + download
              return (
                <div className="gba:flex gba:flex-col gba:items-center" data-testid={`expense-file-generic-${idx}`}>
                  {renderFileIcon()}
                  <a
                    href={fileUrl}
                    download={fileName}
                    className="gba:mt-2 gba:text-xs gba:text-blue-600 hover:gba:underline gba:cursor-pointer"
                    data-testid={`expense-file-download-${idx}`}
                    onClick={e => {
                      e.preventDefault()
                      window.open(fileUrl, '_blank')
                    }}
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.open', 'Open')}
                  </a>
                </div>
              )
            }

            return (
              <div
                key={file.uid}
                className="gba:flex gba:flex-col gba:items-center gba:p-2 gba:bg-background gba:rounded-lg gba:shadow-md gba:w-[104px] gba:min-h-[130px] gba:max-h-[150px]"
                data-testid={`expense-file-card-${idx}`}
              >
                {renderPreview()}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="gba:mt-2 gba:text-xs gba:text-center gba:w-full gba:px-1 gba:break-words gba:cursor-help"
                        data-testid={`expense-file-name-${idx}`}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                          lineHeight: '1.2',
                          wordBreak: 'break-all'
                        }}
                      >
                        {truncateFileName(fileName, 18)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="gba:max-w-xs">
                        <div className="gba:font-medium gba:break-words">{fileName}</div>
                        <div className="gba:text-xs gba:text-gray-500">
                          {file.size ? formatFileSize(file.size) : 'Unknown size'}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <Card
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8"
        data-testid="expense-file-empty"
      >
        <div className="gba:flex gba:flex-col gba:items-center gba:space-y-2">
          <ImageIcon size={48} style={{ color: 'border' }} />
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_receipt_attached', 'No receipt attached')}
          </p>
        </div>
      </Card>
    )
  }, [fileLoading, fileList, previewOpen, previewImage, setPreviewOpen, setPreviewImage])

  // Show loading state while fetching detailed item data
  if (isItemLoading) {
    return (
      <div className="gba:p-4 gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner />
      </div>
    )
  }

  // Show error state if there was an error fetching the detailed item
  if (itemError) {
    return (
      <div className="gba:p-4">
        <Alert>
          <AlertDescription>{itemError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Use the detailed item if available, otherwise fall back to the selectedItem
  const displayItem = detailedItem || selectedItem
  if (!displayItem) return null

  const statusConfig = getExpenseItemStatusDisplay(displayItem.status)
  const statusBadge = (
    <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-item-status-badge">
      {statusConfig.label}
    </Badge>
  )

  const fields: DetailsPanelField[] = [
    {
      label: getTranslationFromI18nKeyAndLabel('common.code', 'Code'),
      value: typeof displayItem.code === 'string' ? displayItem.code : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      value: statusBadge
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date', 'Expense Date'),
      value: displayItem.expenseDate ? formatDate(displayItem.expenseDate, 'date.long') : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.invoice_date', 'Invoice Date'),
      value: displayItem.invoiceDate ? formatDate(displayItem.invoiceDate, 'date.long') : 'N/A'
    },
    ...(typeof displayItem.description === 'string' && displayItem.description
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_item.change_expense_item_container.current_description_label',
              'Description'
            ),
            value: displayItem.description
          }
        ]
      : []),
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.change_expense_item_container.current_e_class_label',
        'Expense Class'
      ),
      value: displayItem.expenseClass?.value ? getCatalogValue(displayItem.expenseClass) : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
        'Cost Center'
      ),
      value: displayItem.costCenter?.name ? String(displayItem.costCenter.name) : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:travel_region_rule.travel_region_rule_details_list.amount',
        'Amount'
      ),
      value: formatCurrencyDisplay(displayItem.reimbursableAmount, displayItem.currency?.code)
    }
  ]

  const availableActions = generateExpenseItemActions(
    displayItem,
    {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
      accessToken: contextProps.accessToken || '',
      onClose: onClose
    },
    { includeDetails: false, includeAssignToRequest: true }
  )

  return (
    <div className="gba:space-y-6">
      {availableActions.length > 0 ? (
        <div className="gba:flex gba:justify-end">
          <AppAction
            variant="table-row"
            customActions={availableActions}
            prefixDataTestId="expense-item-details-action"
            accessToken={contextProps.accessToken}
            emptyState="disable"
            lazyLoad
            data-testid="expense-item-details-action-button"
          >
            <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </AppAction>
        </div>
      ) : null}

      <DetailsPanelContent
        dataTestIdPrefix="expense-item-details"
        title={typeof displayItem.title === 'string' ? displayItem.title : 'Expense Item Details'}
        subtitle={typeof displayItem.code === 'string' ? displayItem.code : undefined}
        fields={fields}
        showHeader={false}
        extraContent={
          <>
            <Separator />
            <div className="gba:mt-2">{renderAttachmentPreview()}</div>
          </>
        }
      />

      {/* Image Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="gba:max-w-[90vw] gba:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense.item.imagePreview', 'Image Preview')}
            </DialogTitle>
          </DialogHeader>
          <div className="gba:mt-4 gba:flex gba:justify-center">
            <img
              src={previewImage}
              alt="Preview"
              className="gba:max-w-full gba:max-h-[calc(90vh-120px)] gba:object-contain"
              data-testid="image-preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="gba:max-w-[90vw] gba:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense.item.pdfPreview', 'PDF Preview')}
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
  )
}

export default ExpenseItemDetails
