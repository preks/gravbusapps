import React, { useEffect, useState } from 'react'
import { Button, Alert, AlertDescription, Spinner, Badge, toast } from '@newwork/nw-design-system'
import { useStageConditionPopupContext } from '../context/StageConditionPopupContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

const prefixDataTestId = 'StageConditionPopup'

const StageConditionPopupComponent: React.FC = () => {
  const { formValues, error, businessAppContext, isLoading } = useStageConditionPopupContext()

  const [submitting, setSubmitting] = useState(false)

  // Add process completion listener
  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response
        if (response) {
          toast.success('Stage condition updated successfully')
          setSubmitting(false)
        }
      } catch (err: any) {
        console.error('Error in process completion:', err)
        toast.error(err?.message || 'Failed to update stage condition')
        setSubmitting(false)
      }
    }

    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener)

    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener)
    }
  }, [])

  // Handle form submission
  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const updatedValues = {
        ...formValues,
        completed: !formValues.completed
      }

      const currentEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

      const payload: any = {
        investmentOpportunityStageCondition: {
          id: formValues.id,
          version: formValues.version,
          completed: updatedValues.completed,
          ...(currentEmployeeId && updatedValues.completed && { completedByEmployee: currentEmployeeId })
        }
      }

      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (error) {
      console.error('Error submitting stage condition form:', error)
      toast.error('Failed to submit form')
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  const newStatus = !formValues.completed

  return (
    <div className="gba:max-w-md gba:mx-auto gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      {error && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="gba:text-center gba:mb-6">
          <Spinner size="lg" className="gba:mb-4" />
          <p className="gba:text-gray-600">Loading condition details...</p>
        </div>
      )}

      {!isLoading && (
        <div className="gba:text-center gba:mb-6">
          <p
            className="gba:text-lg gba:text-gray-800"
            data-testid={formatDataTestId(prefixDataTestId, 'ConfirmationText')}
          >
            Are you sure you want to set this condition to{' '}
            <Badge variant={newStatus ? 'success' : 'secondary'} className="gba:inline">
              {newStatus ? 'completed' : 'uncompleted'}
            </Badge>
            ?
          </p>
        </div>
      )}

      {!isLoading && (
        <div className="gba:flex gba:gap-3">
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
            data-testid={formatDataTestId(prefixDataTestId, 'ConfirmButton')}
          >
            {getTranslationFromI18nKeyAndLabel('crm:common.confirm', 'Confirm')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default StageConditionPopupComponent
