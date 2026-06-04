import React from 'react'
import { Divider, Typography } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/gravity-ui-catalog'
import { useTranslation } from '@newwork/nw-design-system'
import expenseRequestCreationTranslations from '../expense-request-creation/_i18n'

import { showToast } from '../../utils/notificationUtils'
import { EVENTS } from '../../utils/constants'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'

const { Title } = Typography

interface ExpenseRequestInvalidContentProps {
  onCancel: () => void
}

/**
 * Expense Request Invalid Content component
 * @param props - Component props
 * @returns Expense Request Invalid Content component
 */
const ExpenseRequestInvalidContent: React.FC<ExpenseRequestInvalidContentProps> = ({ onCancel }) => {
  const { t } = useTranslation(expenseRequestCreationTranslations)

  return (
    <div
      className="gba:mx-auto gba:flex gba:flex-col"
      style={{ width: '100%', maxWidth: '800px', minHeight: 'calc(100vh - 10px)', fontFamily: "'Roboto', sans-serif" }}
      data-testid="expense-request-invalid-content"
    >
      <div
        className="gba:flex gba:items-center"
        style={{
          paddingTop: '40px',
          paddingBottom: '30px',
          height: '2rem',
          boxSizing: 'content-box',
          position: 'relative',
          fontFamily: "'Roboto', sans-serif",
          marginBottom: '16px'
        }}
        data-testid="expense-request-invalid-header"
      >
        <div
          className="gba:flex-1"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <Title
            level={4}
            style={{ margin: 0, textAlign: 'center', fontFamily: "'Roboto', sans-serif", pointerEvents: 'auto' }}
            data-testid="expense-request-invalid-title"
          >
            {t('initiate-title-header')}
          </Title>
        </div>
      </div>
      <Divider style={{ margin: '0 0 46px 0' }} data-testid="expense-request-invalid-divider" />

      <div
        style={{
          backgroundColor: 'destructive-secondary',
          padding: '16px 24px',
          borderRadius: '4px',
          marginBottom: '32px'
        }}
        data-testid="expense-request-invalid-validation-container"
      >
        <h3
          style={{ fontSize: '14px', fontWeight: 700, color: 'destructive', marginBottom: '8px' }}
          data-testid="expense-request-invalid-validation-title"
        >
          {t('invalid-profile-title')}
        </h3>
        <p
          style={{ fontSize: '14px', color: 'foreground', margin: 0 }}
          data-testid="expense-request-invalid-validation-message"
        >
          {t('missing-sap-wizard-description')}
        </p>
      </div>

      <div style={{ marginTop: 'auto', width: '100%' }} data-testid="expense-request-invalid-footer">
        <Divider style={{ margin: '16px 0' }} data-testid="expense-request-invalid-bottom-divider" />
        <div
          className="gba:flex gba:justify-between"
          style={{ padding: '16px 0' }}
          data-testid="expense-request-invalid-actions"
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
            data-testid="expense-request-invalid-cancel-button"
            onClick={onCancel}
          >
            {t('initiate-cancel-button')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Expense Request Invalid component
 * @param props - Business app context props
 * @returns Expense Request Invalid component
 */
const ExpenseRequestInvalid: React.FC<BusinessAppContextProps> = () => {
  const { t } = useTranslation(expenseRequestCreationTranslations)
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState()

  const handleCancel = () => {
    try {
      dispatchProcessContinueEventIfEnabled(EVENTS.ABORT, {
        event: EVENTS.ABORT,
        pso_exitStrategy: 'abort',
        pso_completeNotification: {
          type: 'error',
          messageKey: t('toast-action-canceled')
        }
      })
    } catch {
      showToast(t('error-flows-message'), 'error')
    }
  }

  return (
    <div data-testid="expense-request-invalid-wrapper">
      <ExpenseRequestInvalidContent onCancel={handleCancel} />
    </div>
  )
}

export default ExpenseRequestInvalid
