import React, { useMemo } from 'react'
import { Button, Input, Label, Spinner, Alert, AlertDescription } from '@newwork/nw-design-system'
import { StarFilled, StarOutlined } from '@ant-design/icons'
import { usePerformanceEvaluationForm } from '../context/PerformanceEvaluationFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { EmployeeSelect } from '@/components/employee-select'
import FormHeader from '../../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

const prefixDataTestId = 'PerformanceEvaluationForm'

const PerformanceEvaluationFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    updateTopic,
    isLoading,
    error,
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
    isRequestedEvaluationFlow
  } = usePerformanceEvaluationForm()

  const handleEmployeeChange = (employeeId: string) => {
    const employee = getEmployeeById(employeeId)
    if (employee) {
      setFormValues({
        employeeId: employee.id,
        employeeName: employee.name
      })
    }
  }

  const handleSubmit = async () => {
    await onSubmit()
  }

  // Check if form is valid - all topics must have ratings and employee must be selected
  const isFormValid =
    formValues.employeeId && formValues.topics.every(topic => topic.rating !== undefined && topic.rating > 0)

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

  // Defer rendering the form for requested-evaluation flow until the preselected employee is applied to form state,
  // so no UI (including Cancel) flashes before we know the final state.
  if (isRequestedEvaluationFlow && !formValues.employeeId) {
    return null
  }

  const title = getTranslationFromI18nKeyAndLabel(
    'lowcoder:performance_evaluation_form.title',
    'Performance Evaluation'
  )

  // Rating component for a specific topic
  const renderTopicRating = (topicId: string, currentRating?: number) => {
    const stars = [1, 2, 3, 4, 5]
    return (
      <div className="gba:flex gba:gap-2">
        {stars.map(star => (
          <button
            key={star}
            type="button"
            onClick={() => updateTopic(topicId, { rating: star })}
            className="gba:text-2xl gba:cursor-pointer gba:transition-colors hover:gba:text-primary"
            data-testid={formatDataTestId(prefixDataTestId, `${topicId}-RatingStar-${star}`)}
          >
            {currentRating && star <= currentRating ? (
              <StarFilled className="gba:text-primary" />
            ) : (
              <StarOutlined className="gba:text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    )
  }

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
                  'lowcoder:performance_evaluation_form.employee.loading',
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
                {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_form.employee.label', 'Employee')} *
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
                  'lowcoder:performance_evaluation_form.employee.placeholder',
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

          {/* Topics Section */}
          <div className="gba:space-y-6">
            {formValues.topics.map(topic => (
              <div
                key={topic.id}
                className="gba:space-y-3 gba:p-4 gba:border gba:border-border gba:rounded-lg"
                data-testid={formatDataTestId(prefixDataTestId, `Topic-${topic.id}`)}
              >
                {/* Topic Header */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Label className="gba:text-base gba:font-semibold">
                    {topic.name}
                    <span className="gba:text-xs gba:font-normal gba:text-muted-foreground gba:ml-2">
                      ({topic.category === 'skill' ? 'Skill' : 'Company Value'})
                    </span>
                  </Label>
                </div>

                {/* Rating Section */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_form.topic.rating', 'Rating')} *
                  </Label>
                  {renderTopicRating(topic.id, topic.rating)}
                  {!topic.rating && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:performance_evaluation_form.topic.rating.helper',
                        'Please select a rating from 1 to 5 stars'
                      )}
                    </p>
                  )}
                </div>

                {/* Comment Section */}
                <div className="gba:space-y-2">
                  <Label htmlFor={`${topic.id}-comment`} className="gba:text-sm gba:font-medium">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_form.topic.comment', 'Comment')}
                  </Label>
                  <Input
                    id={`${topic.id}-comment`}
                    value={topic.comment}
                    onChange={e => updateTopic(topic.id, { comment: e.target.value })}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:performance_evaluation_form.topic.comment.placeholder',
                      'Add a comment...'
                    )}
                    data-testid={formatDataTestId(prefixDataTestId, `${topic.id}-CommentInput`)}
                    className="gba:w-full"
                  />
                </div>
              </div>
            ))}
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
          {!isRequestedEvaluationFlow && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_form.cancel', 'Cancel')}
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            disabled={!isFormValid || isLoading || (hasPreSelectedEmployee && preSelectedEmployeeLoading)}
            onClick={handleSubmit}
            className="gba:bg-foreground hover:gba:bg-muted gba:text-primary-foreground"
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
          >
            {isLoading && <Spinner size="sm" className="gba:mr-2" />}
            {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_form.submit', 'Submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PerformanceEvaluationFormComponent
