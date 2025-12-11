import React from 'react'
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Spinner, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { BenefitDetailsList } from './components/BenefitDetailsList'
import { useBenefitReviewData } from './hooks/useBenefitReviewData'
import translations from '../_i18n'

export const RequestEmployeeBenefitReview: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const { t } = useTranslation(translations)
  const form: UseFormReturn<FieldValues> = useForm({
    defaultValues: {},
    mode: 'onChange'
  })

  const { employeeName, initiatorName, displayItems, benefitDetails, employee, isLoading, error } =
    useBenefitReviewData({
      accessToken,
      additionalData,
      userInfo,
      t
    })

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="request-employee-benefit-review-loading"
      >
        <Spinner
          size="lg"
          srText={t('request-benefit-review-loading', { defaultValue: 'Loading benefit review data...' })}
        />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="gba:max-w-[1200px] gba:mx-auto gba:p-6" data-testid="request-employee-benefit-review-error">
        <Alert variant="destructive">
          <AlertTitle>{t('request-benefit-review-error-title', { defaultValue: 'Unable to Load Data' })}</AlertTitle>
          <AlertDescription>
            {t('request-benefit-review-error-description', { defaultValue: 'Failed to load employee benefit data' })}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Build title with employee name
  const titleText = t('request-benefit-review-title', {
    employeeName: employeeName || '',
    defaultValue: 'Employee Benefit Review for {employeeName}'
  })

  // Build initiator subtitle
  const initiatorText = initiatorName
    ? t('request-benefit-review-initiated-by', {
        initiatorName,
        defaultValue: 'Initiated by {initiatorName}'
      })
    : ''

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1200px]"
      data-testid="request-employee-benefit-review-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} employee={employee} />

      {/* Initiator subtitle */}
      {initiatorText && (
        <div
          className="gba:px-6 gba:-mt-6 gba:mb-4 gba:text-sm gba:text-muted-foreground"
          data-testid="request-employee-benefit-review-initiator"
        >
          {initiatorText}
        </div>
      )}

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='request-employee-benefit-review']]:pt-0! gba:**:data-[testid='request-employee-benefit-review-form']:max-w-none!"
        data-testid="request-employee-benefit-review-form-content"
      >
        <AppActionForm
          processType="update"
          form={form}
          formData={{}}
          submitEventType="pse_submit"
          cancelEventType="pse_cancel"
          submitButtonText={t('request-benefit-review-approve', { defaultValue: 'Approve' })}
          cancelButtonText={t('request-benefit-review-reject', { defaultValue: 'Reject' })}
          submitButtonTestId="request-employee-benefit-review-confirm-button"
          cancelButtonTestId="request-employee-benefit-review-cancel-button"
          onSubmit={async () => {
            return {
              approval: 'approved'
            }
          }}
          onCancel={async () => {
            return {
              approval: 'rejected'
            }
          }}
          data-testid="request-employee-benefit-review"
        >
          {/* Benefit Details Section */}
          <div className="gba:mb-6" data-testid="request-employee-benefit-review-details-section">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {t('request-benefit-review-benefit-details', { defaultValue: 'Benefit Details' })}
            </h3>
            <BenefitDetailsList items={displayItems} dataTestIdPrefix="request-employee-benefit-review" t={t} />
          </div>

          {/* Additional Information Section - Justification */}
          {benefitDetails?.justification && (
            <div className="gba:mb-4 gba:space-y-3" data-testid="request-employee-benefit-review-info-section">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                {t('request-benefit-review-additional-info', { defaultValue: 'Additional Information' })}
              </h3>

              {/* Justification */}
              <div data-testid="request-employee-benefit-review-justification">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {t('request-benefit-review-justification', { defaultValue: 'Justification' })}
                </div>
                <div className="gba:font-medium gba:whitespace-pre-wrap">{benefitDetails.justification}</div>
              </div>
            </div>
          )}
        </AppActionForm>
      </div>
    </div>
  )
}

export default RequestEmployeeBenefitReview
