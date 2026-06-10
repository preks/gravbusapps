import React, { useMemo, useEffect, useCallback, useState } from 'react'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Switch,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { useCampaignEntityById } from '@/common/data/customer/hooks/useCampaignEntityData'
import { GET_CAMPAIGN_EVENT_BY_ID } from '@/common/data/customer/queries/customerCampaignEventQueries'
import type { CustomerCampaignEvent } from '@/common/data/customer/types/customerCampaignEventTypes'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { ErrorAlert } from '@/components/error-alert'
import translations from '../../_i18n'
import EmployeeSelect from '@/components/employee-select/EmployeeSelect'
import { AccountSegment } from '@/common/components/common-relations/form-segments/account-segment'
import { toAccountSegmentOptions } from '@/business-apps/crm/campaigns/_shared/accountSegmentOptions'

const optionalNumber = z.preprocess(
  value => (value === '' || value == null ? undefined : value),
  z.coerce.number().min(0).optional()
)

const optionalInteger = z.preprocess(
  value => (value === '' || value == null ? undefined : value),
  z.coerce.number().int().min(0).optional()
)

const eventAccountRowSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  customerAccountId: z.string().min(1)
})

const eventSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  ownerEmployeeId: z.string().optional(),
  budget: optionalNumber,
  expectedMeetings: optionalInteger,
  meetingsHeld: optionalInteger,
  opportunitiesGenerated: optionalInteger,
  pipelineGenerated: optionalNumber,
  followUpComplete: z.boolean().optional(),
  customerCampaignEventAccounts: z.array(eventAccountRowSchema).optional()
})

type CampaignEventFormValues = z.infer<typeof eventSchema>

export interface CampaignEventFormProps extends BusinessAppContextProps {
  onSuccess?: (data: CampaignEventFormValues) => void
  onCancel?: () => void
}

export const CampaignEventForm: React.FC<CampaignEventFormProps> = ({
  accessToken,
  additionalData,
  onSuccess,
  onCancel,
  ...rest
}) => {
  const { t } = useTranslation(translations)
  const initialParameters = useMemo(
    () =>
      (additionalData as Record<string, unknown>)?.psi_taskPayload?.psi_initialParameters as
        | Record<string, unknown>
        | undefined,
    [additionalData]
  )
  const campaignId =
    ((additionalData as Record<string, unknown>)?.campaignId as string | undefined) ||
    (initialParameters?.campaignId as string | undefined)
  const eventId =
    ((additionalData as Record<string, unknown>)?.eventId as string | undefined) ||
    (initialParameters?.eventId as string | undefined)

  const isUpdateMode = !!eventId
  const {
    entity: event,
    loading: eventLoading,
    error
  } = useCampaignEntityById<CustomerCampaignEvent>(
    accessToken || '',
    eventId,
    GET_CAMPAIGN_EVENT_BY_ID(),
    'CustomerCampaignEventByPk',
    'Failed to load event'
  )

  const ctx = { accessToken, additionalData, ...rest } as BusinessAppContextProps
  const useAccounts = useCustomerAccountsList(ctx, { limit: 20 })

  const searchAccounts = useCallback(
    (search: string) => {
      useAccounts.search?.(search)
    },
    [useAccounts.search]
  )

  const accountOptions = useMemo(() => toAccountSegmentOptions(useAccounts.accounts), [useAccounts.accounts])

  const [loadedEventAccountContacts, setLoadedEventAccountContacts] = useState<
    Array<{
      accountId: string
      account: { id: string; name: string; pictureThumbnail?: string; website?: string }
    }>
  >([])

  const form = useForm<CampaignEventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      eventDate: '',
      budget: undefined,
      expectedMeetings: undefined,
      meetingsHeld: undefined,
      opportunitiesGenerated: undefined,
      pipelineGenerated: undefined,
      ownerEmployeeId: '',
      followUpComplete: false,
      customerCampaignEventAccounts: []
    }
  })

  useEffect(() => {
    if (event) {
      const eventAccounts =
        event.customerCampaignEventAccounts?.map(a => ({
          id: a.id,
          version: a.version,
          customerAccountId: a.customerAccountId
        })) ?? []

      setLoadedEventAccountContacts(
        event.customerCampaignEventAccounts?.map(a => ({
          accountId: a.customerAccountId,
          account: {
            id: a.customerAccount?.id ?? a.customerAccountId,
            name: a.customerAccount?.name ?? a.customerAccountId
          }
        })) ?? []
      )

      form.reset({
        name: event.name || '',
        description: event.description || '',
        eventDate: event.eventDate ? event.eventDate.split('T')[0] : '',
        budget: event.budget ?? undefined,
        expectedMeetings: event.expectedMeetings ?? undefined,
        meetingsHeld: event.meetingsHeld ?? undefined,
        opportunitiesGenerated: event.opportunitiesGenerated ?? undefined,
        pipelineGenerated: event.pipelineGenerated ?? undefined,
        ownerEmployeeId: event.ownerEmployeeId ?? event.ownerEmployee?.id ?? '',
        followUpComplete: event.followUpComplete ?? false,
        customerCampaignEventAccounts: eventAccounts
      })
    } else if (!eventId) {
      setLoadedEventAccountContacts([])
    }
  }, [event, eventId, form])

  const formAccountIds = form.watch('customerCampaignEventAccounts')?.map(row => row.customerAccountId) ?? []

  const eventAccountContacts = useMemo(() => {
    const result = [...loadedEventAccountContacts]
    formAccountIds.forEach(accountId => {
      if (result.some(row => row.accountId === accountId)) return
      const fromSearch = accountOptions.find(account => account.id === accountId)
      if (fromSearch) {
        result.push({
          accountId,
          account: {
            id: fromSearch.id,
            name: fromSearch.name,
            ...(fromSearch.pictureThumbnail && { pictureThumbnail: fromSearch.pictureThumbnail }),
            ...(fromSearch.extraInfo?.website && { website: fromSearch.extraInfo.website })
          }
        })
      }
    })
    return result
  }, [loadedEventAccountContacts, formAccountIds, accountOptions])

  const handleSubmit = async (data: CampaignEventFormValues) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      eventDate: data.eventDate,
      budget: data.budget,
      expectedMeetings: data.expectedMeetings,
      meetingsHeld: data.meetingsHeld,
      opportunitiesGenerated: data.opportunitiesGenerated,
      pipelineGenerated: data.pipelineGenerated,
      followUpComplete: data.followUpComplete,
      ownerEmployee: data.ownerEmployeeId?.trim() || null,
      customerCampaignId: campaignId
    }
    if (isUpdateMode && event) {
      payload.id = event.id
      payload.version = event.version
    } else {
      payload.version = 0
    }
    const customerCampaignEventAccountsPayload = (data.customerCampaignEventAccounts ?? []).map(row => {
      const item: Record<string, unknown> = { customerAccountId: row.customerAccountId }
      if (row.id != null) item.id = row.id
      if (row.version != null) item.version = row.version
      return item
    })
    payload.customerCampaignEventAccounts = {
      changeMode: 'REPLACE',
      customerCampaignEventAccounts: customerCampaignEventAccountsPayload
    }
    return { customerCampaignEvent: payload }
  }

  const errors: Array<{ error?: string | Error; type?: string; context?: string }> = []
  if (!accessToken) errors.push({ type: 'accessToken' })
  if (error) errors.push({ error, context: 'Failed to load event' })

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="campaign-event-form" />
  }

  const processType = isUpdateMode ? 'update' : 'create'

  return (
    <AppActionForm
      processType={processType}
      onSubmit={handleSubmit}
      onSuccess={() => onSuccess?.(form.getValues())}
      onCancel={onCancel}
      formData={form.getValues()}
      form={form}
      schema={eventSchema}
      submitButtonText={t('common-save')}
      cancelButtonText={t('common-cancel')}
      data-testid="campaign-event-form"
      isSubmitDisabled={eventLoading && isUpdateMode}
    >
      <div className="gba:space-y-4" data-testid="campaign-event-form-fields">
        <h2 className="gba:text-xl gba:font-semibold">
          {isUpdateMode ? t('campaign-events-editTitle') : t('campaign-events-addTitle')}
        </h2>
        <Form {...form}>
          <div className="gba:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('campaign-events-name')} <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('campaign-events-name-placeholder')}
                      data-testid="event-form-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('campaign-events-date')} <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <DateInput
                      type="date"
                      value={field.value || ''}
                      onChange={value => field.onChange(typeof value === 'string' ? value : '')}
                      placeholder={t('campaign-events-date-placeholder')}
                      data-testid="event-form-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ownerEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('campaign-owner-form-label')}</FormLabel>
                  <FormControl>
                    <EmployeeSelect
                      value={field.value || null}
                      onValueChange={(value: string | null) => field.onChange(value || '')}
                      businessAppContext={ctx}
                      initialEmployee={event?.ownerEmployee ?? null}
                      placeholder={t('campaign-owner-placeholder')}
                      data-testid="event-form-owner"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common-description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('campaign-events-description-placeholder')}
                      data-testid="event-form-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-events-budget')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="event-form-budget" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pipelineGenerated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-events-pipeline')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="event-form-pipeline"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="expectedMeetings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-events-expectedMeetings')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0" data-testid="event-form-expected-meetings" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meetingsHeld"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-events-meetingsHeld')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0" data-testid="event-form-meetings-held" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="opportunitiesGenerated"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('campaign-events-opps')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" data-testid="event-form-opps" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="followUpComplete"
              render={({ field }) => (
                <FormItem className="gba:flex gba:items-center gba:justify-between gba:rounded-lg gba:border gba:border-border gba:p-4">
                  <FormLabel className="gba:mb-0">{t('campaign-events-followUp')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="event-form-followup" />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="gba:border-t gba:pt-6">
              <FormItem>
                <FormLabel>{t('campaign-events-accounts')}</FormLabel>
                <FormControl>
                  <AccountSegment
                    fieldArrayName="customerCampaignEventAccounts"
                    accountIdFieldName="customerAccountId"
                    typeMode="accountOnly"
                    accountContacts={eventAccountContacts}
                    accounts={accountOptions}
                    accountsLoading={useAccounts.loading}
                    accountsError={useAccounts.error}
                    searchAccounts={searchAccounts}
                    hasMore={useAccounts.hasMore}
                    onLoadMore={useAccounts.loadMore}
                    dataTestId="event-form-accounts"
                  />
                </FormControl>
              </FormItem>
            </div>
          </div>
        </Form>
      </div>
    </AppActionForm>
  )
}

export default CampaignEventForm
