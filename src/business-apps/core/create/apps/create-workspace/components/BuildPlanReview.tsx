/**
 * BuildPlanReview - Component for reviewing and confirming a build plan
 *
 * Shows:
 * - Analysis summary
 * - List of components to be built
 * - Clarifying questions (if any)
 * - Confirm/Cancel actions
 */

import React, { useState, useCallback } from 'react'
import { Button, Input, Label, RadioGroup, RadioGroupItem, cn } from '@newwork/nw-design-system'
import { Monitor, Bot, Code2, Workflow, Database, CheckCircle2, Edit2, type LucideIcon } from 'lucide-react'
import type { BuildPlan, ComponentType, ClarifyingQuestion } from '../types/orchestrator'

export interface BuildPlanReviewProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onCancel: () => void
  onReanalyze?: (answers: Record<string, string>) => void
  isLoading?: boolean
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
  agent: 'Task Expert',
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
  isLoading = false,
  hideActions = false,
  onSkippedComponentsChange,
  'data-testid': testId = 'build-plan-review'
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [skippedComponents, setSkippedComponents] = useState<Set<string>>(new Set())

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

  // Group components by type
  const componentsByType = plan.components.reduce(
    (acc, comp) => {
      if (!acc[comp.type]) acc[comp.type] = []
      acc[comp.type].push(comp)
      return acc
    },
    {} as Record<ComponentType, typeof plan.components>
  )

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

        {/* Edit Plan button - Coming soon */}
        <Button
          variant="outline"
          size="sm"
          disabled
          title="Coming soon - Plan editing"
          className="gba:text-xs gba:opacity-50"
        >
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
