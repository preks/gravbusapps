import React from 'react'
import { Typography, Divider } from 'antd'
import { ExpensePlanItemProvider, useExpensePlanItem } from './context/ExpensePlanItemContext'
import { ExpensePlanItemForm } from './ExpensePlanItemForm'
import { ExpensePlanItemProps } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { showToast } from '../../utils/notificationUtils'
import { useExpensePlanItemTranslation } from './useExpensePlanItemTranslation'

const { Title } = Typography

const ExpensePlanItem: React.FC<BusinessAppContextProps & ExpensePlanItemProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onClose
}) => {
  const [localAdditionalData, setLocalAdditionalData] = React.useState(() => {
    return {
      ...additionalData,
      expensePlanId: additionalData?.expensePlanId,
      itemCurrency: additionalData?.itemCurrency
    }
  })

  // For backward compatibility, still listen for the custom event
  React.useEffect(() => {
    const handleShowExpenseItem = (event: CustomEvent) => {
      if (event.detail) {
        const { expensePlanId, itemCurrency } = event.detail

        // Update additionalData with the parameters from the event
        setLocalAdditionalData((prevData: any) => ({
          ...prevData,
          expensePlanId,
          itemCurrency
        }))
      }
    }

    // Add event listener
    document.addEventListener('expense-item-show', handleShowExpenseItem as EventListener)

    // Clean up
    return () => {
      document.removeEventListener('expense-item-show', handleShowExpenseItem as EventListener)
    }
  }, [])

  const ExpensePlanItemContent: React.FC<{ onClose?: (shouldRefetch?: boolean) => void }> = ({ onClose }) => {
    const { t } = useExpensePlanItemTranslation()
    const {
      form,
      loading,
      expenseGroups,
      expenseTypes,
      customFields,
      costCenters,
      currencies,
      handleSubmit,
      handleCancel,
      handleExpenseGroupChange,
      handleExpenseTypeChange,
      handleCurrencyChange,
      isEditMode
    } = useExpensePlanItem()

    const handleCancelWithCallback = () => {
      handleCancel()
      if (onClose) {
        onClose(false)
      }
    }
    const handleSubmitWithCallback = async () => {
      try {
        await handleSubmit()
        if (onClose) {
          onClose(true)
        }
      } catch {
        showToast(t('no-expense-items'), 'error')
      }
    }

    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col"
        style={{ width: '100%', maxWidth: '800px', height: '100%', minHeight: 'calc(100vh - 10px)' }}
        data-testid="expense-plan-item-main-container"
      >
        <div
          className="gba:flex gba:items-center gba:pt-10 gba:font-primary gba:relative gba:pb-[30px] gba:h-8 gba:box-content"
          data-testid="expense-plan-item-header-container"
        >
          <div
            className="gba:absolute gba:left-0 gba:right-0 gba:flex gba:justify-center gba:pointer-events-none"
            data-testid="expense-plan-item-title-container"
          >
            <Title
              level={4}
              className="gba:mb-0 gba:m-0 gba:font-primary gba:pointer-events-auto"
              data-testid="expense-plan-item-header-title"
            >
              {isEditMode ? t('header-container-title-edit') : t('header-container-title-new')}
            </Title>
          </div>
        </div>
        <Divider className="gba:m-0 gba:ml-0 gba:mb-[30px]" data-testid="expense-plan-item-header-divider" />

        <ExpensePlanItemForm
          form={form}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          currencies={currencies}
          handleSubmit={handleSubmitWithCallback}
          handleCancel={handleCancelWithCallback}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
          handleCurrencyChange={handleCurrencyChange}
          loading={loading}
        />
      </div>
    )
  }

  return (
    <ExpensePlanItemProvider accessToken={accessToken} userInfo={userInfo} additionalData={localAdditionalData}>
      <ExpensePlanItemContent onClose={onClose} />
    </ExpensePlanItemProvider>
  )
}

export default ExpensePlanItem
