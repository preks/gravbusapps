import React from 'react'
import { ExpenseItemProvider, useExpenseItem } from './context'
import { Button } from '@newwork/gravity-ui-catalog'
import { Typography, Divider } from 'antd'
import { ExpenseItemProps } from './types'
import StartScreenComponent from './components/StartScreenComponent'
import FormScreenComponent from './components/FormScreenComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ICONS } from '../../utils/icons'
import { FORM_STEPS } from './constants/constants'
import { showToast } from '../../utils/notificationUtils'
import { useExpenseItemTranslation } from './useExpenseItemTranslation'

const { Title } = Typography

// Move ExpenseItemContent outside to prevent recreation on every render
// Memoize to prevent rerenders when props don't change
const ExpenseItemContent: React.FC<{ onClose?: (shouldRefetch?: boolean) => void }> = React.memo(
  ({ onClose }) => {
    const {
      form,
      currentStep,
      setCurrentStep,
      fileList,
      setFileList,
      positions,
      setPositions,
      expenseGroups,
      expenseRequests,
      loading,
      expenseTypes,
      customFields,
      costCenters,
      multiPosition,
      setCurrentSelectedDate,
      setMultiPosition,
      handleSubmit,
      handleCancel,
      handleExpenseGroupChange,
      handleExpenseTypeChange,
      handleAddPosition,
      handleRemovePosition,
      calculateTotal,
      currencies,
      isEditMode
    } = useExpenseItem()
    const { t } = useExpenseItemTranslation()

    // Modified handleCancel to use onClose callback if provided
    // Do NOT refetch when cancelling to preserve selected items in the wizard
    const handleCancelWithCallback = () => {
      if (onClose) {
        onClose(false)
        handleCancel(true)
      } else {
        handleCancel()
      }
    }

    // Modified handleSubmit to use onClose callback if provided
    // When successful, pass true to onClose to indicate we need to refetch expense request data
    const handleSubmitWithCallback = async () => {
      try {
        await handleSubmit()
        if (onClose) {
          onClose(true)
        }
      } catch (error: any) {
        // Currency validation errors are already toasted by the context - don't show duplicate
        const isCurrencyError = error?.message?.toLowerCase()?.includes('currency')
        if (!isCurrencyError) {
          showToast(t('expense-item-no-items-created'), 'error')
        }
        throw error
      }
    }

    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:relative"
        style={{ width: '100%', maxWidth: '800px', height: '100%', minHeight: 'calc(100vh - 10px)' }}
        data-testid="expense-item-main-container"
      >
        <div
          className="gba:flex gba:items-center gba:pt-10 gba:font-primary gba:relative gba:pb-[30px] gba:box-content"
          style={{ height: '32px' }}
          data-testid="expense-item-header-container"
        >
          {/* Reserve space for back button to prevent layout shift */}
          <div style={{ width: '48px', height: '32px', flexShrink: 0 }}>
            {currentStep === FORM_STEPS.FORM && (
              <Button
                variant="text"
                onClick={() => {
                  setCurrentStep(FORM_STEPS.START)
                  setFileList([])
                }}
                style={{ padding: '0', height: 'auto', minWidth: 'auto' }}
                className="gba:z-[1] gba:relative"
                data-testid="back-button"
              >
                <img
                  src={ICONS.BACK_ARROW}
                  alt={t('expense-item-back')}
                  style={{ width: '24px', height: '24px' }}
                  width="24"
                  height="24"
                  data-testid="back-button-icon"
                />
              </Button>
            )}
          </div>
          <div
            className="gba:absolute gba:left-0 gba:right-0 gba:flex gba:justify-center gba:pointer-events-none"
            data-testid="expense-item-title-container"
          >
            <Title
              level={4}
              className="gba:mb-0 gba:m-0 gba:font-primary gba:pointer-events-auto"
              data-testid="expense-item-header-title"
            >
              {isEditMode ? t('expense-item-header-edit') : t('expense-item-header-new')}
            </Title>
          </div>
        </div>
        <Divider className="gba:m-0 gba:ml-0 gba:mb-[30px]" data-testid="expense-item-header-divider" />

        {currentStep === FORM_STEPS.START ? (
          <StartScreenComponent
            fileList={fileList}
            setFileList={setFileList}
            setCurrentStep={setCurrentStep}
            handleCancel={handleCancelWithCallback}
          />
        ) : (
          <FormScreenComponent
            form={form}
            fileList={fileList}
            setFileList={setFileList}
            positions={positions}
            setPositions={setPositions}
            expenseGroups={expenseGroups}
            expenseTypes={expenseTypes}
            customFields={customFields}
            costCenters={costCenters}
            currencies={currencies}
            expenseRequests={expenseRequests}
            multiPosition={multiPosition}
            setCurrentSelectedDate={setCurrentSelectedDate}
            setMultiPosition={setMultiPosition}
            handleSubmit={handleSubmitWithCallback}
            handleCancel={handleCancelWithCallback}
            handleExpenseGroupChange={handleExpenseGroupChange}
            handleExpenseTypeChange={handleExpenseTypeChange}
            handleAddPosition={handleAddPosition}
            handleRemovePosition={handleRemovePosition}
            loading={loading}
            calculateTotal={calculateTotal}
          />
        )}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only rerender if onClose function reference changes
    return prevProps.onClose === nextProps.onClose
  }
)

const ExpenseItem: React.FC<BusinessAppContextProps & ExpenseItemProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onClose
}) => {
  // Get URL query parameters
  const [localAdditionalData, setLocalAdditionalData] = React.useState(() => {
    return {
      ...additionalData,
      expenseRequestId: additionalData?.expenseRequestId,
      itemCurrency: additionalData?.itemCurrency,
      psi_taskPayload: additionalData?.psi_taskPayload
    }
  })

  // Update localAdditionalData when additionalData changes
  React.useEffect(() => {
    if (additionalData) {
      setLocalAdditionalData((prevData: any) => ({
        ...prevData,
        ...additionalData,
        // Prioritize additionalData over URL parameters
        expenseRequestId: additionalData.expenseRequestId || prevData.expenseRequestId,
        itemCurrency: additionalData.itemCurrency || prevData.itemCurrency
      }))
    }
  }, [additionalData])

  // For backward compatibility, still listen for the custom event
  React.useEffect(() => {
    const handleShowExpenseItem = (event: CustomEvent) => {
      if (event.detail) {
        const { expenseRequestId, itemCurrency } = event.detail

        // Update additionalData with the parameters from the event
        setLocalAdditionalData((prevData: any) => ({
          ...prevData,
          expenseRequestId,
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

  return (
    <ExpenseItemProvider accessToken={accessToken} userInfo={userInfo} additionalData={localAdditionalData}>
      <ExpenseItemContent onClose={onClose} />
    </ExpenseItemProvider>
  )
}

export default ExpenseItem
