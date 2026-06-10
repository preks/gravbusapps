import React, { useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Alert, AlertDescription, Badge, Spinner, useTranslation } from '@newwork/nw-design-system'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import translations from '../../_i18n'

export interface SalesCampaignDeletePopupValues {
  campaignId: string
}

export interface SalesCampaignDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<SalesCampaignDeletePopupValues>
}

interface SalesCampaignData {
  id: string
  version: number
  name: string
  description?: string
  createdAt: string
}

const prefixDataTestId = 'crm-sales-campaign-delete-popup'

const SalesCampaignDeletePopup: React.FC<SalesCampaignDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const { t } = useTranslation(translations)
  const [campaign, setCampaign] = useState<SalesCampaignData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  const campaignId =
    props.additionalData?.campaignId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.campaignId ||
    props.additionalData?.id ||
    initialValues?.campaignId ||
    ''

  useEffect(() => {
    const loadCampaign = async () => {
      if (!campaignId || !props.accessToken) {
        setError(t('salesCampaign-delete-error-noId'))
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetSalesCampaign($id: uuid!) {
            SalesCampaign(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              name
              description
              createdAt
            }
          }
        `

        const result = await graphqlClient.request<{ SalesCampaign: any[] }>(query, { id: campaignId })

        if (!result?.SalesCampaign || result.SalesCampaign.length === 0) {
          setError(t('salesCampaign-delete-error-notFound'))
          return
        }

        const camp = result.SalesCampaign[0]

        setCampaign({
          id: camp.id,
          version: camp.version || 0,
          name: camp.name || 'Unnamed Sales Campaign',
          description: camp.description,
          createdAt: camp.createdAt
        })
      } catch (err) {
        console.error('Failed to load sales campaign:', err)
        setError(err instanceof Error ? err.message : t('salesCampaign-delete-error-loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    loadCampaign()
  }, [campaignId, props.accessToken, graphqlClient])

  const handleSubmit = async () => {
    if (!campaign) {
      throw new Error(t('salesCampaign-delete-error-noData'))
    }

    const deletePayload = {
      salesCampaign: {
        id: campaign.id,
        version: campaign.version,
        isDeleted: true
      }
    }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!campaign) {
      return [t('salesCampaign-delete-error-noData')]
    }
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{t('salesCampaign-delete-loading')}</p>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error || t('salesCampaign-delete-error-failed')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const displayName = campaign.name || 'Unnamed Sales Campaign'

  // Check if we should redirect after delete
  // Auto-detect if we're on a campaign record page by checking the current URL
  const isOnRecordPage = globalThis.location.pathname.includes('/campaign-record')

  // If on record page, redirect to campaigns list after delete
  const handleProcessCompletion = isOnRecordPage
    ? (detail: { resolution?: 'success' | 'failure' } | null) => {
        if (detail?.resolution === 'success') {
          setTimeout(() => {
            navigateTo('/platform/crm/customer-relations?view=campaigns')
          }, 100)
        }
      }
    : undefined

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ campaignId }}
      validateForm={validateForm}
      submitButtonText={t('common-delete')}
      submitButtonVariant="destructive"
      onProcessCompletion={handleProcessCompletion}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {t('salesCampaign-delete-title')}
          </h2>
        </div>

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(prefixDataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:shrink-0">
              <svg className="gba:h-5 gba:w-5 gba:text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-destructive">
                {t('salesCampaign-delete-confirmation-question')}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{t('common-name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {displayName}
                  </Badge>
                </p>
                <p className="gba:mt-1">
                  <strong>{t('common-createdAt')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {formatDate(campaign.createdAt)}
                  </Badge>
                </p>
                <p className="gba:mt-2 gba:font-medium gba:text-destructive">{t('common-deleteWarning')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default SalesCampaignDeletePopup
export { SalesCampaignDeletePopup }
