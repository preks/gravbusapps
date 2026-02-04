/**
 * BuildPlanReview - Component for reviewing and confirming a build plan
 *
 * Shows:
 * - Analysis summary
 * - List of components to be built
 * - Clarifying questions (if any)
 * - Confirm/Cancel actions
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Button, Input, Label, RadioGroup, RadioGroupItem, Textarea, cn } from '@newwork/nw-design-system'
import { Monitor, Bot, Code2, Workflow, Database, CheckCircle2, Edit2, Sparkles, type LucideIcon } from 'lucide-react'
import type { BuildPlan, ComponentType, ClarifyingQuestion } from '../../types'

export interface BuildPlanReviewProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onCancel: () => void
  onReanalyze?: (answers: Record<string, string>) => void
  onEdit?: () => void
  onRefine?: (feedback: string) => void
  isLoading?: boolean
  isRefining?: boolean
  refinementSummary?: string | null
  refineError?: string | null
  hideActions?: boolean
  onSkippedComponentsChange?: (skippedIds: string[]) => void
  'data-testid'?: string
}

// Icon mapping for component types
const typeIcons: Record<ComponentType, LucideIcon> = {
  screen: Monitor,
  agent: Bot,
  function: Code2,
  flow: Workflow,
  data_model: Database
}

// Labels for component types
const typeLabels: Record<ComponentType, string> = {
  screen: 'Screen',
  agent: 'AI Task Expert',
  function: 'Function',
  flow: 'Flow',
  data_model: 'Data Model'
}

/**
 * BuildPlanReview component
 */
export const BuildPlanReview: React.FC<BuildPlanReviewProps> = ({
  plan,
  onConfirm,
  onCancel,
  onReanalyze,
  onEdit,
  onRefine,
  isLoading = false,
  isRefining = false,
  refinementSummary,
  refineError,
  hideActions = false,
  onSkippedComponentsChange,
  'data-testid': testId = 'build-plan-review'
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [skippedComponents, setSkippedComponents] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState('')

  const hasQuestions = plan.questions && plan.questions.length > 0
  const allQuestionsAnswered = !hasQuestions || plan.questions!.every(q => !q.required || answers[q.id])

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }, [])

  const toggleComponentSkip = useCallback(
    (componentId: string) => {
      setSkippedComponents(prev => {
        const newSet = new Set(prev)
        if (newSet.has(componentId)) {
          newSet.delete(componentId)
        } else {
          newSet.add(componentId)
        }
        onSkippedComponentsChange?.(Array.from(newSet))
        return newSet
      })
    },
    [onSkippedComponentsChange]
  )

  const handleEditComponent = useCallback((componentId: string) => {
    // TODO: Implement when backend supports plan editing
    console.log('Edit component:', componentId)
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(skippedComponents))
  }, [onConfirm, skippedComponents])

  const handleReanalyze = useCallback(() => {
    onReanalyze?.(answers)
  }, [onReanalyze, answers])

  const handleRefine = useCallback(() => {
    if (feedback.trim().length >= 3) {
      onRefine?.(feedback.trim())
    }
  }, [onRefine, feedback])

  // Clear feedback on successful refinement
  useEffect(() => {
    if (refinementSummary) {
      setFeedback('')
      // Scroll to top to show updated summary
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [refinementSummary])

  // Check if plan has user-friendly summary
  const hasUserSummary = !!plan.user_summary

  // Get component description (user-friendly if available)
  const getComponentDescription = useCallback((comp: (typeof plan.components)[0]) => {
    return comp.user_friendly_description || comp.description
  }, [])

  // Group components by type
  const componentsByType = plan.components.reduce(
    (acc, comp) => {
      if (!acc[comp.type]) acc[comp.type] = []
      acc[comp.type].push(comp)
      return acc
    },
    {} as Record<ComponentType, typeof plan.components>
  )

  // Render user-friendly summary layout
  if (hasUserSummary) {
    const { user_summary } = plan

    return (
      <div className="gba:space-y-4" data-testid={testId}>
        {/* Two-column layout for What You're Getting and What You Can Do */}
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-3 md:gba:gap-5">
          {/* What You're Getting */}
          <div className="gba:space-y-1.5">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">What You're Getting</h3>
            <ul className="gba:space-y-1">
              {user_summary!.what_you_get.map((item, i) => (
                <li key={i} className="gba:flex gba:gap-2 gba:text-sm gba:text-foreground gba:leading-relaxed">
                  <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                  <span className="gba:flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What You Can Do */}
          <div className="gba:space-y-1.5">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">What You Can Do</h3>
            <ul className="gba:space-y-1">
              {user_summary!.what_you_can_do.map((item, i) => (
                <li key={i} className="gba:flex gba:gap-2 gba:text-sm gba:text-foreground gba:leading-relaxed">
                  <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                  <span className="gba:flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Why This Matters */}
        <div className="gba:space-y-1.5">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Why This Matters</h3>
          <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{user_summary!.business_value}</p>
        </div>

        {/* Build Time */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:py-2 gba:border-y gba:border-border">
          <span className="gba:font-medium">Build Time:</span>
          <span>{user_summary!.estimated_time}</span>
        </div>

        {/* Clarifying Questions */}
        {hasQuestions && (
          <div className="gba:space-y-4 gba:py-4 gba:border-y gba:border-border">
            <div className="gba:flex gba:items-center gba:justify-between">
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Clarifying Questions</h3>
              <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">Required before building</span>
            </div>
            <div className="gba:space-y-5">
              {plan.questions!.map(question => (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={answers[question.id] || ''}
                  onChange={value => handleAnswerChange(question.id, value)}
                />
              ))}
              <Button
                onClick={handleReanalyze}
                disabled={!allQuestionsAnswered || isLoading}
                variant="outline"
                size="sm"
              >
                Re-analyze with Answers
              </Button>
            </div>
          </div>
        )}

        {/* What We'll Build - Flat list */}
        <div className="gba:space-y-2.5">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">
              What We'll Build ({plan.components.length} {plan.components.length === 1 ? 'item' : 'items'})
            </h3>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} disabled={isLoading} className="gba:text-xs">
                <Edit2 className="gba:w-3 gba:h-3 gba:mr-1.5" />
                Customize Components
              </Button>
            )}
          </div>

          <div className="gba:space-y-1.5">
            {plan.components.map(comp => (
              <div
                key={comp.id}
                className={cn(
                  'gba:flex gba:items-start gba:gap-2.5 gba:py-2 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:cursor-pointer gba:transition-all hover:gba:bg-muted/30',
                  skippedComponents.has(comp.id) && 'gba:opacity-40 gba:bg-muted/10'
                )}
                onClick={() => toggleComponentSkip(comp.id)}
              >
                {/* Checkbox */}
                <div className="gba:mt-0.5 gba:shrink-0">
                  <CheckCircle2
                    className={cn(
                      'gba:w-[18px] gba:h-[18px] gba:transition-all',
                      skippedComponents.has(comp.id)
                        ? 'gba:text-muted-foreground gba:opacity-30'
                        : 'gba:text-foreground'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-baseline gba:gap-2">
                  <div
                    className={cn(
                      'gba:text-sm gba:font-medium gba:text-foreground gba:leading-tight gba:shrink-0',
                      skippedComponents.has(comp.id) && 'gba:line-through'
                    )}
                  >
                    {comp.name}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:leading-tight gba:flex-1">
                    {getComponentDescription(comp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refinement Section */}
        {onRefine && (
          <div className="gba:space-y-2.5 gba:pt-3 gba:border-t gba:border-border">
            <div>
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
                <Sparkles className="gba:w-4 gba:h-4" />
                Refine Your Plan
              </h3>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                Describe any changes you'd like in plain English
              </p>
            </div>

            {/* Refinement Summary - success feedback */}
            {refinementSummary && !refineError && (
              <div className="gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg gba:p-2.5">
                <p className="gba:text-sm gba:text-green-800">
                  <span className="gba:font-medium">Changes applied:</span> {refinementSummary}
                </p>
              </div>
            )}

            {/* Feedback textarea */}
            <div className="gba:space-y-2">
              <Textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder='e.g., "Add export to PDF" or "Remove the status filter"'
                disabled={isRefining || isLoading}
                rows={3}
                maxLength={2000}
                className="gba:resize-none gba:text-sm"
              />
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-xs gba:text-muted-foreground">{feedback.length}/2000 characters</span>
                <div className="gba:flex gba:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeedback('')}
                    disabled={!feedback || isRefining || isLoading}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefine}
                    disabled={feedback.trim().length < 3 || isRefining || isLoading}
                  >
                    {isRefining ? 'Refining...' : 'Refine Plan'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Error display */}
            {refineError && (
              <div className="gba:bg-destructive/10 gba:border gba:border-destructive/20 gba:rounded-lg gba:p-2.5">
                <p className="gba:text-sm gba:text-destructive gba:whitespace-pre-line">{refineError}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions (if not hidden) */}
        {!hideActions && (
          <div className="gba:flex gba:items-center gba:justify-end gba:gap-3 gba:pt-3 gba:border-t gba:border-border">
            <Button variant="ghost" onClick={onCancel} disabled={isLoading || isRefining}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading || isRefining || !allQuestionsAnswered}>
              {isLoading ? 'Starting...' : 'Start Building'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Fallback: Render original technical layout if no user_summary
  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Summary Header - Compact single line with better spacing */}
      <div className="gba:flex gba:items-center gba:justify-between gba:pb-6 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-3">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">Build Plan</h2>
          <span className="gba:text-muted-foreground gba:text-sm">•</span>
          <span className="gba:text-sm gba:text-muted-foreground">
            {plan.components.length} component{plan.components.length !== 1 ? 's' : ''}
          </span>
          <span className="gba:text-muted-foreground gba:text-sm">•</span>
          <span className="gba:text-sm gba:text-muted-foreground">
            ~{Math.ceil(plan.estimated_duration_seconds / 60)} min
          </span>
          <span className="gba:text-muted-foreground gba:text-sm">•</span>
          <span className="gba:text-sm gba:text-muted-foreground gba:capitalize">{plan.analysis.complexity}</span>
        </div>

        {/* Edit Plan button */}
        <Button variant="outline" size="sm" onClick={onEdit} disabled={isLoading || !onEdit} className="gba:text-xs">
          <Edit2 className="gba:w-3 gba:h-3 gba:mr-1.5" />
          Edit Plan
        </Button>
      </div>

      {/* Goal - Clean and minimal with better spacing */}
      <div className="gba:space-y-3">
        <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
          Goal
        </h3>
        <p className="gba:text-base gba:text-foreground gba:leading-[1.6]">{plan.analysis.intent}</p>
      </div>

      {/* Notes - Only if present */}
      {plan.analysis.notes && plan.analysis.notes.length > 0 && (
        <div className="gba:space-y-3">
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
            Notes
          </h3>
          <ul className="gba:space-y-2">
            {plan.analysis.notes.map((note, i) => (
              <li key={i} className="gba:text-sm gba:text-muted-foreground gba:flex gba:gap-2 gba:leading-[1.5]">
                <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                <span className="gba:flex-1">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarifying Questions - Minimal with better spacing */}
      {hasQuestions && (
        <div className="gba:space-y-5 gba:py-6 gba:border-t gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
              Clarifying Questions
            </h3>
            <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">Required before building</span>
          </div>
          <div className="gba:space-y-5">
            {plan.questions!.map(question => (
              <QuestionField
                key={question.id}
                question={question}
                value={answers[question.id] || ''}
                onChange={value => handleAnswerChange(question.id, value)}
              />
            ))}
            <Button onClick={handleReanalyze} disabled={!allQuestionsAnswered || isLoading} variant="outline" size="sm">
              Re-analyze with Answers
            </Button>
          </div>
        </div>
      )}

      {/* Components - Flat list, more scannable */}
      <div className="gba:space-y-5 gba:pt-2">
        <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
          Components ({plan.components.length})
        </h3>

        <div className="gba:space-y-8">
          {(Object.keys(componentsByType) as ComponentType[]).map(type => (
            <div key={type} className="gba:space-y-3">
              {/* Type header */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
                {React.createElement(typeIcons[type], {
                  className: 'gba:w-4 gba:h-4'
                })}
                <span className="gba:text-sm gba:font-medium">{typeLabels[type]}s</span>
                <span className="gba:text-xs">({componentsByType[type].length})</span>
              </div>

              {/* Components list - cleaner with better spacing */}
              <div className="gba:space-y-1 gba:pl-6">
                {componentsByType[type].map(comp => (
                  <div
                    key={comp.id}
                    className={cn(
                      'gba:flex gba:items-start gba:gap-3 gba:py-3 gba:px-2 gba:rounded-md gba:group gba:relative gba:cursor-pointer gba:transition-colors hover:gba:bg-muted/50',
                      skippedComponents.has(comp.id) && 'gba:opacity-40'
                    )}
                    onClick={() => toggleComponentSkip(comp.id)}
                  >
                    {/* Checkbox - larger and more obvious */}
                    <div className="gba:mt-0.5 gba:shrink-0">
                      <CheckCircle2
                        className={cn(
                          'gba:w-[18px] gba:h-[18px] gba:transition-all',
                          skippedComponents.has(comp.id)
                            ? 'gba:text-muted-foreground gba:opacity-30'
                            : 'gba:text-foreground'
                        )}
                      />
                    </div>

                    {/* Content with better spacing */}
                    <div className="gba:flex-1 gba:min-w-0 gba:pr-20">
                      <div
                        className={cn(
                          'gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:leading-snug',
                          skippedComponents.has(comp.id) && 'gba:line-through'
                        )}
                      >
                        {comp.name}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:leading-[1.5]">{comp.description}</div>
                    </div>

                    {/* Edit button - hidden by default, appears on hover */}
                    <div className="gba:absolute gba:right-2 gba:top-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-7 gba:px-2 gba:opacity-0 gba:invisible group-hover:gba:opacity-100 group-hover:gba:visible gba:transition-all gba:duration-150"
                        onClick={e => {
                          e.stopPropagation()
                          handleEditComponent(comp.id)
                        }}
                        disabled
                        title="Coming soon - Plan editing"
                      >
                        <Edit2 className="gba:w-3 gba:h-3 gba:mr-1" />
                        <span className="gba:text-xs">Edit</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions - Only show if not using Canvas footer */}
      {!hideActions && (
        <div className="gba:flex gba:items-center gba:justify-between gba:pt-6 gba:pb-4 gba:mt-10 gba:border-t gba:border-border gba:bg-background">
          <div className="gba:text-sm gba:text-muted-foreground gba:font-medium">
            {plan.components.length - skippedComponents.size} of {plan.components.length} component
            {plan.components.length !== 1 ? 's' : ''} selected
          </div>
          <div className="gba:flex gba:items-center gba:gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={isLoading} size="lg">
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={isLoading || (hasQuestions && !allQuestionsAnswered)}
              className="gba:min-w-[160px]"
            >
              {isLoading ? (
                <>
                  <span className="gba:animate-spin gba:mr-2">...</span>
                  Building...
                </>
              ) : (
                <>Start Build</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Question field component
 */
interface QuestionFieldProps {
  question: ClarifyingQuestion
  value: string
  onChange: (value: string) => void
}

const QuestionField: React.FC<QuestionFieldProps> = ({ question, value, onChange }) => {
  if (question.options && question.options.length > 0) {
    return (
      <div className="gba:space-y-2">
        <Label className="gba:flex gba:items-center gba:gap-1">
          {question.question}
          {question.required && <span className="gba:text-destructive">*</span>}
        </Label>
        {question.context && <p className="gba:text-sm gba:text-muted-foreground">{question.context}</p>}
        <RadioGroup value={value} onValueChange={onChange}>
          {question.options.map((option, i) => (
            <div key={i} className="gba:flex gba:items-center gba:space-x-2">
              <RadioGroupItem value={option} id={`${question.id}-${i}`} />
              <Label htmlFor={`${question.id}-${i}`} className="gba:font-normal">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    )
  }

  return (
    <div className="gba:space-y-2">
      <Label htmlFor={question.id} className="gba:flex gba:items-center gba:gap-1">
        {question.question}
        {question.required && <span className="gba:text-destructive">*</span>}
      </Label>
      {question.context && <p className="gba:text-sm gba:text-muted-foreground">{question.context}</p>}
      <Input
        id={question.id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter your answer..."
      />
    </div>
  )
}

export default BuildPlanReview
