import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobInterview } from '@/common/data/recruiting/hooks/useJobInterview'
import { useJobApplication } from '@/common/data/recruiting/hooks/useJobApplication'
import {
  buildJobInterviewPayload,
  type JobInterviewParticipant
} from '@/common/data/recruiting/payloads/jobInterviewPayloads'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { JobApplicationSelect } from '@/common/components/recruiting/form-components/job-application-select'
import { MultiEmployeeSelect } from '@/components/multi-employee-select'
import { createCalendarApiClient } from '@/business-apps/platform/apps/chat/calendar/calendarApiClient'
import { env } from '@/common/env/EnvUtils'
import type { CreateMeetingData, UpdateMeetingData } from '@/business-apps/platform/apps/chat/calendar/types'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  DateInput,
  Card,
  Badge,
  RadioGroup,
  RadioGroupItem,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { JobInterviewStatus } from '@/common/data/recruiting/types/enums'
import { X } from 'lucide-react'

const jobInterviewSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  scheduledAt: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  jobInterviewStatus: z.nativeEnum(JobInterviewStatus).optional(),
  jobApplicationId: z.string().min(1, 'Job application is required'),
  meetingType: z.enum(['everyone', 'external']).default('everyone'),
  jobInterviewParticipants: z
    .array(
      z.object({
        employeeId: z.string().optional(),
        jobCandidateId: z.string().optional(),
        userId: z.string().optional()
      })
    )
    .optional()
})

type JobInterviewFormValues = z.infer<typeof jobInterviewSchema>

type JobInterviewFormProps = BusinessAppContextProps

const JobInterviewForm: React.FC<JobInterviewFormProps> = ({ accessToken, additionalData }) => {
  const interviewId =
    additionalData?.interviewId ||
    additionalData?.jobInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.interviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobInterviewId ||
    undefined

  const initialJobApplicationId =
    additionalData?.jobApplicationId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationId ||
    undefined

  const {
    jobInterview,
    loading: interviewLoading,
    error: interviewError
  } = useJobInterview(accessToken || '', interviewId)

  const [selectedJobApplicationId, setSelectedJobApplicationId] = useState<string | null>(
    initialJobApplicationId || jobInterview?.jobApplicationId || null
  )

  const { jobApplication, loading: applicationLoading } = useJobApplication(
    accessToken || '',
    selectedJobApplicationId || undefined,
    'interview-form'
  )

  const form = useForm<JobInterviewFormValues>({
    resolver: zodResolver(jobInterviewSchema),
    defaultValues: mapToFormValues(
      jobInterview
        ? {
            ...jobInterview,
            jobApplicationId: selectedJobApplicationId || jobInterview.jobApplicationId || '',
            meetingType: jobInterview.meetingLink ? 'everyone' : 'external'
          }
        : {
            jobApplicationId: selectedJobApplicationId || '',
            meetingType: 'external'
          },
      jobInterviewSchema
    ) as JobInterviewFormValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const [participants, setParticipants] = useState<JobInterviewParticipant[]>([])
  const [externalUserIds, setExternalUserIds] = useState<string[]>([''])
  const [selectedEmployees, setSelectedEmployees] = useState<Map<string, EmployeeLiteOption>>(new Map())
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const meetingType = form.watch('meetingType')

  const currentUserId = additionalData?.userInfo?.id || additionalData?.userInfo?.employeeDetails?.employeeId

  const interviewRef = useRef(jobInterview)
  useEffect(() => {
    if (interviewRef.current?.id !== jobInterview?.id) {
      const defaultValues = jobInterview
        ? {
            ...jobInterview,
            jobApplicationId: selectedJobApplicationId || jobInterview.jobApplicationId || '',
            meetingType: jobInterview.meetingLink ? 'everyone' : 'external'
          }
        : {
            jobApplicationId: selectedJobApplicationId || '',
            meetingType: 'external'
          }
      form.reset(mapToFormValues(defaultValues, jobInterviewSchema) as JobInterviewFormValues)

      if (jobInterview?.scheduledAt && jobInterview?.duration) {
        const startTime = new Date(jobInterview.scheduledAt)
        const endTime = new Date(startTime.getTime() + jobInterview.duration * 60 * 1000)
        setDateRange([startTime.toISOString(), endTime.toISOString()])
      } else {
        setDateRange(null)
      }

      interviewRef.current = jobInterview
    }
  }, [jobInterview?.id, jobInterview, selectedJobApplicationId, form])

  useEffect(() => {
    if (selectedJobApplicationId && jobApplication?.jobCandidate?.id) {
      const candidateParticipant: JobInterviewParticipant = {
        jobCandidateId: jobApplication.jobCandidate.id
      }
      setParticipants(prev => {
        const hasCandidate = prev.some(p => p.jobCandidateId === jobApplication.jobCandidate?.id)
        if (!hasCandidate) {
          return [...prev, candidateParticipant]
        }
        return prev
      })
    }
  }, [selectedJobApplicationId, jobApplication?.jobCandidate?.id])

  useEffect(() => {
    if (currentUserId) {
      setParticipants(prev => {
        const hasCurrentUser = prev.some(p => p.userId === currentUserId || p.employeeId === currentUserId)
        if (!hasCurrentUser) {
          return [...prev, { userId: currentUserId }]
        }
        return prev
      })
    }
  }, [currentUserId])

  const handleJobApplicationChange = useCallback(
    (value: string) => {
      setSelectedJobApplicationId(value)
      form.setValue('jobApplicationId', value)
    },
    [form]
  )

  const handleRemoveParticipant = useCallback((index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleExternalUserIdChange = useCallback((index: number, value: string) => {
    setExternalUserIds(prev => {
      const newIds = [...prev]
      newIds[index] = value
      return newIds
    })
  }, [])

  const handleAddExternalUserId = useCallback(() => {
    setExternalUserIds(prev => [...prev, ''])
  }, [])

  const handleRemoveExternalUserId = useCallback((index: number) => {
    setExternalUserIds(prev => {
      const newIds = prev.filter((_, i) => i !== index)
      return newIds.length === 0 ? [''] : newIds
    })
  }, [])

  useEffect(() => {
    const validExternalUserIds = externalUserIds.filter(id => id.trim() !== '')
    const externalParticipants: JobInterviewParticipant[] = validExternalUserIds.map(userId => ({ userId }))

    setParticipants(prev => {
      const withoutExternal = prev.filter(p => !p.userId)
      return [...withoutExternal, ...externalParticipants]
    })
  }, [externalUserIds])

  const getChatApiUrl = useCallback((): string => {
    let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

    const isLocalPlatform = baseUrl.includes('localhost')
    if (isLocalPlatform) {
      baseUrl = 'https://newwork-dev.newwork.com'
    }

    let apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1`
    if (apiUrl.includes('localhost')) {
      apiUrl = `${baseUrl}/chat-service/api/v1`
    }

    return apiUrl
  }, [])

  // Helper function to get candidate name
  const getCandidateNameForMeeting = useCallback((): string => {
    if (!jobApplication?.jobCandidate) return 'Candidate'
    const firstName = jobApplication.jobCandidate.firstName || ''
    const lastName = jobApplication.jobCandidate.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || jobApplication.jobCandidate.displayName || 'Candidate'
  }, [jobApplication])

  // Helper function to get meeting title
  const getMeetingTitle = useCallback((): string => {
    const candidateName = getCandidateNameForMeeting()
    const postingTitle = jobApplication?.jobPosting?.title || 'Job Posting'
    return `Interview: ${candidateName} - ${postingTitle}`
  }, [getCandidateNameForMeeting, jobApplication])

  // Helper function to collect participant IDs
  const collectParticipantIds = useCallback((): string[] => {
    const ids: string[] = []
    for (const participant of participants) {
      if (participant.employeeId) {
        const employee = selectedEmployees.get(participant.employeeId)
        if (employee?.userId) {
          ids.push(employee.userId)
        }
      } else if (participant.jobCandidateId && jobApplication?.jobCandidate?.userId) {
        ids.push(jobApplication.jobCandidate.userId)
      } else if (participant.userId && participant.userId !== currentUserId) {
        ids.push(participant.userId)
      }
    }
    return ids
  }, [participants, selectedEmployees, jobApplication, currentUserId])

  // Helper function to create or update meeting
  const createOrUpdateMeeting = useCallback(
    async (meetingTitle: string, startTime: Date, endTime: Date, participantIds: string[]): Promise<string> => {
      const apiUrl = getChatApiUrl()
      const calendarClient = createCalendarApiClient(apiUrl, accessToken || '')

      if (jobInterview?.meetingLink && jobInterview.id) {
        const updateData: UpdateMeetingData = {
          title: meetingTitle,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: 'EveryOne',
          addParticipantIds: participantIds,
          notifyParticipants: true
        }
        const updatedMeeting = await calendarClient.updateMeeting(jobInterview.meetingLink, updateData)
        return updatedMeeting.id
      } else {
        const createData: CreateMeetingData = {
          title: meetingTitle,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: 'EveryOne',
          meetingLink: 'auto-generate',
          participantIds: participantIds
        }
        const meeting = await calendarClient.createMeeting(createData)
        return meeting.id
      }
    },
    [accessToken, getChatApiUrl, jobInterview]
  )

  const handlePreSubmit = useCallback(
    async (data: JobInterviewFormValues): Promise<JobInterviewFormValues> => {
      // Use user-provided status, or default to SCHEDULED
      const status = data.jobInterviewStatus || JobInterviewStatus.SCHEDULED

      if (meetingType !== 'everyone') {
        return {
          ...data,
          jobInterviewStatus: status
        }
      }

      if (!data.scheduledAt || !data.duration) {
        return {
          ...data,
          jobInterviewStatus: status
        }
      }

      try {
        const startTime = new Date(data.scheduledAt)
        const endTime = new Date(startTime.getTime() + (data.duration || 60) * 60 * 1000)
        const meetingTitle = getMeetingTitle()
        const participantIds = collectParticipantIds()
        const meetingLink = await createOrUpdateMeeting(meetingTitle, startTime, endTime, participantIds)

        return {
          ...data,
          meetingLink,
          jobInterviewStatus: status
        }
      } catch (error) {
        console.error('Error creating/updating chat meeting:', error)
        return {
          ...data,
          jobInterviewStatus: status
        }
      }
    },
    [meetingType, getMeetingTitle, collectParticipantIds, createOrUpdateMeeting]
  )

  const handleSubmit = useCallback(
    async (data: JobInterviewFormValues) => {
      try {
        const processedData = await handlePreSubmit(data)
        const { jobInterview: payload, jobInterviewParticipants } = buildJobInterviewPayload({
          ...processedData,
          jobInterviewParticipants: participants
        })
        return {
          jobInterview: payload,
          jobInterviewParticipants,
          changeMode: data.id ? 'UPDATE' : 'INSERT'
        }
      } catch (error) {
        console.error('Error submitting interview:', error)
        throw error
      }
    },
    [handlePreSubmit, participants]
  )

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (interviewError) {
    errors.push({ error: interviewError, context: 'Failed to load interview data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-interview-form" />
  }

  const processType = jobInterview?.id ? 'update' : 'create'

  const candidateName = jobApplication?.jobCandidate
    ? `${jobApplication.jobCandidate.firstName || ''} ${jobApplication.jobCandidate.lastName || ''}`.trim() ||
      jobApplication.jobCandidate.displayName ||
      'Unknown Candidate'
    : null

  const postingTitle = jobApplication?.jobPosting?.title || null
  const positionName = jobApplication?.jobPosting?.jobRequest?.jobPosition?.name || null

  return (
    <AppActionForm
      processType={processType}
      onSubmit={handleSubmit}
      onCancel={undefined}
      formData={form.getValues()}
      form={form}
      schema={jobInterviewSchema}
      data-testid={formatDataTestId('job-interview-form', 'Form')}
      submitButtonText={jobInterview?.id ? 'Update Interview' : 'Schedule Interview'}
      isSubmitDisabled={interviewLoading || applicationLoading}
    >
      <Form {...form}>
        <div className="gba:space-y-6">
          {/* Job Application Selection */}
          <FormField
            control={form.control}
            name="jobApplicationId"
            render={() => (
              <FormItem>
                <FormLabel>Job Application</FormLabel>
                <FormControl>
                  <JobApplicationSelect
                    value={selectedJobApplicationId}
                    onValueChange={handleJobApplicationChange}
                    businessAppContext={{ accessToken, additionalData, userInfo: additionalData?.userInfo }}
                    placeholder="Select job application..."
                    disabled={!!interviewId}
                    data-testid={formatDataTestId('job-interview-form', 'job-application-select')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Display loaded information */}
          {jobApplication && (candidateName || postingTitle || positionName) && (
            <Card className="gba:p-4">
              <div className="gba:space-y-2">
                <h3 className="gba:text-sm gba:font-medium">Application Details</h3>
                {candidateName && (
                  <div className="gba:text-sm">
                    <span className="gba:font-medium">Candidate: </span>
                    <span>{candidateName}</span>
                  </div>
                )}
                {postingTitle && (
                  <div className="gba:text-sm">
                    <span className="gba:font-medium">Posting: </span>
                    <span>{postingTitle}</span>
                  </div>
                )}
                {positionName && (
                  <div className="gba:text-sm">
                    <span className="gba:font-medium">Position: </span>
                    <span>{positionName}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Interview Details */}
          <div className="gba:space-y-4">
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date & Time</FormLabel>
                  <FormControl>
                    <DateInput
                      mode="range"
                      type="datetime-local"
                      value={
                        dateRange ??
                        (field.value && form.getValues('duration')
                          ? [
                              field.value,
                              new Date(
                                new Date(field.value).getTime() + (form.getValues('duration') ?? 60) * 60 * 1000
                              ).toISOString()
                            ]
                          : undefined)
                      }
                      onChange={(value: string | [string | null, string | null] | null) => {
                        if (Array.isArray(value) && value[0] && value[1]) {
                          setDateRange(value)
                          field.onChange(value[0])
                          const startTime = new Date(value[0])
                          const endTime = new Date(value[1])
                          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000))
                          form.setValue('duration', durationMinutes)
                        } else if (typeof value === 'string') {
                          setDateRange([value, null])
                          field.onChange(value)
                        } else {
                          setDateRange(null)
                          field.onChange('')
                          form.setValue('duration', undefined)
                        }
                      }}
                      placeholder="Select date and time range..."
                      data-testid={formatDataTestId('job-interview-form', 'scheduled-at-input')}
                      captionLayout="dropdown"
                      outputFormat="iso"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interview Status */}
            <FormField
              control={form.control}
              name="jobInterviewStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Status</FormLabel>
                  <FormControl>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger data-testid={formatDataTestId('job-interview-form', 'status-select')}>
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={JobInterviewStatus.SCHEDULED}>Scheduled</SelectItem>
                        <SelectItem value={JobInterviewStatus.COMPLETED}>Completed</SelectItem>
                        <SelectItem value={JobInterviewStatus.CANCELLED}>Cancelled</SelectItem>
                        <SelectItem value={JobInterviewStatus.NO_SHOW}>No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting Type Selection */}
            <FormField
              control={form.control}
              name="meetingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Type</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="gba:flex gba:gap-4">
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="everyone" id="everyone" />
                        <Label htmlFor="everyone">EveryOne Meeting</Label>
                      </div>
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="external" id="external" />
                        <Label htmlFor="external">External Meeting</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Fields based on Meeting Type */}
            {meetingType === 'external' && (
              <>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Conference Room A, Building 2"
                          data-testid={formatDataTestId('job-interview-form', 'location-input')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meetingLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Link</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          {...field}
                          placeholder="https://meet.example.com/interview-123"
                          data-testid={formatDataTestId('job-interview-form', 'meeting-link-input')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          {/* Participants Multi-Select */}
          <div className="gba:space-y-4">
            <FormLabel>Participants</FormLabel>

            {/* Selected Participants Display */}
            {participants.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {participants.map((participant, index) => {
                  let displayName = ''
                  let badgeKey = ''

                  if (participant.employeeId) {
                    const employee = selectedEmployees.get(participant.employeeId)
                    displayName = employee?.displayName || `Employee: ${participant.employeeId}`
                    badgeKey = `employee-${participant.employeeId}`
                  } else if (participant.jobCandidateId) {
                    displayName = candidateName || `Candidate: ${participant.jobCandidateId}`
                    badgeKey = `candidate-${participant.jobCandidateId}`
                  } else if (participant.userId) {
                    displayName = `External: ${participant.userId}`
                    badgeKey = `user-${participant.userId}`
                  }

                  return (
                    <Badge
                      key={badgeKey}
                      variant="secondary"
                      className="gba:flex gba:items-center gba:gap-1.5 gba:pr-1.5 gba:pl-1 gba:py-0.5"
                    >
                      <span className="gba:text-xs">{displayName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(index)}
                        className="gba:ml-1 gba:rounded-full hover:gba:bg-destructive hover:gba:text-destructive-foreground gba:p-0.5"
                      >
                        <X className="gba:h-3 gba:w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}

            {/* Add Employee Participants */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm">Add Employees</Label>
              <MultiEmployeeSelect
                value={participants.filter(p => p.employeeId).map(p => p.employeeId!)}
                onValueChange={employeeIds => {
                  const currentEmployeeIds = participants.filter(p => p.employeeId).map(p => p.employeeId!)
                  const currentEmployeeIdsSet = new Set(currentEmployeeIds)
                  const employeeIdsSet = new Set(employeeIds)
                  const newEmployeeIds = employeeIds.filter(id => !currentEmployeeIdsSet.has(id))
                  const removedEmployeeIds = new Set(currentEmployeeIds.filter(id => !employeeIdsSet.has(id)))

                  setParticipants(prev => {
                    const withoutRemoved = prev.filter(p => !p.employeeId || !removedEmployeeIds.has(p.employeeId))
                    const newParticipants = newEmployeeIds.map(id => ({ employeeId: id }))
                    return [...withoutRemoved, ...newParticipants]
                  })
                }}
                onEmployeesChange={employees => {
                  setSelectedEmployees(prev => {
                    const newMap = new Map(prev)
                    employees.forEach(emp => {
                      if (emp.id) {
                        newMap.set(emp.id, emp)
                      }
                    })
                    return newMap
                  })
                }}
                accessToken={accessToken || ''}
                placeholder="Search employees..."
                data-testid={formatDataTestId('job-interview-form', 'employee-select')}
              />
            </div>

            {/* External User IDs */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm">External Participants (User IDs)</Label>
              {externalUserIds.map((userId, index) => (
                <div key={`external-user-${userId}-${index}`} className="gba:flex gba:gap-2">
                  <Input
                    type="text"
                    value={userId}
                    onChange={e => handleExternalUserIdChange(index, e.target.value)}
                    placeholder="Enter user ID..."
                    data-testid={formatDataTestId('job-interview-form', `external-user-${index}`)}
                  />
                  {externalUserIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExternalUserId(index)}
                      className="gba:px-2 gba:py-1 gba:rounded gba:border gba:border-border hover:gba:bg-destructive hover:gba:text-destructive-foreground"
                    >
                      <X className="gba:h-4 gba:w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddExternalUserId}
                className="gba:text-sm gba:text-muted-foreground hover:gba:text-foreground"
              >
                + Add External Participant
              </button>
            </div>
          </div>
        </div>
      </Form>
    </AppActionForm>
  )
}

export default JobInterviewForm
