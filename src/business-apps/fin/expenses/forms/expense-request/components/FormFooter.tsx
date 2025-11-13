import React from 'react'
import { Divider } from 'antd'
import { Button } from '@newwork/gravity-ui-catalog'
import { FORM_STEPS, REQUEST_TYPES } from '../constants/constants'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface FormFooterProps {
  step: string
  loading?: boolean
  formIsValid?: boolean
  onCancel: () => void
  onSubmit?: () => void
  testIdPrefix?: string
  additionalData?: any
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
  testIdPrefix = REQUEST_TYPES.EXPENSE
}) => {
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
          {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
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
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.expense_request_container.btn_submit',
              'Create'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default FormFooter
