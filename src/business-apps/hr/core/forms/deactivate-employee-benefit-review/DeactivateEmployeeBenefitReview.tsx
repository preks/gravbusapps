import React from 'react'
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Spinner, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { BenefitDetailsList } from '../employee-benefit-review/components'
import { DeactivationDetailsList } from './components/DeactivationDetailsList'
import { useDeactivateBenefitReviewData } from './hooks/useDeactivateBenefitReviewData'
import translations from '../_i18n'

export const DeactivateEmployeeBenefitReview: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const { t } = useTranslation(translations)
  const form: UseFormReturn<FieldValues> = useForm({
    defaultValues: {},
    mode: 'onChange'
  })

  const { initiatorName, displayItems, deactivationDetails, employee, isLoading, error } =
    useDeactivateBenefitReviewData({
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
        data-testid="deactivate-employee-benefit-review-loading"
      >
        <Spinner
          size="lg"
          srText={t('deactivate-benefit-review-loading', { defaultValue: 'Loading benefit deactivation request...' })}
        />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="gba:max-w-[1200px] gba:mx-auto gba:p-6" data-testid="deactivate-employee-benefit-review-error">
        <Alert variant="destructive">
          <AlertTitle>{t('deactivate-benefit-review-error-title', { defaultValue: 'Unable to Load Data' })}</AlertTitle>
          <AlertDescription>
            {t('deactivate-benefit-review-error-description', {
              defaultValue: 'Failed to load benefit deactivation request data'
            })}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Build title (employee info is shown in FormHeader)
  const titleText = t('deactivate-benefit-review-title', {
    defaultValue: 'Benefit Deactivation Request'
  })

  // Build initiator subtitle
  const initiatorText = initiatorName
    ? t('deactivate-benefit-review-requested-by', {
        initiatorName,
        defaultValue: 'Requested by {initiatorName}'
      })
    : ''

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1200px]"
      data-testid="deactivate-employee-benefit-review-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} employee={employee} />

      {/* Initiator subtitle */}
      {initiatorText && (
        <div
          className="gba:px-6 gba:-mt-6 gba:mb-4 gba:text-sm gba:text-muted-foreground"
          data-testid="deactivate-employee-benefit-review-initiator"
        >
          {initiatorText}
        </div>
      )}

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='deactivate-employee-benefit-review']]:pt-0! gba:**:data-[testid='deactivate-employee-benefit-review-form']:max-w-none!"
        data-testid="deactivate-employee-benefit-review-form-content"
      >
        <AppActionForm
          processType="update"
          form={form}
          formData={{}}
          submitEventType="pse_submit"
          submitButtonText={t('deactivate-benefit-review-submit', { defaultValue: 'Deactivate Benefit' })}
          submitButtonVariant="destructive"
          submitButtonTestId="deactivate-employee-benefit-review-submit-button"
          onSubmit={async () => {
            return {
              approval: 'approved'
            }
          }}
          data-testid="deactivate-employee-benefit-review"
        >
          {/* Benefit Details Section */}
          <div className="gba:mb-6" data-testid="deactivate-employee-benefit-review-benefit-section">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {t('deactivate-benefit-review-benefit-details', { defaultValue: 'Benefit Details' })}
            </h3>
            <BenefitDetailsList
              items={displayItems}
              dataTestIdPrefix="deactivate-employee-benefit-review-benefit"
              translationPrefix="deactivate-benefit-review"
              t={t}
            />
          </div>

          {/* Deactivation Request Section */}
          {deactivationDetails && (
            <div className="gba:mb-4" data-testid="deactivate-employee-benefit-review-deactivation-section">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                {t('deactivate-benefit-review-deactivation-details', { defaultValue: 'Deactivation Request' })}
              </h3>
              <DeactivationDetailsList
                details={deactivationDetails}
                dataTestIdPrefix="deactivate-employee-benefit-review"
                t={t}
              />
            </div>
          )}
        </AppActionForm>
      </div>
    </div>
  )
}

export default DeactivateEmployeeBenefitReview
