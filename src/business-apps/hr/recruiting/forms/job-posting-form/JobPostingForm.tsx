import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPosting } from '@/common/data/recruiting/hooks/useJobPosting'
import { useJobRequest } from '@/common/data/recruiting/hooks/useJobRequest'
import { useJobRequests } from '@/common/data/recruiting/hooks/useJobRequests'
import { useJobPositions } from '@/common/data/employee/hooks/useJobPositions'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildJobPostingPayload } from '@/common/data/recruiting/payloads/jobPostingPayloads'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { TranslatableField } from '@/components/translatable-field/TranslatableField'
import { TranslatableEditor } from '@/components/translatable-editor/TranslatableEditor'
import { CatalogSelect } from '@/components/catalog-select'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Combobox,
  Button,
  Input,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import { FileText, Upload, X, Plus, Trash2 } from 'lucide-react'
import { JobRequestStatus } from '@/common/data/recruiting/types/enums'
import type { JobRequest } from '@/common/data/recruiting/types/jobRequestTypes'
import { getJobRequestTypeLabel, getJobRequestStatusLabel } from '@/common/data/recruiting/types/enums'

interface JobPostingPublication {
  id?: string
  jobPostingChannelRef?: string
  url?: string
}

const jobPostingSchema = z.object({
  id: z.string().nullish(),
  version: z.number().nullish(),
  code: z.string().nullish(),
  title: z.string().min(1, 'Title is required'),
  titleI18n: z.any().optional(),
  content: z.string().nullish(),
  contentI18n: z.any().optional(),
  fileInfo: z.any().optional(),
  jobRequestId: z.string().min(1, 'Job Request is required'),
  publications: z
    .array(
      z.object({
        id: z.string().nullish(),
        jobPostingChannelRef: z.string().nullish(),
        url: z.string().nullish()
      })
    )
    .optional(),
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
  // Extract jobPosting object from context with correct priority
  // Priority 1: psi_taskPayload.jobPosting (complete object)
  const contextJobPosting = useMemo(() => {
    return additionalData?.psi_taskPayload?.jobPosting || null
  }, [additionalData])

  // Extract jobPostingId
  // Priority 2: psi_taskPayload.psi_initialParameters.jobPostingId
  const jobPostingId = useMemo(() => {
    // First check if context has a jobPosting with an ID
    if (contextJobPosting?.id) {
      return contextJobPosting.id
    }
    // Otherwise check for explicit jobPostingId in initialParameters
    return additionalData?.psi_taskPayload?.psi_initialParameters?.jobPostingId || undefined
  }, [contextJobPosting, additionalData])

  // Extract jobRequestId with correct priority
  const jobRequestId = useMemo(() => {
    // First check context jobPosting for jobRequest (Priority 1)
    if (contextJobPosting?.jobRequest) {
      // jobRequest can be either an ID string or an object with an id
      if (typeof contextJobPosting.jobRequest === 'string') {
        return contextJobPosting.jobRequest
      }
      if (typeof contextJobPosting.jobRequest === 'object' && contextJobPosting.jobRequest.id) {
        return contextJobPosting.jobRequest.id
      }
    }
    // Then check for jobRequestId
    if (contextJobPosting?.jobRequestId) {
      return contextJobPosting.jobRequestId
    }
    // Priority 3: psi_taskPayload.psi_initialParameters.jobRequestId
    return additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId || undefined
  }, [contextJobPosting, additionalData])

  // Only fetch from backend if we have a jobPostingId (meaning it exists in DB)
  const { jobPosting: fetchedJobPosting, loading, error } = useJobPosting(accessToken || '', jobPostingId)
  const { jobRequest } = useJobRequest(accessToken || '', jobRequestId, 'record')

  // Use fetched jobPosting if available, otherwise use context jobPosting
  const jobPosting = fetchedJobPosting || contextJobPosting

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
  const [publications, setPublications] = useState<JobPostingPublication[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract jobPosition IDs from jobPostingPositions
  const jobPositionIds = useMemo(() => {
    if (!jobPosting?.jobPostingPositions) return []

    const positions = Array.isArray(jobPosting.jobPostingPositions)
      ? jobPosting.jobPostingPositions
      : jobPosting.jobPostingPositions.positions || []

    return positions.map((pos: any) => pos.jobPositionId || pos.id).filter(Boolean)
  }, [jobPosting])

  // Fetch full JobPosition details
  const {
    jobPositions: jobPositionDetails,
    loading: loadingPositions,
    error: positionsError
  } = useJobPositions(
    accessToken || '',
    { ids: jobPositionIds, limit: 100 },
    'record' // Load all fields including relations
  )

  // Group identical job positions
  const groupedPositions = useMemo(() => {
    if (!jobPositionDetails || jobPositionDetails.length === 0) return []

    // Group by identical attributes
    const groups = new Map<string, { position: any; count: number; ids: string[] }>()

    jobPositionDetails.forEach(pos => {
      // Create a unique key based on all relevant attributes
      const key = JSON.stringify({
        name: pos.name,
        contractType: pos.contractType?.value || '',
        employmentType: pos.employmentType?.value || '',
        jobProfile: pos.jobProfile?.name || '',
        jobFunction: pos.jobFunction?.name || '',
        jobLevel: pos.jobLevel?.name || ''
      })

      if (groups.has(key)) {
        const existing = groups.get(key)!
        existing.count++
        existing.ids.push(pos.id)
      } else {
        groups.set(key, { position: pos, count: 1, ids: [pos.id] })
      }
    })

    return Array.from(groups.values())
  }, [jobPositionDetails])

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
      // Load existing publications
      if (jobPosting?.jobPostingPublications) {
        const pubs = Array.isArray(jobPosting.jobPostingPublications)
          ? jobPosting.jobPostingPublications
          : jobPosting.jobPostingPublications.publications || []
        setPublications(
          pubs.map((pub: any) => ({
            id: pub.id,
            jobPostingChannelRef: pub.jobPostingChannelRef,
            url: pub.url
          }))
        )
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

  const handleAddPublication = useCallback(() => {
    setPublications(prev => [...prev, { jobPostingChannelRef: '', url: '' }])
  }, [])

  const handleRemovePublication = useCallback((index: number) => {
    setPublications(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handlePublicationChange = useCallback((index: number, field: keyof JobPostingPublication, value: string) => {
    setPublications(prev => prev.map((pub, i) => (i === index ? { ...pub, [field]: value } : pub)))
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

        // Preserve jobPostingPositions from context if available
        const jobPostingPositionsPayload = contextJobPosting?.jobPostingPositions
          ? {
              changeMode: 'UPSERT',
              positions: Array.isArray(contextJobPosting.jobPostingPositions)
                ? contextJobPosting.jobPostingPositions
                : contextJobPosting.jobPostingPositions.positions || []
            }
          : undefined

        // Add publications to payload
        const publicationsPayload =
          publications.length > 0
            ? {
                changeMode: 'REPLACE',
                publications: publications.map(pub => ({
                  id: pub.id,
                  jobPostingChannelRef: pub.jobPostingChannelRef,
                  url: pub.url
                }))
              }
            : undefined

        return {
          jobPosting: {
            ...jobPosting,
            jobPostingPositions: jobPostingPositionsPayload,
            jobPostingPublications: publicationsPayload
          },
          changeMode: data.id ? 'UPDATE' : 'INSERT'
        }
      } catch (error) {
        console.error('Error submitting job posting:', error)
        throw error
      }
    },
    [fileInfo, publications, contextJobPosting]
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

  // We are in update mode ONLY if jobPosting has an ID (meaning it exists in DB)
  const isUpdateMode = !!jobPosting?.id
  const processType = isUpdateMode ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
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
                  <div className="gba:space-y-2">
                    <div className="gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-2 gba:text-sm">
                      {infoItems.map((item, index) => (
                        <div key={index} className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:text-muted-foreground">{item.label}:</span>
                          <span className="gba:font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

            {/* Job Posting Positions - Read-only list */}
            {contextJobPosting?.jobPostingPositions && contextJobPosting.jobPostingPositions.length > 0 && (
              <div className="gba:space-y-2">
                <label className="gba:text-sm gba:font-medium">Job Posting Positions</label>
                <div className="gba:border gba:border-border gba:rounded-md gba:p-3">
                  <ul className="gba:space-y-1">
                    {contextJobPosting.jobPostingPositions.map((position: any, index: number) => (
                      <li key={index} className="gba:text-sm">
                        {position.jobPosition?.name || position.jobPositionId || `Position ${index + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

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
                      error={
                        form.formState.errors.title?.message ? String(form.formState.errors.title.message) : undefined
                      }
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
                      error={
                        form.formState.errors.content?.message
                          ? String(form.formState.errors.content.message)
                          : undefined
                      }
                      quillModules={quillModules}
                      quillFormats={quillFormats}
                      data-testid={formatDataTestId('job-posting-form', 'content-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Posting Positions - Read-only Display with Grouping */}
            {(loadingPositions || groupedPositions.length > 0 || positionsError) && (
              <div className="gba:space-y-3 gba:p-4 gba:border gba:border-border gba:rounded-md gba:bg-muted/30">
                <FormLabel>
                  Job Posting Positions{' '}
                  {!loadingPositions && groupedPositions.length > 0 && (
                    <span className="gba:text-muted-foreground gba:font-normal">
                      ({jobPositionDetails.length} total, {groupedPositions.length} unique)
                    </span>
                  )}
                </FormLabel>

                {loadingPositions && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:p-4">
                    <Spinner size="sm" />
                    <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">Loading positions...</span>
                  </div>
                )}

                {positionsError && !loadingPositions && (
                  <div className="gba:p-3 gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:rounded-md gba:text-sm">
                    {positionsError}
                  </div>
                )}

                {!loadingPositions && !positionsError && groupedPositions.length > 0 && (
                  <div className="gba:space-y-2">
                    {groupedPositions.map((group, index) => (
                      <div
                        key={index}
                        className="gba:p-3 gba:bg-background gba:rounded-md gba:border gba:border-border"
                      >
                        <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                          <div className="gba:text-sm gba:font-semibold">{group.position.name || '-'}</div>
                          {group.count > 1 && (
                            <Badge variant="secondary" className="gba:ml-2">
                              {group.count}x
                            </Badge>
                          )}
                        </div>
                        <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:text-sm">
                          <div>
                            <span className="gba:font-medium">Employment Type:</span>{' '}
                            <span className="gba:text-muted-foreground">
                              {group.position.employmentType?.value || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="gba:font-medium">Contract Type:</span>{' '}
                            <span className="gba:text-muted-foreground">
                              {group.position.contractType?.value || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="gba:font-medium">Job Profile:</span>{' '}
                            <span className="gba:text-muted-foreground">{group.position.jobProfile?.name || '-'}</span>
                          </div>
                          <div>
                            <span className="gba:font-medium">Job Function:</span>{' '}
                            <span className="gba:text-muted-foreground">{group.position.jobFunction?.name || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Job Posting Publications */}
            <div className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <FormLabel>Publications</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPublication}
                  data-testid={formatDataTestId('job-posting-form', 'add-publication-button')}
                >
                  <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
                  Add Publication
                </Button>
              </div>

              {publications.length > 0 && (
                <div className="gba:space-y-3">
                  {publications.map((publication, index) => (
                    <div
                      key={index}
                      className="gba:flex gba:items-start gba:gap-3 gba:p-3 gba:border gba:border-border gba:rounded-md"
                    >
                      <div className="gba:flex-1 gba:grid gba:grid-cols-2 gba:gap-3">
                        <div>
                          <FormLabel className="gba:text-xs gba:mb-1">Channel</FormLabel>
                          <CatalogSelect
                            catalogIdentifier={RECRUITING_CATALOGS.JOB_POSTING_CHANNEL}
                            value={publication.jobPostingChannelRef || null}
                            onValueChange={(v: string | string[]) =>
                              handlePublicationChange(
                                index,
                                'jobPostingChannelRef',
                                Array.isArray(v) ? v[0] || '' : v || ''
                              )
                            }
                            data-testid={formatDataTestId('job-posting-form', `publication-${index}-channel-select`)}
                          />
                        </div>
                        <div>
                          <FormLabel className="gba:text-xs gba:mb-1">URL</FormLabel>
                          <Input
                            type="url"
                            value={publication.url || ''}
                            onChange={e => handlePublicationChange(index, 'url', e.target.value)}
                            placeholder="https://..."
                            data-testid={formatDataTestId('job-posting-form', `publication-${index}-url-input`)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePublication(index)}
                        className="gba:mt-6"
                        data-testid={formatDataTestId('job-posting-form', `publication-${index}-remove-button`)}
                      >
                        <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

            {/* Debug: AdditionalData */}
            <div className="gba:mt-8 gba:p-4 gba:border gba:border-border gba:rounded-md gba:bg-muted/30">
              <details>
                <summary className="gba:text-sm gba:font-medium gba:cursor-pointer gba:mb-2">
                  Debug: Additional Data & Job Posting
                </summary>
                <div className="gba:space-y-4">
                  <div>
                    <h4 className="gba:text-xs gba:font-semibold gba:mb-2">Additional Data:</h4>
                    <pre className="gba:text-xs gba:whitespace-pre-wrap gba:overflow-auto gba:max-h-96 gba:bg-background gba:p-3 gba:rounded gba:border gba:border-border">
                      {JSON.stringify(additionalData, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="gba:text-xs gba:font-semibold gba:mb-2">Job Posting Object:</h4>
                    <pre className="gba:text-xs gba:whitespace-pre-wrap gba:overflow-auto gba:max-h-96 gba:bg-background gba:p-3 gba:rounded gba:border gba:border-border">
                      {JSON.stringify(jobPosting, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </Form>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default JobPostingForm
