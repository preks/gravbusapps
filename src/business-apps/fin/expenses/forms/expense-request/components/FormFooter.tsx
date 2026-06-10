import React from 'react'
import { Divider } from 'antd'
import { Button } from '@newwork/gravity-ui-catalog'
import { FORM_STEPS, REQUEST_TYPES } from '../constants/constants'
import { useTranslation } from '@newwork/nw-design-system'
import { useExpenseRequestCreationTranslation } from '../../expense-request-creation/useExpenseRequestCreationTranslation'
import expensePlanTranslations from '../../expense-plan/_i18n'

type FormFooterTranslationScope = 'request' | 'plan'

interface FormFooterProps {
  step: string
  loading?: boolean
  formIsValid?: boolean
  onCancel: () => void
  onSubmit?: () => void
  testIdPrefix?: string
  additionalData?: any
  translationScope?: FormFooterTranslationScope
}

/**
 * Footer component with cancel and submit buttons
 */
const FormFooter: React.FC<FormFooterProps> = ({
  step,
  loading = false,
  formIsValid = false,
  onCancel,
  onSubmit,
  testIdPrefix = REQUEST_TYPES.EXPENSE,
  translationScope = 'request'
}) => {
  const { t: tRequest } = useExpenseRequestCreationTranslation()
  const { t: tPlan } = useTranslation(expensePlanTranslations)
  const isPlan = translationScope === 'plan'
  const cancelLabel = isPlan ? tPlan('cancel-button') : tRequest('initiate-cancel-button')
  const submitLabel = isPlan ? tPlan('next-btn') : tRequest('btn-submit')

  return (
    <div style={{ marginTop: 'auto', width: '100%' }} data-testid={`${testIdPrefix}-footer`}>
      <Divider style={{ margin: '16px 0' }} data-testid={`${testIdPrefix}-bottom-divider`} />
      <div
        className="gba:flex gba:justify-between"
        style={{ padding: '16px 0' }}
        data-testid={`${testIdPrefix}-actions`}
      >
        <Button
          variant="outline"
          style={{
            minWidth: '100px',
            borderWidth: '2px',
            fontSize: '16px',
            fontWeight: 600,
            height: '40px',
            padding: '0px 16px',
            borderRadius: '22px'
          }}
          data-testid={`${testIdPrefix}-cancel-button`}
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        {(step === FORM_STEPS.EXPENSE || step === FORM_STEPS.TRIP) && (
          <Button
            variant="primary"
            style={{
              minWidth: '100px',
              borderWidth: '2px',
              fontSize: '16px',
              fontWeight: 600,
              height: '40px',
              padding: '0px 16px',
              borderRadius: '22px',
              width: 'auto'
            }}
            data-testid={`${testIdPrefix}-form-submit-button`}
            onClick={onSubmit}
            disabled={loading || !formIsValid}
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export default FormFooter
