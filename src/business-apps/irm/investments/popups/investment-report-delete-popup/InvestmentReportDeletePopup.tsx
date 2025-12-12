import React, { useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'

export interface InvestmentReportDeletePopupValues {
  investmentReportId: string
}

export interface InvestmentReportDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentReportDeletePopupValues>
}

interface InvestmentReportData {
  id: string
  version: number
  date: string
  investmentMarketValue?: number
  investment?: {
    id: string
    name: string
    code?: string
  }
  investmentPhase?: {
    id: string
    value: string
  }
  currency?: {
    id: string
    value: string
  }
}

const prefixDataTestId = 'InvestmentReportDeletePopup'

const InvestmentReportDeletePopup: React.FC<InvestmentReportDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const [investmentReport, setInvestmentReport] = useState<InvestmentReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  // Extract investment report ID from additionalData
  const investmentReportId =
    props.additionalData?.investmentReportId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.investmentReportId ||
    props.additionalData?.id ||
    initialValues?.investmentReportId ||
    ''

  // Load investment report data
  useEffect(() => {
    const loadInvestmentReport = async () => {
      if (!investmentReportId || !props.accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel(
            'investmentReport.delete.error.noId',
            'Investment Report ID not provided or access token missing'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetInvestmentReport($id: uuid!) {
            InvestmentReport(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              date
              investmentMarketValue
              investment {
                id
                name
                code
              }
              investmentPhase {
                id
                value
              }
              currency {
                id
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentReport: any[] }>(query, { id: investmentReportId })

        if (!result?.InvestmentReport || result.InvestmentReport.length === 0) {
          setError(
            getTranslationFromI18nKeyAndLabel('investmentReport.delete.error.notFound', 'Investment Report not found')
          )
          return
        }

        const report = result.InvestmentReport[0]

        setInvestmentReport({
          id: report.id,
          version: report.version || 0,
          date: report.date || '',
          investmentMarketValue: report.investmentMarketValue,
          investment: report.investment,
          investmentPhase: report.investmentPhase,
          currency: report.currency
        })
      } catch (err) {
        console.error('Failed to load investment report:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel(
                'investmentReport.delete.error.loadFailed',
                'Failed to load investment report'
              )
        )
      } finally {
        setLoading(false)
      }
    }

    loadInvestmentReport()
  }, [investmentReportId, props.accessToken, graphqlClient])

  // Submit handler for deletion
  const handleSubmit = async () => {
    if (!investmentReport) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investmentReport.delete.error.noData', 'Investment Report data not loaded')
      )
    }

    // Prepare deletion payload matching the investment report payload structure
    const deletePayload = {
      investmentReportRequest: {
        investmentReport: {
          id: investmentReport.id,
          version: investmentReport.version,
          isDeleted: true
        }
      }
    }

    return deletePayload
  }

  // Validation function
  const validateForm = (): string[] | null => {
    if (!investmentReport) {
      return [
        getTranslationFromI18nKeyAndLabel('investmentReport.delete.error.noData', 'Investment Report data not loaded')
      ]
    }
    return null
  }

  // Handle process completion - close popup and refresh data
  const handleProcessCompletion = (detail: { resolution?: 'success' | 'failure' } | null) => {
    if (detail?.resolution === 'success') {
      // The parent component (Investment Record) will handle data refresh via useProcessCompletion
      // Just close the popup
      console.log('Investment Report deleted successfully')
    }
  }

  // Format date for display
  const formatReportDate = (dateString: string): string => {
    if (!dateString) return '-'
    try {
      const formatted = formatDate(dateString, 'date.short')
      if (formatted && !formatted.includes('T')) {
        return formatted
      }
      const dateObj = new Date(dateString)
      if (Number.isNaN(dateObj.getTime())) return '-'
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  // Format currency amount
  const formatAmount = (amount?: number, currency?: { value: string }): string => {
    if (amount === undefined || amount === null) return '-'
    try {
      const currencyCode = currency?.value || 'EUR'
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    } catch {
      return `${amount}`
    }
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('investmentReport.delete.loading', 'Loading investment report...')}</p>
      </div>
    )
  }

  if (error || !investmentReport) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error ||
              getTranslationFromI18nKeyAndLabel(
                'investmentReport.delete.error.failed',
                'Failed to load investment report'
              )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ investmentReportId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
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
            {getTranslationFromI18nKeyAndLabel('investmentReport.delete.title', 'Delete Investment Report')}
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
                  'investmentReport.delete.confirmation.question',
                  'Are you sure you want to delete this investment report?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('investmentReport.date', 'Report Date')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {formatReportDate(investmentReport.date)}
                  </Badge>
                </p>
                {investmentReport.investment && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('investment.name', 'Investment')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {investmentReport.investment.name}
                      {investmentReport.investment.code && ` (${investmentReport.investment.code})`}
                    </Badge>
                  </p>
                )}
                {investmentReport.investmentMarketValue !== undefined && (
                  <p className="gba:mt-1">
                    <strong>
                      {getTranslationFromI18nKeyAndLabel('investmentReport.marketValue', 'Market Value')}:
                    </strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {formatAmount(investmentReport.investmentMarketValue, investmentReport.currency)}
                    </Badge>
                  </p>
                )}
                {investmentReport.investmentPhase && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('investment.phase', 'Phase')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {investmentReport.investmentPhase.value}
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

export default InvestmentReportDeletePopup
export { InvestmentReportDeletePopup }
