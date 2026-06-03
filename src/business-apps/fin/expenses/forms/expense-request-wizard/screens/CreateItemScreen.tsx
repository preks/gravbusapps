import React from 'react'
import { Typography } from 'antd'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useExpenseRequestWizardTranslation } from '../useExpenseRequestWizardTranslation'

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
  const { t } = useExpenseRequestWizardTranslation()

  return (
    <div data-testid="expense-request-wizard-create-item-screen">
      <Title level={4} data-testid="expense-request-wizard-create-item-screen-title">
        {t('create-item-screen-title')}
      </Title>
      <div data-testid="expense-request-wizard-create-item-screen-content">{/* Content will be added here */}</div>
    </div>
  )
}

export default CreateItemScreen
