import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Alert, Label, useTranslation } from '@newwork/nw-design-system'
import { UserIcon } from '@phosphor-icons/react'
import { useFeedbackRequestForm } from '../context/FeedbackRequestFormContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import MultiEmployeeSelectionModal from './MultiEmployeeSelectionModal'
import { AppActionForm } from '@/components/app-action-form'
import translations from '../../_i18n'
import { FeedbackRequestClient } from '@/common/network/feedback-request/FeedbackRequestClient'
import { FeedbackRequestPayload } from '../types'

const prefixDataTestId = 'FeedbackRequestFormComponent'

const FeedbackRequestFormComponent: React.FC = () => {
  const { t } = useTranslation(translations)
  const {
    formValues,
    setFormValues,
    isLoading,
    error,
    employees,
    employeesLoading,
    employeesError,
    searchEmployees,
    hasPreSelectedEmployee,
    isPreSelectedEmployeeCurrentUser,
    businessAppContext,
    getEmployeeById,
    preSelectedEmployee
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

  const isSubmitDisabled = useMemo(() => {
    const hasSelection = (formValues.employeeIds && formValues.employeeIds.length > 0) || Boolean(formValues.employeeId)
    return isLoading || !hasSelection
  }, [isLoading, formValues.employeeIds, formValues.employeeId])

  const selectedEmployeesPreview = useMemo(() => {
    const names = formValues.employeeNames || []
    if (!names || names.length === 0) return ''
    const shown = names.slice(0, 2).join(', ')
    const extraCount = names.length > 2 ? ` +${names.length - 2}` : ''
    return `${shown}${extraCount}`
  }, [formValues.employeeNames])

  // Build payload and run any side-effects before submit event is dispatched
  const handlePreSubmit = useCallback(async () => {
    let selectedIds: string[] = []
    if (formValues.employeeIds && formValues.employeeIds.length > 0) {
      selectedIds = formValues.employeeIds
    } else if (formValues.employeeId) {
      selectedIds = [formValues.employeeId]
    }

    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

    // Resolve employees to get userIds where available
    const resolvedEmployees = selectedIds
      .map(id => {
        if (preSelectedEmployee?.id === id) return preSelectedEmployee
        return getEmployeeById(id)
      })
      .filter(Boolean) as Array<{ id: string; userId?: string }>

    const requestedFromList = resolvedEmployees.map(emp => emp.userId || emp.id)

    if (requestedFromList.length > 1) {
      const client = new FeedbackRequestClient()
      client.setAccessToken(businessAppContext.accessToken)
      const [firstRequested, ...remainingRequested] = requestedFromList
      await client.bulkRequestFeedback({
        requestedFromList: remainingRequested,
        creatorUserId: currentUserEmployeeId as string,
        requestMessage: formValues.requestMessage
      })
      const payload: FeedbackRequestPayload = {
        requestedFrom: firstRequested,
        requestedFromList,
        creatorUserId: currentUserEmployeeId as string,
        requestMessage: formValues.requestMessage,
        completeNotification: {
          type: 'success',
          message: t('notification-feedback-request-sent-success')
        }
      }
      return payload
    }

    const payload: FeedbackRequestPayload = {
      requestedFrom: requestedFromList[0]!,
      requestedFromList,
      creatorUserId: currentUserEmployeeId as string,
      requestMessage: formValues.requestMessage,
      completeNotification: {
        type: 'success',
        message: t('notification-feedback-request-sent-success')
      }
    }

    return payload
  }, [
    formValues.employeeIds,
    formValues.employeeId,
    formValues.requestMessage,
    businessAppContext.accessToken,
    businessAppContext.userInfo?.employeeDetails?.employeeId,
    getEmployeeById,
    preSelectedEmployee,
    t
  ])

  return (
    <AppActionForm
      processType="create"
      onSubmit={data => data}
      formData={{ employeeIds: formValues.employeeIds, employeeId: formValues.employeeId }}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={isSubmitDisabled}
      submitEventType="pse_submit"
      cancelEventType="pse_cancel"
      submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.send', 'Send Request')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.cancel', 'Cancel')}
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:bg-white gba:max-w-md gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        <div className="gba:flex gba:items-center gba:justify-between gba:pb-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_request_form.title', 'Request Feedback')}
            </h2>
          </div>
        </div>

        <div className="gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-140px)]">
          {error && (
            <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'Error')}>
              {error}
            </Alert>
          )}

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
                    {selectedEmployeesPreview ||
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:feedback_request_form.selectPlaceholder',
                        'Select employees'
                      )}
                  </div>
                  <Button
                    variant="outline"
                    type="button"
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
                  <UserIcon size={16} />
                  <span className="gba:font-medium">{formValues.employeeName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

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
    </AppActionForm>
  )
}

export default FeedbackRequestFormComponent
