import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobOffer } from '@/common/data/recruiting/hooks/useJobOffer'
import { buildJobOfferPayload } from '@/common/data/recruiting/payloads/jobOfferPayloads'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { JobApplicationSelect } from '@/common/components/recruiting/form-components/job-application-select'
import { JobPositionSelect } from '@/common/components/recruiting/form-components/job-position-select'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea
} from '@newwork/nw-design-system'
import { JobOfferStatus } from '@/common/data/recruiting/types/enums'

const jobOfferSchema = z.object({
  id: z.string().nullish(),
  version: z.number().nullish(),
  offerDate: z.string().nullish(),
  decisionDate: z.string().nullish(),
  expirationDate: z.string().nullish(),
  workingConditions: z.any().optional(),
  jobOfferStatus: z.nativeEnum(JobOfferStatus).optional(),
  jobApplicationId: z.string().min(1, 'Job Application is required'),
  jobPositionId: z.string().nullish(),
  contractDocumentId: z.string().nullish(),
  additionalProperties: z.any().optional()
})

type JobOfferFormProps = BusinessAppContextProps

const JobOfferForm: React.FC<JobOfferFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobOfferId =
    additionalData?.jobOfferId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobOfferId || undefined

  const initialJobApplicationId = useMemo(() => {
    return (
      additionalData?.jobApplicationId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationId ||
      undefined
    )
  }, [additionalData])

  const { jobOffer, loading, error } = useJobOffer(accessToken || '', jobOfferId)

  const initialDefaultValues = useMemo(() => {
    const baseValues = mapToFormValues(jobOffer || {}, jobOfferSchema) as any

    // Pre-fill from context if available
    if (!jobOfferId) {
      const currentDate = new Date().toISOString().split('T')[0]
      return {
        ...baseValues,
        jobApplicationId: initialJobApplicationId || baseValues.jobApplicationId,
        offerDate: baseValues.offerDate || currentDate,
        jobOfferStatus: baseValues.jobOfferStatus || JobOfferStatus.DRAFT
      }
    }

    return baseValues
  }, [jobOffer, jobOfferId, initialJobApplicationId])

  const form = useForm({
    resolver: zodResolver(jobOfferSchema),
    defaultValues: initialDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const jobOfferRef = useRef(jobOffer)
  useEffect(() => {
    if (jobOfferRef.current?.id !== jobOffer?.id) {
      form.reset(mapToFormValues(jobOffer || {}, jobOfferSchema) as any)
      jobOfferRef.current = jobOffer
    }
  }, [jobOffer?.id, jobOffer, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const jobOfferPayload = buildJobOfferPayload(data)
      return {
        jobOffer: jobOfferPayload,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting job offer:', error)
      throw error
    }
  }, [])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job offer data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-offer-form" />
  }

  const handleCancel = async () => {}

  const processType = jobOffer?.id ? 'update' : 'create'

  return (
    <AppActionForm
      processType={processType}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={form.getValues()}
      form={form}
      schema={jobOfferSchema}
      data-testid={formatDataTestId('job-offer-form', 'Form')}
      submitButtonText={jobOffer?.id ? 'Update Job Offer' : 'Create Job Offer'}
      isSubmitDisabled={loading}
    >
      <Form {...form}>
        <div className="gba:space-y-4">
          {/* Job Application Selection (Required) */}
          <FormField
            control={form.control}
            name="jobApplicationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Job Application <span className="gba:text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <JobApplicationSelect
                    value={field.value || null}
                    onValueChange={field.onChange}
                    businessAppContext={{ accessToken, userInfo, additionalData }}
                    placeholder="Select job application..."
                    data-testid={formatDataTestId('job-offer-form', 'job-application-select')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Offer Date */}
          <FormField
            control={form.control}
            name="offerDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Offer Date</FormLabel>
                <FormControl>
                  <DateInput
                    type="date"
                    value={field.value || ''}
                    onChange={value => field.onChange(value || '')}
                    placeholder="Select offer date..."
                    data-testid={formatDataTestId('job-offer-form', 'offer-date-input')}
                    captionLayout="dropdown"
                    outputFormat="iso"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {/* Expiration Date */}
            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date</FormLabel>
                  <FormControl>
                    <DateInput
                      type="date"
                      value={field.value || ''}
                      onChange={value => field.onChange(value || '')}
                      placeholder="Select expiration date..."
                      data-testid={formatDataTestId('job-offer-form', 'expiration-date-input')}
                      captionLayout="dropdown"
                      outputFormat="iso"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Decision Date */}
            <FormField
              control={form.control}
              name="decisionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision Date</FormLabel>
                  <FormControl>
                    <DateInput
                      type="date"
                      value={field.value || ''}
                      onChange={value => field.onChange(value || '')}
                      placeholder="Select decision date..."
                      data-testid={formatDataTestId('job-offer-form', 'decision-date-input')}
                      captionLayout="dropdown"
                      outputFormat="iso"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Job Offer Status */}
          <FormField
            control={form.control}
            name="jobOfferStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Offer Status</FormLabel>
                <FormControl>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger data-testid={formatDataTestId('job-offer-form', 'status-select')}>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={JobOfferStatus.DRAFT}>Draft</SelectItem>
                      <SelectItem value={JobOfferStatus.SUBMITTED}>Submitted</SelectItem>
                      <SelectItem value={JobOfferStatus.ACCEPTED}>Accepted</SelectItem>
                      <SelectItem value={JobOfferStatus.DECLINED}>Declined</SelectItem>
                      <SelectItem value={JobOfferStatus.WITHDRAWN}>Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Job Position Selection */}
          <FormField
            control={form.control}
            name="jobPositionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Position</FormLabel>
                <FormControl>
                  <JobPositionSelect
                    value={field.value || null}
                    onValueChange={field.onChange}
                    businessAppContext={{ accessToken, userInfo, additionalData }}
                    placeholder="Select job position..."
                    data-testid={formatDataTestId('job-offer-form', 'job-position-select')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contract Document ID */}
          <FormField
            control={form.control}
            name="contractDocumentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Document ID</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter contract document ID..."
                    data-testid={formatDataTestId('job-offer-form', 'contract-document-input')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Working Conditions (JSONB field) */}
          <FormField
            control={form.control}
            name="workingConditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Working Conditions</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={typeof field.value === 'string' ? field.value : JSON.stringify(field.value || '', null, 2)}
                    onChange={e => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        field.onChange(parsed)
                      } catch {
                        field.onChange(e.target.value)
                      }
                    }}
                    placeholder="Enter working conditions as JSON..."
                    className="gba:min-h-[100px] gba:font-mono gba:text-sm"
                    data-testid={formatDataTestId('job-offer-form', 'working-conditions-input')}
                  />
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

export default JobOfferForm
