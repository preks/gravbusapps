import React, { useState, useEffect, useRef } from 'react'
import { FileTextIcon, UploadIcon, XIcon } from '@phosphor-icons/react'
import {
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
  Alert,
  AlertDescription,
  Button,
  Badge,
  AiBadge
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { useInvestmentFileUpload } from './hooks/useInvestmentFileUpload'
import { AppActionForm } from '@/components/app-action-form'
import type { InvestmentReportUploadFormProps, UploadFile } from './types'

const DEFAULT_ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png']
const DEFAULT_MAXIcon_FILES = 1

export const InvestmentReportUploadForm: React.FC<BusinessAppContextProps & InvestmentReportUploadFormProps> = ({
  // Form behavior props
  onSuccess,
  onCancel,

  // Investment context props
  investmentId,
  showInvestmentSelector = true,

  // UI customization props
  title,
  description,
  maxFiles = DEFAULT_MAXIcon_FILES,
  allowedFileTypes = DEFAULT_ALLOWED_FILE_TYPES,

  // Business app context props
  accessToken,
  userInfo,
  additionalData
}) => {
  // Extract investmentId from flow context data if not provided directly
  const effectiveInvestmentId =
    investmentId ||
    additionalData?.investmentId ||
    additionalData?.externalContextData?.investmentId ||
    additionalData?.context?.investmentId

  // Determine if investment selector should be shown
  const isInvestmentFromExternalContext = !!(
    additionalData?.externalContextData?.investmentId ||
    additionalData?.context?.investmentId ||
    additionalData?.investmentId
  )

  const effectiveShowInvestmentSelector = isInvestmentFromExternalContext ? false : showInvestmentSelector

  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [loadingInvestments, setLoadingInvestments] = useState(false)
  const [investmentsError, setInvestmentsError] = useState(false)

  // Form data structure
  const [formData] = useState({
    investmentId: effectiveInvestmentId || '',
    files: []
  })

  const form = useForm({
    defaultValues: formData,
    mode: 'onChange'
  })

  // File upload hook - modified to not trigger onSuccess automatically
  const {
    uploadFiles,
    uploadProgress,
    error: uploadError
  } = useInvestmentFileUpload({
    accessToken,
    onSuccess: () => {}, // Don't trigger success here, AppActionForm handles it
    onError: errorMsg => {
      console.error('Upload error:', errorMsg)
    }
  })

  // Initialize investment hook with error boundary
  let fetchInvestments: any = null
  try {
    const investmentHook = useGetInvestments({ accessToken, userInfo, additionalData })
    fetchInvestments = investmentHook.fetchInvestments
  } catch (error) {
    console.warn('Investment hook initialization failed, using fallback:', error)
  }

  // Update form values when investmentId prop changes
  useEffect(() => {
    if (effectiveInvestmentId) {
      form.setValue('investmentId', effectiveInvestmentId)
    }
  }, [effectiveInvestmentId, form])

  // Load investments when form is displayed
  useEffect(() => {
    const loadInvestments = async () => {
      if (!fetchInvestments) {
        console.warn('fetchInvestments not available, skipping investment loading')
        setInvestmentsError(true)
        return
      }

      try {
        setLoadingInvestments(true)
        setInvestmentsError(false)

        const result = await fetchInvestments({ limit: 100 })
        const investmentList = result?.Investment || []

        if (investmentList.length === 0) {
          console.warn('No investments found')
          setInvestmentsError(true)
        } else {
          setInvestments(investmentList)
        }
      } catch (error) {
        console.error('Failed to load investments:', error)
        setInvestmentsError(true)
      } finally {
        setLoadingInvestments(false)
      }
    }

    if (accessToken && fetchInvestments && (effectiveShowInvestmentSelector || effectiveInvestmentId)) {
      loadInvestments()
    }
  }, [effectiveShowInvestmentSelector, effectiveInvestmentId, accessToken, fetchInvestments])

  const validateFile = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedFileTypes.includes(fileExtension)) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.error.fileType',
          `File type ${fileExtension} is not allowed`
        )
      )
    }
    return true
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection from input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    handleFilesAdded(selectedFiles)
  }

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFiles = Array.from(event.dataTransfer.files)
    handleFilesAdded(droppedFiles)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  // Process and validate added files
  const handleFilesAdded = (newFiles: File[]) => {
    const validFiles = newFiles.slice(0, maxFiles).map((file, index) => {
      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${index}`,
        name: file.name,
        status: 'done',
        originFileObj: file
      }

      // Validate file with proper error handling
      try {
        validateFile(file)
        return uploadFile
      } catch (error) {
        // Log the validation error for debugging
        console.warn(
          `File validation failed for ${file.name}:`,
          error instanceof Error ? error.message : 'Unknown error'
        )
        return {
          ...uploadFile,
          status: 'error' as const,
          errorMessage: error instanceof Error ? error.message : 'File validation failed'
        }
      }
    })

    setFileList(validFiles)
  }

  // Remove file from list
  const removeFile = (uid: string) => {
    setFileList(prev => prev.filter(file => file.uid !== uid))
  }

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Pre-submission handler: Upload single file and transform response
  const handlePreSubmit = async (formData: any): Promise<any> => {
    // Extract files from UI state
    const files = fileList.map(f => f.originFileObj).filter(Boolean) as File[]

    if (!files.length) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investment.document.upload.error.noFile', 'Please select a file')
      )
    }

    if (files.length > 1) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.error.tooManyFiles',
          'Please select only one file'
        )
      )
    }

    if (!formData.investmentId) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.error.investmentRequired',
          'Please select an investment'
        )
      )
    }

    // Upload single file using existing hook - now returns full responses
    const uploadResults = await uploadFiles(files, formData.investmentId)

    // Get the single upload result
    const uploadResult: any = uploadResults[0]

    // Transform upload result to investmentDocument format (single object, not array)
    const investmentDocument = {
      investment: formData.investmentId,
      file: uploadResult.fileInfo.fileId, // Convert fileInfo object to JSON string
      fileInfo: uploadResult.fileInfo,
      mimeType: uploadResult.fileInfo.fileMetadata.mimeType,
      folder: false,
      name: uploadResult.fileInfo.fileMetadata.originalFileName
    }

    // Return enhanced data with single investment document
    return {
      ...formData,
      investmentDocument, // Single object, not array
      uploadMetadata: {
        uploadTimestamp: new Date().toISOString(),
        documentType: 'FUND_PERFORMANCE_REPORT',
        documentGroup: 'FINANCIAL'
      }
    }
  }

  // Standard submission handler: Just return the payload
  const handleSubmit = async (enhancedData: any) => {
    // Return the payload structure with single investmentDocument object
    return {
      investmentDocument: enhancedData.investmentDocument
    }
  }

  const handleSuccess = (result: any) => {
    if (onSuccess) {
      // Extract file ID for backward compatibility (single file)
      // The file field now contains the fileId directly as a string, not a JSON string
      let fileId = null

      if (result.investmentDocument?.file) {
        // Direct string assignment - no need to parse as JSON
        fileId = result.investmentDocument.file
      } else if (result.investmentDocument?.fileInfo?.fileId) {
        // Fallback: try to get from fileInfo object
        fileId = result.investmentDocument.fileInfo.fileId
      }

      if (fileId) {
        onSuccess([fileId])
      } else {
        console.warn('Could not extract file ID for success callback')
        onSuccess([])
      }
    }
  }

  const defaultTitle = getTranslationFromI18nKeyAndLabel('investment.document.upload.title', 'Upload Investment Report')

  const defaultDescription = getTranslationFromI18nKeyAndLabel(
    'investment.document.upload.description',
    'Upload your investment report documents and let our AI analyze them automatically. Your documents will be securely stored and easily accessible for future reference.'
  )

  // Error handling for missing access token
  if (!accessToken) {
    return (
      <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
        <div className="gba:h-full gba:flex gba:flex-col">
          <div className="gba:mb-6">
            <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('common.error', 'Error')}
            </h2>
          </div>
          <div className="gba:flex-1">
            <Alert>
              <AlertDescription>
                {getTranslationFromI18nKeyAndLabel(
                  'auth.accessTokenRequired',
                  'Authentication Required: Access token is required to upload documents.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  // Form validation
  const validateForm = (data: any): string[] | null => {
    const errors = []

    if (!data.investmentId) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.error.investmentRequired',
          'Please select an investment'
        )
      )
    }

    if (fileList.length === 0) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.document.upload.error.noFile', 'Please select a file'))
    }

    if (fileList.length > 1) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.error.tooManyFiles',
          'Please select only one file'
        )
      )
    }

    return errors.length > 0 ? errors : null
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto">
      {/* Form Title */}
      <div className="gba:mb-6">
        <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <AiBadge
            label="AI"
            variant="aiGenerated"
            size="lg"
            ariaLabel="AI-powered document analysis"
            data-testid="investment-report-upload-ai-badge"
          />
          {title || defaultTitle}
        </h2>
        <p className="gba:text-sm gba:text-gray-600 gba:mt-2">{description || defaultDescription}</p>
      </div>

      <AppActionForm
        processType="create"
        handlePreSubmit={handlePreSubmit}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
        onCancel={onCancel}
        formData={formData}
        form={form}
        validateForm={validateForm}
        submitButtonText={getTranslationFromI18nKeyAndLabel('investment.document.upload.upload', 'Upload Documents')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
        data-testid="investment-document-upload-form"
      >
        {/* Form Content */}
        <div className="gba:space-y-6">
          {/* Investment Selection - Only show if effectiveShowInvestmentSelector is true */}
          {effectiveShowInvestmentSelector && (
            <FormField
              control={form.control}
              name="investmentId"
              rules={{
                required: getTranslationFromI18nKeyAndLabel(
                  'investment.document.upload.error.investmentRequired',
                  'Please select an investment'
                )
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.document.upload.investment', 'Investment')}
                  </FormLabel>
                  <FormControl>
                    {!investmentsError && investments.length > 0 ? (
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingInvestments}>
                        <SelectTrigger data-testid="investment-select" className="gba:w-full">
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'investment.document.upload.investment.placeholder',
                              'Select an investment'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {investments.map(investment => (
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
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'investment.document.upload.investment.placeholder.manual',
                            'Enter investment ID'
                          )}
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

          {/* Investment Display - Show when investment is preselected */}
          {!effectiveShowInvestmentSelector && effectiveInvestmentId && (
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'investment.document.upload.selectedInvestment',
                  'Selected Investment'
                )}
              </label>
              <div className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-md">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:h-2 gba:w-2 gba:bg-green-500 gba:rounded-full"></div>
                  <span
                    className="gba:text-sm gba:font-medium gba:text-gray-900"
                    data-testid="selected-investment-display"
                  >
                    {(() => {
                      // Try to find the investment name from loaded investments
                      const foundInvestment = investments.find(inv => inv.id === effectiveInvestmentId)
                      if (foundInvestment) {
                        return `${foundInvestment.name || foundInvestment.businessKey || foundInvestment.id}${foundInvestment.businessKey ? ` (${foundInvestment.businessKey})` : ''}`
                      }
                      // Fallback to just showing the ID
                      return `Investment ID: ${effectiveInvestmentId}`
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="gba:space-y-2">
            <label className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('investment.document.upload.files', 'Document Files')}
            </label>
            {/* Custom File Upload Area */}
            <div
              className="gba:border-2 gba:border-dashed gba:rounded-lg gba:p-8 gba:text-center gba:transition-colors gba:cursor-pointer"
              style={{
                borderColor: 'var(--nw-color-border-default)',
                backgroundColor: 'var(--nw-color-surface-secondary)'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={openFilePicker}
              data-testid="file-upload-dragger"
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'
              }}
            >
              <div className="gba:flex gba:justify-center gba:mb-4">
                <UploadIcon size={48} style={{ color: 'var(--nw-muted-foreground)' }} />
              </div>
              <p className="gba:mb-2 gba:font-medium" style={{ color: 'var(--nw-color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel(
                  'investment.document.upload.dropText',
                  'Drop your files here or click to browse'
                )}
              </p>
              <p className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                {getTranslationFromI18nKeyAndLabel(
                  'investment.document.upload.hint',
                  'Supports PDF, Word, Excel, and text files. One file at a time.'
                )}
              </p>
            </div>

            {/* Hidden File Input */}
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={allowedFileTypes.join(',')}
              multiple={maxFiles > 1}
              className="gba:hidden"
              data-testid="file-input"
            />

            {/* File List Display */}
            {fileList.length > 0 && (
              <div className="gba:space-y-2 gba:mt-4">
                <label className="gba:text-sm gba:font-medium" style={{ color: 'var(--nw-color-text-primary)' }}>
                  {getTranslationFromI18nKeyAndLabel('investment.document.upload.selectedFiles', 'Selected Files')}
                </label>
                {fileList.map(file => (
                  <div
                    key={file.uid}
                    className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md"
                    style={{
                      backgroundColor: 'var(--nw-color-surface-primary)',
                      border: '1px solid var(--nw-color-border-default)'
                    }}
                    data-testid={`file-item-${file.uid}`}
                  >
                    <div className="gba:flex gba:flex-col gba:gap-1">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <FileTextIcon className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-muted-foreground)' }} />
                        <span className="gba:text-sm gba:font-medium" style={{ color: 'var(--nw-color-text-primary)' }}>
                          {file.name}
                        </span>
                        {file.status === 'error' && (
                          <Badge variant="destructive" className="gba:text-xs">
                            {getTranslationFromI18nKeyAndLabel('common.error', 'Error')}
                          </Badge>
                        )}
                      </div>
                      {file.status === 'error' && file.errorMessage && (
                        <span className="gba:text-xs gba:ml-6" style={{ color: 'var(--nw-color-danger-500)' }}>
                          {file.errorMessage}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        removeFile(file.uid)
                      }}
                      className="gba:h-6 gba:w-6 gba:p-0"
                      data-testid={`remove-file-${file.uid}`}
                    >
                      <XIcon className="gba:h-4 gba:w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="gba:mb-4">
              <div className="gba:flex gba:justify-between gba:text-sm gba:text-gray-600 gba:mb-2">
                <span>Uploading files...</span>
                <span>
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
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
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </div>
      </AppActionForm>
    </div>
  )
}
