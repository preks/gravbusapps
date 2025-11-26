import React, { useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface LeadDeletePopupValues {
  leadId: string
}

export interface LeadDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<LeadDeletePopupValues>
}

interface LeadData {
  id: string
  version: number
  name: string
  firstName?: string
  lastName?: string
  investmentName?: string
  createdAt: string
  ownerEmployee?: {
    firstName: string
    lastName: string
  }
}

const prefixDataTestId = 'irm-lead-delete-popup'

const LeadDeletePopup: React.FC<LeadDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const [lead, setLead] = useState<LeadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  const leadId =
    props.additionalData?.leadId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    props.additionalData?.id ||
    initialValues?.leadId ||
    ''

  useEffect(() => {
    const loadLead = async () => {
      if (!leadId || !props.accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel('lead.delete.error.noId', 'Lead ID not provided or access token missing')
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetInvestmentLead($id: uuid!) {
            InvestmentLead(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              name
              firstName
              lastName
              investmentName
              createdAt
              ownerEmployee {
                firstName
                lastName
              }
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentLead: any[] }>(query, { id: leadId })

        if (!result?.InvestmentLead || result.InvestmentLead.length === 0) {
          setError(getTranslationFromI18nKeyAndLabel('lead.delete.error.notFound', 'Lead not found'))
          return
        }

        const leadData = result.InvestmentLead[0]

        setLead({
          id: leadData.id,
          version: leadData.version || 0,
          name:
            leadData.name ||
            leadData.investmentName ||
            `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim() ||
            'Unnamed Lead',
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          investmentName: leadData.investmentName,
          createdAt: leadData.createdAt,
          ownerEmployee: leadData.ownerEmployee
        })
      } catch (err) {
        console.error('Failed to load investment lead:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('lead.delete.error.loadFailed', 'Failed to load lead')
        )
      } finally {
        setLoading(false)
      }
    }

    loadLead()
  }, [leadId, props.accessToken, graphqlClient])

  const handleSubmit = async () => {
    if (!lead) {
      throw new Error(getTranslationFromI18nKeyAndLabel('lead.delete.error.noData', 'Lead data not loaded'))
    }

    const deletePayload = {
      investmentLead: {
        id: lead.id,
        version: lead.version,
        isDeleted: true
      }
    }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!lead) {
      return [getTranslationFromI18nKeyAndLabel('lead.delete.error.noData', 'Lead data not loaded')]
    }
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('lead.delete.loading', 'Loading lead...')}</p>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error || getTranslationFromI18nKeyAndLabel('lead.delete.error.failed', 'Failed to load lead')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const ownerName = lead.ownerEmployee
    ? `${lead.ownerEmployee.firstName} ${lead.ownerEmployee.lastName}`
    : getTranslationFromI18nKeyAndLabel('common.notAssigned', 'Not Assigned')

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ leadId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {getTranslationFromI18nKeyAndLabel('lead.delete.title', 'Delete Investment Lead')}
          </h2>
        </div>

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(prefixDataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:flex-shrink-0">
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
                {getTranslationFromI18nKeyAndLabel(
                  'lead.delete.confirmation.question',
                  'Are you sure you want to delete this investment lead?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {lead.name}
                  </Badge>
                </p>
                <p className="gba:mt-1">
                  <strong>{getTranslationFromI18nKeyAndLabel('common.createdAt', 'Created At')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {new Date(lead.createdAt).toLocaleString()}
                  </Badge>
                </p>
                <p className="gba:mt-1">
                  <strong>{getTranslationFromI18nKeyAndLabel('common.owner', 'Owner')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {ownerName}
                  </Badge>
                </p>
                <p className="gba:mt-2 gba:font-medium gba:text-destructive">
                  {getTranslationFromI18nKeyAndLabel('common.deleteWarning', 'This action cannot be undone.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default LeadDeletePopup
export { LeadDeletePopup }
