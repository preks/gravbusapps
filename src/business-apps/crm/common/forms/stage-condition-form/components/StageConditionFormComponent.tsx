import React, { useEffect, useState } from 'react'
import { Button, Alert, AlertDescription, Spinner, Card, CardContent } from '@newwork/nw-design-system'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import { useStageConditionFormContext } from '../context/StageConditionFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

const prefixDataTestId = 'StageConditionForm'

const StageConditionFormComponent: React.FC = () => {
  const { formValues, isLoading, error, businessAppContext } = useStageConditionFormContext()

  const [submitting, setSubmitting] = useState(false)

  // Add process completion listener (exactly like Convert Lead Form)
  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response
        if (response) {
          message.success('Stage condition updated successfully')
          setSubmitting(false)
        }
      } catch (err: any) {
        console.error('Error in process completion:', err)
        message.error(err?.message || 'Failed to update stage condition')
        setSubmitting(false)
      }
    }

    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener)

    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener)
    }
  }, [])

  // Handle form submission (exactly like Convert Lead Form)
  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      // Update the form values to toggle the status
      const updatedValues = {
        ...formValues,
        completed: !formValues.completed
      }

      // Get the current user's employee ID
      const currentEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

      // Prepare stage condition status payload following the correct API structure
      const payload: any = {
        opportunityStageConditionStatus: {
          id: formValues.id,
          version: formValues.version,
          completed: updatedValues.completed,
          // Include the employee ID of who is completing the condition
          ...(currentEmployeeId && updatedValues.completed && { completedByEmployee: currentEmployeeId })
        },
        changeMode: 'UPDATE'
      }

      console.log('Submitting payload:', payload)
      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (error) {
      console.error('Error submitting stage condition form:', error)
      message.error('Failed to submit form')
      setSubmitting(false)
    }
  }

  // Handle form cancellation (exactly like Convert Lead Form)
  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  const newStatus = !formValues.completed
  const statusText = newStatus ? 'Completed' : 'Pending'
  const confirmationText = getTranslationFromI18nKeyAndLabel(
    'crm:stageCondition.statusChangeConfirmation',
    `Are you sure you want to change the status of this condition to "${statusText}"?`
  )

  return (
    <div className="gba:max-w-md gba:mx-auto gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      <Card className="gba:shadow-lg">
        <CardContent className="gba:p-6">
          {/* Title */}
          <div className="gba:text-center gba:mb-6">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-0">
              {getTranslationFromI18nKeyAndLabel('crm:stageCondition.updateStatus', 'Update Condition Status')}
            </h3>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="gba:mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="gba:space-y-6">
            {/* Condition Information */}
            <div className="gba:text-center gba:space-y-4">
              <div>
                <h4 className="gba:text-base gba:font-medium gba:text-gray-700 gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('crm:stageCondition.conditionTitle', 'Condition')}
                </h4>
                <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                  {formValues.conditionTitle || 'Unknown Condition'}
                </p>
              </div>

              <div>
                <h4 className="gba:text-base gba:font-medium gba:text-gray-700 gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('crm:stageCondition.currentStatus', 'Current Status')}
                </h4>
                <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                  {formValues.completed ? (
                    <CheckOutlined className="gba:text-green-500 gba:text-xl" />
                  ) : (
                    <CloseOutlined className="gba:text-gray-400 gba:text-xl" />
                  )}
                  <span
                    className={`gba:text-lg gba:font-medium ${
                      formValues.completed ? 'gba:text-green-600' : 'gba:text-gray-500'
                    }`}
                  >
                    {formValues.completed
                      ? getTranslationFromI18nKeyAndLabel('crm:stageCondition.completed', 'Completed')
                      : getTranslationFromI18nKeyAndLabel('crm:stageCondition.pending', 'Pending')}
                  </span>
                </div>
              </div>

              <div className="gba:text-center gba:py-4">
                <div className="gba:text-2xl gba:mb-2">↓</div>
                <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                  {newStatus ? (
                    <CheckOutlined className="gba:text-green-500 gba:text-xl" />
                  ) : (
                    <CloseOutlined className="gba:text-gray-400 gba:text-xl" />
                  )}
                  <span
                    className={`gba:text-lg gba:font-medium ${newStatus ? 'gba:text-green-600' : 'gba:text-gray-500'}`}
                  >
                    {statusText}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-4">
              <p className="gba:text-sm gba:text-blue-800 gba:text-center">{confirmationText}</p>
            </div>

            {/* Submit and Cancel Buttons - Following working form pattern */}
            <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
              <Button
                variant="secondary"
                className="gba:flex-1"
                size="lg"
                onClick={handleCancel}
                disabled={submitting}
                data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
              >
                {getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="default"
                className="gba:flex-1"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
              >
                {submitting && <Spinner size="sm" className="gba:mr-2" />}
                {submitting
                  ? getTranslationFromI18nKeyAndLabel('crm:common.updating', 'Updating...')
                  : getTranslationFromI18nKeyAndLabel('crm:common.confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StageConditionFormComponent
