import React from 'react'
import { Typography } from 'antd'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/business-apps/types'

const { Title } = Typography

/**
 * CreateItemScreen component props
 */
interface CreateItemScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
}

/**
 * CreateItemScreen component for expense request wizard
 * @param props - Component props
 * @returns CreateItemScreen component
 */
const CreateItemScreen: React.FC<CreateItemScreenProps> = () => {
  return (
    <div data-testid="expense-request-wizard-create-item-screen">
      <Title level={4} data-testid="expense-request-wizard-create-item-screen-title">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request_wizard.create_item_screen_title',
          'Create Expense Item'
        )}
      </Title>
      <div data-testid="expense-request-wizard-create-item-screen-content">{/* Content will be added here */}</div>
    </div>
  )
}

export default CreateItemScreen
