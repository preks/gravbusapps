import React from 'react'
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { BonusDetailsList } from './components/BonusDetailsList'
import { useBonusReviewData } from './hooks/useBonusReviewData'
import translations from '../_i18n'

export const GrantEmployeeBonusReview: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const { t } = useTranslation(translations)
  const form: UseFormReturn<FieldValues> = useForm({
    defaultValues: {},
    mode: 'onChange'
  })

  const { employeeName, initiatorName, displayItems, bonusDetails, employee } = useBonusReviewData({
    accessToken,
    additionalData,
    userInfo,
    t
  })

  // Build title with employee name
  const titleText = t('grant-bonus-review-title', {
    employeeName: employeeName || '',
    defaultValue: `Employee Bonus Review for ${employeeName || ''}`
  })

  // Build initiator subtitle
  const initiatorText = initiatorName
    ? t('grant-bonus-review-initiated-by', {
        initiatorName,
        defaultValue: `Initiated by ${initiatorName}`
      })
    : ''

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1200px]"
      data-testid="review-employee-bonus-grant-form-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} employee={employee} />

      {/* Initiator subtitle */}
      {initiatorText && (
        <div
          className="gba:px-6 gba:-mt-6 gba:mb-4 gba:text-sm gba:text-muted-foreground"
          data-testid="review-employee-bonus-grant-initiator"
        >
          {initiatorText}
        </div>
      )}

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='review-employee-bonus-grant']]:pt-0! gba:**:data-[testid='review-employee-bonus-grant-form']:max-w-none!"
        data-testid="review-employee-bonus-grant-form-content"
      >
        <AppActionForm
          processType="update"
          form={form}
          formData={{}}
          submitEventType="pse_submit"
          cancelEventType="pse_cancel"
          submitButtonText={t('grant-bonus-review-acknowledge', { defaultValue: 'Acknowledge' })}
          cancelButtonText={t('grant-bonus-review-reject', { defaultValue: 'Reject' })}
          submitButtonTestId="review-employee-bonus-grant-confirm-button"
          cancelButtonTestId="review-employee-bonus-grant-cancel-button"
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
          data-testid="review-employee-bonus-grant"
        >
          {/* Bonus Details Section */}
          <div className="gba:mb-6" data-testid="review-employee-bonus-grant-details-section">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {t('grant-bonus-review-bonus-details', { defaultValue: 'Bonus Details' })}
            </h3>
            <BonusDetailsList items={displayItems} dataTestIdPrefix="review-employee-bonus-grant" t={t} />
          </div>

          {/* Additional Information Section - Description & Notes */}
          {bonusDetails && (bonusDetails.description || bonusDetails.notes) && (
            <div className="gba:mb-4 gba:space-y-3" data-testid="grant-employee-bonus-review-info-section">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                {t('grant-bonus-review-additional-info', { defaultValue: 'Additional Information' })}
              </h3>

              {/* Description */}
              {bonusDetails.description && (
                <div data-testid="grant-employee-bonus-review-description">
                  <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                    {t('grant-bonus-review-description', { defaultValue: 'Description' })}
                  </div>
                  <div className="gba:font-medium gba:whitespace-pre-wrap">{bonusDetails.description}</div>
                </div>
              )}

              {/* Notes */}
              {bonusDetails.notes && (
                <div data-testid="grant-employee-bonus-review-notes">
                  <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                    {t('grant-bonus-review-notes', { defaultValue: 'Notes' })}
                  </div>
                  <div className="gba:font-medium gba:whitespace-pre-wrap">{bonusDetails.notes}</div>
                </div>
              )}
            </div>
          )}
        </AppActionForm>
      </div>
    </div>
  )
}

export default GrantEmployeeBonusReview
