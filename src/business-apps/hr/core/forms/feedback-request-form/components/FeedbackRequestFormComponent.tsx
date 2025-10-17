import React, { useState, useEffect } from 'react'
import { Button, Alert, Spinner, Label } from '@newwork/nw-design-system'
import { UserOutlined } from '@ant-design/icons'
import { useFeedbackRequestForm } from '../context/FeedbackRequestFormContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import MultiEmployeeSelectionModal from './MultiEmployeeSelectionModal'

const prefixDataTestId = 'FeedbackRequestFormComponent'

const FeedbackRequestFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    isLoading,
    error,
    clearError,
    onSubmit,
    onCancel,
    employees,
    employeesLoading,
    employeesError,
    searchEmployees,
    hasPreSelectedEmployee,
    isPreSelectedEmployeeCurrentUser
  } = useFeedbackRequestForm()

  // Load initial employees if needed
  useEffect(() => {
    if (!hasPreSelectedEmployee && !isPreSelectedEmployeeCurrentUser) {
      searchEmployees('')
    }
  }, [hasPreSelectedEmployee, isPreSelectedEmployeeCurrentUser, searchEmployees])

  const handleEmployeeSearch = (value: string) => {
    searchEmployees(value)
  }

  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false)
  const openMultiModal = () => setIsMultiModalOpen(true)
  const closeMultiModal = () => setIsMultiModalOpen(false)
  const confirmMultiSelect = (ids: string[], selectedEmployees: { id: string; name: string }[]) => {
    // Prefer the provided selectedEmployees list (accumulated over searches). Fallback to current employees list.
    const selected =
      selectedEmployees && selectedEmployees.length > 0 ? selectedEmployees : employees.filter(e => ids.includes(e.id))
    setFormValues({
      employeeIds: selected.map(s => s.id),
      employeeNames: selected.map(s => s.name),
      // keep single-select fields for submit button enablement and preview
      employeeId: selected[0]?.id,
      employeeName: selected[0]?.name
    })
    closeMultiModal()
  }

  // request message is optional; UI currently does not expose a field

  const handleSubmit = async () => {
    clearError()
    await onSubmit()
  }

  const handleCancel = async () => {
    await onCancel()
  }

  return (
    <div
      className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:bg-white gba:max-w-md gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        {/* Modal Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.title', 'Request Feedback')}
            </h2>
          </div>
        </div>

        {/* Modal Content */}
        <div className="gba:p-4 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-140px)]">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'Error')}>
              {error}
            </Alert>
          )}

          {/* Employee Selection */}
          <div className="gba:space-y-2">
            {!hasPreSelectedEmployee && !isPreSelectedEmployeeCurrentUser ? (
              <>
                <Label className="gba:block gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:feedback_request_form.requestFrom',
                    'Request feedback from...'
                  )}{' '}
                  <span className="gba:text-red-500">*</span>
                </Label>
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:text-sm gba:text-muted-foreground">
                    {formValues.employeeNames && formValues.employeeNames.length > 0
                      ? `${formValues.employeeNames.slice(0, 2).join(', ')}${formValues.employeeNames.length > 2 ? ` +${formValues.employeeNames.length - 2}` : ''}`
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:feedback_request_form.selectPlaceholder',
                          'Select employees'
                        )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={openMultiModal}
                    data-testid={formatDataTestId(prefixDataTestId, 'OpenMultiSelect')}
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:feedback_request_form.selectMultiple',
                      'Select employees'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="gba:p-3 gba:bg-muted gba:rounded-lg gba:border-border">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <UserOutlined />
                  <span className="gba:font-medium">{formValues.employeeName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="gba:p-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            className="gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading || !((formValues.employeeIds && formValues.employeeIds.length > 0) || formValues.employeeId)
            }
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
            className="gba:bg-foreground hover:gba:bg-muted gba:text-primary-foreground gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Spinner size="sm" />
                {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.sending', 'Sending...')}
              </div>
            ) : (
              getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.send', 'Send Request')
            )}
          </Button>
        </div>

        {/* Multi-select modal */}
        {!hasPreSelectedEmployee && !isPreSelectedEmployeeCurrentUser && (
          <MultiEmployeeSelectionModal
            open={isMultiModalOpen}
            onOpenChange={setIsMultiModalOpen}
            employees={employees.map(e => ({
              id: e.id,
              name: e.name,
              jobTitle: e.jobTitle,
              department: e.department,
              pictureThumbnail: e.pictureThumbnail,
              userId: e.userId
            }))}
            loading={employeesLoading}
            error={employeesError || undefined}
            onSearch={handleEmployeeSearch}
            initialSelectedIds={formValues.employeeIds || (formValues.employeeId ? [formValues.employeeId] : [])}
            onConfirm={confirmMultiSelect}
          />
        )}
      </div>
    </div>
  )
}

export default FeedbackRequestFormComponent
