import React, { useMemo, useEffect } from 'react'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { useCampaignEntityById } from '@/common/data/customer/hooks/useCampaignEntityData'
import { GET_CAMPAIGN_CONTENT_BY_ID } from '@/common/data/customer/queries/customerCampaignContentQueries'
import type { CustomerCampaignContent } from '@/common/data/customer/types/customerCampaignContentTypes'
import { ErrorAlert } from '@/components/error-alert'
import { CatalogSelect } from '@/components/catalog-select'
import translations from '../../_i18n'
import {
  CUSTOMER_PERSONA,
  MARKETING_CHANNEL,
  MARKETING_DISTRIBUTION_TYPE,
  CAMPAIGN_EVENT_FUNNEL_STAGE
} from '@/common/data/customer/constants/customerCatalogs'
import {
  createContentFormResolver,
  createContentSchema,
  defaultContentFormValues,
  type CampaignContentFormValues
} from './campaignContentFormSchema'
import { engagementMetricsToFormState, formStateToEngagementMetrics } from './engagementMetricsUtils'
import { EngagementMetricsFields } from './EngagementMetricsFields'

export type { CampaignContentFormValues }

export interface CampaignContentFormProps extends BusinessAppContextProps {
  onSuccess?: (data: CampaignContentFormValues) => void
  onCancel?: () => void
}

const CampaignContentFormInner: React.FC<CampaignContentFormProps> = ({
  accessToken,
  additionalData,
  onSuccess,
  onCancel
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
  const contentId =
    ((additionalData as Record<string, unknown>)?.contentId as string | undefined) ||
    (initialParameters?.contentId as string | undefined)

  const isUpdateMode = !!contentId
  const {
    entity: content,
    loading: contentLoading,
    error
  } = useCampaignEntityById<CustomerCampaignContent>(
    accessToken || '',
    contentId,
    GET_CAMPAIGN_CONTENT_BY_ID(),
    'CustomerCampaignContentByPk',
    'Failed to load content'
  )

  const validationMessages = useMemo(
    () => ({
      metricKeyRequired: t('campaign-content-metricKey-required'),
      metricValueRequired: t('campaign-content-metricValue-required'),
      metricKeyReserved: t('campaign-content-metricKey-reserved'),
      metricKeyDuplicate: t('campaign-content-metricKey-duplicate')
    }),
    [t]
  )

  const contentSchema = useMemo(() => createContentSchema(validationMessages), [validationMessages])
  const formResolver = useMemo(() => createContentFormResolver(validationMessages), [validationMessages])

  const form = useForm<CampaignContentFormValues>({
    resolver: formResolver,
    defaultValues: defaultContentFormValues
  })

  useEffect(() => {
    if (content) {
      form.reset({
        title: content.title || '',
        description: content.description || '',
        publishDate: content.publishDate ? content.publishDate.split('T')[0] : '',
        assistedOpportunities: content.assistedOpportunities ?? undefined,
        engagementMetrics: engagementMetricsToFormState(content.engagementMetrics),
        persona: content.customerPersona?.id || content.customerPersona?.value || '',
        funnelStage: content.marketingFunnelStage?.id || content.marketingFunnelStage?.value || '',
        channel: content.marketingChannel?.id || content.marketingChannel?.value || '',
        distributionType: content.marketingDistributionType?.id || content.marketingDistributionType?.value || ''
      })
    }
  }, [content, form])

  const handleSubmit = async (data: CampaignContentFormValues) => {
    const engagementMetricsObject = formStateToEngagementMetrics(data.engagementMetrics)
    // The backend stores engagementMetrics as a serialized JSON string, so send a string
    // (sending the raw object triggers a 400 "Cannot deserialize value of type java.lang.String").
    const engagementMetrics = engagementMetricsObject ? JSON.stringify(engagementMetricsObject) : null

    const payload: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      publishDate: data.publishDate,
      assistedOpportunities: data.assistedOpportunities,
      engagementMetrics,
      customerCampaignId: campaignId,
      customerPersonaRef: data.persona || undefined,
      marketingFunnelStageRef: data.funnelStage || undefined,
      marketingChannelRef: data.channel || undefined,
      marketingDistributionTypeRef: data.distributionType || undefined
    }
    if (isUpdateMode && content) {
      payload.id = content.id
      payload.version = content.version
    } else {
      payload.version = 0
    }
    return { customerCampaignContent: payload }
  }

  const errors: Array<{ error?: string | Error; type?: string; context?: string }> = []
  if (!accessToken) errors.push({ type: 'accessToken' })
  if (error) errors.push({ error, context: 'Failed to load content' })

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="campaign-content-form" />
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
      schema={contentSchema}
      submitButtonText={t('common-save')}
      cancelButtonText={t('common-cancel')}
      data-testid="campaign-content-form"
      isSubmitDisabled={contentLoading && isUpdateMode}
    >
      <div className="gba:space-y-4" data-testid="campaign-content-form-fields">
        <h2 className="gba:text-xl gba:font-semibold">
          {isUpdateMode ? t('campaign-content-editTitle') : t('campaign-content-addTitle')}
        </h2>
        <Form {...form}>
          <div className="gba:space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('campaign-content-title')} <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('campaign-content-title-placeholder')}
                      data-testid="content-form-title"
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
                      placeholder={t('campaign-content-description-placeholder')}
                      data-testid="content-form-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="publishDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('campaign-content-publishDate')}</FormLabel>
                  <FormControl>
                    <DateInput
                      type="date"
                      value={field.value || ''}
                      onChange={value => field.onChange(typeof value === 'string' ? value : '')}
                      placeholder={t('campaign-content-publishDate-placeholder')}
                      data-testid="content-form-publish-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="persona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-content-persona')}</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={CUSTOMER_PERSONA}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        data-testid="content-form-persona"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="funnelStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-content-funnelStage')}</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={CAMPAIGN_EVENT_FUNNEL_STAGE}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        data-testid="content-form-funnel"
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
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-content-channel')}</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={MARKETING_CHANNEL}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        data-testid="content-form-channel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="distributionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('campaign-content-distribution')}</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={MARKETING_DISTRIBUTION_TYPE}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        data-testid="content-form-distribution"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="assistedOpportunities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('campaign-content-assistedOpps')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" data-testid="content-form-assisted-opps" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <EngagementMetricsFields />
          </div>
        </Form>
      </div>
    </AppActionForm>
  )
}

export const CampaignContentForm: React.FC<CampaignContentFormProps> = props => {
  return (
    <CatalogSelect.Provider<CampaignContentFormValues> {...props}>
      <CampaignContentFormInner {...props} />
    </CatalogSelect.Provider>
  )
}

export default CampaignContentForm
