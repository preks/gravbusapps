import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPosting } from '@/common/data/recruiting/hooks/useJobPosting'
import { useJobRequest } from '@/common/data/recruiting/hooks/useJobRequest'
import { useJobRequests } from '@/common/data/recruiting/hooks/useJobRequests'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildJobPostingPayload } from '@/common/data/recruiting/payloads/jobPostingPayloads'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { TranslatableField } from '@/components/translatable-field/TranslatableField'
import { TranslatableEditor } from '@/components/translatable-editor/TranslatableEditor'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Combobox,
  Button
} from '@newwork/nw-design-system'
import { FileText, Upload, X } from 'lucide-react'
import { JobRequestStatus } from '@/common/data/recruiting/types/enums'
import type { JobRequest } from '@/common/data/recruiting/types/jobRequestTypes'
import { getJobRequestTypeLabel, getJobRequestStatusLabel } from '@/common/data/recruiting/types/enums'

const jobPostingSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  titleI18n: z.any().optional(),
  content: z.string().optional(),
  contentI18n: z.any().optional(),
  fileInfo: z.any().optional(),
  jobRequestId: z.string().min(1, 'Job Request is required'),
  additionalProperties: z.any().optional()
})

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean']
  ]
}

const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'align', 'link', 'image']

type JobPostingFormProps = BusinessAppContextProps

// Local JobRequestSelect component
interface JobRequestSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onJobRequestChange?: (jobRequest: JobRequest | null) => void
  accessToken?: string
  disabled?: boolean
  'data-testid'?: string
}

const JobRequestSelect: React.FC<JobRequestSelectProps> = ({
  value,
  onValueChange,
  onJobRequestChange,
  accessToken,
  disabled = false,
  'data-testid': dataTestId = 'job-request-select'
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentOffset, setCurrentOffset] = useState(0)
  const [allJobRequests, setAllJobRequests] = useState<JobRequest[]>([])

  const { jobRequests, total, loading, refetch } = useJobRequests(
    accessToken || '',
    {
      search: searchTerm,
      limit: 20,
      offset: currentOffset,
      jobRequestStatus: [JobRequestStatus.APPROVED]
    },
    'list'
  )

  useEffect(() => {
    if (searchTerm) {
      setCurrentOffset(0)
      setAllJobRequests([])
    }
  }, [searchTerm])

  useEffect(() => {
    if (jobRequests.length > 0) {
      if (currentOffset === 0) {
        setAllJobRequests(jobRequests)
      } else {
        setAllJobRequests(prev => {
          const existingIds = new Set(prev.map(jr => jr.id))
          const newRequests = jobRequests.filter(jr => jr.id && !existingIds.has(jr.id))
          return [...prev, ...newRequests]
        })
      }
    } else if (currentOffset === 0) {
      setAllJobRequests([])
    }
  }, [jobRequests, currentOffset])

  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
  }, [])

  const handleLoadMore = useCallback(() => {
    const newOffset = currentOffset + 20
    setCurrentOffset(newOffset)
    refetch({ search: searchTerm, limit: 20, offset: newOffset, jobRequestStatus: [JobRequestStatus.APPROVED] })
  }, [currentOffset, searchTerm, refetch])

  const handleValueChange = useCallback(
    (newValue: string | null) => {
      onValueChange?.(newValue || null)
      if (newValue && onJobRequestChange) {
        const jobRequest = allJobRequests.find(jr => jr.id === newValue)
        onJobRequestChange(jobRequest || null)
      } else {
        onJobRequestChange?.(null)
      }
    },
    [onValueChange, onJobRequestChange, allJobRequests]
  )

  const hasMore = total > allJobRequests.length

  const options = useMemo(() => {
    return allJobRequests.map(jr => {
      const displayName = jr.name || jr.code || 'Unknown'
      return {
        value: jr.id!,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
            <FileText className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
              <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{displayName}</div>
              {jr.code && jr.code !== displayName && (
                <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:text-left">{jr.code}</div>
              )}
            </div>
          </div>
        )
      }
    })
  }, [allJobRequests])

  return (
    <Combobox
      className="gba:[&&]:h-auto gba:w-full"
      options={options as any}
      value={value || ''}
      onValueChange={handleValueChange}
      placeholder="Search Job Request..."
      searchPlaceholder="Type to search..."
      emptyText={loading ? 'Loading...' : 'No job requests found'}
      onSearch={handleSearch}
      searchDebounce={300}
      loading={Boolean(loading)}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      disabled={disabled}
      data-testid={dataTestId}
      align="start"
    />
  )
}

const JobPostingForm: React.FC<JobPostingFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobPostingId =
    additionalData?.jobPostingId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobPostingId || undefined

  const jobRequestId =
    additionalData?.jobRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId || undefined

  const { jobPosting, loading, error } = useJobPosting(accessToken || '', jobPostingId)
  const { jobRequest } = useJobRequest(accessToken || '', jobRequestId, 'record')

  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const form = useForm({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      ...mapToFormValues(jobPosting || {}, jobPostingSchema),
      titleI18n: jobPosting?.titleI18n || {},
      contentI18n: jobPosting?.contentI18n || {}
    } as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileInfo, setFileInfo] = useState<any>(jobPosting?.fileInfo || null)
  const [selectedJobRequest, setSelectedJobRequest] = useState<JobRequest | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const jobPostingRef = useRef(jobPosting)
  const jobRequestRef = useRef(jobRequest)

  useEffect(() => {
    if (jobPostingRef.current?.id !== jobPosting?.id) {
      const formValues = {
        ...mapToFormValues(jobPosting || {}, jobPostingSchema),
        titleI18n: jobPosting?.titleI18n || {},
        contentI18n: jobPosting?.contentI18n || {}
      }
      form.reset(formValues as any)
      if (jobPosting?.fileInfo) {
        setFileInfo(jobPosting.fileInfo)
      }
      jobPostingRef.current = jobPosting
    }
  }, [jobPosting?.id, jobPosting, form])

  useEffect(() => {
    if (jobRequest && jobRequest.id) {
      if (!form.getValues('jobRequestId')) {
        form.setValue('jobRequestId', jobRequest.id)
      }
      setSelectedJobRequest(jobRequest)
      jobRequestRef.current = jobRequest
    }
  }, [jobRequest, form])

  const handleJobRequestChange = useCallback((jobRequest: JobRequest | null) => {
    setSelectedJobRequest(jobRequest)
  }, [])

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile || !accessToken) return

    setUploading(true)
    try {
      const result = await fileClient.uploadFile(
        selectedFile,
        { accessScope: 'tenant' },
        {
          appName: 'recruiting',
          folderPath: `/job-postings/${jobPostingId || 'temp'}/${Date.now()}`,
          mimeType: selectedFile.type
        }
      )

      setFileInfo(result.fileInfo)
      form.setValue('fileInfo', result.fileInfo)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }, [selectedFile, accessToken, fileClient, jobPostingId, form])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }, [])

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null)
    setFileInfo(null)
    form.setValue('fileInfo', null)
  }, [form])

  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        const submitData = {
          ...data,
          fileInfo: fileInfo || data.fileInfo
        }
        const { jobPosting } = buildJobPostingPayload(submitData)
        return {
          jobPosting,
          changeMode: data.id ? 'UPDATE' : 'INSERT'
        }
      } catch (error) {
        console.error('Error submitting job posting:', error)
        throw error
      }
    },
    [fileInfo]
  )

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job posting data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-posting-form" />
  }

  const handleCancel = async () => {}
  const processType = jobPosting?.id ? 'update' : 'create'
  const isUpdateMode = !!jobPostingId

  return (
    <AppActionForm
      processType={processType}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={form.getValues()}
      form={form}
      schema={jobPostingSchema}
      data-testid={formatDataTestId('job-posting-form', 'Form')}
      submitButtonText={jobPosting?.id ? 'Update Job Posting' : 'Create Job Posting'}
      isSubmitDisabled={loading || uploading}
    >
      <Form {...form}>
        <div className="gba:space-y-6">
          {/* Job Request Selection - Mandatory */}
          <FormField
            control={form.control}
            name="jobRequestId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Job Request <span className="gba:text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <JobRequestSelect
                    value={field.value || null}
                    onValueChange={field.onChange}
                    onJobRequestChange={handleJobRequestChange}
                    accessToken={accessToken}
                    disabled={isUpdateMode || !!jobRequestId}
                    data-testid={formatDataTestId('job-posting-form', 'job-request-select')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Job Request Information - Read-only */}
          {(jobRequest || selectedJobRequest) &&
            (() => {
              const displayJobRequest = jobRequest || selectedJobRequest
              if (!displayJobRequest) return null

              const getValue = (value: any): string => {
                if (value === null || value === undefined || value === '') return '-'
                return String(value)
              }

              const infoItems: Array<{ label: string; value: string }> = [
                { label: 'Name', value: getValue(displayJobRequest.name) },
                { label: 'Code', value: getValue(displayJobRequest.code) },
                {
                  label: 'Type',
                  value: displayJobRequest.jobRequestType
                    ? getJobRequestTypeLabel(displayJobRequest.jobRequestType)
                    : '-'
                },
                {
                  label: 'Status',
                  value: displayJobRequest.jobRequestStatus
                    ? getJobRequestStatusLabel(displayJobRequest.jobRequestStatus)
                    : '-'
                },
                { label: 'Contract Type', value: getValue(displayJobRequest.contractType?.value) },
                { label: 'Employment Type', value: getValue(displayJobRequest.employmentType?.value) },
                { label: 'Experience Level', value: getValue(displayJobRequest.jobExperienceLevel?.value) },
                {
                  label: 'Planned Hire Date',
                  value: displayJobRequest.plannedHireDate
                    ? new Date(displayJobRequest.plannedHireDate).toLocaleDateString()
                    : '-'
                },
                {
                  label: 'Planned Exit Date',
                  value: displayJobRequest.plannedExitDate
                    ? new Date(displayJobRequest.plannedExitDate).toLocaleDateString()
                    : '-'
                }
              ]

              return (
                <div className="gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-2 gba:text-sm">
                  {infoItems.map((item, index) => (
                    <div key={index} className="gba:flex gba:items-center gba:gap-1">
                      <span className="gba:text-muted-foreground">{item.label}:</span>
                      <span className="gba:font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              )
            })()}

          {/* Title - Translatable Field */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TranslatableField
                    label="Title"
                    value={field.value || ''}
                    onChange={field.onChange}
                    translations={form.watch('titleI18n') || {}}
                    onTranslationsChange={translations => form.setValue('titleI18n', translations)}
                    placeholder="Enter job posting title..."
                    required
                    error={form.formState.errors.title?.message}
                    data-testid={formatDataTestId('job-posting-form', 'title-input')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Content - Translatable Rich Text Editor */}
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TranslatableEditor
                    label="Content"
                    value={field.value || ''}
                    onChange={field.onChange}
                    translations={form.watch('contentI18n') || {}}
                    onTranslationsChange={translations => form.setValue('contentI18n', translations)}
                    placeholder="Write job posting content here..."
                    error={form.formState.errors.content?.message}
                    quillModules={quillModules}
                    quillFormats={quillFormats}
                    data-testid={formatDataTestId('job-posting-form', 'content-input')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* File Upload */}
          <FormField
            control={form.control}
            name="fileInfo"
            render={() => (
              <FormItem>
                <FormLabel>File Attachment</FormLabel>
                <FormControl>
                  <div className="gba:space-y-2">
                    {fileInfo ? (
                      <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:border-border gba:rounded-md">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <FileText className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                          <span className="gba:text-sm">
                            {fileInfo.fileMetadata?.originalFileName || fileInfo.fileId || 'File uploaded'}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleFileRemove}
                          data-testid={formatDataTestId('job-posting-form', 'file-remove-button')}
                        >
                          <X className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="gba:space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelect}
                          className="gba:hidden"
                          data-testid={formatDataTestId('job-posting-form', 'file-input')}
                        />
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            data-testid={formatDataTestId('job-posting-form', 'file-select-button')}
                          >
                            <Upload className="gba:h-4 gba:w-4 gba:mr-2" />
                            Select File
                          </Button>
                          {selectedFile && (
                            <>
                              <span className="gba:text-sm gba:text-muted-foreground">{selectedFile.name}</span>
                              <Button
                                type="button"
                                variant="default"
                                onClick={handleFileUpload}
                                disabled={uploading}
                                data-testid={formatDataTestId('job-posting-form', 'file-upload-button')}
                              >
                                {uploading ? 'Uploading...' : 'Upload'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </AppActionForm>
  )
}

export default JobPostingForm
