import React from 'react'
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Switch
} from '@newwork/nw-design-system'
import { DownOutlined } from '@ant-design/icons'
import { useFeedbackForm } from '../context/FeedbackFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import EmployeeSearchableSelect from '../../../../../crm/core/forms/lead-form/components/EmployeeSearchableSelect'

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
    isPreSelectedEmployeeCurrentUser
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

  // Get selected employee details - prioritize pre-selected employee
  const selectedEmployee = formValues.employeeId
    ? preSelectedEmployee?.id === formValues.employeeId
      ? preSelectedEmployee
      : getEmployeeById(formValues.employeeId)
    : null

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
              {getTranslationFromI18nKeyAndLabel('feedback.form.title', 'Give Feedback')}
            </h2>
          </div>
        </div>

        {/* Modal Content */}
        <div className="gba:p-4 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-140px)]">
          {/* Employee Selection Section */}
          <div className="gba:space-y-2">
            {/* Show loading state for pre-selected employee */}
            {hasPreSelectedEmployee && preSelectedEmployeeLoading && (
              <div className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-muted gba:rounded-lg">
                <Spinner size="sm" />
                <span className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('feedback.form.employee.loading', 'Loading employee details...')}
                </span>
              </div>
            )}

            {/* Show error state for pre-selected employee */}
            {hasPreSelectedEmployee && preSelectedEmployeeError && (
              <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'EmployeeErrorAlert')}>
                <AlertDescription>{preSelectedEmployeeError}</AlertDescription>
              </Alert>
            )}

            {/* Show selected employee or dropdown */}
            {selectedEmployee && !preSelectedEmployeeLoading && !isPreSelectedEmployeeCurrentUser ? (
              <div className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-muted gba:rounded-lg">
                <Avatar className="gba:w-10 gba:h-10">
                  {selectedEmployee.pictureThumbnail && (
                    <AvatarImage
                      src={`data:image/gif;base64,${selectedEmployee.pictureThumbnail}`}
                      alt={selectedEmployee.name}
                    />
                  )}
                  <AvatarFallback className="gba:bg-muted">
                    {selectedEmployee.name !== '-'
                      ? selectedEmployee.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="gba:flex-1">
                  <div className="gba:font-medium gba:text-foreground">{selectedEmployee.name}</div>
                  {selectedEmployee.jobTitle && (
                    <div className="gba:text-sm gba:text-muted-foreground">{selectedEmployee.jobTitle}</div>
                  )}
                </div>
                {!hasPreSelectedEmployee && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormValues({ employeeId: undefined, employeeName: undefined })}
                    className="gba:text-muted-foreground hover:gba:text-foreground"
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (!hasPreSelectedEmployee || isPreSelectedEmployeeCurrentUser) && !preSelectedEmployeeLoading ? (
              <EmployeeSearchableSelect
                label={getTranslationFromI18nKeyAndLabel('feedback.form.employee.label', 'Employee')}
                name="employee-select"
                value={formValues.employeeId}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'feedback.form.employee.placeholder',
                  'Select an employee...'
                )}
                options={employees.map(emp => ({
                  id: emp.id,
                  value: emp.id,
                  name: emp.name,
                  label: emp.name,
                  jobTitle: emp.jobTitle,
                  department: emp.department,
                  pictureThumbnail: emp.pictureThumbnail,
                  userId: emp.userId,
                  extraInfo: {
                    jobPosition: emp.jobTitle,
                    organizationalUnit: emp.department,
                    pictureThumbnail: emp.pictureThumbnail,
                    userId: emp.userId
                  }
                }))}
                loading={employeesLoading}
                onSearch={searchEmployees}
                onChange={handleEmployeeChange}
                data-testid={formatDataTestId(prefixDataTestId, 'EmployeeSelect')}
                error={employeesError}
                required={true}
                className="gba:w-full"
              />
            ) : null}
          </div>

          {/* Public switch */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label htmlFor="feedback-public" className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('feedback.form.public.label', 'Public Feedback')}
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
              {getTranslationFromI18nKeyAndLabel('feedback.form.text.label', 'Feedback')} *
            </Label>
            <Textarea
              id="feedback-text"
              name="feedbackText"
              data-testid={formatDataTestId(prefixDataTestId, 'Textarea')}
              value={formValues.feedbackText}
              onChange={handleTextChange}
              placeholder="Enter your feedback here..."
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
                      ? getTranslationFromI18nKeyAndLabel('feedback.form.transforming', 'Transforming')
                      : getTranslationFromI18nKeyAndLabel('feedback.form.transform.placeholder', 'Text Tool')}
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
                  {getTranslationFromI18nKeyAndLabel('feedback.form.formalize', 'Formalize')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleTransform('translate')}
                  data-testid={formatDataTestId(prefixDataTestId, 'TranslateOption')}
                  className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                >
                  {getTranslationFromI18nKeyAndLabel('feedback.form.translate', 'Translate')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleTransform('shorten')}
                  data-testid={formatDataTestId(prefixDataTestId, 'ShortenOption')}
                  className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                >
                  {getTranslationFromI18nKeyAndLabel('feedback.form.shorten', 'Shorten')}
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
        <div className="gba:p-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
          <Button
            variant="secondary"
            onClick={onCancel}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            className="gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {getTranslationFromI18nKeyAndLabel('feedback.form.cancel', 'Cancel')}
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid || isLoading || (hasPreSelectedEmployee && preSelectedEmployeeLoading)}
            size="default"
            onClick={handleSubmit}
            className="gba:bg-primary hover:gba:bg-primary gba:text-primary-foreground gba:px-6 gba:py-2 gba:rounded-lg"
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
          >
            {isLoading && <Spinner size="sm" className="gba:mr-2" />}
            {getTranslationFromI18nKeyAndLabel('feedback.form.submit', 'Submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackFormComponent
