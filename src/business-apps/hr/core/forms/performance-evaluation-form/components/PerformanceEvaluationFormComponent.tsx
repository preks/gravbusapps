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
    isRequestedEvaluationFlow,
    ratingScaleValues,
    ratingScaleLoading,
    employeeSkillsLoading
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
  // Always show in header when pre-selected (even if current user)
  const employeeForHeader = useMemo(() => {
    if (!preSelectedEmployee || preSelectedEmployeeLoading) {
      return null
    }

    // preSelectedEmployee is already in EmployeeOption format
    const employeeName = preSelectedEmployee.name || ''
    const nameParts = employeeName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    return {
      firstName,
      lastName,
      pictureThumbnail: preSelectedEmployee.pictureThumbnail,
      jobTitle: preSelectedEmployee.jobTitle
    }
  }, [preSelectedEmployee, preSelectedEmployeeLoading])

  // Detect if rating scale uses star format
  const isStarBasedRating = useMemo(() => {
    if (ratingScaleValues.length === 0) return true // Default to stars
    // Check if any label contains "star"
    return ratingScaleValues.some(scale => scale.label.toLowerCase().includes('star'))
  }, [ratingScaleValues])

  // Defer rendering the form for requested-evaluation flow until the preselected employee is applied to form state,
  // so no UI (including Cancel) flashes before we know the final state.
  if (isRequestedEvaluationFlow && !formValues.employeeId) {
    return null
  }

  const title = getTranslationFromI18nKeyAndLabel(
    'lowcoder:performance_evaluation_form.title',
    'Performance Evaluation'
  )

  // Rating component for a specific topic using rating scale values
  const renderTopicRating = (topicId: string, currentRating?: number) => {
    if (ratingScaleLoading) {
      return <Spinner size="sm" />
    }

    // Star-based rating (when labels contain "star")
    if (isStarBasedRating) {
      return (
        <div className="gba:flex gba:gap-2">
          {ratingScaleValues.map(scale => (
            <button
              key={scale.value}
              type="button"
              onClick={() => updateTopic(topicId, { rating: scale.value })}
              className="gba:text-2xl gba:cursor-pointer gba:transition-colors hover:gba:text-primary"
              data-testid={formatDataTestId(prefixDataTestId, `${topicId}-RatingStar-${scale.value}`)}
              title={scale.label}
            >
              {currentRating && scale.value <= currentRating ? (
                <StarFilled className="gba:text-primary" />
              ) : (
                <StarOutlined className="gba:text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      )
    }

    // Button-based rating (for numeric or text labels)
    return (
      <div className="gba:flex gba:gap-2 gba:flex-wrap">
        {ratingScaleValues.map(scale => (
          <button
            key={scale.value}
            type="button"
            onClick={() => updateTopic(topicId, { rating: scale.value })}
            className={`gba:px-4 gba:py-2 gba:rounded-lg gba:border gba:transition-all gba:min-w-[60px] gba:font-medium ${
              currentRating === scale.value
                ? 'gba:bg-primary gba:text-primary-foreground gba:border-primary'
                : 'gba:bg-background gba:text-foreground gba:border-border hover:gba:border-primary hover:gba:bg-accent'
            }`}
            data-testid={formatDataTestId(prefixDataTestId, `${topicId}-RatingButton-${scale.value}`)}
          >
            {scale.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-white"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      {/* Header - Fixed */}
      <div className="gba:flex-shrink-0">
        <FormHeader title={title} flowIconUrl={flowIconUrl} employee={employeeForHeader} />
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:px-6 gba:py-6 gba:space-y-4">
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

        {/* Employee Selection Section - only show if not pre-selected (always hidden when userId provided) */}
        {!hasPreSelectedEmployee && !preSelectedEmployeeLoading && (
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
                {renderTopicRating(topic.id, topic.rating)}
                {!topic.rating && (
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:performance_evaluation_form.topic.rating.helper',
                      'Please select a rating'
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

          {/* Employee Skills Loading Indicator */}
          {employeeSkillsLoading && (
            <div
              className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:border gba:border-border gba:rounded-lg gba:bg-muted/50"
              data-testid={formatDataTestId(prefixDataTestId, 'SkillsLoading')}
            >
              <Spinner className="gba:h-5 gba:w-5" />
              <span className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:performance_evaluation_form.skills.loading',
                  'Loading employee skills...'
                )}
              </span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end gba:bg-white">
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
  )
}

export default PerformanceEvaluationFormComponent
