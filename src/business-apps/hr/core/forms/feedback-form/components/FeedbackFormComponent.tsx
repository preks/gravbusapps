import React, { useMemo } from 'react'
import {
  Button,
  Textarea,
  Label,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Alert,
  AlertDescription,
  Switch
} from '@newwork/nw-design-system'
import { DownOutlined } from '@ant-design/icons'
import { useFeedbackForm } from '../context/FeedbackFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { EmployeeSelect } from '@/components/employee-select'
import FormHeader from '../../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

const prefixDataTestId = 'FeedbackForm'

const FeedbackFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    transformText,
    isLoading,
    error,
    clearError,
    onSubmit,
    onCancel,
    employees,
    employeesLoading,
    employeesError,
    searchEmployees,
    getEmployeeById,
    preSelectedEmployee,
    preSelectedEmployeeLoading,
    preSelectedEmployeeError,
    hasPreSelectedEmployee,
    isPreSelectedEmployeeCurrentUser,
    isRequestedFeedbackFlow
  } = useFeedbackForm()

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormValues({ feedbackText: e.target.value })
    if (error) clearError()
  }

  const handleEmployeeChange = (employeeId: string) => {
    const employee = getEmployeeById(employeeId)
    if (employee) {
      setFormValues({
        employeeId: employee.id,
        employeeName: employee.name
      })
    }
  }

  const handleTransform = async (type: 'formalize' | 'translate' | 'shorten') => {
    if (!formValues.feedbackText.trim()) {
      return
    }

    let targetLanguage: string | undefined
    if (type === 'translate') {
      targetLanguage = 'en' // Default to English, could be made configurable
    }

    await transformText(type, targetLanguage)
  }

  const handleSubmit = async () => {
    if (!formValues.feedbackText.trim()) {
      return
    }
    await onSubmit()
  }

  // Check if form is valid
  const isFormValid = formValues.feedbackText.trim().length > 0 && formValues.employeeId

  // Parse employee name for FormHeader (firstName lastName)
  const employeeForHeader = useMemo(() => {
    if (!preSelectedEmployee || isPreSelectedEmployeeCurrentUser || preSelectedEmployeeLoading) {
      return null
    }
    const nameParts = (preSelectedEmployee.name || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    return {
      firstName,
      lastName,
      pictureThumbnail: preSelectedEmployee.pictureThumbnail,
      jobTitle: preSelectedEmployee.jobTitle
    }
  }, [preSelectedEmployee, isPreSelectedEmployeeCurrentUser, preSelectedEmployeeLoading])

  // Defer rendering the form for requested-feedback flow until the preselected employee is applied to form state,
  // so no UI (including Cancel) flashes before we know the final state.
  if (isRequestedFeedbackFlow && !formValues.employeeId) {
    return null
  }

  const title = getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.title', 'Give Feedback')

  return (
    <div
      className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:bg-white gba:max-w-md gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        <FormHeader title={title} flowIconUrl={flowIconUrl} employee={employeeForHeader} />

        {/* Modal Content */}
        <div className="gba:px-6 gba:py-6 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-200px)]">
          {/* Show loading state for pre-selected employee */}
          {hasPreSelectedEmployee && preSelectedEmployeeLoading && (
            <div className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-muted gba:rounded-lg">
              <Spinner size="sm" />
              <span className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:feedback_give_form.employee.loading',
                  'Loading employee details...'
                )}
              </span>
            </div>
          )}

          {/* Show error state for pre-selected employee */}
          {hasPreSelectedEmployee && preSelectedEmployeeError && (
            <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'EmployeeErrorAlert')}>
              <AlertDescription>{preSelectedEmployeeError}</AlertDescription>
            </Alert>
          )}

          {/* Employee Selection Section - only show if not pre-selected or is current user */}
          {(!hasPreSelectedEmployee || isPreSelectedEmployeeCurrentUser) && !preSelectedEmployeeLoading && (
            <div className="gba:space-y-2">
              <Label htmlFor="employee-select" className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.employee.label', 'Employee')} *
              </Label>
              <EmployeeSelect
                value={formValues.employeeId || null}
                onValueChange={value => {
                  if (value) {
                    handleEmployeeChange(value)
                  } else {
                    setFormValues({ employeeId: undefined, employeeName: undefined })
                  }
                }}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:feedback_give_form.employee.placeholder',
                  'Select an employee...'
                )}
                employees={
                  employees.map(emp => ({
                    id: emp.id,
                    displayName: emp.name,
                    firstName: emp.name.split(' ')[0] || '',
                    lastName: emp.name.split(' ').slice(1).join(' ') || '',
                    pictureThumbnail: emp.pictureThumbnail,
                    userId: emp.userId,
                    employeePosition: {
                      jobPosition: emp.jobTitle ? { name: emp.jobTitle } : undefined,
                      organizationalUnit: emp.department ? { name: emp.department } : undefined
                    }
                  })) as Employee[]
                }
                loading={employeesLoading}
                onSearch={searchEmployees}
                data-testid={formatDataTestId(prefixDataTestId, 'EmployeeSelect')}
                className="gba:w-full"
              />
              {employeesError && <div className="gba:text-sm gba:text-destructive">{employeesError}</div>}
            </div>
          )}

          {/* Public switch */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label htmlFor="feedback-public" className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.public.label', 'Public Feedback')}
            </Label>
            <Switch
              id="feedback-public"
              checked={!!formValues.feedbackPublic}
              onCheckedChange={(v: boolean) => setFormValues({ feedbackPublic: v })}
              data-testid={formatDataTestId(prefixDataTestId, 'PublicSwitch')}
            />
          </div>

          {/* Feedback Text Section */}
          <div className="gba:space-y-2">
            <Label htmlFor="feedback-text" className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.text.label', 'Feedback')} *
            </Label>
            <Textarea
              id="feedback-text"
              name="feedbackText"
              data-testid={formatDataTestId(prefixDataTestId, 'Textarea')}
              value={formValues.feedbackText}
              onChange={handleTextChange}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:feedback_give_form.text.placeholder',
                'Enter your feedback here...'
              )}
              rows={12}
              className="gba:resize-none gba:border-border gba:focus:border-ring gba:focus:ring-ring gba:min-h-[200px]"
            />
          </div>

          {/* Text Transformation Tool */}
          <div className="gba:space-y-2 gba:w-30">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  disabled={!formValues.feedbackText.trim() || isLoading}
                  className="gba:w-full gba:justify-between gba:bg-destructive hover:gba:bg-destructive gba:text-primary-foreground gba:border-destructive"
                  data-testid={formatDataTestId(prefixDataTestId, 'TransformDropdown')}
                >
                  <span>
                    {isLoading
                      ? getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.transforming', 'Transforming')
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:feedback_give_form.transform.placeholder',
                          'Text Tool'
                        )}
                  </span>
                  <DownOutlined className="gba:h-4 gba:w-4 gba:opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="gba:w-full gba:bg-primary-foreground gba:border-border gba:rounded-lg gba:shadow-lg">
                <DropdownMenuItem
                  onClick={() => handleTransform('formalize')}
                  data-testid={formatDataTestId(prefixDataTestId, 'FormalizeOption')}
                  className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.formalize', 'Formalize')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleTransform('translate')}
                  data-testid={formatDataTestId(prefixDataTestId, 'TranslateOption')}
                  className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.translate', 'Translate')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleTransform('shorten')}
                  data-testid={formatDataTestId(prefixDataTestId, 'ShortenOption')}
                  className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.shorten', 'Shorten')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="gba:px-6 gba:py-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
          {!isRequestedFeedbackFlow && (
            <Button
              variant="secondary"
              onClick={onCancel}
              data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
              className="gba:px-6 gba:py-2 gba:rounded-lg"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.cancel', 'Cancel')}
            </Button>
          )}
          <Button
            variant="default"
            disabled={!isFormValid || isLoading || (hasPreSelectedEmployee && preSelectedEmployeeLoading)}
            size="default"
            onClick={handleSubmit}
            className="gba:bg-primary hover:gba:bg-primary gba:text-primary-foreground gba:px-6 gba:py-2 gba:rounded-lg"
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
          >
            {isLoading && <Spinner size="sm" className="gba:mr-2" />}
            {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_give_form.submit', 'Submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackFormComponent
