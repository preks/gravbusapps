import React, { useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface InvestmentDeletePopupValues {
  investmentId: string
}

export interface InvestmentDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentDeletePopupValues>
}

interface InvestmentData {
  id: string
  version: number
  name: string
  code?: string
  investmentGroup?: {
    id: string
    value: string
  }
  investmentType?: {
    id: string
    value: string
  }
  investmentStatus?: {
    id: string
    value: string
  }
}

const prefixDataTestId = 'InvestmentDeletePopup'

const InvestmentDeletePopup: React.FC<InvestmentDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const [investment, setInvestment] = useState<InvestmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  // Extract investment ID from additionalData (matching investment-popup pattern)
  const investmentId =
    props.additionalData?.investmentId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId ||
    props.additionalData?.id ||
    initialValues?.investmentId ||
    ''

  // Load investment data
  useEffect(() => {
    const loadInvestment = async () => {
      if (!investmentId || !props.accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel(
            'investment.delete.error.noId',
            'Investment ID not provided or access token missing'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetInvestment($id: uuid!) {
            Investment(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              name
              code
              investmentGroup {
                id
                value
              }
              investmentType {
                id
                value
              }
              investmentStatus {
                id
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{ Investment: any[] }>(query, { id: investmentId })

        if (!result?.Investment || result.Investment.length === 0) {
          setError(getTranslationFromI18nKeyAndLabel('investment.delete.error.notFound', 'Investment not found'))
          return
        }

        const inv = result.Investment[0]

        setInvestment({
          id: inv.id,
          version: inv.version || 0,
          name: inv.name || 'Unnamed Investment',
          code: inv.code,
          investmentGroup: inv.investmentGroup,
          investmentType: inv.investmentType,
          investmentStatus: inv.investmentStatus
        })
      } catch (err) {
        console.error('Failed to load investment:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('investment.delete.error.loadFailed', 'Failed to load investment')
        )
      } finally {
        setLoading(false)
      }
    }

    loadInvestment()
  }, [investmentId, props.accessToken, graphqlClient])

  // Submit handler for deletion
  const handleSubmit = async () => {
    if (!investment) {
      throw new Error(getTranslationFromI18nKeyAndLabel('investment.delete.error.noData', 'Investment data not loaded'))
    }

    // Prepare deletion payload matching the investment payload structure
    const deletePayload = {
      investmentRequest: {
        investment: {
          id: investment.id,
          version: investment.version,
          isDeleted: true
        }
      }
    }

    return deletePayload
  }

  // Validation function
  const validateForm = (): string[] | null => {
    if (!investment) {
      return [getTranslationFromI18nKeyAndLabel('investment.delete.error.noData', 'Investment data not loaded')]
    }
    return null
  }

  // Handle process completion - redirect to investment management
  const handleProcessCompletion = (detail: { resolution?: 'success' | 'failure' } | null) => {
    if (detail?.resolution === 'success') {
      const investmentManagementPath = '/platform/irm/investment-management'
      const isAlreadyOnInvestmentManagement = globalThis.location.pathname.startsWith(investmentManagementPath)
      if (!isAlreadyOnInvestmentManagement) {
        setTimeout(() => {
          navigateTo('/platform/irm/investment-management?view=investments')
        }, 100)
      }
    }
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('investment.delete.loading', 'Loading investment...')}</p>
      </div>
    )
  }

  if (error || !investment) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error || getTranslationFromI18nKeyAndLabel('investment.delete.error.failed', 'Failed to load investment')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ investmentId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      onProcessCompletion={handleProcessCompletion}
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {getTranslationFromI18nKeyAndLabel('investment.delete.title', 'Delete Investment')}
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
                  'investment.delete.confirmation.question',
                  'Are you sure you want to delete this investment?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {investment.name}
                  </Badge>
                </p>
                {investment.code && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('common.code', 'Code')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {investment.code}
                    </Badge>
                  </p>
                )}
                {investment.investmentGroup && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('investment.group', 'Group')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {investment.investmentGroup.value}
                    </Badge>
                  </p>
                )}
                {investment.investmentType && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('investment.type', 'Type')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {investment.investmentType.value}
                    </Badge>
                  </p>
                )}
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

export default InvestmentDeletePopup
export { InvestmentDeletePopup }
