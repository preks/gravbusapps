import React, { useMemo } from 'react'
import {
  Button,
  Label,
  Spinner,
  Alert,
  AlertDescription,
  Textarea,
  useTranslation,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { StarIcon, CaretDownIcon } from '@phosphor-icons/react'
import { usePerformanceEvaluationForm } from '../context/PerformanceEvaluationFormContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { EmployeeSelect } from '@/components/employee-select'
import FormHeader from '../../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import { PERFORMANCE_VALIDATION } from '@/business-apps/hr/core/apps/performance-evaluation/constants/validationConstants'
import translations from '../_i18n'

const prefixDataTestId = 'PerformanceEvaluationForm'

const PerformanceEvaluationFormComponent: React.FC = () => {
  const { t } = useTranslation(translations)
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
    employeeSkillsLoading,
    transformCommentText,
    textTransformationLoading,
    textTransformationError,
    clearTextTransformationError
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

  // Check if form is valid: employee (selected or pre-selected in task flow) and all topics have a rating
  const hasEmployee = formValues.employeeId || hasPreSelectedEmployee
  const isFormValid =
    hasEmployee &&
    formValues.topics.length > 0 &&
    formValues.topics.every(topic => topic.rating !== undefined && topic.rating > 0)

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
                <StarIcon size={16} weight="fill" className="gba:text-primary" />
              ) : (
                <StarIcon size={16} className="gba:text-muted-foreground" />
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
        <FormHeader title={t('title')} flowIconUrl={flowIconUrl} employee={employeeForHeader} />
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:px-6 gba:py-6 gba:space-y-4">
        {/* Show loading state for pre-selected employee */}
        {hasPreSelectedEmployee && preSelectedEmployeeLoading && (
          <div className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-muted gba:rounded-lg">
            <Spinner size="sm" />
            <span className="gba:text-sm gba:text-muted-foreground">{t('employee-loading')}</span>
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
              {t('employee-label')} *
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
              placeholder={t('employee-placeholder')}
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

        {/* Topics Section: Skills and Company Values */}
        <div className="gba:space-y-8">
          {(() => {
            const skillTopics = formValues.topics.filter(t => t.category === 'skill')
            const companyValueTopics = formValues.topics.filter(t => t.category === 'value')

            const renderTopicCard = (topic: (typeof formValues.topics)[0]) => (
              <div
                key={topic.id}
                className="gba:space-y-3 gba:p-4 gba:border gba:border-border gba:rounded-lg"
                data-testid={formatDataTestId(prefixDataTestId, `Topic-${topic.id}`)}
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Label className="gba:text-base gba:font-semibold">
                    {topic.name ||
                      (topic.category === 'skill' ? t('topic-category-skill') : t('topic-category-company-value'))}
                  </Label>
                </div>
                <div className="gba:space-y-2">
                  {renderTopicRating(topic.id, topic.rating)}
                  {!topic.rating && <p className="gba:text-xs gba:text-muted-foreground">{t('topic-rating-helper')}</p>}
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor={`${topic.id}-comment`} className="gba:text-sm gba:font-medium">
                    {t('topic-comment')}
                  </Label>
                  <Textarea
                    id={`${topic.id}-comment`}
                    value={topic.comment}
                    onChange={e => {
                      updateTopic(topic.id, { comment: e.target.value })
                      clearTextTransformationError()
                    }}
                    placeholder={t('topic-comment-placeholder')}
                    maxLength={PERFORMANCE_VALIDATION.COMMENT_MAX_LENGTH}
                    data-testid={formatDataTestId(prefixDataTestId, `${topic.id}-CommentInput`)}
                    className="gba:min-h-[80px] gba:w-full gba:resize-y"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="default"
                        disabled={!topic.comment?.trim() || textTransformationLoading}
                        className="gba:w-full gba:justify-between gba:bg-destructive hover:gba:bg-destructive gba:text-primary-foreground gba:border-destructive"
                        data-testid={formatDataTestId(prefixDataTestId, `${topic.id}-TextTool`)}
                      >
                        <span>
                          {textTransformationLoading ? (
                            <Spinner size="sm" />
                          ) : (
                            t('text-tool', { defaultValue: 'Text Tool' })
                          )}
                        </span>
                        <CaretDownIcon size={16} className="gba:h-4 gba:w-4 gba:opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="gba:w-full gba:bg-primary-foreground gba:border-border gba:rounded-lg gba:shadow-lg">
                      <DropdownMenuItem
                        className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                        onClick={async () => {
                          const result = await transformCommentText(topic.comment ?? '', 'formalize')
                          if (result != null) updateTopic(topic.id, { comment: result })
                        }}
                      >
                        {t('text-tool-formalize', { defaultValue: 'Formalize' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                        onClick={async () => {
                          const result = await transformCommentText(topic.comment ?? '', 'translate', 'en')
                          if (result != null) updateTopic(topic.id, { comment: result })
                        }}
                      >
                        {t('text-tool-translate', { defaultValue: 'Translate' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                        onClick={async () => {
                          const result = await transformCommentText(topic.comment ?? '', 'shorten')
                          if (result != null) updateTopic(topic.id, { comment: result })
                        }}
                      >
                        {t('text-tool-shorten', { defaultValue: 'Shorten' })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )

            return (
              <>
                {skillTopics.length > 0 && (
                  <section className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'Section-Skills')}>
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('section-skills')}</h2>
                    <div className="gba:space-y-4">{skillTopics.map(renderTopicCard)}</div>
                  </section>
                )}
                {companyValueTopics.length > 0 && (
                  <section
                    className="gba:space-y-4"
                    data-testid={formatDataTestId(prefixDataTestId, 'Section-CompanyValues')}
                  >
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('section-company-values')}</h2>
                    <div className="gba:space-y-4">{companyValueTopics.map(renderTopicCard)}</div>
                  </section>
                )}
              </>
            )
          })()}

          {/* Employee Skills Loading Indicator */}
          {employeeSkillsLoading && (
            <div
              className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:border gba:border-border gba:rounded-lg gba:bg-muted/50"
              data-testid={formatDataTestId(prefixDataTestId, 'SkillsLoading')}
            >
              <Spinner className="gba:h-5 gba:w-5" />
              <span className="gba:text-sm gba:text-muted-foreground">{t('skills-loading')}</span>
            </div>
          )}
        </div>

        {/* General Comments */}
        <div className="gba:space-y-2">
          <Label htmlFor="general-comments" className="gba:text-lg gba:font-semibold gba:text-foreground">
            {t('general-comments-label')}
          </Label>
          <Textarea
            id="general-comments"
            value={formValues.comments ?? ''}
            onChange={e => {
              setFormValues({ comments: e.target.value })
              clearTextTransformationError()
            }}
            placeholder={t('general-comments-placeholder')}
            maxLength={PERFORMANCE_VALIDATION.COMMENT_MAX_LENGTH}
            className="gba:min-h-[120px] gba:w-full gba:resize-y"
            data-testid={formatDataTestId(prefixDataTestId, 'GeneralComments')}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="default"
                disabled={!(formValues.comments ?? '').trim() || textTransformationLoading}
                className="gba:w-full gba:justify-between gba:bg-destructive hover:gba:bg-destructive gba:text-primary-foreground gba:border-destructive"
                data-testid={formatDataTestId(prefixDataTestId, 'GeneralCommentsTextTool')}
              >
                <span>
                  {textTransformationLoading ? <Spinner size="sm" /> : t('text-tool', { defaultValue: 'Text Tool' })}
                </span>
                <CaretDownIcon size={16} className="gba:h-4 gba:w-4 gba:opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="gba:w-full gba:bg-primary-foreground gba:border-border gba:rounded-lg gba:shadow-lg">
              <DropdownMenuItem
                className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                onClick={async () => {
                  const result = await transformCommentText(formValues.comments ?? '', 'formalize')
                  if (result != null) setFormValues({ comments: result })
                }}
              >
                {t('text-tool-formalize', { defaultValue: 'Formalize' })}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                onClick={async () => {
                  const result = await transformCommentText(formValues.comments ?? '', 'translate', 'en')
                  if (result != null) setFormValues({ comments: result })
                }}
              >
                {t('text-tool-translate', { defaultValue: 'Translate' })}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gba:px-3 gba:py-2 gba:hover:bg-accent gba:cursor-pointer"
                onClick={async () => {
                  const result = await transformCommentText(formValues.comments ?? '', 'shorten')
                  if (result != null) setFormValues({ comments: result })
                }}
              >
                {t('text-tool-shorten', { defaultValue: 'Shorten' })}
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
        {textTransformationError && (
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'TextTransformationErrorAlert')}>
            <AlertDescription>{textTransformationError}</AlertDescription>
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
            {t('cancel-button')}
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
          {t('submit-button')}
        </Button>
      </div>
    </div>
  )
}

export default PerformanceEvaluationFormComponent
